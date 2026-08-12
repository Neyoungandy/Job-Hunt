"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/context/AuthProvider";
import { useApp } from "@/context/AppProvider";
import { exportStateBlob, importStateFromJson } from "@/lib/storage";

export function ProfileMenu() {
  const { data: session, signOut } = useSession();
  const {
    hydrated,
    state,
    activeProfile,
    setActiveProfileId,
    addProfile,
    removeProfile,
    replaceState,
  } = useApp();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const canRemove = state.profiles.length > 1;

  function onExport() {
    const blob = exportStateBlob(state);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `job-hunt-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function onImport(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const next = importStateFromJson(text);
      replaceState(next);
    } catch {
      alert("Could not import that file. Check it is a backup from JOB HUNT.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 w-full max-w-full space-y-3">
      {session?.user && (
        <div className="rounded-lg border border-[var(--hairline)] bg-[var(--elevated)] px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {activeProfile?.avatarDataUrl || session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeProfile?.avatarDataUrl ?? session.user.image ?? ""}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                {(session.user.name ?? session.user.email ?? "U")
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--ink)]">
                {session.user.name ?? session.user.email ?? "Signed in"}
              </p>
              {session.user.email && (
                <p className="truncate text-[11px] text-[var(--muted)]">
                  {session.user.email}
                </p>
              )}
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--hairline)] py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] hover:text-[var(--ink)]"
              onClick={() => {
                void signOut().then(() => {
                  window.location.href = "/";
                });
              }}
            >
              Sign out
            </button>
            <Link
              href="/profile"
              className="rounded-lg border border-[var(--hairline)] py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Manage profile
            </Link>
          </div>
        </div>
      )}

      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={expanded}
          className="flex w-full items-center justify-between rounded-lg border border-[var(--hairline)] bg-white/[0.03] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
          onClick={() => setExpanded((open) => !open)}
        >
          <span>Workspace</span>
          <span aria-hidden className="text-[var(--ink)]">
            {expanded ? "−" : "+"}
          </span>
        </button>
      </div>

      <div
        className={`min-w-0 space-y-2.5 ${expanded ? "block" : "hidden lg:block"}`}
      >
        <div>
          <label
            htmlFor="active-profile"
            className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]"
          >
            Active profile
          </label>
          <select
            id="active-profile"
            className="w-full min-w-0 rounded-lg border border-[var(--hairline)] bg-[var(--elevated)] px-2.5 py-2 text-sm text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
            value={activeProfile?.id ?? ""}
            disabled={!hydrated}
            onChange={(e) => setActiveProfileId(e.target.value)}
          >
            {state.profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <input
            className="input-field py-2 text-sm"
            placeholder="New profile name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="button"
            className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-ink)] transition hover:opacity-90"
            onClick={() => {
              const n = name.trim() || "New profile";
              addProfile(n);
              setName("");
            }}
          >
            Add profile
          </button>
        </div>

        {activeProfile && canRemove && (
          <button
            type="button"
            className="w-full rounded-lg border border-[var(--hairline)] px-2 py-1.5 text-xs text-[var(--muted)] hover:border-red-500/40 hover:text-red-400"
            onClick={() => {
              if (
                confirm(
                  `Delete profile “${activeProfile.name}”? Applications remain in your account; export a backup first if needed.`,
                )
              )
                removeProfile(activeProfile.id);
            }}
          >
            Remove current profile
          </button>
        )}

        <div className="grid grid-cols-2 gap-2 border-t border-[var(--hairline)] pt-2.5">
          <button
            type="button"
            className="rounded-lg border border-[var(--hairline)] px-2 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
            onClick={onExport}
          >
            Export backup
          </button>
          <label className="cursor-pointer rounded-lg border border-[var(--hairline)] px-2 py-1.5 text-center text-xs text-[var(--muted)] hover:text-[var(--ink)]">
            {busy ? "Importing…" : "Import backup"}
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              disabled={busy}
              onChange={(e) => void onImport(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
