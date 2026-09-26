import Avatar from "./Avatar";
import { Mark } from "./Logo";
import { DiscordIcon } from "./icons";
import { price } from "@/lib/format";

export type PosterStream = { id: string; title: string; streamer: string; avatar: string | null; priceCents: number; live: boolean };

// The logged-out start page: the actual stream, set like an event poster.
export default function Poster({ featured, others, invite, error }: { featured: PosterStream | null; others: PosterStream[]; invite?: string; error?: boolean }) {
  return (
    <section className="poster">
      <div className="poster-top">
        <Mark size={44} animated />
        {featured && (
          <span className={`poster-status ${featured.live ? "live" : ""}`}>
            <i aria-hidden />
            {featured.live ? "On air now" : "Next up"}
          </span>
        )}
      </div>

      {featured ? (
        <>
          <h1 className="poster-title">{featured.title}</h1>
          <div className="poster-meta">
            <span className="poster-host">
              <Avatar src={featured.avatar} name={featured.streamer} size={30} />
              <span>
                <small>Streamed by</small>
                {featured.streamer}
              </span>
            </span>
            <span className="poster-price">
              <small>Ticket</small>
              {price(featured.priceCents)}
            </span>
          </div>
        </>
      ) : (
        <h1 className="poster-title quiet">Nothing on air yet.</h1>
      )}

      {error && <p className="error" role="alert">Discord login didn&apos;t finish. Try again, and approve the request on Discord&apos;s page.</p>}

      <div className="poster-actions">
        <a className="btn discord big" href="/api/auth/login">
          <DiscordIcon /> {featured ? "Log in with Discord to watch" : "Log in with Discord"}
        </a>
        {invite && (
          <a className="btn ghost big" href={invite} target="_blank" rel="noopener noreferrer">
            Not in the server yet? Join it
          </a>
        )}
      </div>
      <p className="poster-how">
        For members of the 8live Discord. Log in with your Discord account, get a ticket on the stream&apos;s page, and it plays right here.
      </p>

      {others.length > 0 && (
        <div className="poster-more">
          <h2>Also on the schedule</h2>
          <ul>
            {others.map((s) => (
              <li key={s.id}>
                <span className={`state ${s.live ? "live" : "soon"}`}>
                  <i aria-hidden />
                  {s.live ? "Live" : "Soon"}
                </span>
                <span className="poster-more-title">{s.title}</span>
                <span className="muted">{s.streamer}</span>
                <span className="price">{price(s.priceCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
