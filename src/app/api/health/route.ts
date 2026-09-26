import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Which settings this deployment can see: names and yes/no only, never values.
const NAMES = [
  "SESSION_SECRET", "APP_URL", "DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "DISCORD_GUILD_ID",
  "DISCORD_STREAMER_ROLE_ID", "DISCORD_MEMBER_ROLE_ID", "UTMALIVE_URL", "UTMALIVE_DATABASE_URL", "DATABASE_URL",
  "LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
];

export async function GET() {
  const session = await getSession();
  if (!session?.isStreamer) return NextResponse.json({ error: "Log in as a streamer first" }, { status: 403 });
  const vars = Object.fromEntries(NAMES.map((n) => [n, process.env[n] ? "✅ set" : "❌ missing or empty"]));
  const muxLike = Object.keys(process.env).filter((k) => /LIVEKIT|UTMALIVE|DATABASE/i.test(k)).sort();
  return NextResponse.json(
    { deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local", environment: process.env.VERCEL_ENV ?? "local", vars, relatedNames: muxLike },
    { headers: { "Cache-Control": "no-store" } },
  );
}
