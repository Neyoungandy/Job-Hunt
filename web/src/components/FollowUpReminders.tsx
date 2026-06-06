"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/context/AppProvider";
import {
  countUrgentFollowUps,
  getFollowUpReminders,
} from "@/lib/follow-up-reminders";

export function FollowUpReminders({ compact = false }: { compact?: boolean }) {
  const { hydrated, state, activeProfile } = useApp();

  const reminders = useMemo(() => {
    if (!hydrated) return [];
    return getFollowUpReminders(
      state.applications,
      activeProfile?.id,
    );
  }, [hydrated, state.applications, activeProfile?.id]);

  const urgent = countUrgentFollowUps(reminders);

  if (!hydrated || reminders.length === 0) return null;

  if (compact) {
    if (urgent === 0) return null;
    return (
      <span
        className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-[var(--accent-ink)]"
        title={`${urgent} follow-up${urgent === 1 ? "" : "s"} due`}
      >
        {urgent}
      </span>
    );
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-amber-500/30 bg-gradient-to-r from-amber-500/12 to-transparent p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold text-amber-100/95">
            Follow-up reminders
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {urgent > 0
              ? `${urgent} application${urgent === 1 ? "" : "s"} need attention today or are overdue.`
              : `${reminders.length} upcoming follow-up${reminders.length === 1 ? "" : "s"} in the next week.`}
          </p>
        </div>
        <Link href="/applications" className="btn-secondary px-3 py-2 text-sm">
          Open tracker
        </Link>
      </div>
      <ul className="mt-4 space-y-2">
        {reminders.slice(0, 5).map((r) => (
          <li
            key={r.application.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--hairline)] bg-[var(--panel)]/80 px-3 py-2 text-sm"
          >
            <span className="min-w-0 truncate font-medium text-[var(--ink)]">
              {r.application.title}{" "}
              <span className="text-[var(--muted)]">· {r.application.company}</span>
            </span>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                r.kind === "overdue"
                  ? "bg-red-500/20 text-red-300"
                  : r.kind === "today"
                    ? "bg-amber-500/25 text-amber-200"
                    : "bg-[var(--accent-soft)] text-[var(--accent)]"
              }`}
            >
              {r.kind === "overdue"
                ? `${Math.abs(r.daysUntil)}d overdue`
                : r.kind === "today"
                  ? "Due today"
                  : `In ${r.daysUntil}d`}
            </span>
          </li>
        ))}
      </ul>
      {reminders.length > 5 && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          +{reminders.length - 5} more in Job tracker
        </p>
      )}
    </section>
  );
}
