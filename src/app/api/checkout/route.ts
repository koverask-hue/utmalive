import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getStream, hasTicket } from "@/lib/db";
import { createTicketCheckout } from "@/lib/whop";
import { appUrl } from "@/lib/env";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(`${appUrl()}/`, 303);

  const form = await req.formData();
  const stream = await getStream(String(form.get("streamId") ?? ""));
  if (!stream || stream.ended_at) return NextResponse.redirect(`${appUrl()}/`, 303);

  const watchUrl = `${appUrl()}/streams/${stream.id}`;
  if (stream.price_cents === 0 || stream.streamer_id === session.id || (await hasTicket(stream.id, session.id))) {
    return NextResponse.redirect(watchUrl, 303);
  }

  try {
    const url = await createTicketCheckout(stream, session.id, `${watchUrl}?paid=1`);
    return NextResponse.redirect(url, 303);
  } catch (err) {
    console.error(err);
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(`${watchUrl}?payerror=${encodeURIComponent(reason.slice(0, 200))}`, 303);
  }
}
