import type { RoleDefinition } from "./default-roles";

export type ApplicationStatus =
  | "saved"
  | "drafting"
  | "ready"
  | "applied"
  | "interview"
  | "closed";

export type SavedApplication = {
  id: string;
  /** When missing, treat as belonging to the first profile (legacy). */
  profileId?: string;
  source: string;
  title: string;
  company: string;
  url: string;
  category?: string;
  jobType?: string;
  savedAt: string;
  status: ApplicationStatus;
  notes: string;
  tailoredResume: string;
  /** Generated cover letter draft; you must verify before sending. */
  coverLetter: string;
  jobDescriptionSnippet: string;
  /** When you marked the role as applied (ISO). */
  appliedAt?: string | null;
  /** Optional reminder for follow-up (ISO date). */
  nextFollowUp?: string | null;
};

export type UserProfile = {
  id: string;
  name: string;
  headline: string;
  baseResume: string;
  /** Last PDF imported (filename only; file is not stored). */
  resumePdfFileName?: string;
  createdAt: string;
  /** Present when loaded from the API (per-profile interests). */
  customRoles?: RoleDefinition[];
  disabledBuiltInRoleIds?: string[];
};

/** manual: you copy/paste yourself. assisted: after save, app copies package + opens apply URL (you still submit on the site). */
export type ApplyMode = "manual" | "assisted";

export type AppPersistedState = {
  version: 1;
  activeProfileId: string | null;
  profiles: UserProfile[];
  customRoles: RoleDefinition[];
  disabledBuiltInRoleIds: string[];
  applications: SavedApplication[];
  applyMode: ApplyMode;
};

/** Normalized listing from one or more job boards. */
export type RemoteJobListing = {
  id: string;
  source: string;
  title: string;
  company_name: string;
  company_logo?: string;
  category: string;
  job_type: string;
  publication_date: string;
  candidate_required_location?: string;
  salary?: string;
  url: string;
  description: string;
};
