import { NextRequest, NextResponse } from "next/server";
import { streamAccess } from "@/lib/access";
import { chatSince, postChat } from "@/lib/db";

import { REACTIONS } from "@/lib/reactions";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const access = await streamAccess((await params).id);
  if (!access) return NextResponse.json({ error: "No ticket for this stream" }, { status: 403 });
  const after = req.nextUrl.searchParams.get("after");
  const rows = await chatSince(access.stream.id, after && /^\d+$/.test(after) ? after : null);
  return NextResponse.json({
    messages: rows.map((r) => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar,
      kind: r.kind,
      body: r.body,
      at: r.created_at,
      streamer: r.discord_id === access.stream.streamer_id,
      mine: r.discord_id === access.session.id,
    })),
  });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const access = await streamAccess((await params).id);
  if (!access) return NextResponse.json({ error: "No ticket for this stream" }, { status: 403 });
  if (access.stream.ended_at) return NextResponse.json({ error: "This stream has ended" }, { status: 409 });

  const input = (await req.json().catch(() => ({}))) as { body?: unknown; react?: unknown };
  let kind: "msg" | "react";
  let body: string;
  if (typeof input.react === "string" && REACTIONS.includes(input.react)) {
    kind = "react";
    body = input.react;
  } else if (typeof input.body === "string" && input.body.trim()) {
    kind = "msg";
    body = input.body.trim().replace(/\s+/g, " ").slice(0, 300);
  } else {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const id = await postChat({
    streamId: access.stream.id,
    discordId: access.session.id,
    name: access.session.name,
    avatar: access.session.avatar,
    kind,
    body,
  });
  if (!id) return NextResponse.json({ error: "Slow down a little" }, { status: 429 });
  return NextResponse.json({ id });
}
