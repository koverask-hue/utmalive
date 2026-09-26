import Link from "next/link";
import type { Metadata } from "next";
import { requireStreamer } from "@/lib/session";
import { listStreamsBy, salesByStream } from "@/lib/db";
import { MUX_RTMP_URL, liveStatus, streamKey } from "@/lib/mux";
import { euro, timeAgo } from "@/lib/format";
import PricePicker from "@/components/PricePicker";
import CopyField from "@/components/CopyField";
import ConfirmEnd from "@/components/ConfirmEnd";
import SubmitButton from "@/components/SubmitButton";
import { createStream, endStream } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Studio" };

export default async function Studio({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await requireStreamer();
  const { error } = await searchParams;
  let streams, sales, details;
  try {
    [streams, sales] = await Promise.all([listStreamsBy(session.id), salesByStream(session.id)]);
    details = await Promise.all(
      streams.filter((s) => !s.ended_at).map(async (s) => ({ status: await liveStatus(s.mux_live_stream_id), key: await streamKey(s.mux_live_stream_id) })),
    );
  } catch (err) {
    console.error(err);
    return (
      <section className="center-card">
        <h1>Studio can&apos;t load</h1>
        <p className="setup-error">{err instanceof Error ? err.message : String(err)}</p>
        <p className="muted">Send this message to whoever set up the site.</p>
      </section>
    );
  }
  const open = streams.filter((s) => !s.ended_at);
  const past = streams.filter((s) => s.ended_at);
  const totals = [...sales.values()].reduce((a, s) => ({ t: a.t + s.tickets, r: a.r + s.revenue_cents }), { t: 0, r: 0 });
  const liveNow = details.filter((d) => d.status === "active").length;
  // DEFAULT_PRICE_CENTS is in cents (200 = €2); anything unusable falls back to €2.
  const configured = Number(process.env.DEFAULT_PRICE_CENTS) / 100;
  const defaultPrice = Number.isFinite(configured) && configured >= 0.5 ? configured : 2;

  return (
    <section className="studio">
      <div className="page-head">
        <div>
          <h1>Studio</h1>
          <p className="muted">Create a stream, paste the key into OBS, and go live.</p>
        </div>
      </div>

      {error && (
        <p className="setup-error" role="alert">
          Couldn&apos;t create the stream: {error}
        </p>
      )}

      <dl className="stats">
        <div>
          <dt>Tickets sold</dt>
          <dd className="tabular">{totals.t}</dd>
        </div>
        <div>
          <dt>Ticket revenue</dt>
          <dd className="tabular gold-text">{euro(totals.r)}</dd>
          <small>Before payment fees</small>
        </div>
        <div>
          <dt>Live now</dt>
          <dd className="tabular">{liveNow}</dd>
        </div>
      </dl>

      <form action={createStream} className="panel">
        <h2>New stream</h2>
        <PricePicker defaultPrice={defaultPrice} streamer={session.name} />
        <SubmitButton pending="Creating stream…">Create stream</SubmitButton>
      </form>

      <h2 className="section-title">Open streams</h2>
      {open.length === 0 && <p className="empty">No open streams. Create one above to get your OBS key.</p>}
      <div className="stack">
        {open.map((s, i) => {
          const live = details[i].status === "active";
          const sold = sales.get(s.id);
          return (
            <article key={s.id} className={`panel stream-panel ${live ? "is-live" : ""}`}>
              <header className="stream-panel-head">
                <div>
                  <span className={`state ${live ? "live" : "soon"}`}>
                    <i aria-hidden />
                    {live ? "Live" : "Waiting for OBS"}
                  </span>
                  <h3>{s.title}</h3>
                  <p className="muted">
                    {euro(s.price_cents)} per ticket. {sold?.tickets ?? 0} sold, {euro(sold?.revenue_cents ?? 0)} so far.
                  </p>
                </div>
                <Link href={`/streams/${s.id}`} className="btn ghost">Open watch page</Link>
              </header>
              <div className="obs">
                <ol className="obs-steps">
                  <li>In OBS, open Settings, then Stream.</li>
                  <li>Set Service to Custom.</li>
                  <li>Paste the server and stream key below, then Start Streaming.</li>
                </ol>
                <div className="obs-fields">
                  <CopyField label="Server" value={MUX_RTMP_URL} />
                  <CopyField label="Stream key" value={details[i].key} secret />
                </div>
              </div>
              <footer className="stream-panel-foot">
                <small className="muted">Keep the key private. Anyone with it can broadcast on this stream.</small>
                <ConfirmEnd id={s.id} title={s.title} action={endStream} />
              </footer>
            </article>
          );
        })}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="section-title">Past streams</h2>
          <table className="history">
            <thead>
              <tr>
                <th>Stream</th>
                <th>Ended</th>
                <th className="num">Tickets</th>
                <th className="num">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {past.map((s) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td className="muted">{timeAgo(s.ended_at!)}</td>
                  <td className="num tabular">{sales.get(s.id)?.tickets ?? 0}</td>
                  <td className="num tabular">{euro(sales.get(s.id)?.revenue_cents ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
