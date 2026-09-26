"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectionQuality,
  Room,
  RoomEvent,
  Track,
  VideoPreset,
  type LocalAudioTrack,
  type LocalVideoTrack,
} from "livekit-client";
import { useToast } from "./Toast";

// Quality presets for screen share. Bitrates are ceilings; LiveKit lowers them
// when the streamer's upload can't keep up.
export const QUALITY = {
  saver: { label: "Saver", detail: "720p · 30 fps", preset: new VideoPreset(1280, 720, 2_500_000, 30), upload: 4 },
  hd: { label: "HD", detail: "1080p · 30 fps", preset: new VideoPreset(1920, 1080, 5_000_000, 30), upload: 7 },
  smooth: { label: "Smooth", detail: "1080p · 60 fps", preset: new VideoPreset(1920, 1080, 8_000_000, 60), upload: 10 },
  max: { label: "Max", detail: "1440p · 60 fps", preset: new VideoPreset(2560, 1440, 12_000_000, 60), upload: 15 },
} as const;
export type QualityKey = keyof typeof QUALITY;

type Health = { width: number; height: number; fps: number; kbps: number; limited?: string } | null;

const isSafari = () => typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export default function BroadcastDesk({ room, onChange }: { room: Room; onChange: () => void }) {
  const toast = useToast();
  const lp = room.localParticipant;
  const [busy, setBusy] = useState<string | null>(null);
  const [quality, setQuality] = useState<QualityKey>("smooth");
  const [mode, setMode] = useState<"motion" | "detail">("motion");
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [health, setHealth] = useState<Health>(null);
  const [conn, setConn] = useState<ConnectionQuality>(lp.connectionQuality);
  const lastBytes = useRef<{ bytes: number; at: number } | null>(null);

  const screenOn = lp.isScreenShareEnabled;
  const camOn = lp.isCameraEnabled;
  const micOn = lp.isMicrophoneEnabled;
  const live = screenOn || camOn || micOn;

  // Remember choices between streams.
  useEffect(() => {
    try {
      const q = localStorage.getItem("desk.quality") as QualityKey | null;
      if (q && q in QUALITY) setQuality(q);
      const m = localStorage.getItem("desk.mode");
      if (m === "motion" || m === "detail") setMode(m);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("desk.quality", quality);
      localStorage.setItem("desk.mode", mode);
    } catch {}
  }, [quality, mode]);

  const loadDevices = useCallback(async () => {
    const [c, m] = await Promise.all([Room.getLocalDevices("videoinput", false), Room.getLocalDevices("audioinput", false)]).catch(() => [[], []]);
    setCams(c);
    setMics(m);
  }, []);
  useEffect(() => {
    loadDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", loadDevices);
    const onQuality = (q: ConnectionQuality, p: { identity: string }) => p.identity === lp.identity && setConn(q);
    room.on(RoomEvent.ConnectionQualityChanged, onQuality);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", loadDevices);
      room.off(RoomEvent.ConnectionQualityChanged, onQuality);
    };
  }, [room, lp, loadDevices]);

  // Outgoing video stats every 2 s: what viewers actually receive at best.
  useEffect(() => {
    if (!screenOn && !camOn) {
      setHealth(null);
      lastBytes.current = null;
      return;
    }
    const t = setInterval(async () => {
      const pub = lp.getTrackPublication(screenOn ? Track.Source.ScreenShare : Track.Source.Camera);
      const track = pub?.videoTrack as LocalVideoTrack | undefined;
      const stats = await track?.getSenderStats().catch(() => []);
      if (!stats?.length) return;
      const top = stats.reduce((a, b) => (b.frameWidth * b.frameHeight > a.frameWidth * a.frameHeight ? b : a));
      const bytes = stats.reduce((sum, s) => sum + (s.bytesSent ?? 0), 0);
      const now = Date.now();
      const prev = lastBytes.current;
      lastBytes.current = { bytes, at: now };
      const kbps = prev ? Math.max(0, Math.round(((bytes - prev.bytes) * 8) / (now - prev.at))) : 0;
      const limited = top.qualityLimitationReason && top.qualityLimitationReason !== "none" ? top.qualityLimitationReason : undefined;
      setHealth({ width: top.frameWidth, height: top.frameHeight, fps: Math.round(top.framesPerSecond || 0), kbps, limited });
    }, 2000);
    return () => clearInterval(t);
  }, [lp, screenOn, camOn]);

  // Leaving the page while live drops the stream for everyone.
  useEffect(() => {
    if (!live) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [live]);

  const fail = useCallback(
    (err: unknown) => {
      const text = err instanceof Error ? `${err.name} ${err.message}` : String(err);
      toast(
        /denied|NotAllowed/i.test(text)
          ? "Permission blocked. Allow it in your browser's site settings, then try again."
          : /NotFound|Requested device not found/i.test(text)
            ? "No device found. Plug one in or pick another."
            : "That source couldn't start. Close other apps using it and try again.",
        "error",
      );
    },
    [toast],
  );

  const toggle = useCallback(
    async (what: "screen" | "camera" | "mic") => {
      setBusy(what);
      try {
        if (what === "screen") {
          const q = QUALITY[quality].preset;
          await lp.setScreenShareEnabled(
            !screenOn,
            {
              audio: true,
              contentHint: mode,
              selfBrowserSurface: "exclude",
              systemAudio: "include",
              // Safari captures at low resolution if one is specified.
              ...(isSafari() ? {} : { resolution: q.resolution }),
            },
            {
              screenShareEncoding: q.encoding,
              videoCodec: "vp9",
              backupCodec: true,
              degradationPreference: mode === "motion" ? "maintain-framerate" : "maintain-resolution",
            },
          );
        }
        if (what === "camera") await lp.setCameraEnabled(!camOn, { resolution: QUALITY.hd.preset.resolution }, { videoCodec: "vp9", backupCodec: true });
        if (what === "mic") await lp.setMicrophoneEnabled(!micOn, { echoCancellation: true, noiseSuppression: true, autoGainControl: true });
        if (what !== "screen") loadDevices();
      } catch (err) {
        fail(err);
      }
      setBusy(null);
      onChange();
    },
    [lp, quality, mode, screenOn, camOn, micOn, fail, loadDevices, onChange],
  );

  async function switchDevice(kind: MediaDeviceKind, id: string) {
    await room.switchActiveDevice(kind, id).catch(fail);
    onChange();
  }

  async function stopAll() {
    await Promise.all([lp.setScreenShareEnabled(false), lp.setCameraEnabled(false), lp.setMicrophoneEnabled(false)]).catch(() => {});
    onChange();
    toast("You're off air. Viewers see the waiting screen.");
  }

  // S, C and M toggle sources when you're not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (e.key === "s") toggle("screen");
      if (e.key === "c") toggle("camera");
      if (e.key === "m") toggle("mic");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const micTrack = lp.getTrackPublication(Track.Source.Microphone)?.audioTrack as LocalAudioTrack | undefined;
  const target = QUALITY[quality];

  return (
    <section className="desk" aria-label="Broadcast controls">
      <header className="desk-head">
        <div className={`desk-status ${live ? "on" : ""}`}>
          <i aria-hidden />
          {live ? "On air" : "Off air"}
        </div>
        <Readout health={health} conn={conn} live={live} target={target.detail} />
        {live && (
          <button type="button" className="btn danger-ghost small" onClick={stopAll}>
            Go off air
          </button>
        )}
      </header>

      <div className="sources">
        <Source
          name="Screen"
          hint={screenOn ? "Sharing" : "A window, a tab or your whole screen"}
          on={screenOn}
          busy={busy === "screen"}
          shortcut="S"
          onClick={() => toggle("screen")}
          icon={<svg viewBox="0 0 24 24" aria-hidden><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>}
        />
        <Source
          name="Camera"
          hint={camOn ? "Shown in the corner while you share your screen" : "Face cam"}
          on={camOn}
          busy={busy === "camera"}
          shortcut="C"
          onClick={() => toggle("camera")}
          icon={<svg viewBox="0 0 24 24" aria-hidden><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></svg>}
          devices={cams}
          onDevice={(id) => switchDevice("videoinput", id)}
          active={room.getActiveDevice("videoinput")}
        />
        <Source
          name="Microphone"
          hint={micOn ? "Noise suppression on" : "Your voice"}
          on={micOn}
          busy={busy === "mic"}
          shortcut="M"
          onClick={() => toggle("mic")}
          icon={<svg viewBox="0 0 24 24" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>}
          devices={mics}
          onDevice={(id) => switchDevice("audioinput", id)}
          active={room.getActiveDevice("audioinput")}
          meter={micOn && micTrack ? <MicMeter track={micTrack} /> : null}
        />
      </div>

      <div className="desk-settings">
        <fieldset className="seg" disabled={screenOn}>
          <legend>Screen quality</legend>
          {(Object.keys(QUALITY) as QualityKey[]).map((k) => (
            <label key={k} className={quality === k ? "on" : ""}>
              <input type="radio" name="quality" value={k} checked={quality === k} onChange={() => setQuality(k)} />
              <strong>{QUALITY[k].label}</strong>
              <span>{QUALITY[k].detail}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="seg two" disabled={screenOn}>
          <legend>Optimize for</legend>
          <label className={mode === "motion" ? "on" : ""}>
            <input type="radio" name="mode" checked={mode === "motion"} onChange={() => setMode("motion")} />
            <strong>Motion</strong>
            <span>Games, sports. Keeps fps up</span>
          </label>
          <label className={mode === "detail" ? "on" : ""}>
            <input type="radio" name="mode" checked={mode === "detail"} onChange={() => setMode("detail")} />
            <strong>Detail</strong>
            <span>Text, slides. Keeps it sharp</span>
          </label>
        </fieldset>
        <p className="desk-note">
          {screenOn
            ? "Stop sharing to change quality."
            : `${target.label} needs about ${target.upload} Mbps upload. If yours is lower, the picture drops quality instead of freezing.`}
        </p>
      </div>
    </section>
  );
}

function Source(props: {
  name: string;
  hint: string;
  on: boolean;
  busy: boolean;
  shortcut: string;
  onClick: () => void;
  icon: React.ReactNode;
  devices?: MediaDeviceInfo[];
  onDevice?: (id: string) => void;
  active?: string;
  meter?: React.ReactNode;
}) {
  const labelled = props.devices?.filter((d) => d.label) ?? [];
  return (
    <div className={`source ${props.on ? "on" : ""}`}>
      <button type="button" className="source-main" onClick={props.onClick} disabled={props.busy} aria-pressed={props.on}>
        <span className="source-icon">{props.busy ? <span className="spinner" /> : props.icon}</span>
        <span className="source-text">
          <strong>{props.name}</strong>
          <span>{props.hint}</span>
        </span>
        <kbd>{props.shortcut}</kbd>
      </button>
      {props.meter}
      {labelled.length > 1 && (
        <select className="source-device" value={props.active ?? ""} onChange={(e) => props.onDevice?.(e.target.value)} aria-label={`${props.name} device`}>
          {labelled.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function Readout({ health, conn, live, target }: { health: Health; conn: ConnectionQuality; live: boolean; target: string }) {
  const connText = { excellent: "Excellent", good: "Good", poor: "Poor", lost: "Reconnecting", unknown: "Checking" }[conn] ?? "Checking";
  const warn = health?.limited === "bandwidth" ? "Upload is limiting quality" : health?.limited === "cpu" ? "Computer is busy, quality lowered" : null;
  return (
    <dl className="readout">
      <div>
        <dt>Sending</dt>
        <dd className="tabular">{health && health.height ? `${health.height}p · ${health.fps} fps` : live ? "Audio only" : target}</dd>
      </div>
      <div>
        <dt>Bitrate</dt>
        <dd className="tabular">{health?.kbps ? `${(health.kbps / 1000).toFixed(1)} Mbps` : "–"}</dd>
      </div>
      <div>
        <dt>Connection</dt>
        <dd className={`conn ${conn}`}>
          <span className="bars" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          {connText}
        </dd>
      </div>
      {warn && <p className="readout-warn" role="status">{warn}</p>}
    </dl>
  );
}

// Live input level, so the streamer can see the mic is actually picking them up.
function MicMeter({ track }: { track: LocalAudioTrack }) {
  const bar = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const stream = new MediaStream([track.mediaStreamTrack]);
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, (peak / 128) * 2.2)})`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      ctx.close();
    };
  }, [track]);
  return (
    <span className="meter" aria-hidden>
      <span ref={bar} />
    </span>
  );
}
