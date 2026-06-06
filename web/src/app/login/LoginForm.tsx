"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { PasswordField } from "@/components/PasswordField";

type OauthFlags = { github: boolean; google: boolean };
type AuthMode = "signin" | "signup";

export function LoginForm({
  oauth,
  appOrigin,
  callbackUrl,
  initialMode = "signin",
}: {
  oauth: OauthFlags;
  appOrigin: string;
  callbackUrl: string;
  initialMode?: AuthMode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: AuthMode) {
    setMode(next);
    setMessage(null);
    setConfirmPassword("");
  }

  async function onEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (mode === "signup" && password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            name: name.trim() || undefined,
          }),
        });
        let data: { error?: string; detail?: string } = {};
        const rawText = await res.text();
        try {
          data = rawText
            ? (JSON.parse(rawText) as { error?: string; detail?: string })
            : {};
        } catch {
          data = {};
        }
        if (!res.ok) {
          const base =
            data.error ??
            `Could not create account (HTTP ${res.status}). If this persists, open the terminal where "npm run dev" is running and look for "[POST /api/register]".`;
          setMessage(
            data.detail ? `${base}\n\nDetails: ${data.detail}` : base,
          );
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        setMessage(
          mode === "signin"
            ? "Wrong email or password."
            : "Account was created but sign-in failed. Try signing in.",
        );
        return;
      }
      if (result?.ok && result.url) {
        router.push(result.url);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <div className="flex min-h-full flex-col items-center justify-center mesh-bg px-4 py-16">
      <div className="w-full max-w-md space-y-6 glass-panel animate-fade-up rounded-[var(--radius-lg)] p-8">
        <div className="flex flex-col items-center text-center">
          <BrandMark className="mb-4 h-12 w-12" />
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {isSignup
              ? "Set up your JOB HUNT workspace with email and password. You can add Google or GitHub later in settings."
              : "Sign in to your workspace with email and password, or use Google (Gmail) when enabled."}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Authentication mode"
          className="flex rounded-xl border border-[var(--hairline)] bg-[var(--canvas-2)]/60 p-1 text-sm font-semibold"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!isSignup}
            className={`flex-1 rounded-lg py-2.5 transition ${
              !isSignup
                ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
            onClick={() => switchMode("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignup}
            className={`flex-1 rounded-lg py-2.5 transition ${
              isSignup
                ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
            onClick={() => switchMode("signup")}
          >
            Create account
          </button>
        </div>

        {isSignup && (
          <div className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--ink)]">
            Enter your details below. Password must be at least 8 characters.
          </div>
        )}

        {(oauth.google || oauth.github) && !isSignup && (
          <div className="space-y-3">
            {oauth.google && (
              <button
                type="button"
                className="btn-secondary w-full py-3"
                disabled={busy}
                onClick={() => void signIn("google", { callbackUrl })}
              >
                Continue with Google
              </button>
            )}
            {oauth.github && (
              <button
                type="button"
                className="btn-secondary w-full py-3"
                disabled={busy}
                onClick={() => void signIn("github", { callbackUrl })}
              >
                Continue with GitHub
              </button>
            )}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[var(--hairline)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wide">
                <span className="bg-[var(--panel)] px-2 text-[var(--muted)]">
                  or email
                </span>
              </div>
            </div>
          </div>
        )}

        <form
          key={mode}
          className="space-y-4"
          onSubmit={(e) => void onEmailAuth(e)}
        >
          {isSignup && (
            <div>
              <label
                htmlFor="auth-name"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
              >
                Full name
              </label>
              <input
                id="auth-name"
                type="text"
                autoComplete="name"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
          )}
          <div>
            <label
              htmlFor="auth-email"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
            >
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <PasswordField
            id="auth-password"
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder={
              isSignup ? "At least 8 characters" : "Your password"
            }
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={isSignup ? 8 : undefined}
            hint={
              isSignup
                ? "Use the eye icon to preview what you typed."
                : "Tap the eye icon to check your password before signing in."
            }
          />
          {isSignup && (
            <PasswordField
              id="auth-confirm-password"
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
              minLength={8}
              matchWith={password}
            />
          )}
          {message && (
            <p className="whitespace-pre-wrap rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full py-3 disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : isSignup
                ? "Create account & sign in"
                : "Sign in with email"}
          </button>
        </form>

        {isSignup && (oauth.google || oauth.github) && (
          <p className="text-center text-xs text-[var(--muted)]">
            After creating your account, you can link Google or GitHub from the
            login screen.
          </p>
        )}

        <p className="text-center text-xs leading-relaxed text-[var(--muted)]">
          {oauth.google ? (
            <>
              Google sign-in uses{" "}
              <code className="text-[var(--accent)]">AUTH_GOOGLE_ID</code> and{" "}
              <code className="text-[var(--accent)]">AUTH_GOOGLE_SECRET</code>{" "}
              in <code className="text-[var(--accent)]">.env</code>. Redirect
              URI:{" "}
              <code className="break-all text-[var(--accent)]">
                {appOrigin}/api/auth/callback/google
              </code>
              .
            </>
          ) : (
            <>
              To enable Google, set{" "}
              <code className="text-[var(--accent)]">AUTH_GOOGLE_ID</code> and{" "}
              <code className="text-[var(--accent)]">AUTH_GOOGLE_SECRET</code>{" "}
              in <code className="text-[var(--accent)]">.env</code>.
            </>
          )}{" "}
          {oauth.github ? (
            <>
              GitHub is optional (
              <code className="text-[var(--accent)]">AUTH_GITHUB_*</code>
              ).
            </>
          ) : null}
        </p>

        <Link
          href="/"
          className="block text-center text-sm text-[var(--muted)] hover:text-[var(--accent)]"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
