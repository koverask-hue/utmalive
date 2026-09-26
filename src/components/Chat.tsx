"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import { useToast } from "./Toast";
import { REACTIONS } from "@/lib/reactions";

type Msg = {
  id: string;
  name: string;
  avatar: string | null;
  kind: "msg" | "react";
  body: string;
  at: string;
  streamer: boolean;
  mine: boolean;
  pending?: boolean;
};

export const REACT_EVENT = "utma:react";

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// Polls for new messages (quicker while chat is busy, slower when quiet, paused
// while the tab is hidden). Reactions float over the player instead of listing.
export default function Chat({ streamId, me, live }: { streamId: string; me: { name: string; avatar: string | null }; live: boolean }) {
  const toast = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const lastId = useRef<string | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const pinned = useRef(true);
  const quiet = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const busy = useRef(false);
  const alive = useRef(true);

  const scrollDown = useCallback(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
    setUnseen(0);
  }, []);

  const poll = useCallback(async () => {
    // One request at a time, or two polls with the same cursor would duplicate messages.
    if (busy.current) return;
    busy.current = true;
    clearTimeout(timer.current);
    if (!document.hidden) {
      try {
        const res = await fetch(`/api/streams/${streamId}/chat${lastId.current ? `?after=${lastId.current}` : ""}`, { cache: "no-store" });
        if (res.ok) {
          const { messages } = (await res.json()) as { messages: Msg[] };
          const first = lastId.current === null;
          if (messages.length) {
            lastId.current = messages[messages.length - 1].id;
            quiet.current = 0;
            const reacts = messages.filter((m) => m.kind === "react" && !m.mine);
            if (!first) reacts.forEach((r) => window.dispatchEvent(new CustomEvent(REACT_EVENT, { detail: r.body })));
            const chat = messages.filter((m) => m.kind === "msg");
            if (chat.length) {
              setMsgs((prev) => [...prev.filter((p) => !p.pending || !chat.some((c) => c.mine && c.body === p.body)), ...chat].slice(-200));
              if (!pinned.current && !first) setUnseen((n) => n + chat.filter((c) => !c.mine).length);
            }
          } else {
            quiet.current++;
          }
          setLoaded(true);
        }
      } catch {}
    }
    busy.current = false;
    if (!alive.current) return;
    const delay = document.hidden ? 5000 : quiet.current > 6 ? 5000 : 2000;
    timer.current = setTimeout(poll, delay);
  }, [streamId]);

  useEffect(() => {
    alive.current = true;
    poll();
    const onVis = () => !document.hidden && poll();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [poll]);

  useEffect(() => {
    if (pinned.current) scrollDown();
  }, [msgs, scrollDown]);

  function onScroll() {
    const el = list.current!;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (pinned.current) setUnseen(0);
  }

  async function send(payload: { body?: string; react?: string }) {
    const res = await fetch(`/api/streams/${streamId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    if (!res?.ok) {
      const err = (await res?.json().catch(() => null)) as { error?: string } | null;
      if (payload.body) toast(err?.error ?? "Message not sent. Check your connection.", "error");
      return false;
    }
    quiet.current = 0;
    setTimeout(poll, 150);
    return true;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    pinned.current = true;
    // Show it right away; the poll swaps in the stored copy.
    setMsgs((m) => [...m, { id: `p${Date.now()}`, name: me.name, avatar: me.avatar, kind: "msg", body, at: new Date().toISOString(), streamer: false, mine: true, pending: true }]);
    setText("");
    const ok = await send({ body });
    if (!ok) setMsgs((m) => m.filter((x) => !(x.pending && x.body === body)));
    setSending(false);
  }

  function react(emoji: string) {
    window.dispatchEvent(new CustomEvent(REACT_EVENT, { detail: emoji }));
    send({ react: emoji });
  }

  return (
    <aside className="chat" aria-label="Live chat">
      <header className="chat-head">
        <h2>Chat</h2>
        <span className="muted small">{live ? "Everyone with a ticket" : "Pre-show"}</span>
      </header>
      <ol className="chat-list" ref={list} onScroll={onScroll} aria-live="polite">
        {!loaded && <li className="chat-note">Connecting…</li>}
        {loaded && msgs.length === 0 && <li className="chat-note">No messages yet. Say hi.</li>}
        {msgs.map((m, i) => {
          const prev = msgs[i - 1];
          const grouped = prev && prev.name === m.name && new Date(m.at).getTime() - new Date(prev.at).getTime() < 120000;
          return (
            <li key={m.id} className={`msg ${grouped ? "grouped" : ""} ${m.mine ? "mine" : ""} ${m.pending ? "pending" : ""}`}>
              {!grouped && <Avatar src={m.avatar} name={m.name} size={26} />}
              <div className="msg-body">
                {!grouped && (
                  <span className="msg-meta">
                    <span className={`msg-name ${m.streamer ? "streamer" : ""}`}>{m.name}</span>
                    {m.streamer && <span className="pill small">Streamer</span>}
                    <time dateTime={m.at}>{time(m.at)}</time>
                  </span>
                )}
                <p>{m.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {unseen > 0 && (
        <button type="button" className="unseen" onClick={() => { pinned.current = true; scrollDown(); }}>
          {unseen} new {unseen === 1 ? "message" : "messages"}
        </button>
      )}
      <div className="reactions" role="group" aria-label="Send a reaction">
        {REACTIONS.map((r) => (
          <button key={r} type="button" onClick={() => react(r)} aria-label={`React ${r}`}>
            {r}
          </button>
        ))}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Send a message" aria-label="Message" />
        {text.length > 240 && <span className="chat-count tabular">{300 - text.length}</span>}
        <button className="btn small" disabled={!text.trim() || sending}>Send</button>
      </form>
    </aside>
  );
}
