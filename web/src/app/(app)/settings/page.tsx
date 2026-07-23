import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Manage your account security and how JOB HUNT helps you apply to jobs.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/settings/security"
          className="card-interactive group block p-5"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-lg text-[var(--accent)]">
            ⛨
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold text-[var(--ink)] group-hover:text-[var(--accent)]">
            Security
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Change your sign-in password and keep your account secure.
          </p>
        </Link>

        <Link
          href="/settings/apply"
          className="card-interactive group block p-5"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-lg text-[var(--accent)]">
            ⚙
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold text-[var(--ink)] group-hover:text-[var(--accent)]">
            Apply workflow
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Choose manual or assisted mode when saving jobs to your pipeline.
          </p>
        </Link>
      </div>
    </div>
  );
}
