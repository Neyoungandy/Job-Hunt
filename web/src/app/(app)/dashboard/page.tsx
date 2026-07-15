import Link from "next/link";
import { auth } from "@/lib/auth-server";
import { FollowUpReminders } from "@/components/FollowUpReminders";

const tiles = [
  {
    href: "/search",
    title: "Job search",
    desc: "Multi-source remote listings filtered by your profile's role interests.",
    icon: "◎",
    tint: "from-teal-500/25 to-transparent",
  },
  {
    href: "/resume",
    title: "Resume",
    desc: "Import a PDF or Word file or paste text — one source of truth per profile.",
    icon: "▤",
    tint: "from-violet-500/20 to-transparent",
  },
  {
    href: "/roles",
    title: "Role interests",
    desc: "Built-in tracks plus custom roles stored per profile.",
    icon: "◇",
    tint: "from-amber-500/15 to-transparent",
  },
  {
    href: "/applications",
    title: "Job tracker",
    desc: "Statuses, follow-ups, tailored resume and cover letter per application.",
    icon: "▣",
    tint: "from-sky-500/15 to-transparent",
  },
  {
    href: "/settings",
    title: "Apply settings",
    desc: "Manual vs assisted clipboard workflow when you save from search.",
    icon: "⚙",
    tint: "from-rose-500/10 to-transparent",
    wide: true,
  },
];

function firstNameFromSession(
  name: string | null | undefined,
  email: string | null | undefined,
): string | null {
  if (name?.trim()) {
    const part = name.trim().split(/\s+/)[0];
    if (part) return part;
  }
  if (email?.includes("@")) {
    const local = email.split("@")[0]?.split(/[._+-]/)[0];
    if (local) {
      return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
    }
  }
  return null;
}

export default async function DashboardPage() {
  const session = await auth();
  const firstName = firstNameFromSession(
    session?.user?.name,
    session?.user?.email,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-8 hidden h-40 w-40 opacity-40 sm:block">
          <svg viewBox="0 0 160 160" fill="none" className="h-full w-full" aria-hidden>
            <circle cx="80" cy="80" r="60" stroke="rgba(94,234,212,0.3)" strokeWidth="2" strokeDasharray="8 6" />
            <circle cx="80" cy="80" r="36" fill="rgba(167,139,250,0.12)" />
            <path d="M80 56v48M56 80h48" stroke="url(#dash-cross)" strokeWidth="3" strokeLinecap="round" />
            <defs>
              <linearGradient id="dash-cross" x1="56" y1="56" x2="104" y2="104">
                <stop stopColor="#5eead4" />
                <stop offset="1" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="relative space-y-3">
          <span className="badge badge-accent">Your workspace</span>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {firstName ? (
              <>
                Hello {firstName}, ready to{" "}
                <span className="gradient-text">hunt</span>?
              </>
            ) : (
              <>
                Ready to <span className="gradient-text">hunt</span>?
              </>
            )}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-[var(--muted)]">
            Pull listings from Remotive, Arbeitnow, Remote OK, We Work Remotely,
            Jobicy, Greenhouse, and Lever. Tailor documents per job, then track
            everything in your pipeline.
          </p>
        </div>
      </section>

      <FollowUpReminders />

      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`card-interactive group relative overflow-hidden p-5 ${
              t.wide ? "sm:col-span-2" : ""
            }`}
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.tint} opacity-50 transition group-hover:opacity-100`}
            />
            <div className="relative flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-lg text-[var(--accent)]">
                {t.icon}
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-[var(--ink)] group-hover:text-[var(--accent)]">
                  {t.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                  {t.desc}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-transparent p-5 text-sm">
        <p className="font-medium text-amber-200/95">Fair use reminder</p>
        <p className="mt-2 leading-relaxed text-[var(--muted)]">
          Respect each job board&apos;s API and linking rules. JOB HUNT does not
          auto-submit applications — you review and submit on the employer&apos;s
          official page.
        </p>
      </div>
    </div>
  );
}
