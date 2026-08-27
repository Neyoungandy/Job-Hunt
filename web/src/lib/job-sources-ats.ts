import type { RemoteJobListing } from "@/lib/types";
import { greenhouseBoardTokens, leverSiteSlugs, ashbyBoardSlugs } from "@/lib/ats-board-config";
import { isBlockedListing, isOpenWorldwideLocation } from "@/lib/job-location";

type GreenhouseJob = {
  id: number;
  title?: string;
  company_name?: string;
  absolute_url?: string;
  updated_at?: string;
  location?: { name?: string };
  content?: string;
};

function displaySlugName(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function isLeverDemoListing(site: string, url: string, title: string, desc: string): boolean {
  const blob = `${site} ${url} ${title} ${desc}`.toLowerCase();
  return (
    site === "leverdemo" ||
    site.includes("demo") ||
    url.includes("/leverdemo/") ||
    blob.includes("demo job listing") ||
    blob.includes("fictional job") ||
    blob.includes("not an actual open position") ||
    blob.includes("for demonstration purposes")
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function normalizeGreenhouse(
  boardToken: string,
  j: GreenhouseJob,
): RemoteJobListing | null {
  const title = (j.title ?? "").trim();
  const url = (j.absolute_url ?? "").trim();
  if (!title || !url) return null;
  if (!isOpenWorldwideLocation(j.location?.name)) return null;
  const desc =
    typeof j.content === "string" && j.content.trim()
      ? j.content
      : "Full description is on the employer’s Greenhouse job page (link below).";
  return {
    id: `greenhouse:${boardToken}:${j.id}`,
    source: "Greenhouse",
    title,
    company_name: (j.company_name ?? "").trim() || displaySlugName(boardToken),
    category: "Employer board (Greenhouse)",
    job_type: "Open role",
    publication_date: j.updated_at || new Date().toISOString(),
    candidate_required_location: j.location?.name,
    url,
    description: desc,
  };
}

async function fetchGreenhouseBoard(
  token: string,
): Promise<RemoteJobListing[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 900 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      jobs?: GreenhouseJob[];
      status?: number;
    };
    if (data.status === 404 || !Array.isArray(data.jobs)) return [];
    return data.jobs
      .map((j) => normalizeGreenhouse(token, j))
      .filter((x): x is RemoteJobListing => Boolean(x));
  } catch {
    return [];
  }
}

export async function fetchAllGreenhouseJobs(): Promise<RemoteJobListing[]> {
  const tokens = greenhouseBoardTokens();
  const out: RemoteJobListing[] = [];
  for (const group of chunk(tokens, 8)) {
    const batches = await Promise.all(group.map((t) => fetchGreenhouseBoard(t)));
    for (const b of batches) out.push(...b);
  }
  return out;
}

function leverTimestamp(p: Record<string, unknown>): string {
  const raw = p.createdAt ?? p.updatedAt;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return new Date(raw).toISOString();
  }
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    return new Date(Number(raw)).toISOString();
  }
  return new Date().toISOString();
}

function leverLocation(cats: Record<string, unknown>): string | undefined {
  if (typeof cats.location === "string" && cats.location.trim()) {
    return cats.location.trim();
  }
  const all = cats.allLocations;
  if (Array.isArray(all)) {
    const s = all
      .filter((x) => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean)
      .join(" · ");
    return s || undefined;
  }
  return undefined;
}

function normalizeLever(
  site: string,
  p: Record<string, unknown>,
): RemoteJobListing | null {
  const title = String(p.text ?? "").trim();
  const url = String(p.hostedUrl ?? p.applyUrl ?? "").trim();
  if (!title || !url) return null;
  const cats = (p.categories as Record<string, unknown>) || {};
  const loc = leverLocation(cats);
  if (!isOpenWorldwideLocation(loc)) return null;
  const desc =
    String(
      p.descriptionPlain ??
        p.descriptionBodyPlain ??
        p.openingPlain ??
        "",
    ).trim() ||
    "Full description is on the employer’s Lever job page (link below).";
  if (isLeverDemoListing(site, url, title, desc)) return null;
  const team =
    (typeof cats.team === "string" && cats.team) ||
    (typeof cats.department === "string" && cats.department) ||
    "Employer board (Lever)";
  const commitment =
    typeof cats.commitment === "string" ? cats.commitment : "Open role";
  return {
    id: `lever:${site}:${String(p.id ?? url)}`,
    source: "Lever",
    title,
    company_name: displaySlugName(site),
    category: team,
    job_type: commitment,
    publication_date: leverTimestamp(p),
    candidate_required_location: loc,
    url,
    description: desc,
  };
}

