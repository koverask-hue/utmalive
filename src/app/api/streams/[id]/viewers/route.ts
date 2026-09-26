import { NextResponse } from "next/server";
import { streamAccess } from "@/lib/access";
import { liveInfo } from "@/lib/live";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await streamAccess((await params).id);
  if (!access) return NextResponse.json({ viewers: null }, { status: 403 });
  const info = await liveInfo(access.stream.id, access.stream.streamer_id);
  return NextResponse.json({ viewers: info.status === "active" ? info.viewers : null, live: info.status === "active" });
}
