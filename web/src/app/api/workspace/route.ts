import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ROLES, type RoleDefinition } from "@/lib/default-roles";
import { buildRoleKeywords } from "@/lib/role-keywords";
import type { ApplyMode, SavedApplication, UserProfile } from "@/lib/types";

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapProfile(p: {
  id: string;
  name: string;
  headline: string;
  baseResume: string;
  resumePdfFileName: string | null;
  customRolesJson: string;
  disabledBuiltInJson: string;
  createdAt: Date;
}): UserProfile & {
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
    id: p.id,
    name: p.name,
    headline: p.headline,
    baseResume: p.baseResume,
    resumePdfFileName: p.resumePdfFileName ?? undefined,
    createdAt: p.createdAt.toISOString(),
    customRoles,
    disabledBuiltInRoleIds,
  };
}

function mapApplication(a: {
  id: string;
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
  savedAt: Date;
  appliedAt: Date | null;
  nextFollowUp: Date | null;
}): SavedApplication & {
  appliedAt: string | null;
  nextFollowUp: string | null;
} {
  return {
    id: a.id,
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
    savedAt: a.savedAt.toISOString(),
    appliedAt: a.appliedAt ? a.appliedAt.toISOString() : null,
    nextFollowUp: a.nextFollowUp ? a.nextFollowUp.toISOString() : null,
  };
}

