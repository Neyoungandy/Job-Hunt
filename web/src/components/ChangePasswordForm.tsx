"use client";

import { useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  type User,
} from "firebase/auth";
import { PasswordField } from "@/components/PasswordField";
import { useAuth } from "@/context/AuthProvider";

function hasEmailPasswordProvider(user: User): boolean {
  return user.providerData.some((p) => p.providerId === "password");
}

function friendlyPasswordError(code: string): string {
  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Current password is incorrect.";
    case "auth/weak-password":
      return "New password must be at least 6 characters.";
    case "auth/requires-recent-login":
      return "For security, sign out and sign in again, then retry changing your password.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    default:
      return "Could not update password. Check your current password and try again.";
  }
}

export function ChangePasswordForm() {
  const { user, status } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  if (status === "loading") {
    return <p className="text-sm text-[var(--muted)]">Loading account…</p>;
  }

  if (!user) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Sign in to manage your password.
      </p>
    );
  }

  if (!user.email) {
    return (
      <p className="text-sm text-[var(--muted)]">
        This account has no email address. Password change is not available.
      </p>
    );
  }

  if (!hasEmailPasswordProvider(user)) {
    return (
      <p className="text-sm leading-relaxed text-[var(--muted)]">
        You signed in with a provider that does not use a JOB HUNT password (for
        example Google). Password changes are only available for email and
        password accounts.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({
        kind: "err",
        text: "New password must be at least 6 characters.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ kind: "err", text: "New passwords do not match." });
      return;
    }
    if (newPassword === currentPassword) {
      setMessage({
        kind: "err",
        text: "Choose a new password that is different from your current one.",
      });
      return;
    }

    setBusy(true);
    try {
      const email = user!.email!;
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(user!, credential);
      await updatePassword(user!, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({
        kind: "ok",
        text: "Password updated successfully. Use your new password next time you sign in.",
      });
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      setMessage({
        kind: "err",
        text: code
          ? friendlyPasswordError(code)
          : err instanceof Error
            ? err.message
            : "Could not update password.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
      <p className="text-sm text-[var(--muted)]">
        Signed in as{" "}
        <span className="font-medium text-[var(--ink)]">{user.email}</span>.
        Enter your current password to confirm it&apos;s you.
      </p>

      <PasswordField
        id="current-password"
        label="Current password"
        value={currentPassword}
        onChange={setCurrentPassword}
        autoComplete="current-password"
        required
        placeholder="Your current password"
        hint="Required to verify your identity before changing your password."
      />

      <PasswordField
        id="new-password"
        label="New password"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
        required
        minLength={6}
        placeholder="At least 6 characters"
      />

      <PasswordField
        id="confirm-new-password"
        label="Confirm new password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        required
        minLength={6}
        placeholder="Re-enter new password"
        matchWith={newPassword}
      />

      {message && (
        <p
          className={`whitespace-pre-wrap rounded-lg border px-3 py-2 text-sm ${
            message.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
          role="status"
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn-primary px-4 py-2 disabled:opacity-50"
      >
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
