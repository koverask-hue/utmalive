import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Archivo } from "next/font/google";
import { getSession } from "@/lib/session";
import Starfield from "@/components/Starfield";
import NavLinks from "@/components/NavLinks";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import { ToastProvider } from "@/components/Toast";
import { LogoutIcon } from "@/components/icons";
import "./globals.css";

// One family: condensed heavy for headlines, normal width for text.
const archivo = Archivo({ subsets: ["latin", "latin-ext"], variable: "--font-archivo", axes: ["wdth"] });

export const metadata: Metadata = {
  title: { default: "8live", template: "%s | 8live" },
  description: "Live streams for members of the 8live Discord server.",
};

export const viewport: Viewport = { themeColor: "#07080D", colorScheme: "dark" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en" className={archivo.variable}>
      <body>
        <Starfield />
        <ToastProvider>
          <a href="#main" className="skip">Skip to content</a>
          <header className="topbar">
            <Link href="/" className="brand" aria-label="8live home">
              <Logo />
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
        </ToastProvider>
      </body>
    </html>
  );
}
