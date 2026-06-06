"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppProvider";
import { copyApplicationPackage, openApplyUrl } from "@/lib/apply-package";
import { applicationsToCsv, downloadCsv } from "@/lib/export-csv";
import { getFollowUpReminders } from "@/lib/follow-up-reminders";
import type { ApplicationStatus, SavedApplication } from "@/lib/types";

const statuses: { id: ApplicationStatus; label: string }[] = [
  { id: "saved", label: "Saved" },
  { id: "drafting", label: "Drafting" },
  { id: "ready", label: "Ready to apply" },
  { id: "applied", label: "Applied" },
  { id: "interview", label: "Interview" },
  { id: "closed", label: "Closed" },
];

function dateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function isoFromDateInput(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const d = new Date(`${t}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function ApplicationsPage() {
  const { hydrated, activeProfile, state, updateApplication, removeApplication } =
    useApp();
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">(
    "all",
  );

  const rows = useMemo(() => {
    const pid = activeProfile?.id;
    return state.applications.filter(
      (a) => !a.profileId || a.profileId === pid,
    );
  }, [state.applications, activeProfile?.id]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((a) => a.status === statusFilter);
  }, [rows, statusFilter]);

  const stats = useMemo(() => {
    const m = new Map<ApplicationStatus | "all", number>();
    m.set("all", rows.length);
    for (const s of statuses) m.set(s.id, 0);
    for (const a of rows) {
      m.set(a.status, (m.get(a.status) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  const followUpById = useMemo(() => {
    const map = new Map<string, "overdue" | "today" | "upcoming">();
    for (const r of getFollowUpReminders(rows, activeProfile?.id)) {
      map.set(r.application.id, r.kind);
    }
    return map;
  }, [rows, activeProfile?.id]);

  function exportCsv() {
    const csv = applicationsToCsv(rows);
    const safeName = (activeProfile?.name ?? "profile")
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase();
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`job-hunt-tracker-${safeName}-${date}.csv`, csv);
  }

  if (!hydrated) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Job tracker — {activeProfile?.name ?? "Profile"}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Pipeline, follow-up dates, and documents per employer. Filter by
            status; set &quot;Applied&quot; date when you actually submit.
          </p>
        </div>
        {rows.length > 0 && (
          <button
            type="button"
            onClick={exportCsv}
            className="btn-secondary shrink-0 px-4 py-2 text-sm"
          >
            Export CSV
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-[var(--hairline)] bg-[var(--panel)] p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Summary
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-xl border px-2 py-2 text-left text-xs ${
                statusFilter === "all"
                  ? "border-[var(--accent)]/50 bg-[var(--accent-soft)]"
                  : "border-[var(--hairline)]"
              }`}
            >
              <div className="text-[var(--muted)]">All</div>
              <div className="font-display text-lg font-semibold">{stats.get("all")}</div>
            </button>
            {statuses.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatusFilter(s.id)}
                className={`rounded-xl border px-2 py-2 text-left text-xs ${
                  statusFilter === s.id
                    ? "border-[var(--accent)]/50 bg-[var(--accent-soft)]"
                    : "border-[var(--hairline)]"
                }`}
              >
                <div className="text-[var(--muted)]">{s.label}</div>
                <div className="font-display text-lg font-semibold">
                  {stats.get(s.id) ?? 0}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-[var(--hairline)] bg-[var(--panel)] p-8 text-center text-sm text-[var(--muted)]">
          {rows.length === 0
            ? "Nothing saved yet. Use Job search → Tailor & save on a listing."
            : "No applications in this status filter."}
        </p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((a) => {
            const followKind = followUpById.get(a.id);
            return (
            <li
              key={a.id}
              className={`rounded-2xl border bg-[var(--panel)] p-4 ${
                followKind === "overdue"
                  ? "border-red-500/35 ring-1 ring-red-500/15"
                  : followKind === "today"
                    ? "border-amber-500/35 ring-1 ring-amber-500/15"
                    : "border-[var(--hairline)]"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold leading-snug">
                      {a.title}
                    </h2>
                    {followKind === "overdue" && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-300">
                        Follow-up overdue
                      </span>
                    )}
                    {followKind === "today" && (
                      <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                        Follow-up today
                      </span>
                    )}
                    {followKind === "upcoming" && (
                      <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                        Follow-up soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--muted)]">
                    {a.company} · {a.source}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Saved {new Date(a.savedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <select
                    className="rounded-xl border border-[var(--hairline)] bg-[var(--elevated)] px-3 py-2 text-sm"
                    value={a.status}
                    onChange={(e) => {
                      const st = e.target.value as ApplicationStatus;
                      const patch: Partial<SavedApplication> = { status: st };
                      if (st === "applied" && !a.appliedAt) {
                        patch.appliedAt = new Date().toISOString();
                      }
                      updateApplication(a.id, patch);
                    }}
                  >
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Applied on
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-[var(--hairline)] bg-[var(--elevated)] px-3 py-2 text-sm"
                    value={dateInputValue(a.appliedAt)}
                    onChange={(e) =>
                      updateApplication(a.id, {
                        appliedAt: isoFromDateInput(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Follow-up reminder
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-[var(--hairline)] bg-[var(--elevated)] px-3 py-2 text-sm"
                    value={dateInputValue(a.nextFollowUp)}
                    onChange={(e) =>
                      updateApplication(a.id, {
                        nextFollowUp: isoFromDateInput(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Notes
              </label>
              <textarea
                className="mt-1 w-full rounded-xl border border-[var(--hairline)] bg-[var(--elevated)] p-3 text-sm"
                rows={2}
                value={a.notes}
                onChange={(e) =>
                  updateApplication(a.id, { notes: e.target.value })
                }
                placeholder="Recruiter name, referral, thank-you sent…"
              />
              <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Tailored resume draft
              </label>
              <textarea
                className="mt-1 max-h-48 w-full rounded-xl border border-[var(--hairline)] bg-[var(--elevated)] p-3 font-mono text-xs leading-relaxed"
                value={a.tailoredResume}
                onChange={(e) =>
                  updateApplication(a.id, { tailoredResume: e.target.value })
                }
                rows={6}
              />
              <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Cover letter
              </label>
              <textarea
                className="mt-1 max-h-40 w-full rounded-xl border border-[var(--hairline)] bg-[var(--elevated)] p-3 text-sm leading-relaxed"
                value={a.coverLetter ?? ""}
                onChange={(e) =>
                  updateApplication(a.id, { coverLetter: e.target.value })
                }
                rows={5}
                placeholder="Cover letter draft for this employer…"
              />
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-[var(--hairline)] px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
                  onClick={() =>
                    void copyApplicationPackage(
                      a.title,
                      a.company,
                      a.tailoredResume,
                      a.coverLetter ?? "",
                    ).then((ok) => {
                      if (!ok) {
                        alert(
                          "Clipboard unavailable. Select text manually or try HTTPS/localhost.",
                        );
                      }
                    })
                  }
                >
                  Copy resume + letter
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-[var(--hairline)] px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
                  onClick={() => openApplyUrl(a.url)}
                >
                  Open apply link
                </button>
                <button
                  type="button"
                  className="text-xs text-red-300 hover:underline"
                  onClick={() => {
                    if (confirm("Remove this saved application?")) {
                      removeApplication(a.id);
                    }
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          );
          })}
        </ul>
      )}
    </div>
  );
}
