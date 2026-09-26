import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { env } from "./env";

// Video runs on LiveKit (WebRTC). Each stream is a LiveKit room named after the
// stream id. Only the stream's owner may publish; ticket holders get subscribe-only
// tokens from our server, so the paywall can't be bypassed with a shared link.

export function liveUrl() {
  return env("LIVEKIT_URL");
}

let rooms: RoomServiceClient | null = null;
function roomService() {
  rooms ??= new RoomServiceClient(liveUrl().replace(/^ws/, "http"), env("LIVEKIT_API_KEY"), env("LIVEKIT_API_SECRET"));
  return rooms;
}

export async function joinToken(opts: { room: string; identity: string; name: string; canPublish: boolean }) {
  const at = new AccessToken(env("LIVEKIT_API_KEY"), env("LIVEKIT_API_SECRET"), {
    identity: opts.identity,
    name: opts.name,
    ttl: "6h",
  });
  at.addGrant({
    room: opts.room,
    roomJoin: true,
    canSubscribe: true,
    canPublish: opts.canPublish,
    canPublishData: false,
  });
  return at.toJwt();
}

export type LiveStatus = "active" | "idle";

// Live = the streamer is in the room and publishing at least one track.
export async function liveInfo(room: string, streamerId: string): Promise<{ status: LiveStatus; startedAt: number | null; viewers: number }> {
  try {
    const people = await roomService().listParticipants(room);
    const host = people.find((p) => p.identity === streamerId && p.tracks.length > 0);
    return {
      status: host ? "active" : "idle",
      startedAt: host ? Number(host.joinedAtMs) : null,
      viewers: people.filter((p) => p.identity !== streamerId).length,
    };
  } catch {
    // The room doesn't exist until someone joins.
    return { status: "idle", startedAt: null, viewers: 0 };
  }
}

export async function closeRoom(room: string) {
  await roomService().deleteRoom(room).catch(() => {});
}
