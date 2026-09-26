"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Shown while the stream isn't broadcasting yet. Checks again every 15 s.
export default function WaitingRoom({ title, message }: { title: string; message: string }) {
  const router = useRouter();
  const [left, setLeft] = useState(15);
  useEffect(() => {
    const t = setInterval(() => {
      setLeft((n) => {
        if (n <= 1) {
          router.refresh();
          return 15;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <div className="waiting">
      <div className="radar" aria-hidden>
        <span />
        <span />
        <span />
        <i />
      </div>
      <h1>{title}</h1>
      <p className="muted">{message}</p>
      <p className="checking">Checking for the signal again in <span className="tabular">{left}s</span></p>
    </div>
  );
}
