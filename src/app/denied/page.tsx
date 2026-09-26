import { DiscordIcon } from "@/components/icons";

export const metadata = { title: "Members only" };

export default function Denied() {
  return (
    <section className="center-card">
      <h1>Members only</h1>
      <p className="muted">
        Your Discord account isn&apos;t in the UTMA server, or it doesn&apos;t have the verified role yet. Join the server,
        get verified, then log in again.
      </p>
      <div className="join-steps">
        {process.env.DISCORD_INVITE_URL && (
          <a className="btn ghost" href={process.env.DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer">
            <DiscordIcon /> Join the server
          </a>
        )}
        <a className="btn discord" href="/api/auth/login">
          <DiscordIcon /> Log in again
        </a>
      </div>
    </section>
  );
}
