const ROLE_STYLES: Record<string, { gradient: string; symbol: string }> = {
  programming: { gradient: "from-violet-500/35 to-purple-700/15", symbol: "</>" },
  frontend: { gradient: "from-cyan-500/35 to-teal-700/15", symbol: "UI" },
  backend: { gradient: "from-amber-500/30 to-orange-700/15", symbol: "API" },
  fullstack: { gradient: "from-emerald-500/35 to-teal-700/15", symbol: "FS" },
  testing: { gradient: "from-rose-500/30 to-pink-700/15", symbol: "QA" },
  "software-dev": { gradient: "from-sky-500/35 to-blue-700/15", symbol: "SD" },
  "software-eng": { gradient: "from-indigo-500/35 to-violet-700/15", symbol: "SE" },
  "tech-support": { gradient: "from-lime-500/30 to-green-700/15", symbol: "IT" },
  admin: { gradient: "from-fuchsia-500/30 to-purple-700/15", symbol: "Ad" },
  "customer-support": { gradient: "from-teal-500/35 to-cyan-700/15", symbol: "CX" },
};

export function RoleTrackIcon({
  roleId,
  className = "h-11 w-11",
}: {
  roleId: string;
  className?: string;
}) {
  const style = ROLE_STYLES[roleId] ?? {
    gradient: "from-slate-500/30 to-slate-700/15",
    symbol: "•",
  };

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-mono text-xs font-bold tracking-tight text-[var(--accent)] ${style.gradient} ${className}`}
      aria-hidden
    >
      {style.symbol}
    </span>
  );
}
