"use client";

import { useEffect, useState } from "react";
import Player from "./Player";
import ShareButton from "./ShareButton";
import ReactionLayer from "./ReactionLayer";
import { ExpandIcon, ShrinkIcon } from "./icons";

export default function TheaterPlayer(props: React.ComponentProps<typeof Player>) {
  const [theater, setTheater] = useState(false);

  useEffect(() => {
    try {
      setTheater(localStorage.getItem("theater") === "1");
    } catch {}
  }, []);
  useEffect(() => {
    document.body.classList.toggle("theater", theater);
    try {
      localStorage.setItem("theater", theater ? "1" : "0");
    } catch {}
    return () => document.body.classList.remove("theater");
  }, [theater]);

  // "t" toggles theater mode, like most video sites.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (e.key === "t" && !e.metaKey && !e.ctrlKey && !["INPUT", "TEXTAREA"].includes(el.tagName)) setTheater((v) => !v);
      if (e.key === "Escape") setTheater(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="stage">
      <div className="screen">
        <Player {...props} />
        <ReactionLayer />
      </div>
      <div className="stage-tools">
        <button type="button" className="btn ghost" onClick={() => setTheater((v) => !v)} aria-pressed={theater}>
          {theater ? <ShrinkIcon /> : <ExpandIcon />}
          {theater ? "Exit theater" : "Theater mode"}
          <kbd>T</kbd>
        </button>
        <ShareButton title={props.title} />
      </div>
    </div>
  );
}
