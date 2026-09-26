"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Back from Whop: the ticket appears once Whop's payment notification arrives,
// usually within seconds. Re-checks every 3 s for up to 2 minutes.
export default function PaymentPending({ streamId }: { streamId: string }) {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  const gaveUp = tries >= 40;
  useEffect(() => {
    if (gaveUp) return;
    const t = setTimeout(() => {
      setTries((n) => n + 1);
      router.refresh();
    }, 3000);
    return () => clearTimeout(t);
  }, [tries, gaveUp, router]);
  return (
    <section className="center-card">
      {!gaveUp && <span className="spinner big" aria-hidden />}
      <h1>{gaveUp ? "Still waiting for Whop" : "Confirming your payment"}</h1>
      <p className="muted">
        {gaveUp
          ? "Your payment hasn't been confirmed yet. If you were charged, it will unlock soon. Reload this page in a minute, or message a streamer in Discord with your Whop receipt."
          : "This takes a few seconds. Keep this page open and the stream unlocks by itself."}
      </p>
      {gaveUp && (
        <a className="btn" href={`/streams/${streamId}?paid=1`}>
          Check again
        </a>
      )}
    </section>
  );
}
