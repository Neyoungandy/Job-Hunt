import { getAdminDb } from "@/lib/firebase/admin";
import { DEFAULT_ROLES, type RoleDefinition } from "@/lib/default-roles";
import { buildRoleKeywords } from "@/lib/role-keywords";
import type { ApplyMode, SavedApplication, UserProfile } from "@/lib/types";

type ProfileDoc = {
  name: string;
  headline: string;
  baseResume: string;
  avatarDataUrl: string | null;
  resumePdfFileName: string | null;
  customRolesJson: string;
  disabledBuiltInJson: string;
  createdAt: string;
};

type ApplicationDoc = {
  profileId: string | null;
  source: string;
  title: string;
  company: string;
  url: string;
  category: string | null;
  jobType: string | null;
  status: string;
  notes: string;
  tailoredResume: string;
  coverLetter: string;
  jobDescriptionSnippet: string;
  savedAt: string;
  appliedAt: string | null;
  nextFollowUp: string | null;
};

type SettingsDoc = {
  applyMode: string;
  activeProfileId: string | null;
};

export type WorkspacePayload = {
  applyMode: ApplyMode;
  activeProfileId: string | null;
  profiles: (UserProfile & {
    customRoles: RoleDefinition[];
    disabledBuiltInRoleIds: string[];
  })[];
  applications: (SavedApplication & {
    appliedAt: string | null;
    nextFollowUp: string | null;
  })[];
};

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function workspaceRef(userId: string) {
  return getAdminDb().collection("workspaces").doc(userId);
}

function profilesRef(userId: string) {
  return workspaceRef(userId).collection("profiles");
}

function applicationsRef(userId: string) {
  return workspaceRef(userId).collection("applications");
}

function mapProfile(
  id: string,
  p: ProfileDoc,
): UserProfile & {
  customRoles: RoleDefinition[];
  disabledBuiltInRoleIds: string[];
} {
  const customRoles = parseJson<RoleDefinition[]>(p.customRolesJson, []).map(
    (r) => ({ ...r, builtIn: false }),
  );
  const disabledBuiltInRoleIds = parseJson<string[]>(
    p.disabledBuiltInJson,
    [],
  );
  return {
    id,
    name: p.name,
    headline: p.headline,
    baseResume: p.baseResume,
    avatarDataUrl: p.avatarDataUrl ?? undefined,
    resumePdfFileName: p.resumePdfFileName ?? undefined,
    createdAt: p.createdAt,
    customRoles,
    disabledBuiltInRoleIds,
  };
}

function mapApplication(
  id: string,
  a: ApplicationDoc,
): SavedApplication & {
  appliedAt: string | null;
  nextFollowUp: string | null;
} {
  return {
    id,
    profileId: a.profileId ?? undefined,
    source: a.source,
    title: a.title,
    company: a.company,
    url: a.url,
    category: a.category ?? undefined,
    jobType: a.jobType ?? undefined,
    status: a.status as SavedApplication["status"],
    notes: a.notes,
    tailoredResume: a.tailoredResume,
    coverLetter: a.coverLetter,
    jobDescriptionSnippet: a.jobDescriptionSnippet,
    savedAt: a.savedAt,
    appliedAt: a.appliedAt,
    nextFollowUp: a.nextFollowUp,
  };
}

async function readSettings(userId: string): Promise<SettingsDoc> {
  const snap = await workspaceRef(userId).get();
  const data = snap.data() as SettingsDoc | undefined;
  return {
    applyMode: data?.applyMode === "assisted" ? "assisted" : "manual",
    activeProfileId: data?.activeProfileId ?? null,
  };
}

async function writeSettings(userId: string, patch: Partial<SettingsDoc>) {
  await workspaceRef(userId).set(patch, { merge: true });
}

async function listProfiles(userId: string) {
  const snap = await profilesRef(userId).orderBy("createdAt", "asc").get();
  return snap.docs.map((d) => ({
    id: d.id,
    data: d.data() as ProfileDoc,
  }));
}

async function listApplications(userId: string) {
  const snap = await applicationsRef(userId).orderBy("savedAt", "desc").get();
  return snap.docs.map((d) => ({
    id: d.id,
    data: d.data() as ApplicationDoc,
  }));
}

