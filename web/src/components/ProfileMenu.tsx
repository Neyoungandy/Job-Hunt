"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useApp } from "@/context/AppProvider";
import { exportStateBlob, importStateFromJson } from "@/lib/storage";

export function ProfileMenu() {
  const { data: session } = useSession();
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
    <div className="flex flex-col gap-2 lg:w-full">
      {session?.user && (
        <div className="rounded-lg border border-[var(--hairline)] bg-[var(--elevated)] px-2 py-2 text-xs text-[var(--muted)]">
          <p className="truncate font-medium text-[var(--ink)]">
            {session.user.name ?? session.user.email ?? "Signed in"}
          </p>
          {session.user.email && (
            <p className="truncate text-[10px]">{session.user.email}</p>
          )}
          <button
            type="button"
            className="mt-2 w-full rounded-lg border border-[var(--hairline)] py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] hover:text-[var(--ink)]"
            onClick={() => void signOut({ callbackUrl: "/" })}
          >
            Sign out
          </button>
        </div>
      )}
      <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        Active profile
      </label>
      <select
        className="rounded-lg border border-[var(--hairline)] bg-[var(--elevated)] px-2 py-2 text-sm text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
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
      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[6rem] flex-1 rounded-lg border border-[var(--hairline)] bg-[var(--elevated)] px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
          placeholder="New profile name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--accent-ink)] transition hover:opacity-90"
          onClick={() => {
            const n = name.trim() || "New profile";
            addProfile(n);
            setName("");
          }}
        >
          Add
        </button>
      </div>
      {activeProfile && canRemove && (
        <button
          type="button"
          className="rounded-lg border border-[var(--hairline)] px-2 py-1.5 text-xs text-[var(--muted)] hover:border-red-500/40 hover:text-red-400"
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
      <div className="flex flex-wrap gap-2 border-t border-[var(--hairline)] pt-2">
        <button
          type="button"
          className="rounded-lg border border-[var(--hairline)] px-2 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
          onClick={onExport}
        >
          Export backup
        </button>
        <label className="cursor-pointer rounded-lg border border-[var(--hairline)] px-2 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--ink)]">
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
  );
}
