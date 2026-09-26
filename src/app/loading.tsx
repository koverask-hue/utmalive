export default function Loading() {
  return (
    <section aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ width: 220, height: 40, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: 320, height: 18, marginBottom: 32 }} />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 72, marginBottom: 10 }} />
      ))}
    </section>
  );
}