export async function ensureWorkspace(userId: string) {
  let settings = await readSettings(userId);
  let profiles = await listProfiles(userId);

  if (profiles.length === 0) {
    const ref = profilesRef(userId).doc();
    const createdAt = new Date().toISOString();
    const profile: ProfileDoc = {
      name: "My profile",
      headline: "",
      baseResume: "",
      avatarDataUrl: null,
      resumePdfFileName: null,
      customRolesJson: "[]",
      disabledBuiltInJson: "[]",
      createdAt,
    };
    await ref.set(profile);
    await writeSettings(userId, {
      applyMode: settings.applyMode || "manual",
      activeProfileId: ref.id,
    });
    settings = await readSettings(userId);
    profiles = await listProfiles(userId);
  }

  const activeOk =
    settings.activeProfileId &&
    profiles.some((p) => p.id === settings.activeProfileId);
  if (!activeOk && profiles[0]) {
    await writeSettings(userId, { activeProfileId: profiles[0].id });
    settings = await readSettings(userId);
  }

  return { settings, profiles };
}

export async function getWorkspace(userId: string): Promise<WorkspacePayload> {
  const { settings, profiles } = await ensureWorkspace(userId);
  const applications = await listApplications(userId);
  return {
    applyMode: settings.applyMode === "assisted" ? "assisted" : "manual",
    activeProfileId: settings.activeProfileId,
    profiles: profiles.map((p) => mapProfile(p.id, p.data)),
    applications: applications.map((a) => mapApplication(a.id, a.data)),
  };
}

type PostBody =
  | { action: "setActiveProfile"; profileId: string }
  | { action: "setApplyMode"; applyMode: ApplyMode }
  | { action: "createProfile"; name: string }
  | {
      action: "updateProfile";
      id: string;
      patch: Partial<
        Pick<
          UserProfile,
          "name" | "headline" | "baseResume" | "resumePdfFileName" | "avatarDataUrl"
        >
      >;
    }
  | { action: "deleteProfile"; id: string }
  | { action: "addCustomRole"; label: string; keywords: string[] }
  | {
      action: "updateCustomRole";
      id: string;
      patch: Partial<Pick<RoleDefinition, "label" | "keywords">>;
    }
  | { action: "removeCustomRole"; id: string }
  | { action: "toggleBuiltInRole"; id: string; enabled: boolean }
  | {
      action: "createApplication";
      app: Omit<
        SavedApplication,
        "id" | "savedAt" | "profileId" | "appliedAt" | "nextFollowUp"
      > & { profileId?: string };
    }
  | {
      action: "updateApplication";
      id: string;
      patch: Partial<SavedApplication>;
    }
  | { action: "deleteApplication"; id: string }
  | { action: "importBackup"; state: unknown };

function profileById(
  profiles: { id: string; data: ProfileDoc }[],
  id: string,
) {
  return profiles.find((p) => p.id === id);
}

function readCustomRoles(profile: ProfileDoc) {
  return parseJson<RoleDefinition[]>(profile.customRolesJson, []);
}

function readDisabled(profile: ProfileDoc) {
  return parseJson<string[]>(profile.disabledBuiltInJson, []);
}

