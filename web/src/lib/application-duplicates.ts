import type { SavedApplication } from "@/lib/types";

/** Normalize apply URLs for duplicate checks (strip query/hash, lowercase host+path). */
export function normalizeJobUrl(url: string): string {
  const raw = url.trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.hostname.toLowerCase()}${path.toLowerCase()}`;
  } catch {
    return raw.toLowerCase().replace(/\/+$/, "");
  }
}

function normalizeTitleCompany(title: string, company: string): string {
  return `${title} ${company}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findDuplicateApplication(
  applications: SavedApplication[],
  job: { url: string; title: string; company: string },
  profileId?: string,
): SavedApplication | null {
  const scoped = applications.filter(
    (a) => !profileId || !a.profileId || a.profileId === profileId,
  );
  const jobUrl = normalizeJobUrl(job.url);
  if (jobUrl) {
    const byUrl = scoped.find((a) => normalizeJobUrl(a.url) === jobUrl);
    if (byUrl) return byUrl;
  }
  const blob = normalizeTitleCompany(job.title, job.company);
  if (blob.length < 6) return null;
  return (
    scoped.find(
      (a) => normalizeTitleCompany(a.title, a.company) === blob,
    ) ?? null
  );
}
