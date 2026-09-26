import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, fetchIdentity } from "@/lib/discord";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { appUrl } from "@/lib/env";

const STATE_COOKIE = "utma_oauth_state";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = req.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || state !== expected) {
    return NextResponse.redirect(`${appUrl()}/?error=login`);
  }

  try {
    const identity = await fetchIdentity(await exchangeCode(code));
    if (!identity.isMember) {
      const res = NextResponse.redirect(`${appUrl()}/denied`);
      res.cookies.delete(STATE_COOKIE);
      return res;
    }
    const token = await createSessionToken({
      id: identity.id,
      name: identity.name,
      avatar: identity.avatar,
      isStreamer: identity.isStreamer,
    });
    const res = NextResponse.redirect(`${appUrl()}/`);
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(`${appUrl()}/?error=login`);
  }
}
