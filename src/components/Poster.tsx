import { DiscordIcon } from "./icons";
import { price } from "@/lib/format";

export type PosterStream = { id: string; title: string; streamer: string; avatar: string | null; priceCents: number; live: boolean };

// The logged-out start page: the stream's name, one line, one button.
export default function Poster({ featured, invite, error }: { featured: PosterStream | null; others?: PosterStream[]; invite?: string; error?: boolean }) {
  return (
    <section className="poster">
      {featured?.live && (
        <p className="poster-live">
          <i aria-hidden /> On air
        </p>
      )}
      <h1 className="poster-title">{featured ? featured.title : "8live"}</h1>
      <p className="poster-line">
        {featured
          ? `${featured.streamer}, ${featured.priceCents === 0 ? "free" : `${price(featured.priceCents)} ticket`}`
          : "Live streams for the 8live Discord."}
      </p>
      {error && <p className="error" role="alert">Discord login didn&apos;t finish. Try again.</p>}
      <a className="btn discord big" href="/api/auth/login">
        <DiscordIcon /> Log in with Discord
      </a>
      {invite && (
        <a className="poster-join" href={invite} target="_blank" rel="noopener noreferrer">
          Not in the server? Join it first
        </a>
      )}
    </section>
  );
}
