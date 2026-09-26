"use client";

import { useEffect, useState } from "react";
import { EyeIcon } from "./icons";

export default function ViewerCount({ streamId }: { streamId: string }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let stop = false;
    async function load() {
      const res = await fetch(`/api/streams/${streamId}/viewers`, { cache: "no-store" }).catch(() => null);
      const json = (await res?.json().catch(() => null)) as { viewers: number | null } | null;
      if (!stop) setN(json?.viewers ?? null);
    }
    load();
    const t = setInterval(load, 20000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [streamId]);
  if (n === null) return null;
  return (
    <span className="viewers" title="Watching now">
      <EyeIcon /> <span className="tabular">{n.toLocaleString()}</span> watching
    </span>
  );
}
