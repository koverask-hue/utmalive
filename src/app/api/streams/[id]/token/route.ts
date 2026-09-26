import { NextResponse } from "next/server";
import { streamAccess } from "@/lib/access";
import { joinToken, liveUrl } from "@/lib/live";

// A LiveKit token for this stream: publish rights for its streamer, watch-only for ticket holders.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await streamAccess((await params).id);
  if (!access) return NextResponse.json({ error: "No ticket for this stream" }, { status: 403 });
  if (access.stream.ended_at) return NextResponse.json({ error: "This stream has ended" }, { status: 410 });
  try {
    const token = await joinToken({
      room: access.stream.id,
      identity: access.session.id,
      name: access.session.name,
      canPublish: access.stream.streamer_id === access.session.id,
    });
    return NextResponse.json({ token, url: liveUrl() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Video service unavailable" }, { status: 500 });
  }
}
