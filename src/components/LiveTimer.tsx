"use client";

import { useEffect, useState } from "react";

// Elapsed broadcast time, e.g. 1:04:09.
export default function LiveTimer({ since }: { since: number }) {
  const [now, setNow] = useState(since);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const hh = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(hh ? 2 : 1, "0");
  const ss = String(s % 60).padStart(2, "0");
  return <span className="tabular">{hh ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`}</span>;
}
