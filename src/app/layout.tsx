import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Unbounded, Instrument_Sans } from "next/font/google";
import { getSession } from "@/lib/session";
import Starfield from "@/components/Starfield";
import NavLinks from "@/components/NavLinks";
import Avatar from "@/components/Avatar";
import { ToastProvider } from "@/components/Toast";
import { LogoutIcon } from "@/components/icons";
import "./globals.css";

const display = Unbounded({ subsets: ["latin"], variable: "--font-display", weight: ["400", "600", "800"] });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: { default: "8live", template: "%s | 8live" },
  description: "Live streams for members of the 8live Discord server.",
};

export const viewport: Viewport = { themeColor: "#060816", colorScheme: "dark" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <Starfield />
        <ToastProvider>
          <a href="#main" className="skip">Skip to content</a>
          <header className="topbar">
            <Link href="/" className="brand" aria-label="8live home">
              <span className="brand-mark" aria-hidden />
              8<span className="brand-live">live</span>
            </Link>
            {session && (
              <nav className="nav" aria-label="Main">
                <NavLinks isStreamer={session.isStreamer} />
                <span className="me">
                  <Avatar src={session.avatar} name={session.name} />
                  <span className="me-name">{session.name}</span>
                  {session.isStreamer && <span className="pill small">Streamer</span>}
                </span>
                <form action="/api/auth/logout" method="post">
                  <button className="icon-btn" aria-label="Log out" title="Log out">
                    <LogoutIcon />
                  </button>
                </form>
              </nav>
            )}
          </header>
          <main id="main" className="container">{children}</main>
          <footer className="footer">For members of the 8live Discord server.</footer>
        </ToastProvider>
      </body>
    </html>
  );
}
