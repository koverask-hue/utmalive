import Link from "next/link";

export default function NotFound() {
  return (
    <section className="center-card">
      <p className="big-code" aria-hidden>404</p>
      <h1>Lost in space</h1>
      <p className="muted">This page doesn&apos;t exist, or the stream was removed.</p>
      <Link href="/" className="btn">Back to streams</Link>
    </section>
  );
}
