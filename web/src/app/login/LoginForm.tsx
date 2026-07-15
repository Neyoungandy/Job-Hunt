"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { BrandMark } from "@/components/BrandMark";
import { PasswordField } from "@/components/PasswordField";
import { getFirebaseAuth } from "@/lib/firebase/client";

type AuthMode = "signin" | "signup";

async function establishSession(idToken: string) {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      details?: string;
    };
    throw new Error(
      data.details
        ? `${data.error ?? "Session failed"}\n\n${data.details}`
        : (data.error ??
            "Signed in with Firebase but could not start a server session. Check Firebase Admin keys in .env."),
    );
  }
}

function friendlyAuthError(code: string): string {
  switch (code) {
    case "auth/configuration-not-found":
    case "auth/operation-not-allowed":
      return [
        "Email/password sign-in is not enabled for this Firebase project.",
        "",
        "In Firebase Console → Authentication → Sign-in method:",
        "1. Click Get started (if shown)",
        "2. Enable Email/Password",
        "3. Save, then try again",
      ].join("\n");
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    default:
      return "Authentication failed. Check your details and try again.";
  }
}

export function LoginForm({
  callbackUrl,
  initialMode = "signin",
}: {
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
      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error("Firebase is not initialized. Check NEXT_PUBLIC_FIREBASE_* env vars.");
      }
      
      const normalizedEmail = email.trim().toLowerCase();

      let idToken: string;
      if (mode === "signup") {
        console.log("[LoginForm] Creating user with email:", normalizedEmail);
        const cred = await createUserWithEmailAndPassword(
          auth,
          normalizedEmail,
          password,
        );
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
        idToken = await cred.user.getIdToken(true);
        console.log("[LoginForm] Got ID token (length:", idToken.length, ")");
      } else {
        console.log("[LoginForm] Signing in with email:", normalizedEmail);
        const cred = await signInWithEmailAndPassword(
          auth,
          normalizedEmail,
          password,
        );
        idToken = await cred.user.getIdToken(true);
        console.log("[LoginForm] Got ID token (length:", idToken.length, ")");
      }

      console.log("[LoginForm] Establishing session...");
      await establishSession(idToken);
      console.log("[LoginForm] Session established, redirecting...");
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      const message = code
        ? friendlyAuthError(code)
        : err instanceof Error
          ? err.message
          : "Something went wrong.";
      console.error("[LoginForm] Error:", message, err);
      setMessage(message);
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
              ? "Set up your JOB HUNT workspace with email and password."
              : "Sign in to your workspace with email and password."}
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
            Enter your details below. Password must be at least 6 characters.
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
              isSignup ? "At least 6 characters" : "Your password"
            }
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={isSignup ? 6 : undefined}
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
              minLength={6}
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

        <p className="text-center text-xs leading-relaxed text-[var(--muted)]">
          Accounts are stored securely with Firebase Authentication.
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
