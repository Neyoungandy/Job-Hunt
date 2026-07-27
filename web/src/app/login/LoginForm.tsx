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
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      details?: string;
    };

    throw new Error(
      data.details
        ? `${data.error ?? "Session failed"}\n\n${data.details}`
        : (data.error ??
            "You signed in successfully, but the server session could not be created. Please try again."),
    );
  }
}

function friendlyAuthError(code: string, mode: AuthMode): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password. Please check your credentials and try again.";

    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";

    case "auth/weak-password":
      return "Your password must contain at least 6 characters.";

    case "auth/missing-password":
      return "Please enter your password.";

    case "auth/missing-email":
      return "Please enter your email address.";

    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";

    case "auth/too-many-requests":
      return "Too many unsuccessful attempts. Please wait a few minutes and try again.";

    case "auth/network-request-failed":
      return "Unable to connect. Please check your internet connection and try again.";

    case "auth/configuration-not-found":
    case "auth/operation-not-allowed":
      return "Email and password authentication is currently unavailable. Please contact the administrator.";

    default:
      return mode === "signup"
        ? "We could not create your account. Please check your information and try again."
        : "We could not sign you in. Please check your information and try again.";
  }
}

function getErrorCode(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return "";
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

  const isSignup = mode === "signup";

  function clearMessage() {
    if (message !== null) {
      setMessage(null);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function onEmailAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!normalizedEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    if (!password) {
      setMessage("Please enter your password.");
      return;
    }

    if (isSignup && password.length < 6) {
      setMessage("Your password must contain at least 6 characters.");
      return;
    }

    if (isSignup && password !== confirmPassword) {
      setMessage("Passwords do not match. Please enter them again.");
      return;
    }

    setBusy(true);

    try {
      const auth = getFirebaseAuth();

      let idToken: string;

      if (isSignup) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          normalizedEmail,
          password,
        );

        if (trimmedName) {
          await updateProfile(credential.user, {
            displayName: trimmedName,
          });
        }

        idToken = await credential.user.getIdToken(true);
      } else {
        const credential = await signInWithEmailAndPassword(
          auth,
          normalizedEmail,
          password,
        );

        idToken = await credential.user.getIdToken(true);
      }

      await establishSession(idToken);

      router.push(callbackUrl);
      router.refresh();
    } catch (error: unknown) {
      const errorCode = getErrorCode(error);

      if (errorCode) {
        setMessage(friendlyAuthError(errorCode, mode));
      } else if (error instanceof Error) {
        /*
         * Errors from establishSession() are already written in
         * user-friendly language, so they may be displayed safely.
         */
        setMessage(error.message);
      } else {
        setMessage(
          isSignup
            ? "We could not create your account. Please try again."
            : "We could not sign you in. Please try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mesh-bg flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="glass-panel animate-fade-up w-full max-w-md space-y-6 rounded-[var(--radius-lg)] p-8">
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
            disabled={busy}
            className={`flex-1 rounded-lg py-2.5 transition disabled:cursor-not-allowed disabled:opacity-60 ${
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
            disabled={busy}
            className={`flex-1 rounded-lg py-2.5 transition disabled:cursor-not-allowed disabled:opacity-60 ${
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

        <form key={mode} className="space-y-4" onSubmit={onEmailAuth}>
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
                disabled={busy}
                onChange={(event) => {
                  setName(event.target.value);
                  clearMessage();
                }}
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
              autoFocus
              autoComplete="email"
              className="input-field"
              value={email}
              disabled={busy}
              aria-invalid={Boolean(message)}
              aria-describedby={message ? "auth-error" : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                clearMessage();
              }}
              placeholder="you@example.com"
            />
          </div>

          <PasswordField
            id="auth-password"
            label="Password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              clearMessage();
            }}
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
              onChange={(value) => {
                setConfirmPassword(value);
                clearMessage();
              }}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
              minLength={6}
              matchWith={password}
            />
          )}

          {message && (
            <div
              id="auth-error"
              role="alert"
              aria-live="assertive"
              className="whitespace-pre-wrap rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-center text-sm leading-relaxed text-red-300"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? isSignup
                ? "Creating account…"
                : "Signing in…"
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