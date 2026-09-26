"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, type Participant } from "livekit-client";
import ReactionLayer from "./ReactionLayer";
import ShareButton from "./ShareButton";
import LiveTimer from "./LiveTimer";
import BroadcastDesk from "./BroadcastDesk";
import { ExpandIcon, ShrinkIcon } from "./icons";

type Props = { streamId: string; title: string; streamerId: string; streamerName: string; broadcaster: boolean };

// Plays the stream for ticket holders; for the streamer it adds the control desk.
export default function LiveStage({ streamId, title, streamerId, streamerName, broadcaster }: Props) {
  // adaptiveStream sends each viewer the layer that fits their player size and connection.
  const [room] = useState(() => new Room({ adaptiveStream: true, dynacast: true }));
  const [state, setState] = useState<"connecting" | "ready" | "error">("connecting");
  const [error, setError] = useState("");
  const [, bump] = useState(0);
  const [needsAudio, setNeedsAudio] = useState(false);
  const [theater, setTheater] = useState(false);
  const liveSince = useRef<number | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const rerender = () => bump((n) => n + 1);
    const events = [
      RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed, RoomEvent.TrackMuted, RoomEvent.TrackUnmuted,
      RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected, RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished, RoomEvent.Reconnected, RoomEvent.Reconnecting, RoomEvent.TrackPublished,
      RoomEvent.TrackUnpublished, RoomEvent.Disconnected,
    ];
    events.forEach((e) => room.on(e, rerender));
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => setNeedsAudio(!room.canPlaybackAudio));

    (async () => {
      try {
        const res = await fetch(`/api/streams/${streamId}/token`, { cache: "no-store" });
        const json = (await res.json()) as { token?: string; url?: string; error?: string };
        if (!res.ok || !json.token || !json.url) throw new Error(json.error ?? "Couldn't reach the video service");
        await room.connect(json.url, json.token);
        if (cancelled) return;
        setNeedsAudio(!room.canPlaybackAudio);
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setState("error");
      }
    })();

    return () => {
      cancelled = true;
      room.removeAllListeners();
      room.disconnect();
    };
  }, [room, streamId]);

  useEffect(() => {
    document.body.classList.toggle("theater", theater);
    return () => document.body.classList.remove("theater");
  }, [theater]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (e.key === "t") setTheater((v) => !v);
      if (e.key === "f") toggleFullscreen(screenRef.current);
      if (e.key === "Escape") setTheater(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Whoever is on stage: the local participant for the streamer, the host for viewers.
  const host: Participant | undefined = broadcaster ? room.localParticipant : [...room.remoteParticipants.values()].find((p) => p.identity === streamerId);
  const screen = host?.getTrackPublication(Track.Source.ScreenShare);
  const camera = host?.getTrackPublication(Track.Source.Camera);
  const mic = host?.getTrackPublication(Track.Source.Microphone);
  const main = screen?.track && !screen.isMuted ? screen : camera?.track && !camera.isMuted ? camera : undefined;
  const pip = main === screen && camera?.track && !camera.isMuted ? camera : undefined;
  const audio = broadcaster ? [] : [mic, host?.getTrackPublication(Track.Source.ScreenShareAudio)].filter((p) => p?.track);
  const live = !!main || !!(mic?.track && !mic.isMuted);
  const reconnecting = room.state === "reconnecting";

  if (live && liveSince.current === null) liveSince.current = broadcaster ? Date.now() : host?.joinedAt?.getTime() ?? Date.now();
  if (!live) liveSince.current = null;

  return (
    <div className="stage">
      <div className={`screen ${live ? "is-live" : ""}`} ref={screenRef}>
        {main?.track && <TrackVideo key={main.trackSid} track={main.track} mirrored={broadcaster && main === camera} contain={main === screen} />}
        {pip?.track && (
          <div className="pip">
            <TrackVideo key={pip.trackSid} track={pip.track} mirrored={broadcaster} />
          </div>
        )}
        {audio.map((p) => p?.track && <TrackAudio key={p.trackSid} track={p.track} />)}

        {live && (
          <span className="stage-badge">
            <span className="onair-signal">
              <i aria-hidden /> Live {liveSince.current && <LiveTimer since={liveSince.current} />}
            </span>
            {broadcaster && <span className="stage-self">Your preview</span>}
          </span>
        )}
        {reconnecting && <span className="stage-reconnect">Connection dropped. Reconnecting…</span>}

        {!main && (
          <div className="stage-overlay">
            {state === "error" ? (
              <>
                <h3>Video isn&apos;t available</h3>
                <p className="muted">{error}</p>
              </>
            ) : (
              <>
                <div className="radar" aria-hidden>
                  <span />
                  <span />
                  <span />
                  <i />
                </div>
                <h3>
                  {state === "connecting"
                    ? "Connecting…"
                    : broadcaster
                      ? live
                        ? "You're live with audio only"
                        : "You're off air"
                      : live
                        ? `${streamerName} is live, audio only`
                        : `Waiting for ${streamerName}`}
                </h3>
                <p className="muted">
                  {broadcaster
                    ? "Pick a source below. Viewers see it the moment you turn it on."
                    : "The video starts by itself when the stream begins. Keep this page open."}
                </p>
              </>
            )}
          </div>
        )}

        {needsAudio && !broadcaster && live && (
          <button className="btn unmute" onClick={() => room.startAudio().then(() => setNeedsAudio(false))}>
            Tap to turn on sound
          </button>
        )}
        <ReactionLayer />
        {!broadcaster && live && <ViewerControls screen={screenRef} audioKey={audio.map((a) => a?.trackSid).join()} />}
      </div>

      {broadcaster && state === "ready" && <BroadcastDesk room={room} onChange={() => bump((n) => n + 1)} />}

      <div className="stage-tools">
        <span className="stage-spacer" />
        <button type="button" className="btn ghost" onClick={() => setTheater((v) => !v)} aria-pressed={theater}>
          {theater ? <ShrinkIcon /> : <ExpandIcon />}
          {theater ? "Exit theater" : "Theater mode"}
          <kbd>T</kbd>
        </button>
        <ShareButton title={title} />
      </div>
    </div>
  );
}

function toggleFullscreen(el: HTMLElement | null) {
  if (!el) return;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else el.requestFullscreen?.().catch(() => {});
}

// Volume, mute, picture-in-picture, fullscreen and a quality badge. Fades out
// while the pointer is still, like any video player.
function ViewerControls({ screen, audioKey }: { screen: React.RefObject<HTMLDivElement | null>; audioKey: string }) {
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [idle, setIdle] = useState(false);
  const [res, setRes] = useState("");

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem("player.volume"));
      if (v >= 0 && v <= 1 && localStorage.getItem("player.volume") !== null) setVolume(v);
    } catch {}
  }, []);

  // Apply to every audio element on stage (mic + screen audio).
  useEffect(() => {
    screen.current?.querySelectorAll("audio").forEach((a) => {
      a.volume = volume;
      a.muted = muted;
    });
    try {
      localStorage.setItem("player.volume", String(volume));
    } catch {}
  }, [volume, muted, screen, audioKey]);

  // Received resolution, e.g. "1080p60", so viewers know what they're getting.
  useEffect(() => {
    let frames = 0;
    let lastFrames = 0;
    let handle = 0;
    const video = screen.current?.querySelector<HTMLVideoElement>("video.stage-video");
    const count = () => {
      frames++;
      handle = video?.requestVideoFrameCallback?.(count) ?? 0;
    };
    if (video?.requestVideoFrameCallback) handle = video.requestVideoFrameCallback(count);
    const t = setInterval(() => {
      if (!video?.videoHeight) return;
      const fps = (frames - lastFrames) / 2;
      lastFrames = frames;
      setRes(`${video.videoHeight}p${fps > 40 ? "60" : fps > 0 ? "30" : ""}`);
    }, 2000);
    return () => {
      clearInterval(t);
      if (handle) video?.cancelVideoFrameCallback?.(handle);
    };
  }, [screen, audioKey]);

  useEffect(() => {
    const el = screen.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 2500);
    };
    wake();
    el.addEventListener("pointermove", wake);
    el.addEventListener("pointerdown", wake);
    return () => {
      clearTimeout(timer);
      el.removeEventListener("pointermove", wake);
      el.removeEventListener("pointerdown", wake);
    };
  }, [screen]);

  async function pictureInPicture() {
    const video = screen.current?.querySelector<HTMLVideoElement>("video.stage-video");
    if (!video) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture().catch(() => {});
    else await video.requestPictureInPicture?.().catch(() => {});
  }

  const level = muted ? 0 : volume;
  return (
    <div className={`vc ${idle ? "idle" : ""}`}>
      <button type="button" className="vc-btn" onClick={() => setMuted((m) => !m)} aria-label={level === 0 ? "Unmute" : "Mute"}>
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M4 9v6h4l5 4V5L8 9H4Z" />
          {level === 0 ? <path d="m17 9 5 6M22 9l-5 6" /> : <path d={level > 0.5 ? "M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14" : "M16 8a5 5 0 0 1 0 8"} />}
        </svg>
      </button>
      <input
        className="vc-volume"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={level}
        onChange={(e) => {
          setVolume(Number(e.target.value));
          setMuted(false);
        }}
        aria-label="Volume"
        style={{ ["--v" as string]: `${level * 100}%` }}
      />
      <span className="vc-spacer" />
      {res && <span className="vc-res tabular">{res}</span>}
      <button type="button" className="vc-btn" onClick={pictureInPicture} aria-label="Picture in picture">
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <button type="button" className="vc-btn" onClick={() => toggleFullscreen(screen.current)} aria-label="Fullscreen (F)">
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
      </button>
    </div>
  );
}

function TrackVideo({ track, mirrored, contain }: { track: Track; mirrored?: boolean; contain?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current!;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);
  return <video ref={ref} className={`stage-video ${mirrored ? "mirrored" : ""} ${contain ? "contain" : ""}`} autoPlay playsInline muted />;
}

function TrackAudio({ track }: { track: Track }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current!;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);
  return <audio ref={ref} autoPlay />;
}
