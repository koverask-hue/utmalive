"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStreamer } from "@/lib/session";
import { getStream, insertStream, markStreamEnded } from "@/lib/db";
import { createLiveStream, endLiveStream } from "@/lib/mux";

export async function createStream(formData: FormData) {
  const session = await requireStreamer();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const price = Number(String(formData.get("price") ?? "").replace(",", "."));
  // Stripe's minimum charge for EUR is €0.50.
  if (!title || !Number.isFinite(price) || price < 0.5 || price > 500) return;

  let failure: string | null = null;
  try {
  const { liveStreamId, playbackId } = await createLiveStream();
  await insertStream({
    id: crypto.randomUUID(),
    title,
    streamer_id: session.id,
    streamer_name: session.name,
    streamer_avatar: session.avatar,
    price_cents: Math.round(price * 100),
    mux_live_stream_id: liveStreamId,
    mux_playback_id: playbackId,
  });
  } catch (err) {
    console.error(err);
    failure = err instanceof Error ? err.message : String(err);
  }
  // Streamers see the real reason, so setup problems can be fixed without digging through logs.
  if (failure) redirect(`/studio?error=${encodeURIComponent(failure.slice(0, 300))}`);
  revalidatePath("/studio");
}

export async function endStream(formData: FormData) {
  const session = await requireStreamer();
  const stream = await getStream(String(formData.get("id") ?? ""));
  if (!stream || stream.streamer_id !== session.id || stream.ended_at) return;
  await endLiveStream(stream.mux_live_stream_id);
  await markStreamEnded(stream.id);
  revalidatePath("/studio");
}
