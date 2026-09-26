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
    INSERT INTO streams (id, title, streamer_id, streamer_name, price_cents, mux_live_stream_id, mux_playback_id)
    VALUES (${s.id}, ${s.title}, ${s.streamer_id}, ${s.streamer_name}, ${s.price_cents}, ${s.mux_live_stream_id}, ${s.mux_playback_id})
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
