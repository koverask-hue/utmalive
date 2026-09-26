import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { appUrl } from "@/lib/env";

// POST only, so a link or image on another site can't log people out.
export async function POST() {
  const res = NextResponse.redirect(`${appUrl()}/`, 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
