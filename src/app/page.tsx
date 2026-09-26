import Link from "next/link";
import { getSession } from "@/lib/session";
import { countOpenStreams, listStreams, ticketStreamIds } from "@/lib/db";
import { liveInfo, type LiveStatus } from "@/lib/live";
import { euro, timeAgo } from "@/lib/format";
import StreamBrowser, { type StreamItem } from "@/components/StreamBrowser";
import Avatar from "@/components/Avatar";
import { DiscordIcon, PlusIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();
  const { error } = await searchParams;
  if (!session) return <Landing error={!!error} />;

  const [streams, owned] = await Promise.all([listStreams(), ticketStreamIds(session.id)]);
  const statuses = await Promise.all(
    streams.map((s) => (s.ended_at ? Promise.resolve<LiveStatus>("idle") : liveInfo(s.id, s.streamer_id).then((i) => i.status))),
  );

  const items: StreamItem[] = streams.map((s, i) => {
    const state = s.ended_at ? "ended" : statuses[i] === "active" ? "live" : "soon";
    return {
      id: s.id,
      title: s.title,
      streamer: s.streamer_name,
      avatar: s.streamer_avatar,
      priceCents: s.price_cents,
      state,
      when: state === "ended" ? `ended ${timeAgo(s.ended_at!)}` : `created ${timeAgo(s.created_at)}`,
      hasTicket: owned.has(s.id),
      isMine: s.streamer_id === session.id,
    };
  });
  const live = items.filter((i) => i.state === "live");

  return (
    <section className="home">
      <div className="page-head">
        <div>
          <h1>Streams</h1>
          <p className="muted">
            {live.length ? `${live.length} on air right now.` : "Nobody is live right now. Streams show up here the moment they start."}
          </p>
        </div>
        {session.isStreamer && (
          <Link href="/studio" className="btn">
            <PlusIcon /> New stream
          </Link>
        )}
      </div>

      {live.length > 0 && (
        <div className="onair">
          {live.slice(0, 2).map((s) => (
            <Link key={s.id} href={`/streams/${s.id}`} className="onair-card">
              <span className="onair-signal">
                <i aria-hidden /> On air
              </span>
              <span className="onair-title">{s.title}</span>
              <span className="onair-foot">
                <span className="row-by">
                  <Avatar src={s.avatar} name={s.streamer} size={24} />
                  {s.streamer}
                </span>
                <span className="btn small">{s.hasTicket || s.isMine || s.priceCents === 0 ? "Watch now" : `Get ticket, ${euro(s.priceCents)}`}</span>
              </span>
            </Link>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty-state">
          <p>No streams yet.</p>
          {session.isStreamer ? (
            <Link href="/studio" className="btn">Start the first one</Link>
          ) : (
            <p className="muted">When a streamer goes live, it appears here.</p>
          )}
        </div>
      ) : (
        <StreamBrowser items={items} />
      )}
    </section>
  );
}

async function Landing({ error }: { error: boolean }) {
  const open = await countOpenStreams().catch(() => 0);
  return (
    <section className="landing">
      <div className="landing-copy">
        {open > 0 && (
          <span className="onair-signal">
            <i aria-hidden /> {open === 1 ? "1 stream open now" : `${open} streams open now`}
          </span>
        )}
        <h1 className="display">Live from the server.</h1>
        <p className="lede">Streams for members of the UTMA Discord. Log in with the account you use there, grab a ticket, and watch.</p>
        {error && <p className="error" role="alert">Discord login didn&apos;t finish. Try again, and approve the request on Discord&apos;s page.</p>}
        <a className="btn discord big" href="/api/auth/login">
          <DiscordIcon /> Log in with Discord
        </a>
      </div>
      <ol className="steps">
        <li>
          <strong>Log in with Discord</strong>
          <span>We check that you&apos;re in the server. Nothing is posted and we never see your password.</span>
        </li>
        <li>
          <strong>Get a ticket</strong>
          <span>Each stream has its own price, usually €2. Pay once and it&apos;s yours on any device.</span>
        </li>
        <li>
          <strong>Watch live</strong>
          <span>The player opens as soon as the streamer goes live.</span>
        </li>
      </ol>
    </section>
  );
}
