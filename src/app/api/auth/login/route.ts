import { NextResponse } from "next/server";
import { authorizeUrl } from "@/lib/discord";

const STATE_COOKIE = "utma_oauth_state";

export async function GET() {
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
