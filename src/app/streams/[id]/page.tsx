import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getStream, hasTicket } from "@/lib/db";
import { liveStatus, playbackTokens } from "@/lib/mux";
import { stripe, fulfillCheckout } from "@/lib/stripe";
import { euro } from "@/lib/format";
import Player from "@/components/Player";
import AutoRefresh from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await requireUser();
  const { id } = await params;
  const { checkout } = await searchParams;

  const stream = await getStream(id);
  if (!stream) notFound();

  // Back from Stripe: record the ticket now instead of waiting for the webhook.
  if (checkout) {
    const cs = await stripe().checkout.sessions.retrieve(checkout).catch(() => null);
    if (cs && cs.metadata?.discord_id === session.id && cs.metadata?.stream_id === stream.id) {
      await fulfillCheckout(cs);
    }
    redirect(`/streams/${stream.id}`);
  }

  const isOwner = stream.streamer_id === session.id;
  const canWatch = isOwner || (await hasTicket(stream.id, session.id));

  if (stream.ended_at) {
    return (
      <section className="hero">
        <h1>{stream.title}</h1>
        <p className="muted">This stream has ended.</p>
      </section>
    );
  }

  if (!canWatch) {
    return (
      <section className="hero">
        <h1>{stream.title}</h1>
        <p className="muted">by {stream.streamer_name}</p>
        <p>
          A ticket for this stream costs <strong>{euro(stream.price_cents)}</strong>.
        </p>
        <form action="/api/checkout" method="post">
          <input type="hidden" name="streamId" value={stream.id} />
          <button className="btn">Pay {euro(stream.price_cents)} with Stripe</button>
        </form>
      </section>
    );
  }

  const status = await liveStatus(stream.mux_live_stream_id);
  if (status !== "active") {
    return (
      <section className="hero">
        <AutoRefresh seconds={15} />
        <h1>{stream.title}</h1>
        <p className="muted">
          {isOwner
            ? "Start streaming from OBS with the key in your Studio. This page refreshes on its own."
            : "You have a ticket. Waiting for the stream to start. This page refreshes on its own."}
        </p>
      </section>
    );
  }

  const tokens = await playbackTokens(stream.mux_playback_id);
  return (
    <section>
      <h1>{stream.title}</h1>
      <p className="muted">
        <span className="badge live">Live</span> by {stream.streamer_name}
      </p>
      <Player playbackId={stream.mux_playback_id} title={stream.title} viewerId={session.id} tokens={tokens} />
    </section>
  );
}
