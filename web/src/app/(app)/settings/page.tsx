"use client";

import { useApp } from "@/context/AppProvider";

export default function SettingsPage() {
  const { hydrated, state, setApplyMode } = useApp();

  if (!hydrated) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Apply workflow
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Third-party job sites (LinkedIn, Indeed, Workday, Greenhouse, etc.)
          generally forbid unattended bots submitting forms on your behalf. That
          practice can get accounts restricted and produces low-quality
          applications. This app instead supports a clear{" "}
          <span className="font-semibold text-[var(--ink)]">manual</span> path and
          an{" "}
          <span className="font-semibold text-[var(--ink)]">assisted</span> path
          that still leaves the final click with you on the real employer page.
        </p>
      </div>

      <fieldset className="space-y-4 rounded-2xl border border-[var(--hairline)] bg-[var(--panel)] p-5">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Mode
        </legend>

        <label className="flex cursor-pointer gap-3 rounded-xl border border-transparent p-3 hover:bg-[var(--elevated)] has-[:checked]:border-[var(--accent)]/40 has-[:checked]:bg-[var(--accent-soft)]">
          <input
            type="radio"
            name="applyMode"
            className="mt-1"
            checked={state.applyMode === "manual"}
            onChange={() => setApplyMode("manual")}
          />
          <div>
            <p className="font-medium text-[var(--ink)]">Manual</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              You copy tailored resume and cover letter yourself, then open the
              apply link when you are ready.
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer gap-3 rounded-xl border border-transparent p-3 hover:bg-[var(--elevated)] has-[:checked]:border-[var(--accent)]/40 has-[:checked]:bg-[var(--accent-soft)]">
          <input
            type="radio"
            name="applyMode"
            className="mt-1"
            checked={state.applyMode === "assisted"}
            onChange={() => setApplyMode("assisted")}
          />
          <div>
            <p className="font-medium text-[var(--ink)]">Assisted (recommended)</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              When you save a job to the pipeline, the app copies a single
              package (tailored resume + cover letter) to your clipboard and
              opens the official apply page in a new tab. You paste into their
              form and submit — so you stay compliant and in control.
            </p>
          </div>
        </label>
      </fieldset>

      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-[var(--muted)]">
        <p className="font-medium text-red-200/90">What we do not offer</p>
        <p className="mt-2">
          There is no supported way to have the app silently log in to external
          sites and press &quot;Submit&quot; for you. That would violate typical
          terms of use, break often when sites change, and put your reputation
          at risk. If a vendor claims otherwise, read their terms and your local
          laws carefully.
        </p>
      </div>
    </div>
  );
}
