import Link from "next/link";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default function SecuritySettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/settings"
          className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
        >
          ← Back to settings
        </Link>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">
          Security
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Update the password for your JOB HUNT account. This applies to email
          sign-in only — you will use the new password on the login page.
        </p>
      </div>

      <section className="card p-5">
        <h2 className="section-label">Change password</h2>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--panel)]/60 p-5 text-sm text-[var(--muted)]">
        <p className="font-medium text-[var(--ink)]">Tips</p>
        <ul className="mt-2 list-inside list-disc space-y-1 leading-relaxed">
          <li>Use a unique password you do not reuse on other sites.</li>
          <li>
            If you forget your password, contact support or use Firebase
            password reset from the login flow when available.
          </li>
          <li>
            Job-search profiles and resumes are separate from your login — they
            live in your workspace, not in this password form.
          </li>
        </ul>
      </section>
    </div>
  );
}
