export function RolesHero({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-gradient-to-br from-violet-500/10 via-transparent to-teal-500/10 p-1 ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 320 140"
        className="h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="roles-g" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#5eead4" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r="48" fill="rgba(94,234,212,0.08)" stroke="rgba(94,234,212,0.25)" />
        <circle cx="70" cy="70" r="28" fill="url(#roles-g)" opacity="0.25" />
        <path d="M70 52v36M52 70h36" stroke="url(#roles-g)" strokeWidth="3" strokeLinecap="round" />
        <rect x="140" y="36" width="72" height="16" rx="8" fill="rgba(240,244,252,0.15)" />
        <rect x="140" y="62" width="120" height="12" rx="6" fill="rgba(148,163,184,0.3)" />
        <rect x="140" y="82" width="96" height="10" rx="5" fill="rgba(148,163,184,0.2)" />
        <rect x="140" y="100" width="140" height="28" rx="14" fill="rgba(94,234,212,0.12)" stroke="rgba(94,234,212,0.3)" />
        <text x="156" y="118" fill="#5eead4" fontSize="11" fontFamily="system-ui,sans-serif" fontWeight="600">
          Click to toggle
        </text>
        <circle cx="268" cy="48" r="20" fill="rgba(167,139,250,0.15)" stroke="rgba(167,139,250,0.35)" />
        <path d="M260 48l6 6 12-12" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
