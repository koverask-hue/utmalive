import { neon } from "@neondatabase/serverless";
import { envAny } from "./env";

let client: ReturnType<typeof neon> | null = null;
function sql() {
  client ??= neon(envAny("UTMALIVE_URL", "UTMALIVE_DATABASE_URL", "DATABASE_URL", "POSTGRES_URL"));
  return client;
}

export type Stream = {
  id: string;
  title: string;
  streamer_id: string;
  streamer_name: string;
  streamer_avatar: string | null;
  price_cents: number;
  mux_live_stream_id: string;
  mux_playback_id: string;
  ended_at: string | null;
  created_at: string;
};

export async function listStreams(): Promise<Stream[]> {
  return (await sql()`
    SELECT * FROM streams
    ORDER BY (ended_at IS NULL) DESC, created_at DESC
    LIMIT 50
  `) as Stream[];
}

export async function listStreamsBy(streamerId: string): Promise<Stream[]> {
  return (await sql()`
    SELECT * FROM streams WHERE streamer_id = ${streamerId}
    ORDER BY created_at DESC LIMIT 50
  `) as Stream[];
}

export async function getStream(id: string): Promise<Stream | null> {
  const rows = (await sql()`SELECT * FROM streams WHERE id = ${id}`) as Stream[];
  return rows[0] ?? null;
}

export async function insertStream(s: Omit<Stream, "ended_at" | "created_at">) {
  await sql()`
    INSERT INTO streams (id, title, streamer_id, streamer_name, streamer_avatar, price_cents, mux_live_stream_id, mux_playback_id)
    VALUES (${s.id}, ${s.title}, ${s.streamer_id}, ${s.streamer_name}, ${s.streamer_avatar}, ${s.price_cents}, ${s.mux_live_stream_id}, ${s.mux_playback_id})
  `;
}

export async function markStreamEnded(id: string) {
  await sql()`UPDATE streams SET ended_at = now() WHERE id = ${id} AND ended_at IS NULL`;
}

export async function hasTicket(streamId: string, discordId: string): Promise<boolean> {
  const rows = (await sql()`
    SELECT 1 FROM purchases WHERE stream_id = ${streamId} AND discord_id = ${discordId} LIMIT 1
  `) as unknown[];
  return rows.length > 0;
}

// Idempotent: the webhook and the success redirect may both record the same session.
export async function recordPurchase(p: {
  stripeSessionId: string;
  streamId: string;
  discordId: string;
  amountCents: number;
}) {
  await sql()`
    INSERT INTO purchases (stripe_session_id, stream_id, discord_id, amount_cents)
    VALUES (${p.stripeSessionId}, ${p.streamId}, ${p.discordId}, ${p.amountCents})
    ON CONFLICT (stripe_session_id) DO NOTHING
  `;
}

// Stream ids the user holds a ticket for, to mark cards on the home page.
export async function ticketStreamIds(discordId: string): Promise<Set<string>> {
  const rows = (await sql()`SELECT DISTINCT stream_id FROM purchases WHERE discord_id = ${discordId}`) as {
    stream_id: string;
  }[];
  return new Set(rows.map((r) => r.stream_id));
}

export type StreamSales = { tickets: number; revenue_cents: number };

export async function salesByStream(streamerId: string): Promise<Map<string, StreamSales>> {
  const rows = (await sql()`
    SELECT p.stream_id, COUNT(*)::int AS tickets, COALESCE(SUM(p.amount_cents), 0)::int AS revenue_cents
    FROM purchases p JOIN streams s ON s.id = p.stream_id
    WHERE s.streamer_id = ${streamerId}
    GROUP BY p.stream_id
  `) as ({ stream_id: string } & StreamSales)[];
  return new Map(rows.map((r) => [r.stream_id, { tickets: r.tickets, revenue_cents: r.revenue_cents }]));
}

export async function countOpenStreams(): Promise<number> {
  const rows = (await sql()`SELECT COUNT(*)::int AS n FROM streams WHERE ended_at IS NULL`) as { n: number }[];
  return rows[0]?.n ?? 0;
}
