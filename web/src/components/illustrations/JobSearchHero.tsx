export function JobSearchHero({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-gradient-to-br from-[var(--elevated)] to-[var(--canvas-2)] ${className}`}
      aria-hidden
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[var(--accent)]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-[var(--accent-2)]/15 blur-3xl" />
      <svg
        viewBox="0 0 480 360"
        className="relative h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="jh-hero-g" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#5eead4" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <rect x="60" y="48" width="360" height="240" rx="20" fill="#121826" stroke="rgba(255,255,255,0.08)" />
        <rect x="60" y="48" width="360" height="44" rx="20" fill="#1a2234" />
        <circle cx="88" cy="70" r="6" fill="#f87171" opacity="0.8" />
        <circle cx="108" cy="70" r="6" fill="#fbbf24" opacity="0.8" />
        <circle cx="128" cy="70" r="6" fill="#34d399" opacity="0.8" />
        <rect x="88" y="112" width="140" height="12" rx="6" fill="url(#jh-hero-g)" opacity="0.9" />
        <rect x="88" y="136" width="220" height="8" rx="4" fill="rgba(148,163,184,0.35)" />
        <rect x="88" y="152" width="180" height="8" rx="4" fill="rgba(148,163,184,0.25)" />
        <rect x="88" y="180" width="304" height="56" rx="12" fill="rgba(94,234,212,0.08)" stroke="rgba(94,234,212,0.2)" />
        <rect x="104" y="196" width="120" height="8" rx="4" fill="rgba(240,244,252,0.7)" />
        <rect x="104" y="212" width="200" height="6" rx="3" fill="rgba(148,163,184,0.4)" />
        <rect x="88" y="252" width="304" height="56" rx="12" fill="rgba(167,139,250,0.08)" stroke="rgba(167,139,250,0.2)" />
        <rect x="104" y="268" width="140" height="8" rx="4" fill="rgba(240,244,252,0.6)" />
        <rect x="104" y="284" width="180" height="6" rx="3" fill="rgba(148,163,184,0.35)" />
        <g transform="translate(340 120)">
          <rect width="64" height="80" rx="14" fill="#1a2234" stroke="rgba(94,234,212,0.35)" />
          <circle cx="32" cy="24" r="14" fill="url(#jh-hero-g)" opacity="0.35" />
          <rect x="14" y="46" width="36" height="6" rx="3" fill="rgba(240,244,252,0.5)" />
          <rect x="14" y="58" width="28" height="5" rx="2.5" fill="rgba(148,163,184,0.4)" />
        </g>
        <path
          d="M24 300 Q120 260 200 300 T380 280"
          stroke="url(#jh-hero-g)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}
