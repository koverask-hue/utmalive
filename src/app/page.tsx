import Link from "next/link";
import { getSession } from "@/lib/session";
import { listStreams, ticketStreamIds } from "@/lib/db";
import { liveInfo, type LiveStatus } from "@/lib/live";
import { euro, timeAgo } from "@/lib/format";
import StreamBrowser, { type StreamItem } from "@/components/StreamBrowser";
import Avatar from "@/components/Avatar";
import { PlusIcon } from "@/components/icons";
import Poster, { type PosterStream } from "@/components/Poster";

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
  const open = (await listStreams().catch(() => [])).filter((s) => !s.ended_at);
  const live = await Promise.all(open.map((s) => liveInfo(s.id, s.streamer_id).then((i) => i.status === "active").catch(() => false)));
  const items: PosterStream[] = open.map((s, i) => ({
    id: s.id,
    title: s.title,
    streamer: s.streamer_name,
    avatar: s.streamer_avatar,
    priceCents: s.price_cents,
    live: live[i],
  }));
  // Live streams first, then the newest; the list is already newest first.
  items.sort((a, b) => Number(b.live) - Number(a.live));
  return <Poster featured={items[0] ?? null} others={items.slice(1, 4)} invite={process.env.DISCORD_INVITE_URL} error={error} />;
}
