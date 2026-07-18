import type { AppPersistedState, SavedApplication, UserProfile } from "./types";

export function exportStateBlob(state: AppPersistedState): Blob {
  return new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
}

export function importStateFromJson(text: string): AppPersistedState {
  const parsed = JSON.parse(text) as Partial<AppPersistedState> &
    Record<string, unknown>;
  if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
    throw new Error("Invalid backup");
  }
  const version = parsed.version ?? 1;
  if (version !== 1) throw new Error("Unsupported backup version");

  const applications = Array.isArray(parsed.applications)
    ? (parsed.applications as SavedApplication[]).map((a) => ({
        ...a,
        coverLetter:
          typeof a.coverLetter === "string" ? a.coverLetter : "",
        appliedAt: a.appliedAt ?? null,
        nextFollowUp: a.nextFollowUp ?? null,
      }))
    : [];

  const profiles = (parsed.profiles as UserProfile[]).map((p) => ({
    id: p.id,
    name: p.name,
    headline: p.headline ?? "",
    baseResume: p.baseResume ?? "",
    avatarDataUrl: p.avatarDataUrl,
    resumePdfFileName: p.resumePdfFileName,
    createdAt: p.createdAt ?? new Date().toISOString(),
    customRoles: p.customRoles,
    disabledBuiltInRoleIds: p.disabledBuiltInRoleIds,
  }));

  const active =
    profiles.find((p) => p.id === parsed.activeProfileId) ?? profiles[0];

  return {
    version: 1,
    applyMode: parsed.applyMode === "assisted" ? "assisted" : "manual",
    activeProfileId: parsed.activeProfileId ?? active.id,
    profiles,
    customRoles:
      parsed.customRoles ??
      active.customRoles ??
      [],
    disabledBuiltInRoleIds:
      parsed.disabledBuiltInRoleIds ??
      active.disabledBuiltInRoleIds ??
      [],
    applications,
  };
}
