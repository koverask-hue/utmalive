"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Avatar from "./Avatar";
import { SearchIcon } from "./icons";
import { euro } from "@/lib/format";

export type StreamItem = {
  id: string;
  title: string;
  streamer: string;
  avatar: string | null;
  priceCents: number;
  state: "live" | "soon" | "ended";
  when: string;
  hasTicket: boolean;
  isMine: boolean;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live now" },
  { key: "soon", label: "Starting soon" },
  { key: "mine", label: "My tickets" },
  { key: "ended", label: "Ended" },
] as const;

export default function StreamBrowser({ items }: { items: StreamItem[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [q, setQ] = useState("");

  const counts = useMemo(
    () => ({
      all: items.length,
      live: items.filter((i) => i.state === "live").length,
      soon: items.filter((i) => i.state === "soon").length,
      mine: items.filter((i) => i.hasTicket).length,
      ended: items.filter((i) => i.state === "ended").length,
    }),
    [items],
  );

  const shown = items.filter((i) => {
    if (filter === "mine" ? !i.hasTicket : filter !== "all" && i.state !== filter) return false;
    const needle = q.trim().toLowerCase();
    return !needle || i.title.toLowerCase().includes(needle) || i.streamer.toLowerCase().includes(needle);
  });

  return (
    <div className="browser">
      <div className="browser-bar">
        <div className="tabs" role="tablist">
          {FILTERS.map((f) => (
            <button key={f.key} role="tab" aria-selected={filter === f.key} className={`tab ${filter === f.key ? "on" : ""}`} onClick={() => setFilter(f.key)}>
              {f.label}
              <span className="count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <label className="search">
          <SearchIcon />
          <input placeholder="Search streams or streamers" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search streams" />
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="empty">{q ? `Nothing matches “${q}”.` : "Nothing here yet."}</p>
      ) : (
        <ul className="rows">
          {shown.map((s) => (
            <li key={s.id}>
              <Row s={s} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ s }: { s: StreamItem }) {
  const inner = (
    <>
      <span className={`state ${s.state}`}>
        <i aria-hidden />
        {s.state === "live" ? "Live" : s.state === "soon" ? "Soon" : "Ended"}
      </span>
      <span className="row-main">
        <span className="row-title">{s.title}</span>
        <span className="row-by">
          <Avatar src={s.avatar} name={s.streamer} size={20} />
          {s.streamer}
          <span className="row-when">{s.when}</span>
        </span>
      </span>
      <span className="row-end">
        {s.isMine ? (
          <span className="pill">Your stream</span>
        ) : s.hasTicket ? (
          <span className="pill gold">Ticket</span>
        ) : (
          <span className="price">{euro(s.priceCents)}</span>
        )}
      </span>
    </>
  );
  return s.state === "ended" ? (
    <div className="row dim">{inner}</div>
  ) : (
    <Link className="row" href={`/streams/${s.id}`}>
      {inner}
    </Link>
  );
}
