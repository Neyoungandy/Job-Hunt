"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppProvider";
import { DEFAULT_ROLES } from "@/lib/default-roles";
import { buildRoleKeywords } from "@/lib/role-keywords";
import { RoleTrackIcon } from "@/components/RoleTrackIcon";
import { RolesHero } from "@/components/illustrations/RolesHero";

export default function RolesPage() {
  const {
    hydrated,
    roles,
    state,
    addCustomRole,
    updateCustomRole,
    removeCustomRole,
    toggleBuiltInRole,
  } = useApp();
  const [label, setLabel] = useState("");
  const [keywords, setKeywords] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const builtInList = useMemo(() => DEFAULT_ROLES, []);
  const enabledCount = builtInList.filter(
    (r) => !state.disabledBuiltInRoleIds.includes(r.id),
  ).length;

  async function saveCustomRole() {
    const trimmed = label.trim();
    if (!trimmed) {
      setSaveMsg({ kind: "err", text: "Enter a role name first." });
      return;
    }
    const extra = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    setSaveBusy(true);
    setSaveMsg(null);
    try {
      await addCustomRole(trimmed, extra);
      setLabel("");
      setKeywords("");
      setSaveMsg({
        kind: "ok",
        text: `“${trimmed}” added — included in job search now.`,
      });
    } catch (e) {
      setSaveMsg({
        kind: "err",
        text:
          e instanceof Error
            ? e.message
            : "Could not save role. Check your connection and try again.",
      });
    } finally {
      setSaveBusy(false);
    }
  }

  if (!hydrated) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_200px] lg:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Role interests
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Built-in tracks match your original list. Click any role to enable or
            disable it — the whole row is clickable. Add custom roles whenever your
            goals change.
          </p>
          <p className="mt-3 text-xs text-[var(--accent)]">
            {enabledCount} of {builtInList.length} built-in tracks active
          </p>
        </div>
        <RolesHero className="hidden h-28 sm:block lg:h-32" />
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Built-in tracks
        </h2>
        <ul className="space-y-2">
          {builtInList.map((r) => {
            const enabled = !state.disabledBuiltInRoleIds.includes(r.id);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => toggleBuiltInRole(r.id, !enabled)}
                  title={
                    enabled
                      ? `Click to disable ${r.label}`
                      : `Click to enable ${r.label}`
                  }
                  aria-pressed={enabled}
                  className={`role-toggle flex w-full cursor-pointer flex-col gap-3 rounded-2xl border p-4 text-left sm:flex-row sm:items-center sm:justify-between ${
                    enabled
                      ? "border-[var(--accent)]/20 bg-[var(--panel)]"
                      : "border-[var(--hairline)] bg-[var(--panel)]/60 opacity-80"
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-3 sm:items-center">
                    <RoleTrackIcon roleId={r.id} />
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--ink)]">{r.label}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Keywords: {r.keywords.slice(0, 6).join(", ")}
                        {r.keywords.length > 6 ? "…" : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`role-toggle-chip shrink-0 self-start rounded-xl px-4 py-2 text-sm font-semibold sm:self-center ${
                      enabled
                        ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                        : "border border-[var(--hairline)] bg-[var(--elevated)] text-[var(--muted)]"
                    }`}
                  >
                    {enabled ? "Enabled" : "Disabled"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--hairline)] bg-[var(--panel)] p-5">
        <h2 className="font-display text-lg font-semibold">Add a custom role</h2>
        <p className="text-sm text-[var(--muted)]">
          Name any field you care about — bookkeeping, nursing, data analyst, etc.
          Keywords are optional; we auto-generate them from the name. Your custom
          role is included in job search immediately alongside enabled built-in
          tracks.
        </p>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void saveCustomRole();
          }}
        >
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Role name
            </label>
            <input
              className="input-field"
              placeholder="e.g. Bookkeeping, DevRel, Data Analyst"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setSaveMsg(null);
              }}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Extra keywords (optional)
            </label>
            <input
              className="input-field"
              placeholder="bookkeeper, accounts payable, quickbooks"
              value={keywords}
              onChange={(e) => {
                setKeywords(e.target.value);
                setSaveMsg(null);
              }}
            />
            {label.trim() && (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Will search for:{" "}
                <span className="text-[var(--accent)]">
                  {buildRoleKeywords(
                    label,
                    keywords
                      .split(",")
                      .map((k) => k.trim())
                      .filter(Boolean),
                  ).join(", ")}
                </span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saveBusy || !label.trim()}
              className="btn-primary px-4 py-2 disabled:opacity-50"
            >
              {saveBusy ? "Saving…" : "Save custom role"}
            </button>
            {saveMsg && (
              <p
                className={`text-sm ${
                  saveMsg.kind === "ok"
                    ? "text-emerald-400/90"
                    : "text-[var(--warning)]"
                }`}
                role="status"
              >
                {saveMsg.text}
              </p>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Your custom roles
        </h2>
        {state.customRoles.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            None yet — add a role above (e.g. Bookkeeping) and it will appear here
            and in Job search.
          </p>
        ) : (
          <ul className="space-y-3">
            {state.customRoles.map((r) => (
              <CustomRoleRow
                key={r.id}
                role={r}
                onSave={(patch) => updateCustomRole(r.id, patch)}
                onRemove={() => removeCustomRole(r.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-[var(--muted)]">
        Active merged roles in search: {roles.length}
      </p>
    </div>
  );
}

function CustomRoleRow({
  role,
  onSave,
  onRemove,
}: {
  role: { id: string; label: string; keywords: string[] };
  onSave: (patch: { label?: string; keywords?: string[] }) => void;
  onRemove: () => void;
}) {
  const [label, setLabel] = useState(role.label);
  const [kw, setKw] = useState(role.keywords.join(", "));

  return (
    <li className="rounded-2xl border border-[var(--hairline)] bg-[var(--panel)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="input-field flex-1"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary px-3 py-2 text-sm"
            onClick={() =>
              onSave({
                label: label.trim(),
                keywords: kw
                  .split(",")
                  .map((k) => k.trim())
                  .filter(Boolean),
              })
            }
          >
            Update
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-xl border border-red-500/30 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10"
            onClick={onRemove}
          >
            Remove
          </button>
        </div>
      </div>
      <textarea
        className="input-field mt-3 min-h-[4rem] font-mono text-xs"
        rows={2}
        value={kw}
        onChange={(e) => setKw(e.target.value)}
      />
    </li>
  );
}
