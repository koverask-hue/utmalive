import { NextResponse } from "next/server";
import { streamAccess } from "@/lib/access";
import { viewerCount } from "@/lib/mux";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await streamAccess((await params).id);
  if (!access) return NextResponse.json({ viewers: null }, { status: 403 });
  return NextResponse.json({ viewers: await viewerCount(access.stream.mux_live_stream_id) });
}
