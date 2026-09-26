import Link from "next/link";
import { getSession } from "@/lib/session";
import { listStreams, type Stream } from "@/lib/db";
import { liveStatus, type LiveStatus } from "@/lib/mux";
import { euro } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();
  const { error } = await searchParams;

  if (!session) {
    return (
      <section className="hero">
        <h1>Members-only live streams</h1>
        <p className="muted">Log in with the Discord account you use in our server to see what&apos;s on.</p>
        {error && <p className="error">Login failed. Please try again.</p>}
        <a className="btn discord" href="/api/auth/login">
          Log in with Discord
        </a>
      </section>
    );
  }

  const streams = await listStreams();
  const statuses = await Promise.all(
    streams.map((s) => (s.ended_at ? Promise.resolve<LiveStatus>("disabled") : liveStatus(s.mux_live_stream_id))),
  );

  return (
    <section>
      <h1>Streams</h1>
      {streams.length === 0 ? (
        <p className="muted">Nothing scheduled yet.{session.isStreamer && <> Start one in the <Link href="/studio">Studio</Link>.</>}</p>
      ) : (
        <ul className="grid">
          {streams.map((s, i) => (
            <StreamCard key={s.id} stream={s} status={statuses[i]} />
          ))}
        </ul>
      )}
    </section>
  );
}

function StreamCard({ stream, status }: { stream: Stream; status: LiveStatus }) {
  const badge = stream.ended_at ? "Ended" : status === "active" ? "Live" : "Starting soon";
  return (
    <li className="card">
      <span className={`badge ${badge === "Live" ? "live" : ""}`}>{badge}</span>
      <h2>{stream.title}</h2>
      <p className="muted">by {stream.streamer_name}</p>
      <div className="row">
        <strong>{euro(stream.price_cents)}</strong>
        {!stream.ended_at && (
          <Link className="btn" href={`/streams/${stream.id}`}>
            Watch
          </Link>
        )}
      </div>
    </li>
  );
}