export async function mutateWorkspace(
  userId: string,
  body: PostBody,
): Promise<WorkspacePayload | { error: string; status: number }> {
  const { settings, profiles } = await ensureWorkspace(userId);
  const activeProfileId = settings.activeProfileId ?? profiles[0]?.id;
  const activeProfileEntry = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  if (!activeProfileEntry) {
    return { error: "No profile", status: 400 };
  }

  switch (body.action) {
    case "setActiveProfile": {
      if (!profiles.some((p) => p.id === body.profileId)) {
        return { error: "Invalid profile", status: 400 };
      }
      await writeSettings(userId, { activeProfileId: body.profileId });
      break;
    }
    case "setApplyMode": {
      await writeSettings(userId, { applyMode: body.applyMode });
      break;
    }
    case "createProfile": {
      const ref = profilesRef(userId).doc();
      await ref.set({
        name: body.name.trim() || "New profile",
        headline: "",
        baseResume: "",
        avatarDataUrl: null,
        resumePdfFileName: null,
        customRolesJson: "[]",
        disabledBuiltInJson: "[]",
        createdAt: new Date().toISOString(),
      } satisfies ProfileDoc);
      await writeSettings(userId, { activeProfileId: ref.id });
      break;
    }
    case "updateProfile": {
      const p = profileById(profiles, body.id);
      if (!p) return { error: "Not found", status: 404 };
      const d: Partial<ProfileDoc> = {};
      if (body.patch.name !== undefined) d.name = body.patch.name;
      if (body.patch.headline !== undefined) d.headline = body.patch.headline;
      if (body.patch.baseResume !== undefined) d.baseResume = body.patch.baseResume;
      if (body.patch.avatarDataUrl !== undefined) {
        d.avatarDataUrl = body.patch.avatarDataUrl || null;
      }
      if (body.patch.resumePdfFileName !== undefined) {
        d.resumePdfFileName = body.patch.resumePdfFileName ?? null;
      }
      if (Object.keys(d).length) {
        await profilesRef(userId).doc(body.id).update(d);
      }
      break;
    }
    case "deleteProfile": {
      if (profiles.length <= 1) {
        return { error: "Cannot delete last profile", status: 400 };
      }
      if (!profileById(profiles, body.id)) {
        return { error: "Not found", status: 404 };
      }
      const apps = await applicationsRef(userId).where("profileId", "==", body.id).get();
      const batch = getAdminDb().batch();
      for (const doc of apps.docs) {
        batch.update(doc.ref, { profileId: null });
      }
      batch.delete(profilesRef(userId).doc(body.id));
      await batch.commit();
      const remaining = await listProfiles(userId);
      await writeSettings(userId, { activeProfileId: remaining[0]?.id ?? null });
      break;
    }
    case "addCustomRole": {
      const label = body.label?.trim() ?? "";
      if (!label) {
        return { error: "Enter a role name (e.g. Bookkeeping).", status: 400 };
      }
      const extra = (body.keywords ?? []).map((k) => k.trim()).filter(Boolean);
      const keywords = buildRoleKeywords(label, extra);
      if (keywords.length === 0) {
        return { error: "Could not build keywords for this role.", status: 400 };
      }
      const roles = readCustomRoles(activeProfileEntry.data);
      roles.push({
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
        label,
        keywords,
        builtIn: false,
      });
      await profilesRef(userId).doc(activeProfileEntry.id).update({
        customRolesJson: JSON.stringify(roles),
      });
      break;
    }
    case "updateCustomRole": {
      const roles = readCustomRoles(activeProfileEntry.data).map((r) =>
        r.id === body.id
          ? {
              ...r,
              label: body.patch.label?.trim() ?? r.label,
              keywords: body.patch.keywords ?? r.keywords,
            }
          : r,
      );
      await profilesRef(userId).doc(activeProfileEntry.id).update({
        customRolesJson: JSON.stringify(roles),
      });
      break;
    }
    case "removeCustomRole": {
      const roles = readCustomRoles(activeProfileEntry.data).filter(
        (r) => r.id !== body.id,
      );
      await profilesRef(userId).doc(activeProfileEntry.id).update({
        customRolesJson: JSON.stringify(roles),
      });
      break;
    }
    case "toggleBuiltInRole": {
      const disabled = new Set(readDisabled(activeProfileEntry.data));
      if (body.enabled) disabled.delete(body.id);
      else if (DEFAULT_ROLES.some((r) => r.id === body.id)) disabled.add(body.id);
      await profilesRef(userId).doc(activeProfileEntry.id).update({
        disabledBuiltInJson: JSON.stringify([...disabled]),
      });
      break;
    }
    case "createApplication": {
      const pid = body.app.profileId ?? activeProfileEntry.id;
      const ref = applicationsRef(userId).doc();
      await ref.set({
        profileId: pid,
        source: body.app.source,
        title: body.app.title,
        company: body.app.company,
        url: body.app.url,
        category: body.app.category ?? null,
        jobType: body.app.jobType ?? null,
        status: body.app.status,
        notes: body.app.notes,
        tailoredResume: body.app.tailoredResume,
        coverLetter: body.app.coverLetter ?? "",
        jobDescriptionSnippet: body.app.jobDescriptionSnippet,
        savedAt: new Date().toISOString(),
        appliedAt: null,
        nextFollowUp: null,
      } satisfies ApplicationDoc);
      break;
    }
    case "updateApplication": {
      const ref = applicationsRef(userId).doc(body.id);
      const snap = await ref.get();
      if (!snap.exists) return { error: "Not found", status: 404 };
      const patch = body.patch;
      const d: Partial<ApplicationDoc> = {};
      if (patch.status !== undefined) d.status = patch.status;
      if (patch.notes !== undefined) d.notes = patch.notes;
      if (patch.tailoredResume !== undefined) d.tailoredResume = patch.tailoredResume;
      if (patch.coverLetter !== undefined) d.coverLetter = patch.coverLetter;
      if (patch.appliedAt !== undefined) {
        d.appliedAt =
          patch.appliedAt === null || patch.appliedAt === ""
            ? null
            : String(patch.appliedAt);
      }
      if (patch.nextFollowUp !== undefined) {
        d.nextFollowUp =
          patch.nextFollowUp === null || patch.nextFollowUp === ""
            ? null
            : String(patch.nextFollowUp);
      }
      if (Object.keys(d).length) await ref.update(d);
      break;
    }
    case "deleteApplication": {
      await applicationsRef(userId).doc(body.id).delete();
      break;
    }
    case "importBackup": {
      const s = body.state as {
        profiles?: UserProfile[];
        applications?: SavedApplication[];
        applyMode?: ApplyMode;
        activeProfileId?: string | null;
        customRoles?: RoleDefinition[];
        disabledBuiltInRoleIds?: string[];
      };
      if (!s?.profiles?.length) {
        return { error: "Invalid backup", status: 400 };
      }

      const batch = getAdminDb().batch();
      const existingApps = await applicationsRef(userId).get();
      const existingProfiles = await profilesRef(userId).get();
      for (const doc of existingApps.docs) batch.delete(doc.ref);
      for (const doc of existingProfiles.docs) batch.delete(doc.ref);
      await batch.commit();

      const legacyRoles = s.customRoles ?? [];
      const legacyDis = s.disabledBuiltInRoleIds ?? [];
      const newProfileIds: string[] = [];

      for (let i = 0; i < s.profiles.length; i++) {
        const p = s.profiles[i];
        const cr =
          (p as { customRoles?: RoleDefinition[] }).customRoles ??
          (i === 0 ? legacyRoles : []);
        const dis =
          (p as { disabledBuiltInRoleIds?: string[] }).disabledBuiltInRoleIds ??
          (i === 0 ? legacyDis : []);
        const ref = profilesRef(userId).doc();
        newProfileIds.push(ref.id);
        await ref.set({
          name: p.name,
          headline: p.headline ?? "",
          baseResume: p.baseResume ?? "",
          avatarDataUrl: p.avatarDataUrl ?? null,
          resumePdfFileName: p.resumePdfFileName ?? null,
          customRolesJson: JSON.stringify(cr),
          disabledBuiltInJson: JSON.stringify(dis),
          createdAt: p.createdAt ?? new Date().toISOString(),
        } satisfies ProfileDoc);
      }

      const firstId = newProfileIds[0];
      const activeId =
        s.activeProfileId && newProfileIds.includes(s.activeProfileId)
          ? s.activeProfileId
          : firstId;

      await writeSettings(userId, {
        applyMode: s.applyMode === "assisted" ? "assisted" : "manual",
        activeProfileId: activeId ?? null,
      });

      for (const a of s.applications ?? []) {
        const ref = applicationsRef(userId).doc();
        await ref.set({
          profileId: firstId ?? null,
          source: a.source,
          title: a.title,
          company: a.company,
          url: a.url,
          category: a.category ?? null,
          jobType: a.jobType ?? null,
          status: a.status,
          notes: a.notes ?? "",
          tailoredResume: a.tailoredResume ?? "",
          coverLetter: a.coverLetter ?? "",
          jobDescriptionSnippet: a.jobDescriptionSnippet ?? "",
          savedAt: a.savedAt ?? new Date().toISOString(),
          appliedAt: a.appliedAt ?? null,
          nextFollowUp: a.nextFollowUp ?? null,
        } satisfies ApplicationDoc);
      }
      break;
    }
    default:
      return { error: "Unknown action", status: 400 };
  }

  return getWorkspace(userId);
}