async function fetchLeverSite(site: string): Promise<RemoteJobListing[]> {
  const urls = [
    `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`,
    `https://api.eu.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        next: { revalidate: 900 },
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const data: unknown = await res.json();
      if (!Array.isArray(data) || data.length === 0) continue;
      return data
        .filter((row) => row && typeof row === "object")
        .map((row) => normalizeLever(site, row as Record<string, unknown>))
        .filter((x): x is RemoteJobListing => Boolean(x));
    } catch {
      /* try next region */
    }
  }
  return [];
}

export async function fetchAllLeverJobs(): Promise<RemoteJobListing[]> {
  const sites = leverSiteSlugs();
  const out: RemoteJobListing[] = [];
  for (const group of chunk(sites, 6)) {
    const batches = await Promise.all(group.map((s) => fetchLeverSite(s)));
    for (const b of batches) out.push(...b);
  }
  return out.filter((job) => !isBlockedListing(job));
}

type AshbyJob = {
  id?: string;
  title?: string;
  departmentName?: string;
  teamName?: string;
  employmentType?: string;
  locationName?: string;
  locationIsRemote?: boolean;
  isRemote?: boolean;
  jobUrl?: string;
  applyUrl?: string;
  publishedAt?: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
  isListed?: boolean;
};

function normalizeAshby(board: string, j: AshbyJob): RemoteJobListing | null {
  if (j.isListed === false) return null;
  const remote = j.locationIsRemote === true || j.isRemote === true;
  const loc = j.locationName ?? "";
  if (!remote && loc && !/remote|anywhere|worldwide|global/i.test(loc)) {
    return null;
  }
  if (!isOpenWorldwideLocation(loc || (remote ? "Remote" : ""))) return null;
  const title = String(j.title ?? "").trim();
  const url = String(j.applyUrl || j.jobUrl || "").trim();
  if (!title || !url) return null;
  if (isBlockedListing({ url, title, company_name: board })) return null;
  return {
    id: `ashby:${board}:${j.id ?? url}`,
    source: "Ashby",
    title,
    company_name: displaySlugName(board),
    category: j.departmentName || j.teamName || "Employer board (Ashby)",
    job_type: j.employmentType || "Remote",
    publication_date: j.publishedAt || new Date().toISOString(),
    candidate_required_location: loc || "Remote",
    url,
    description: String(j.descriptionPlain || j.descriptionHtml || ""),
  };
}

async function fetchAshbyBoard(board: string): Promise<RemoteJobListing[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 900 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { jobs?: AshbyJob[] };
    if (!Array.isArray(data.jobs)) return [];
    return data.jobs
      .map((j) => normalizeAshby(board, j))
      .filter((x): x is RemoteJobListing => Boolean(x));
  } catch {
    return [];
  }
}

export async function fetchAllAshbyJobs(): Promise<RemoteJobListing[]> {
  const boards = ashbyBoardSlugs();
  const out: RemoteJobListing[] = [];
  for (const group of chunk(boards, 5)) {
    const batches = await Promise.all(group.map((b) => fetchAshbyBoard(b)));
    for (const b of batches) out.push(...b);
  }
  return out;
}

/** Greenhouse + Lever + Ashby employer boards (parallel). */
export async function fetchAtsRemoteJobs(): Promise<RemoteJobListing[]> {
  const [gh, lv, ashby] = await Promise.all([
    fetchAllGreenhouseJobs(),
    fetchAllLeverJobs(),
    fetchAllAshbyJobs(),
  ]);
  return [...gh, ...lv, ...ashby];
}
