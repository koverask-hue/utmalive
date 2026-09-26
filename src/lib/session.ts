import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

export const SESSION_COOKIE = "utma_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export type Session = {
  id: string; // Discord user id
  name: string;
  avatar: string | null;
  isStreamer: boolean;
};

function key() {
  return new TextEncoder().encode(env("SESSION_SECRET"));
}

export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key());
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return {
      id: String(payload.id),
      name: String(payload.name),
      avatar: payload.avatar ? String(payload.avatar) : null,
      isStreamer: payload.isStreamer === true,
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/");
  return session;
}

export async function requireStreamer(): Promise<Session> {
  const session = await requireUser();
  if (!session.isStreamer) redirect("/");
  return session;
}
