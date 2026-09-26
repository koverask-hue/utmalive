import Mux from "@mux/mux-node";
import { env } from "./env";

export const MUX_RTMP_URL = "rtmps://global-live.mux.com:443/app";

let client: Mux | null = null;
export function mux() {
  client ??= new Mux({
    tokenId: env("MUX_TOKEN_ID"),
    tokenSecret: env("MUX_TOKEN_SECRET"),
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
