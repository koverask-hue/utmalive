import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, fulfillCheckout } from "@/lib/stripe";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new NextResponse("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    // Must be the raw body: re-serialized JSON breaks the signature.
    event = stripe().webhooks.constructEvent(await req.text(), signature, env("STRIPE_WEBHOOK_SECRET"));
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await fulfillCheckout(event.data.object);
  }

  return NextResponse.json({ received: true });
}
