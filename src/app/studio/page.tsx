import Link from "next/link";
import { requireStreamer } from "@/lib/session";
import { listStreamsBy } from "@/lib/db";
import { MUX_RTMP_URL, liveStatus, streamKey } from "@/lib/mux";
import { euro } from "@/lib/format";
import { createStream, endStream } from "./actions";

export const dynamic = "force-dynamic";

export default async function Studio() {
  const session = await requireStreamer();
  const streams = await listStreamsBy(session.id);
  const active = streams.filter((s) => !s.ended_at);
  const details = await Promise.all(
    active.map(async (s) => ({
      status: await liveStatus(s.mux_live_stream_id),
      key: await streamKey(s.mux_live_stream_id),
    })),
  );
  const defaultPrice = (Number(process.env.DEFAULT_PRICE_CENTS ?? 200) / 100).toFixed(2);

  return (
    <section>
      <h1>Studio</h1>

      <form action={createStream} className="card form">
        <h2>New stream</h2>
        <label>
          Title
          <input name="title" required maxLength={120} placeholder="Friday night session" />
        </label>
        <label>
          Ticket price (€)
          <input name="price" type="number" step="0.01" min="0.50" max="500" defaultValue={defaultPrice} required />
        </label>
        <button className="btn">Create stream</button>
      </form>

      <h2>Your open streams</h2>
      {active.length === 0 && <p className="muted">None yet.</p>}
      <ul className="stack">
        {active.map((s, i) => (
          <li key={s.id} className="card">
            <div className="row">
              <h2>{s.title}</h2>
              <span className={`badge ${details[i].status === "active" ? "live" : ""}`}>
                {details[i].status === "active" ? "Live" : "Waiting for OBS"}
              </span>
            </div>
            <p className="muted">
              {euro(s.price_cents)} per ticket · <Link href={`/streams/${s.id}`}>Open watch page</Link>
            </p>
            <details>
              <summary>OBS settings (keep the key secret)</summary>
              <p>
                Settings → Stream → Service: <em>Custom</em>
              </p>
              <label>
                Server
                <input readOnly value={MUX_RTMP_URL} />
              </label>
              <label>
                Stream key
                <input readOnly value={details[i].key} />
              </label>
            </details>
            <form action={endStream}>
              <input type="hidden" name="id" value={s.id} />
              <button className="btn danger">End stream</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
