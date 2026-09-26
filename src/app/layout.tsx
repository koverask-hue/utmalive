import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "UTMA Live",
  description: "Members-only live streams",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="dot" /> UTMA Live
          </Link>
          {session && (
            <nav className="nav">
              {session.isStreamer && <Link href="/studio">Studio</Link>}
              <span className="user">
                {session.avatar && <img src={session.avatar} alt="" width={28} height={28} />}
                {session.name}
              </span>
              <form action="/api/auth/logout" method="post">
                <button className="link">Log out</button>
              </form>
            </nav>
          )}
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
