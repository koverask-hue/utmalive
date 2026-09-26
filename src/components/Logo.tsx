// The 8 is two loops: an outline on top and a solid red dot below, the "on air"
// light. "live" is drawn in the same monoline stroke, so the whole mark is one
// family and needs no font. `animated` draws the 8, then lights the dot.
export function Mark({ size = 28, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <svg className={`mark ${animated ? "mark-anim" : ""}`} width={size * 0.6} height={size} viewBox="0 0 24 40" aria-hidden>
      <circle className="mark-top" cx="12" cy="11" r="7.5" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle className="mark-dot" cx="12" cy="28" r="9.5" fill="var(--signal)" />
    </svg>
  );
}

// Header logo in the site's look: white-to-blue strokes like the headline,
// and a glowing red dot like the other live indicators.
export default function Logo({ height = 30 }: { height?: number }) {
  return (
    <svg className="logo" height={height} viewBox="0 0 96 40" role="img" aria-label="8live" overflow="visible">
      <defs>
        <linearGradient id="logo-ink" gradientUnits="userSpaceOnUse" x1="0" y1="4" x2="0" y2="38">
          <stop offset="0.3" stopColor="#ffffff" />
          <stop offset="1" stopColor="#9fb4ff" />
        </linearGradient>
        <filter id="logo-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>
      <circle cx="12" cy="11" r="7.5" fill="none" stroke="url(#logo-ink)" strokeWidth="4" />
      <circle cx="12" cy="28" r="9.5" fill="#ff4d6a" filter="url(#logo-glow)" opacity="0.8" />
      <circle cx="12" cy="28" r="9.5" fill="#ff4d6a" />
      <g fill="none" stroke="url(#logo-ink)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M34 5v31" />
        <path d="M43.5 19v17" />
        <path d="M51 19l7.5 17 7.5-17" />
        <path d="M72.5 27.5h17.5a8.75 8.75 0 1 0-2.6 6.3" />
      </g>
      <circle cx="43.5" cy="10.5" r="2.6" fill="#ffffff" />
    </svg>
  );
}
