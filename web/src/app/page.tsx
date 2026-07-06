import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { JobSearchHero } from "@/components/illustrations/JobSearchHero";

const features = [
  {
    title: "Multi-source search",
    body: "Remotive, Arbeitnow, Remote OK, We Work Remotely, Jobicy, Greenhouse, and Lever — in one feed.",
    accent: "from-teal-500/20 to-cyan-500/5",
    icon: "◎",
  },
  {
    title: "Smart tailoring",
    body: "PDF import plus optional AI-assisted resume and cover letter drafts per job.",
    accent: "from-violet-500/20 to-purple-500/5",
    icon: "✦",
  },
  {
    title: "Application tracker",
    body: "Statuses, follow-up dates, and exportable backups for every profile.",
    accent: "from-amber-500/15 to-orange-500/5",
    icon: "▣",
  },
  {
    title: "Your rules",
    body: "Manual or assisted clipboard workflow — you submit on the employer site.",
    accent: "from-sky-500/15 to-blue-500/5",
    icon: "⚡",
  },
  {
    title: "Role interests",
    body: "Built-in tracks and custom keyword groups, stored per profile.",
    accent: "from-emerald-500/15 to-teal-500/5",
    icon: "◇",
  },
  {
    title: "Private workspace",
    body: "Sign in with email, Google, or GitHub — isolated data per account.",
    accent: "from-rose-500/10 to-pink-500/5",
    icon: "◆",
  },
];

export default function HomePage() {
  return (
    <div className="mesh-bg flex min-h-full flex-col text-[var(--ink)]">
      <header className="relative border-b border-[var(--hairline)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark className="h-11 w-11" />
            <div>
              <p className="font-display text-xl font-bold tracking-tight">
                JOB HUNT
              </p>
              <p className="text-xs text-[var(--muted)]">
                Search · tailor · track
              </p>
            </div>
          </Link>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary">
              Sign in
            </Link>
            <Link href="/login?mode=signup" className="btn-secondary">
              Create workspace
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-14 px-6 py-14 sm:py-20">
        <section className="animate-fade-up grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="relative max-w-xl space-y-6">
            <span className="badge badge-accent">Built for remote job search</span>
            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="gradient-text">One place</span> for serious job
              hunting
            </h1>
            <p className="text-lg leading-relaxed text-[var(--muted)]">
              Aggregate listings, tailor your resume and cover letter per role, and
              track every application — without giving up control of how you apply.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/login?mode=signup" className="btn-primary px-6 py-3 text-base">
                Get started free
              </Link>
              <a href="#features" className="btn-secondary px-6 py-3 text-base">
                See features
              </a>
            </div>
            <div className="flex flex-wrap gap-6 pt-4 text-sm text-[var(--muted)]">
              <span>
                <strong className="text-[var(--ink)]">7+</strong> job sources
              </span>
              <span>
                <strong className="text-[var(--ink)]">Per-profile</strong> resumes
              </span>
              <span>
                <strong className="text-[var(--ink)]">You</strong> submit applications
              </span>
            </div>
          </div>
          <JobSearchHero className="animate-fade-up-delay-1 mx-auto w-full max-w-lg shadow-[var(--shadow-glow)] lg:max-w-none" />
        </section>

        <section id="features" className="animate-fade-up-delay-1 space-y-6">
          <div>
            <p className="section-label">Features</p>
            <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
              Everything you need in one workspace
            </h2>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <li
                key={f.title}
                className={`card group relative overflow-hidden p-5 transition hover:border-[var(--accent)]/30`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${f.accent} opacity-60 transition group-hover:opacity-100`}
                />
                <div className="relative">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-lg text-[var(--accent)]">
                    {f.icon}
                  </span>
                  <h3 className="font-display text-base font-semibold text-[var(--ink)]">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    {f.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-[var(--hairline)] px-6 py-8 text-center text-xs text-[var(--muted)]">
        <p className="font-medium text-[var(--ink)]">
          CSE 499 Capstone Project · Brigham Young University Idaho
        </p>
        <p className="mt-2 leading-relaxed">
          Andrew Omoniyi Mogbeyiromore · Hugo Leonardo Lopes Almeida · Angel
          David Arevalo Balcazar · Rommel Aunario
        </p>
      </footer>
    </div>
  );
}
