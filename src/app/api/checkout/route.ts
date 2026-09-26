import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getStream, hasTicket } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { appUrl } from "@/lib/env";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(`${appUrl()}/`, 303);

  const form = await req.formData();
  const streamId = String(form.get("streamId") ?? "");
  const stream = await getStream(streamId);
  if (!stream || stream.ended_at) return NextResponse.redirect(`${appUrl()}/`, 303);

  const watchUrl = `${appUrl()}/streams/${stream.id}`;
  if (stream.price_cents === 0 || stream.streamer_id === session.id || (await hasTicket(stream.id, session.id))) {
    return NextResponse.redirect(watchUrl, 303);
  }

  const checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: stream.price_cents,
          product_data: { name: `Ticket: ${stream.title}`, description: `Live by ${stream.streamer_name}` },
        },
      },
    ],
    client_reference_id: session.id,
    metadata: { stream_id: stream.id, discord_id: session.id },
    payment_intent_data: { metadata: { stream_id: stream.id, discord_id: session.id } },
    success_url: `${watchUrl}?checkout={CHECKOUT_SESSION_ID}`,
    cancel_url: watchUrl,
  });

  return NextResponse.redirect(checkout.url!, 303);
}
