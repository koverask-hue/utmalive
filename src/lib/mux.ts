import Mux from "@mux/mux-node";
import { env, envAny } from "./env";

export const MUX_RTMP_URL = "rtmps://global-live.mux.com:443/app";

let client: Mux | null = null;
export function mux() {
  client ??= new Mux({
    tokenId: envAny("UTMALIVE_TOKEN_ID", "MUX_TOKEN_ID"),
    tokenSecret: envAny("UTMALIVE_TOKEN_SECRET", "MUX_TOKEN_SECRET"),
    jwtSigningKey: env("MUX_SIGNING_KEY_ID"),
    jwtPrivateKey: env("MUX_SIGNING_KEY_PRIVATE"),
  });
  return client;
}

export async function createLiveStream() {
  const live = await mux().video.liveStreams.create({
    // Signed: a playback id is useless without a token we only hand to ticket holders.
    playback_policies: ["signed"],
    new_asset_settings: { playback_policies: ["signed"] },
    latency_mode: "low",
    reconnect_window: 60,
  });
  const playbackId = live.playback_ids?.[0]?.id;
  if (!playbackId) throw new Error("Mux did not return a playback id");
  return { liveStreamId: live.id, playbackId };
}

export type LiveStatus = "active" | "idle" | "disabled" | "unknown";

export async function liveStatus(liveStreamId: string): Promise<LiveStatus> {
  try {
    return (await mux().video.liveStreams.retrieve(liveStreamId)).status;
  } catch {
    return "unknown";
  }
}

// Status plus when the current broadcast began (the recording asset starts with it).
export async function liveInfo(liveStreamId: string): Promise<{ status: LiveStatus; startedAt: number | null }> {
  try {
    const live = await mux().video.liveStreams.retrieve(liveStreamId);
    let startedAt: number | null = null;
    if (live.status === "active" && live.active_asset_id) {
      const asset = await mux().video.assets.retrieve(live.active_asset_id).catch(() => null);
      if (asset?.created_at) startedAt = Number(asset.created_at) * 1000;
    }
    return { status: live.status, startedAt };
  } catch {
    return { status: "unknown", startedAt: null };
  }
}

export async function streamKey(liveStreamId: string): Promise<string> {
  return (await mux().video.liveStreams.retrieve(liveStreamId)).stream_key ?? "";
}

export async function endLiveStream(liveStreamId: string) {
  // complete() ends the broadcast for viewers; disable() refuses any reconnect.
  await mux().video.liveStreams.complete(liveStreamId).catch(() => {});
  await mux().video.liveStreams.disable(liveStreamId);
}

export async function playbackTokens(playbackId: string) {
  const [playback, thumbnail] = await Promise.all([
    mux().jwt.signPlaybackId(playbackId, { type: "video", expiration: "4h" }),
    mux().jwt.signPlaybackId(playbackId, { type: "thumbnail", expiration: "4h" }),
  ]);
  return { playback, thumbnail };
}

// Concurrent viewers from Mux Data. Null when there's no data yet.
export async function viewerCount(liveStreamId: string): Promise<number | null> {
  try {
    const token = await mux().jwt.signViewerCounts(liveStreamId, { type: "live_stream", expiration: "5m" });
    const res = await fetch(`https://stats.mux.com/counts?token=${token}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { viewers?: number }[] };
    return json.data?.[0]?.viewers ?? null;
  } catch {
    return null;
  }
}
