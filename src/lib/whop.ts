import { WhopClient } from "@whop/sdk";
import { env, optionalEnv } from "./env";
import { recordPurchase, type Stream } from "./db";

let client: WhopClient | null = null;
function whop() {
  client ??= new WhopClient({ token: env("WHOP_API_KEY") });
  return client;
}

// A one-time Whop checkout for one stream at its own price. The stream and buyer
// ride along as metadata, which Whop copies onto the resulting payment.
export async function createTicketCheckout(stream: Stream, discordId: string, returnUrl: string): Promise<string> {
  const checkout = await whop().checkoutConfigurations.create({
    account_id: env("WHOP_COMPANY_ID"),
    plan: {
      plan_type: "one_time",
      initial_price: stream.price_cents / 100,
      currency: "eur",
      title: `Ticket: ${stream.title}`.slice(0, 80),
      description: `Live with ${stream.streamer_name}`,
      product_id: optionalEnv("WHOP_PRODUCT_ID") ?? null,
      visibility: "hidden",
    },
    metadata: { stream_id: stream.id, discord_id: discordId },
    redirect_url: returnUrl,
  });
  if (!checkout.purchase_url) throw new Error("Whop didn't return a checkout link");
  return checkout.purchase_url;
}

// Looks the payment up on Whop instead of trusting the webhook body, and records
// the ticket only when it's paid and carries our metadata.
export async function fulfillPayment(paymentId: string): Promise<boolean> {
  const payment = await whop().payments.retrieve({ id: paymentId });
  const streamId = payment.metadata?.stream_id;
  const discordId = payment.metadata?.discord_id;
  if (payment.status !== "paid" || typeof streamId !== "string" || typeof discordId !== "string") return false;
  await recordPurchase({
    stripeSessionId: payment.id, // column predates Whop; holds the payment id
    streamId,
    discordId,
    amountCents: Math.round(Number(payment.total?.amount ?? 0) * 100),
  });
  return true;
}
