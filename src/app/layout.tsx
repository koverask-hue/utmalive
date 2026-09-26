import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Unbounded, Instrument_Sans } from "next/font/google";
import { getSession } from "@/lib/session";
import Starfield from "@/components/Starfield";
import NavLinks from "@/components/NavLinks";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import { ToastProvider } from "@/components/Toast";
import { LogoutIcon } from "@/components/icons";
import "./globals.css";

const display = Unbounded({ subsets: ["latin"], variable: "--font-display", weight: ["400", "600", "800"] });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: { default: "8live", template: "%s | 8live" },
  description: "Live streams for members of the 8live Discord server.",
};

export const viewport: Viewport = { themeColor: "#0c0506", colorScheme: "dark" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <Starfield />
        <ToastProvider>
          <a href="#main" className="skip">Skip to content</a>
          <header className="topbar">
            <div className="topbar-inner">
              <Link href="/" className="brand" aria-label="8live home">
                <Logo height={28} />
              </Link>
              {session && (
                <nav className="nav" aria-label="Main">
                  <div className="navlinks">
                    <NavLinks isStreamer={session.isStreamer} />
                  </div>
                  <div className="me">
                    <Avatar src={session.avatar} name={session.name} size={28} />
                    <span className="me-text">
                      <span className="me-name">{session.name}</span>
                      {session.isStreamer && <span className="me-role">Streamer</span>}
                    </span>
                    <form action="/api/auth/logout" method="post">
                      <button className="icon-btn" aria-label="Log out" title="Log out">
                        <LogoutIcon />
                      </button>
                    </form>
                  </div>
                </nav>
              )}
            </div>
          </header>
          <main id="main" className="container">{children}</main>
          <footer className="footer">For members of the 8live Discord server.</footer>
        </ToastProvider>
      </body>
    </html>
  );
}
