"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="center-card">
      <h1>Signal lost</h1>
      <p className="muted">The page couldn&apos;t load. This is usually brief. Try again, and if it keeps happening, tell a streamer in Discord.</p>
      <button className="btn" onClick={reset}>Try again</button>
    </section>
  );
}
