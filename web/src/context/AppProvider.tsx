"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useSession } from "@/context/AuthProvider";
import useSWR from "swr";
import { DEFAULT_ROLES, type RoleDefinition } from "@/lib/default-roles";
import type {
  AppPersistedState,
  ApplyMode,
  SavedApplication,
  UserProfile,
} from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed to load workspace");
  return r.json();
});

async function postAction(body: unknown) {
  const res = await fetch("/api/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as AppPersistedStatePayload;
}

type AppPersistedStatePayload = {
  applyMode: ApplyMode;
  activeProfileId: string | null;
  profiles: (UserProfile & {
    customRoles: RoleDefinition[];
    disabledBuiltInRoleIds: string[];
  })[];
  applications: (SavedApplication & {
    appliedAt?: string | null;
    nextFollowUp?: string | null;
  })[];
};

type AppContextValue = {
  hydrated: boolean;
  state: AppPersistedState;
  activeProfile: (UserProfile & {
    customRoles?: RoleDefinition[];
    disabledBuiltInRoleIds?: string[];
  }) | null;
  roles: RoleDefinition[];
  setActiveProfileId: (id: string) => void;
  upsertProfile: (p: Partial<UserProfile> & { id: string }) => Promise<void>;
  addProfile: (name: string) => void;
  removeProfile: (id: string) => void;
  addCustomRole: (label: string, keywords: string[]) => Promise<void>;
  updateCustomRole: (id: string, patch: Partial<RoleDefinition>) => void;
  removeCustomRole: (id: string) => void;
  toggleBuiltInRole: (id: string, enabled: boolean) => void;
  addApplication: (
    app: Omit<SavedApplication, "id" | "savedAt" | "profileId"> & {
      profileId?: string;
    },
  ) => void;
  updateApplication: (id: string, patch: Partial<SavedApplication>) => void;
  removeApplication: (id: string) => void;
  replaceState: (next: AppPersistedState) => void;
  setApplyMode: (mode: ApplyMode) => void;
  mutateWorkspace: () => Promise<unknown>;
};

const AppContext = createContext<AppContextValue | null>(null);

function toClientState(payload: AppPersistedStatePayload): AppPersistedState {
  const profiles: UserProfile[] = payload.profiles.map(
    ({ customRoles, disabledBuiltInRoleIds, ...rest }) => ({
      ...rest,
      customRoles,
      disabledBuiltInRoleIds,
    }),
  );
  const active = payload.profiles.find((p) => p.id === payload.activeProfileId) ?? payload.profiles[0];
  return {
    version: 1,
    applyMode: payload.applyMode,
    activeProfileId: payload.activeProfileId,
    profiles,
    customRoles: active?.customRoles ?? [],
    disabledBuiltInRoleIds: active?.disabledBuiltInRoleIds ?? [],
    applications: payload.applications.map((a) => ({
      ...a,
      appliedAt: a.appliedAt ?? null,
      nextFollowUp: a.nextFollowUp ?? null,
    })),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const authed = status === "authenticated";
  const { data, mutate, isLoading } = useSWR(
    authed ? "/api/workspace" : null,
    fetcher,
    { revalidateOnFocus: true },
  );

  const hydrated = status !== "loading" && (!authed || !isLoading || !!data);

  const state = useMemo<AppPersistedState>(() => {
    if (!data) {
      return {
        version: 1,
        applyMode: "manual",
        activeProfileId: null,
        profiles: [],
        customRoles: [],
        disabledBuiltInRoleIds: [],
        applications: [],
      };
    }
    return toClientState(data as AppPersistedStatePayload);
  }, [data]);

  const activeProfile = useMemo(() => {
    if (!data) return null;
    const p = (data as AppPersistedStatePayload).profiles.find(
      (x) => x.id === (data as AppPersistedStatePayload).activeProfileId,
    ) ?? (data as AppPersistedStatePayload).profiles[0];
    if (!p) return null;
    return {
      id: p.id,
      name: p.name,
      headline: p.headline,
      baseResume: p.baseResume,
      resumePdfFileName: p.resumePdfFileName,
      avatarDataUrl: p.avatarDataUrl,
      createdAt: p.createdAt,
      customRoles: p.customRoles,
      disabledBuiltInRoleIds: p.disabledBuiltInRoleIds,
    };
  }, [data]);

  const roles = useMemo(() => {
    const disabled = new Set(activeProfile?.disabledBuiltInRoleIds ?? []);
    const builtIn = DEFAULT_ROLES.filter((r) => !disabled.has(r.id));
    const customs = (activeProfile?.customRoles ?? []).map((r) => ({
      ...r,
      builtIn: false,
    }));
    return [...builtIn, ...customs];
  }, [activeProfile]);

  const run = useCallback(
    async (body: unknown) => {
      const next = await postAction(body);
      await mutate(next, { revalidate: false });
    },
    [mutate],
  );

  const setActiveProfileId = useCallback(
    (id: string) => void run({ action: "setActiveProfile", profileId: id }),
    [run],
  );

  const upsertProfile = useCallback(
    (p: Partial<UserProfile> & { id: string }): Promise<void> => {
      const patch = Object.fromEntries(
        Object.entries({
          name: p.name,
          headline: p.headline,
          baseResume: p.baseResume,
          resumePdfFileName: p.resumePdfFileName,
          avatarDataUrl: p.avatarDataUrl,
        }).filter(([, v]) => v !== undefined),
      ) as Partial<
        Pick<
          UserProfile,
          "name" | "headline" | "baseResume" | "resumePdfFileName" | "avatarDataUrl"
        >
      >;
      if (Object.keys(patch).length === 0) return Promise.resolve();
      return run({
        action: "updateProfile",
        id: p.id,
        patch,
      });
    },
    [run],
  );

  const addProfile = useCallback(
    (name: string) => void run({ action: "createProfile", name }),
    [run],
  );

  const removeProfile = useCallback(
    (id: string) => void run({ action: "deleteProfile", id }),
    [run],
  );

  const addCustomRole = useCallback(
    (label: string, keywords: string[]) =>
      run({ action: "addCustomRole", label, keywords }),
    [run],
  );

  const updateCustomRole = useCallback(
    (id: string, patch: Partial<RoleDefinition>) =>
      void run({ action: "updateCustomRole", id, patch }),
    [run],
  );

  const removeCustomRole = useCallback(
    (id: string) => void run({ action: "removeCustomRole", id }),
    [run],
  );

  const toggleBuiltInRole = useCallback(
    (id: string, enabled: boolean) =>
      void run({ action: "toggleBuiltInRole", id, enabled }),
    [run],
  );

  const addApplication = useCallback(
    (
      app: Omit<SavedApplication, "id" | "savedAt" | "profileId"> & {
        profileId?: string;
      },
    ) => void run({ action: "createApplication", app }),
    [run],
  );

  const updateApplication = useCallback(
    (id: string, patch: Partial<SavedApplication>) =>
      void run({ action: "updateApplication", id, patch }),
    [run],
  );

  const removeApplication = useCallback(
    (id: string) => void run({ action: "deleteApplication", id }),
    [run],
  );

  const replaceState = useCallback(
    (next: AppPersistedState) =>
      void run({ action: "importBackup", state: next }),
    [run],
  );

  const setApplyMode = useCallback(
    (mode: ApplyMode) => void run({ action: "setApplyMode", applyMode: mode }),
    [run],
  );

  const value: AppContextValue = {
    hydrated,
    state,
    activeProfile,
    roles,
    setActiveProfileId,
    upsertProfile,
    addProfile,
    removeProfile,
    addCustomRole,
    updateCustomRole,
    removeCustomRole,
    toggleBuiltInRole,
    addApplication,
    updateApplication,
    removeApplication,
    replaceState,
    setApplyMode,
    mutateWorkspace: mutate,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
