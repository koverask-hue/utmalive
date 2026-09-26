import Stripe from "stripe";
import { env } from "./env";
import { recordPurchase } from "./db";

let client: Stripe | null = null;
export function stripe() {
  client ??= new Stripe(env("STRIPE_SECRET_KEY"));
  return client;
}

// Shared by the webhook and the success redirect. Only paid sessions become tickets.
export async function fulfillCheckout(session: Stripe.Checkout.Session): Promise<boolean> {
  const streamId = session.metadata?.stream_id;
  const discordId = session.metadata?.discord_id;
  if (session.payment_status !== "paid" || !streamId || !discordId) return false;
  await recordPurchase({
    stripeSessionId: session.id,
    streamId,
    discordId,
    amountCents: session.amount_total ?? 0,
  });
  return true;
}
