"use client";

import { useEffect, useState } from "react";
import { REACT_EVENT } from "./Chat";

type Float = { id: number; emoji: string; x: number; drift: number; dur: number };

// Emoji rise from the bottom of the player and fade out.
export default function ReactionLayer() {
  const [floats, setFloats] = useState<Float[]>([]);
  useEffect(() => {
    function onReact(e: Event) {
      const emoji = (e as CustomEvent<string>).detail;
      const f: Float = { id: Math.random(), emoji, x: 60 + Math.random() * 35, drift: (Math.random() - 0.5) * 60, dur: 2200 + Math.random() * 900 };
      setFloats((all) => [...all.slice(-24), f]);
      setTimeout(() => setFloats((all) => all.filter((x) => x.id !== f.id)), f.dur);
    }
    window.addEventListener(REACT_EVENT, onReact);
    return () => window.removeEventListener(REACT_EVENT, onReact);
  }, []);
  return (
    <div className="reaction-layer" aria-hidden>
      {floats.map((f) => (
        <span key={f.id} style={{ left: `${f.x}%`, ["--drift" as string]: `${f.drift}px`, animationDuration: `${f.dur}ms` }}>
          {f.emoji}
        </span>
      ))}
    </div>
  );
}
