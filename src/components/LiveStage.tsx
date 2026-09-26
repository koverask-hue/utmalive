"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, type Participant } from "livekit-client";
import ReactionLayer from "./ReactionLayer";
import ShareButton from "./ShareButton";
import LiveTimer from "./LiveTimer";
import { useToast } from "./Toast";
import { ExpandIcon, ShrinkIcon, SignalIcon } from "./icons";

type Props = { streamId: string; title: string; streamerId: string; streamerName: string; broadcaster: boolean };

// Plays the stream for ticket holders; for the streamer it is also the control desk.
export default function LiveStage({ streamId, title, streamerId, streamerName, broadcaster }: Props) {
  const toast = useToast();
  const [room] = useState(() => new Room({ adaptiveStream: true, dynacast: true }));
  const [state, setState] = useState<"connecting" | "ready" | "error">("connecting");
  const [error, setError] = useState("");
  const [, bump] = useState(0);
  const [needsAudio, setNeedsAudio] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [theater, setTheater] = useState(false);
  const liveSince = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const rerender = () => bump((n) => n + 1);
    const events = [
      RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed, RoomEvent.TrackMuted, RoomEvent.TrackUnmuted,
      RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected, RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished, RoomEvent.Reconnected, RoomEvent.TrackPublished, RoomEvent.TrackUnpublished,
    ];
    events.forEach((e) => room.on(e, rerender));
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => setNeedsAudio(!room.canPlaybackAudio));
    room.on(RoomEvent.Disconnected, () => !cancelled && rerender());

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
      events.forEach((e) => room.off(e, rerender));
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
      if (e.key === "t" && !e.metaKey && !e.ctrlKey && !["INPUT", "TEXTAREA"].includes(el.tagName)) setTheater((v) => !v);
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

  if (live && liveSince.current === null) liveSince.current = broadcaster ? Date.now() : host?.joinedAt?.getTime() ?? Date.now();
  if (!live) liveSince.current = null;

  const toggle = useCallback(
    async (what: "screen" | "camera" | "mic") => {
      setBusy(what);
      const lp = room.localParticipant;
      try {
        if (what === "screen") await lp.setScreenShareEnabled(!lp.isScreenShareEnabled, { audio: true, contentHint: "motion", selfBrowserSurface: "exclude" });
        if (what === "camera") await lp.setCameraEnabled(!lp.isCameraEnabled);
        if (what === "mic") await lp.setMicrophoneEnabled(!lp.isMicrophoneEnabled);
      } catch (err) {
        const denied = err instanceof Error && /denied|NotAllowed/i.test(err.name + err.message);
        toast(denied ? "Permission blocked. Allow it in your browser's site settings." : "That device couldn't start.", "error");
      }
      setBusy(null);
      bump((n) => n + 1);
    },
    [room, toast],
  );

  async function stopAll() {
    const lp = room.localParticipant;
    await Promise.all([lp.setScreenShareEnabled(false), lp.setCameraEnabled(false), lp.setMicrophoneEnabled(false)]).catch(() => {});
    bump((n) => n + 1);
    toast("You're off air. Viewers see the waiting screen.");
  }

  return (
    <div className="stage">
      <div className="screen">
        {main?.track && <TrackVideo track={main.track} mirrored={broadcaster && main === camera} contain={main === screen} />}
        {pip?.track && (
          <div className="pip">
            <TrackVideo track={pip.track} mirrored={broadcaster} />
          </div>
        )}
        {audio.map((p) => p?.track && <TrackAudio key={p.trackSid} track={p.track} />)}

        {live && (
          <span className="stage-badge">
            <span className="onair-signal">
              <i aria-hidden /> Live {liveSince.current && <LiveTimer since={liveSince.current} />}
            </span>
          </span>
        )}

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
                <h3>{state === "connecting" ? "Connecting…" : broadcaster ? (live ? "You're live with audio only" : "You're not live yet") : `Waiting for ${streamerName}`}</h3>
                <p className="muted">
                  {broadcaster
                    ? "Share your screen or turn on your camera below. Viewers see you the moment you do."
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
      </div>

      <div className="stage-tools">
        {broadcaster && state === "ready" && (
          <div className="desk" role="group" aria-label="Broadcast controls">
            <DeskButton on={!!screen?.track} busy={busy === "screen"} onClick={() => toggle("screen")} label="Share screen" />
            <DeskButton on={!!camera?.track && !camera.isMuted} busy={busy === "camera"} onClick={() => toggle("camera")} label="Camera" />
            <DeskButton on={!!mic?.track && !mic.isMuted} busy={busy === "mic"} onClick={() => toggle("mic")} label="Microphone" />
            {live && (
              <button type="button" className="btn danger-ghost" onClick={stopAll}>
                Go off air
              </button>
            )}
          </div>
        )}
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

function DeskButton({ on, busy, onClick, label }: { on: boolean; busy: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" className={`btn desk-btn ${on ? "on" : "ghost"}`} onClick={onClick} disabled={busy} aria-pressed={on}>
      {busy ? <span className="spinner" aria-hidden /> : <SignalIcon />}
      {on ? `Stop ${label.toLowerCase()}` : label}
    </button>
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
