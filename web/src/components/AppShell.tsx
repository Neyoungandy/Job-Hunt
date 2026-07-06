"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { FollowUpReminders } from "@/components/FollowUpReminders";
import { ProfileMenu } from "@/components/ProfileMenu";

const nav = [
  { href: "/dashboard", label: "Overview", icon: "◆" },
  { href: "/search", label: "Job search", icon: "◎" },
  { href: "/resume", label: "Resume", icon: "▤" },
  { href: "/roles", label: "Role interests", icon: "◇" },
  { href: "/applications", label: "Job tracker", icon: "▣" },
  { href: "/settings", label: "Apply settings", icon: "⚙" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mesh-bg flex min-h-full flex-col text-[var(--ink)]">
      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="glass-panel relative z-10 border-b border-[var(--hairline)] lg:w-[17rem] lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgba(94,234,212,0.06)] to-transparent" />
          <div className="relative flex items-center justify-between gap-3 border-b border-[var(--hairline)] px-4 py-5 lg:flex-col lg:items-stretch">
            <Link href="/dashboard" className="group flex items-center gap-3">
              <BrandMark className="h-10 w-10 shrink-0 transition group-hover:scale-105" />
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-lg font-bold tracking-tight">
                  JOB HUNT
                </span>
                <span className="text-[11px] font-medium tracking-wide text-[var(--muted)]">
                  Search · tailor · track
                </span>
              </div>
            </Link>
            <ProfileMenu />
          </div>
          <nav className="relative flex gap-1 overflow-x-auto px-2 py-3 lg:flex-col lg:overflow-visible lg:px-3">
            {nav.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--ink)] shadow-[inset_3px_0_0_0_var(--accent)]"
                      : "text-[var(--muted)] hover:bg-white/[0.04] hover:text-[var(--ink)]"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${
                      active
                        ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                        : "bg-white/[0.04] text-[var(--muted)]"
                    }`}
                    aria-hidden
                  >
                    {item.icon}
                  </span>
                  {item.label}
                  {item.href === "/applications" && (
                    <FollowUpReminders compact />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="relative hidden px-4 pb-5 pt-1 lg:block">
            <div className="rounded-xl border border-[var(--hairline)] bg-white/[0.03] p-3 text-xs leading-relaxed text-[var(--muted)]">
              <p className="font-medium text-[var(--ink)]/90">You stay in control</p>
              <p className="mt-1.5">
                JOB HUNT never auto-submits. Review every tailored resume and cover
                letter, then apply on the employer&apos;s site.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass-panel border-b border-[var(--hairline)] px-4 py-3 lg:hidden">
            <p className="text-center text-xs text-[var(--muted)]">
              Human-in-the-loop — you submit on the employer site
            </p>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-8 sm:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
