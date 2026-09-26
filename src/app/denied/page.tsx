export default function Denied() {
  return (
    <section className="hero">
      <h1>Access denied</h1>
      <p className="muted">
        This site is only for verified members of our Discord server. Join the server and get verified, then log in again.
      </p>
      <a className="btn discord" href="/api/auth/login">
        Try again
      </a>
    </section>
  );
}
