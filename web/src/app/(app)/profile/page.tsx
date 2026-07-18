"use client";

import { useState } from "react";
import { useSession } from "@/context/AuthProvider";
import { useApp } from "@/context/AppProvider";
import { exportStateBlob, importStateFromJson } from "@/lib/storage";
import type { UserProfile } from "@/lib/types";

type Message = { kind: "ok" | "err"; text: string } | null;

export default function ProfilePage() {
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
  const [newProfileName, setNewProfileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const canRemove = state.profiles.length > 1 && !!activeProfile;

  if (!hydrated) {
    return <p className="text-sm text-[var(--muted)]">Loading profile...</p>;
  }

  const accountImage = activeProfile?.avatarDataUrl ?? session?.user?.image;

  function createProfile() {
    const name = newProfileName.trim();
    if (!name) {
      setMessage({ kind: "err", text: "Enter a profile name first." });
      return;
    }
    addProfile(name);
    setNewProfileName("");
    setMessage({ kind: "ok", text: `"${name}" created.` });
  }

  function exportBackup() {
    const blob = exportStateBlob(state);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `job-hunt-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importBackup(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const text = await file.text();
      replaceState(importStateFromJson(text));
      setMessage({ kind: "ok", text: "Backup imported." });
    } catch {
      setMessage({
        kind: "err",
        text: "Could not import that file. Check it is a JOB HUNT backup.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Profile
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Manage the account you are signed in with, switch between job-search
          profiles, and keep your workspace backup under control.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <div className="card p-5">
          <h2 className="section-label">Account</h2>
          <div className="mt-4 flex items-center gap-3">
            {accountImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={accountImage}
                alt=""
                className="h-12 w-12 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">
                {(session?.user?.name ?? session?.user?.email ?? "U")
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium text-[var(--ink)]">
                {session?.user?.name ?? "Signed in"}
              </p>
              <p className="truncate text-sm text-[var(--muted)]">
                {session?.user?.email ?? "No email available"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary mt-5 w-full"
            onClick={() => {
              void signOut().then(() => {
                window.location.href = "/";
              });
            }}
          >
            Sign out
          </button>
        </div>

        <CurrentProfileForm
          key={activeProfile?.id ?? "none"}
          profiles={state.profiles}
          activeProfile={activeProfile}
          canRemove={canRemove}
          onSelect={setActiveProfileId}
          onRemove={removeProfile}
          onMessage={setMessage}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <form
          className="card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            createProfile();
          }}
        >
          <h2 className="section-label">New profile</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Use separate profiles for different target roles, locations, or
            resumes.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              className="input-field"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="e.g. Product roles"
            />
            <button type="submit" className="btn-primary shrink-0">
              Add
            </button>
          </div>
        </form>

        <div className="card p-5">
          <h2 className="section-label">Backup</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Export your full workspace or restore a previous JOB HUNT backup.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="btn-secondary" onClick={exportBackup}>
              Export backup
            </button>
            <label className="btn-secondary cursor-pointer">
              {busy ? "Importing..." : "Import backup"}
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                disabled={busy}
                onChange={(e) => void importBackup(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-label">All profiles</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {state.profiles.map((profile) => {
            const active = profile.id === activeProfile?.id;
            return (
              <li key={profile.id}>
                <button
                  type="button"
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-[var(--accent)]/40 bg-[var(--accent-soft)]"
                      : "border-[var(--hairline)] bg-[var(--panel)] hover:border-[var(--accent)]/30"
                  }`}
                  onClick={() => setActiveProfileId(profile.id)}
                >
                  <div className="flex items-start gap-3">
                    <ProfileAvatar profile={profile} className="h-10 w-10" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--ink)]">
                        {profile.name}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                        {profile.headline || "No headline yet"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    {profile.resumePdfFileName
                      ? `Resume: ${profile.resumePdfFileName}`
                      : "No resume import yet"}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {message && (
        <p
          className={message.kind === "ok" ? "toast-success" : "text-sm text-[var(--warning)]"}
          role="status"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

function CurrentProfileForm({
  profiles,
  activeProfile,
  canRemove,
  onSelect,
  onRemove,
  onMessage,
}: {
  profiles: UserProfile[];
  activeProfile: UserProfile | null;
  canRemove: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onMessage: (message: Message) => void;
}) {
  const { upsertProfile } = useApp();
  const [profileName, setProfileName] = useState(activeProfile?.name ?? "");
  const [headline, setHeadline] = useState(activeProfile?.headline ?? "");
  const [avatarDataUrl, setAvatarDataUrl] = useState(
    activeProfile?.avatarDataUrl ?? "",
  );
  const [busy, setBusy] = useState(false);

  async function saveProfileDetails() {
    if (!activeProfile) return;
    const name = profileName.trim();
    if (!name) {
      onMessage({ kind: "err", text: "Profile name is required." });
      return;
    }
    setBusy(true);
    onMessage(null);
    try {
      await upsertProfile({
        id: activeProfile.id,
        name,
        headline: headline.trim(),
        avatarDataUrl,
      });
      onMessage({ kind: "ok", text: "Profile details saved." });
    } catch (e) {
      onMessage({
        kind: "err",
        text: e instanceof Error ? e.message : "Could not save profile.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void saveProfileDetails();
      }}
    >
      <h2 className="section-label">Current profile</h2>
      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Active profile
          </label>
          <select
            className="input-field"
            value={activeProfile?.id ?? ""}
            onChange={(e) => onSelect(e.target.value)}
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Photo
          </label>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--hairline)] bg-white/[0.03] p-3">
            {avatarDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarDataUrl}
                alt=""
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <ProfileAvatar
                profile={{
                  name: profileName || "Profile",
                }}
                className="h-16 w-16"
              />
            )}
            <div className="flex flex-wrap gap-2">
              <label className="btn-secondary cursor-pointer px-3 py-2 text-sm">
                Choose image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    e.currentTarget.value = "";
                    void loadAvatar(file)
                      .then((next) => {
                        if (next) setAvatarDataUrl(next);
                      })
                      .catch((err) => {
                        onMessage({
                          kind: "err",
                          text:
                            err instanceof Error
                              ? err.message
                              : "Could not read that image.",
                        });
                      });
                  }}
                />
              </label>
              {avatarDataUrl && (
                <button
                  type="button"
                  className="btn-secondary px-3 py-2 text-sm"
                  onClick={() => setAvatarDataUrl("")}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Profile name
          </label>
          <input
            className="input-field"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Main profile"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Headline
          </label>
          <input
            className="input-field"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Full-stack engineer, data analyst, operations lead..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="btn-primary"
            disabled={busy || !activeProfile}
          >
            {busy ? "Saving..." : "Save profile"}
          </button>
          {canRemove && (
            <button
              type="button"
              className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
              onClick={() => {
                if (
                  activeProfile &&
                  confirm(`Delete profile "${activeProfile.name}"?`)
                ) {
                  onRemove(activeProfile.id);
                  onMessage({ kind: "ok", text: "Profile deleted." });
                }
              }}
            >
              Delete current
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function ProfileAvatar({
  profile,
  className,
}: {
  profile: Pick<UserProfile, "name" | "avatarDataUrl">;
  className: string;
}) {
  if (profile.avatarDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatarDataUrl}
        alt=""
        className={`${className} shrink-0 rounded-2xl object-cover`}
      />
    );
  }

  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]`}
    >
      {(profile.name || "P").slice(0, 1).toUpperCase()}
    </div>
  );
}

async function loadAvatar(file: File | null) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 8 MB.");
  }

  const original = await readFileAsDataUrl(file);
  const image = await loadImage(original);
  const max = 512;
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare that image.");
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load that image."));
    image.src = src;
  });
}
