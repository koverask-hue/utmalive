import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getStream, hasTicket } from "@/lib/db";
import { euro } from "@/lib/format";
import TicketWelcome from "@/components/TicketWelcome";
import PaymentPending from "@/components/PaymentPending";
import Ticket from "@/components/Ticket";
import Avatar from "@/components/Avatar";
import SubmitButton from "@/components/SubmitButton";
import Chat from "@/components/Chat";
import LiveStage from "@/components/LiveStage";
import ConfirmEnd from "@/components/ConfirmEnd";
import { endStream } from "@/app/studio/actions";
import ViewerCount from "@/components/ViewerCount";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string; ticket?: string; payerror?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stream = await getStream((await params).id).catch(() => null);
  return { title: stream?.title ?? "Stream" };
}

export default async function WatchPage({ params, searchParams }: Props) {
  const session = await requireUser();
  const { id } = await params;
  const { paid, ticket, payerror } = await searchParams;

  const stream = await getStream(id);
  if (!stream) notFound();

  const isOwner = stream.streamer_id === session.id;
  const free = stream.price_cents === 0;
  const owned = await hasTicket(stream.id, session.id);
  const canWatch = isOwner || free || owned;

  // Back from Whop checkout.
  if (paid === "1") {
    if (owned) redirect(`/streams/${stream.id}?ticket=1`);
    if (!isOwner && !free) return <PaymentPending streamId={stream.id} />;
  }
  const serial = stream.id.replace(/-/g, "").slice(0, 6).toUpperCase();

  if (stream.ended_at) {
    return (
      <section className="center-card">
        <h1>{stream.title}</h1>
        <p className="muted">This stream has ended.</p>
        <Link href="/" className="btn">See what&apos;s on</Link>
      </section>
    );
  }

  if (!canWatch) {
    return (
      <section className="buy">
        {payerror && (
          <p className="setup-error" role="alert">
            Checkout couldn&apos;t open: {payerror}
          </p>
        )}
        <Ticket title={stream.title} streamer={stream.streamer_name} priceCents={stream.price_cents} serial={serial}>
          <form action="/api/checkout" method="post">
            <input type="hidden" name="streamId" value={stream.id} />
            <SubmitButton className="btn gold big" pending="Opening checkout…">
              Buy ticket for {euro(stream.price_cents)}
            </SubmitButton>
          </form>
        </Ticket>
        <ul className="fineprint">
          <li>One payment, valid for this stream on every device you log in with.</li>
          <li>You can buy it before the stream starts. The player opens when it goes live.</li>
          <li>Payment goes through Whop. Card details never touch this site.</li>
        </ul>
      </section>
    );
  }

  const welcome = ticket === "1" && <TicketWelcome streamId={stream.id} />;
  const me = { name: session.name, avatar: session.avatar };

  return (
    <section className="watch">
      {welcome}
      <div className="watch-head">
        <div>
          <h1>{stream.title}</h1>
          <p className="row-by">
            <Avatar src={stream.streamer_avatar} name={stream.streamer_name} size={24} />
            {stream.streamer_name}
          </p>
        </div>
        <div className="watch-meta">
          <ViewerCount streamId={stream.id} />
          {isOwner ? (
            <>
              <span className="pill">Your stream</span>
              <ConfirmEnd id={stream.id} title={stream.title} action={endStream} />
            </>
          ) : free ? (
            <span className="pill">Free stream</span>
          ) : (
            <span className="pill gold">Ticket No. {serial}</span>
          )}
        </div>
      </div>
      <div className="with-chat">
        <LiveStage streamId={stream.id} title={stream.title} streamerId={stream.streamer_id} streamerName={stream.streamer_name} broadcaster={isOwner} />
        <Chat streamId={stream.id} me={me} live />
      </div>
    </section>
  );
}