async function ensureWorkspace(userId: string) {
  let settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) {
    const profile = await prisma.profile.create({
      data: { userId, name: "My profile" },
    });
    settings = await prisma.userSettings.create({
      data: { userId, applyMode: "manual", activeProfileId: profile.id },
    });
  }
  const profileCount = await prisma.profile.count({ where: { userId } });
  if (profileCount === 0) {
    const profile = await prisma.profile.create({
      data: { userId, name: "My profile" },
    });
    settings = await prisma.userSettings.update({
      where: { userId },
      data: { activeProfileId: profile.id },
    });
  }
  const profiles = await prisma.profile.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  const current = await prisma.userSettings.findUniqueOrThrow({
    where: { userId },
  });
  const activeOk =
    current.activeProfileId &&
    profiles.some((p) => p.id === current.activeProfileId);
  if (!activeOk && profiles[0]) {
    await prisma.userSettings.update({
      where: { userId },
      data: { activeProfileId: profiles[0].id },
    });
  }
  const finalSettings = await prisma.userSettings.findUniqueOrThrow({
    where: { userId },
  });
  return { settings: finalSettings, profiles };
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { settings, profiles } = await ensureWorkspace(userId);
  const applications = await prisma.application.findMany({
    where: { userId },
    orderBy: { savedAt: "desc" },
  });

  const mappedProfiles = profiles.map(mapProfile);
  const mappedApps = applications.map(mapApplication);

  return NextResponse.json({
    applyMode: (settings.applyMode === "assisted" ? "assisted" : "manual") as ApplyMode,
    activeProfileId: settings.activeProfileId,
    profiles: mappedProfiles,
    applications: mappedApps,
  });
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
          "name" | "headline" | "baseResume" | "resumePdfFileName"
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
      app: Omit<SavedApplication, "id" | "savedAt" | "profileId" | "appliedAt" | "nextFollowUp"> & {
        profileId?: string;
      };
    }
  | {
      action: "updateApplication";
      id: string;
      patch: Partial<SavedApplication>;
    }
  | { action: "deleteApplication"; id: string }
  | { action: "importBackup"; state: unknown };

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { settings, profiles } = await ensureWorkspace(userId);
  const activeProfileId = settings.activeProfileId ?? profiles[0]?.id;
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  if (!activeProfile) {
    return NextResponse.json({ error: "No profile" }, { status: 400 });
  }

  async function readCustomRoles(profile: typeof activeProfile) {
    return parseJson<RoleDefinition[]>(profile.customRolesJson, []);
  }

  async function readDisabled(profile: typeof activeProfile) {
    return parseJson<string[]>(profile.disabledBuiltInJson, []);
  }

  async function writeProfileJson(
    profileId: string,
    data: { customRolesJson?: string; disabledBuiltInJson?: string },
  ) {
    await prisma.profile.update({ where: { id: profileId }, data });
  }

  switch (body.action) {
    case "setActiveProfile": {
      const ok = profiles.some((p) => p.id === body.profileId);
      if (!ok) return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
      await prisma.userSettings.update({
        where: { userId },
        data: { activeProfileId: body.profileId },
      });
      break;
    }
    case "setApplyMode": {
      await prisma.userSettings.update({
        where: { userId },
        data: { applyMode: body.applyMode },
      });
      break;
    }
    case "createProfile": {
      const p = await prisma.profile.create({
        data: { userId, name: body.name.trim() || "New profile" },
      });
      await prisma.userSettings.update({
        where: { userId },
        data: { activeProfileId: p.id },
      });
      break;
    }
    case "updateProfile": {
      const p = profiles.find((x) => x.id === body.id);
      if (!p || p.userId !== userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const d: Record<string, string | null> = {};
      if (body.patch.name !== undefined) d.name = body.patch.name;
      if (body.patch.headline !== undefined) d.headline = body.patch.headline;
      if (body.patch.baseResume !== undefined) d.baseResume = body.patch.baseResume;
      if (body.patch.resumePdfFileName !== undefined) {
        d.resumePdfFileName = body.patch.resumePdfFileName ?? null;
      }
      if (Object.keys(d).length) {
        await prisma.profile.update({ where: { id: body.id }, data: d });
      }
      break;
    }
    case "deleteProfile": {
      if (profiles.length <= 1) {
        return NextResponse.json({ error: "Cannot delete last profile" }, { status: 400 });
      }
      const p = profiles.find((x) => x.id === body.id);
      if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await prisma.application.updateMany({
        where: { profileId: body.id },
        data: { profileId: null },
      });
      await prisma.profile.delete({ where: { id: body.id } });
      const remaining = await prisma.profile.findMany({ where: { userId } });
      const nextActive = remaining[0]?.id;
      await prisma.userSettings.update({
        where: { userId },
        data: { activeProfileId: nextActive },
      });
      break;
    }
    case "addCustomRole": {
      const label = body.label?.trim() ?? "";
      if (!label) {
        return NextResponse.json(
          { error: "Enter a role name (e.g. Bookkeeping)." },
          { status: 400 },
        );
      }
      const extra = (body.keywords ?? [])
        .map((k) => k.trim())
        .filter(Boolean);
      const keywords = buildRoleKeywords(label, extra);
      if (keywords.length === 0) {
        return NextResponse.json(
          { error: "Could not build keywords for this role." },
          { status: 400 },
        );
      }
      const roles = await readCustomRoles(activeProfile);
      const role: RoleDefinition = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
        label,
        keywords,
        builtIn: false,
      };
      roles.push(role);
      await writeProfileJson(activeProfile.id, {
        customRolesJson: JSON.stringify(roles),
      });
      break;
    }
    case "updateCustomRole": {
      const roles = await readCustomRoles(activeProfile);
      const next = roles.map((r) =>
        r.id === body.id
          ? {
              ...r,
              label: body.patch.label?.trim() ?? r.label,
              keywords: body.patch.keywords ?? r.keywords,
            }
          : r,
      );
      await writeProfileJson(activeProfile.id, {
        customRolesJson: JSON.stringify(next),
      });
      break;
    }
    case "removeCustomRole": {
      const roles = (await readCustomRoles(activeProfile)).filter(
        (r) => r.id !== body.id,
      );
      await writeProfileJson(activeProfile.id, {
        customRolesJson: JSON.stringify(roles),
      });
      break;
    }
    case "toggleBuiltInRole": {
      const disabled = new Set(await readDisabled(activeProfile));
      if (body.enabled) disabled.delete(body.id);
      else {
        if (DEFAULT_ROLES.some((r) => r.id === body.id)) disabled.add(body.id);
      }
      await writeProfileJson(activeProfile.id, {
        disabledBuiltInJson: JSON.stringify([...disabled]),
      });
      break;
    }
    case "createApplication": {
      const pid = body.app.profileId ?? activeProfile.id;
      await prisma.application.create({
        data: {
          userId,
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
        },
      });
      break;
    }
    case "updateApplication": {
      const app = await prisma.application.findFirst({
        where: { id: body.id, userId },
      });
      if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const patch = body.patch;
      const d: Record<string, unknown> = {};
      if (patch.status !== undefined) d.status = patch.status;
      if (patch.notes !== undefined) d.notes = patch.notes;
      if (patch.tailoredResume !== undefined) d.tailoredResume = patch.tailoredResume;
      if (patch.coverLetter !== undefined) d.coverLetter = patch.coverLetter;
      if (patch.appliedAt !== undefined) {
        d.appliedAt =
          patch.appliedAt === null || patch.appliedAt === ""
            ? null
            : new Date(patch.appliedAt as string);
      }
      if (patch.nextFollowUp !== undefined) {
        d.nextFollowUp =
          patch.nextFollowUp === null || patch.nextFollowUp === ""
            ? null
            : new Date(patch.nextFollowUp as string);
      }
      if (Object.keys(d).length) {
        await prisma.application.update({
          where: { id: body.id },
          data: d as {
            status?: string;
            notes?: string;
            tailoredResume?: string;
            coverLetter?: string;
            appliedAt?: Date | null;
            nextFollowUp?: Date | null;
          },
        });
      }
      break;
    }
    case "deleteApplication": {
      await prisma.application.deleteMany({ where: { id: body.id, userId } });
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
        return NextResponse.json({ error: "Invalid backup" }, { status: 400 });
      }
      await prisma.$transaction([
        prisma.application.deleteMany({ where: { userId } }),
        prisma.profile.deleteMany({ where: { userId } }),
      ]);
      const legacyRoles = s.customRoles ?? [];
      const legacyDis = s.disabledBuiltInRoleIds ?? [];
      for (let i = 0; i < s.profiles.length; i++) {
        const p = s.profiles[i];
        const cr =
          (p as { customRoles?: RoleDefinition[] }).customRoles ??
          (i === 0 ? legacyRoles : []);
        const dis =
          (p as { disabledBuiltInRoleIds?: string[] }).disabledBuiltInRoleIds ??
          (i === 0 ? legacyDis : []);
        await prisma.profile.create({
          data: {
            userId,
            name: p.name,
            headline: p.headline ?? "",
            baseResume: p.baseResume ?? "",
            resumePdfFileName: p.resumePdfFileName ?? null,
            customRolesJson: JSON.stringify(cr),
            disabledBuiltInJson: JSON.stringify(dis),
          },
        });
      }
      const newProfiles = await prisma.profile.findMany({ where: { userId } });
      const first = newProfiles[0];
      await prisma.userSettings.update({
        where: { userId },
        data: {
          applyMode: s.applyMode === "assisted" ? "assisted" : "manual",
          activeProfileId:
            newProfiles.find((x) => x.id === s.activeProfileId)?.id ?? first?.id,
        },
      });
      for (const a of s.applications ?? []) {
        await prisma.application.create({
          data: {
            userId,
            profileId: first?.id ?? null,
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
            appliedAt: a.appliedAt ? new Date(a.appliedAt) : null,
            nextFollowUp: a.nextFollowUp ? new Date(a.nextFollowUp) : null,
          },
        });
      }
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const fresh = await ensureWorkspace(userId);
  const applications = await prisma.application.findMany({
    where: { userId },
    orderBy: { savedAt: "desc" },
  });
  const mappedProfiles = fresh.profiles.map(mapProfile);
  const freshSettings = await prisma.userSettings.findUniqueOrThrow({
    where: { userId },
  });

  return NextResponse.json({
    applyMode: (freshSettings.applyMode === "assisted" ? "assisted" : "manual") as ApplyMode,
    activeProfileId: freshSettings.activeProfileId,
    profiles: mappedProfiles,
    applications: applications.map(mapApplication),
  });
}
