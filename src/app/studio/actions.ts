"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStreamer } from "@/lib/session";
import { getStream, insertStream, markStreamEnded } from "@/lib/db";
import { closeRoom } from "@/lib/live";

export async function createStream(formData: FormData) {
  const session = await requireStreamer();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const price = Number(String(formData.get("price") ?? "").replace(",", "."));
  // 0 = free. Otherwise at least €0.50, the lowest EUR card charge.
  if (!title || !Number.isFinite(price) || price < 0 || (price > 0 && price < 0.5) || price > 500) return;

  let failure: string | null = null;
  const id = crypto.randomUUID();
  try {
  await insertStream({
    id,
    title,
    streamer_id: session.id,
    streamer_name: session.name,
    streamer_avatar: session.avatar,
    price_cents: Math.round(price * 100),
  });
  } catch (err) {
    console.error(err);
    failure = err instanceof Error ? err.message : String(err);
  }
  // Streamers see the real reason, so setup problems can be fixed without digging through logs.
  if (failure) redirect(`/studio?error=${encodeURIComponent(failure.slice(0, 300))}`);
  // Straight to the broadcast page, where the streamer picks screen, camera and mic.
  redirect(`/streams/${id}`);
}

export async function endStream(formData: FormData) {
  const session = await requireStreamer();
  const stream = await getStream(String(formData.get("id") ?? ""));
  if (!stream || stream.streamer_id !== session.id || stream.ended_at) return;
  await closeRoom(stream.id);
  await markStreamEnded(stream.id);
  revalidatePath("/studio");
  redirect("/studio");
}
