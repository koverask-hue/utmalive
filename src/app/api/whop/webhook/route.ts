import { NextRequest, NextResponse } from "next/server";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { fulfillPayment } from "@/lib/whop";
import { env } from "@/lib/env";

type Event = { type?: string; action?: string; data?: { id?: string } };

export async function POST(req: NextRequest) {
  let event: Event;
  try {
    // Must be the raw body: the signature covers the exact bytes.
    event = unwrapWebhook<Event>(await req.text(), {
      headers: Object.fromEntries(req.headers),
      key: env("WHOP_WEBHOOK_SECRET"),
    });
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const type = event.type ?? event.action;
  if (type === "payment.succeeded" && event.data?.id) {
    try {
      await fulfillPayment(event.data.id);
    } catch (err) {
      console.error(err);
      // 500 makes Whop retry the delivery later.
      return new NextResponse("Couldn't record payment", { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
