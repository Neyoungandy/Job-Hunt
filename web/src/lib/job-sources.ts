import type { RemoteJobListing } from "@/lib/types";
import { isBlockedListing, isOpenWorldwideLocation } from "@/lib/job-location";
import { fetchJobicyRemoteJobs } from "@/lib/job-sources-jobicy";
import { fetchAtsRemoteJobs } from "@/lib/job-sources-ats";

type RemotiveApi = { jobs?: Record<string, unknown>[] };

type ArbeitRow = {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at: number;
};

type ArbeitApi = { data?: ArbeitRow[] };

type RemoteOkRow = {
  id?: string;
  slug?: string;
  company?: string;
  company_logo?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  date?: string;
  url?: string;
  apply_url?: string;
  salary_min?: number;
  salary_max?: number;
  logo?: string;
};

function isRemoteOkRemote(row: RemoteOkRow): boolean {
  const tags = (row.tags ?? []).map((t) => t.toLowerCase());
  if (tags.includes("remote")) return true;
  const loc = (row.location ?? "").toLowerCase();
  return loc.includes("remote") || loc.includes("worldwide") || loc.includes("anywhere");
}

function normalizeRemotive(j: Record<string, unknown>): RemoteJobListing | null {
  const loc = j.candidate_required_location
    ? String(j.candidate_required_location)
    : "";
  if (!isOpenWorldwideLocation(loc)) return null;
  const id = String(j.id ?? "");
  return {
    id: `remotive:${id}`,
    source: "Remotive",
    title: String(j.title ?? ""),
    company_name: String(j.company_name ?? ""),
    company_logo: j.company_logo ? String(j.company_logo) : undefined,
    category: String(j.category ?? ""),
    job_type: String(j.job_type ?? ""),
    publication_date: String(j.publication_date ?? ""),
    candidate_required_location: j.candidate_required_location
      ? String(j.candidate_required_location)
      : undefined,
    salary: j.salary ? String(j.salary) : undefined,
    url: String(j.url ?? ""),
    description: String(j.description ?? ""),
  };
}

function normalizeArbeitnow(j: ArbeitRow): RemoteJobListing | null {
  if (!j.remote) return null;
  if (!isOpenWorldwideLocation(j.location)) return null;
  const when = j.created_at
    ? new Date(j.created_at * 1000).toISOString()
    : new Date().toISOString();
  return {
    id: `arbeitnow:${j.slug}`,
    source: "Arbeitnow",
    title: j.title,
    company_name: j.company_name,
    category: (j.tags ?? []).join(" · ") || "General",
    job_type: (j.job_types ?? []).join(", ") || "Remote",
    publication_date: when,
    url: j.url,
    description: j.description,
  };
}

function normalizeRemoteOk(j: RemoteOkRow): RemoteJobListing | null {
  if (!j.company || !j.position) return null;
  if (!isRemoteOkRemote(j)) return null;
  if (!isOpenWorldwideLocation(j.location)) return null;
  const salary =
    j.salary_min != null && j.salary_max != null
      ? `$${j.salary_min}–${j.salary_max}`
      : undefined;
  const logo = j.company_logo || j.logo;
  return {
    id: `remoteok:${j.id ?? j.slug ?? j.url ?? Math.random()}`,
    source: "Remote OK",
    title: j.position,
    company_name: j.company,
    company_logo: logo ? String(logo) : undefined,
    category: (j.tags ?? []).slice(0, 6).join(", ") || "Remote",
    job_type: "Remote",
    publication_date: j.date ?? new Date().toISOString(),
    candidate_required_location: j.location,
    salary,
    url: String(j.apply_url || j.url || ""),
    description: String(j.description ?? ""),
  };
}

type HimalayasJob = {
  title?: string;
  excerpt?: string;
  companyName?: string;
  companyLogo?: string;
  employmentType?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  currency?: string | null;
  locationRestrictions?: string[];
  categories?: string[];
  description?: string;
  pubDate?: number;
  applicationLink?: string;
  guid?: string;
};

type HimalayasApi = {
  jobs?: HimalayasJob[];
  nextCursor?: string;
};

type FourDayWeekLocation = {
  city?: string;
  country?: string;
  continent?: string;
  work_arrangement?: string;
};

type FourDayWeekJob = {
  id?: string;
  title?: string;
  slug?: string;
  company_name?: string;
  work_arrangement?: string;
  locations?: FourDayWeekLocation[];
  posted?: number;
  salary?: string;
  category?: string;
  is_expired?: boolean;
  company?: { logo_url?: string; hires_worldwide?: boolean };
  stack?: { name?: string }[];
};

function unixToIso(value: number | undefined): string {
  if (!value || !Number.isFinite(value)) return new Date().toISOString();
  const ms = value > 1e12 ? value : value * 1000;
  return new Date(ms).toISOString();
}

function normalizeHimalayas(j: HimalayasJob): RemoteJobListing | null {
  const url = String(j.applicationLink || j.guid || "").trim();
  const title = String(j.title ?? "").trim();
  if (!url || !title) return null;
  if (!isOpenWorldwideLocation(j.locationRestrictions)) return null;
  const salary =
    j.minSalary != null && j.maxSalary != null && j.currency
      ? `${j.currency} ${j.minSalary.toLocaleString()}–${j.maxSalary.toLocaleString()}`
      : undefined;
  return {
    id: `himalayas:${url}`,
    source: "Himalayas",
    title,
    company_name: String(j.companyName ?? "—"),
    company_logo: j.companyLogo ? String(j.companyLogo) : undefined,
    category: (j.categories ?? []).slice(0, 6).join(", ") || "Remote",
    job_type: String(j.employmentType ?? "Remote"),
    publication_date: unixToIso(j.pubDate),
    candidate_required_location: (j.locationRestrictions ?? []).join(", ") || undefined,
    salary,
    url,
    description: String(j.description || j.excerpt || ""),
  };
}

function normalizeFourDayWeek(j: FourDayWeekJob): RemoteJobListing | null {
  if (j.is_expired) return null;
  const arrangement = (j.work_arrangement ?? "").toLowerCase();
  if (arrangement !== "remote") return null;
  if (!j.company?.hires_worldwide) {
    const locText = (j.locations ?? [])
      .map((loc) => [loc.city, loc.country, loc.continent].filter(Boolean).join(", "))
      .join(" · ");
    if (!isOpenWorldwideLocation(locText || undefined)) return null;
  }
  const slug = String(j.slug ?? "").trim();
  const title = String(j.title ?? "").trim();
  if (!slug || !title) return null;
  const locParts = (j.locations ?? [])
    .map((loc) => [loc.city, loc.country, loc.continent].filter(Boolean).join(", "))
    .filter(Boolean);
  const stack = (j.stack ?? []).map((s) => s.name).filter(Boolean).join(", ");
  return {
    id: `4dayweek:${j.id ?? slug}`,
    source: "4 Day Week",
    title,
    company_name: String(j.company_name ?? "—"),
    company_logo: j.company?.logo_url,
    category: j.category || "Remote",
    job_type: "Remote",
    publication_date: unixToIso(j.posted),
    candidate_required_location: locParts[0] || undefined,
    salary: j.salary || undefined,
    url: `https://4dayweek.io/jobs/${slug}`,
    description: [stack && `Stack: ${stack}`, j.category && `Category: ${j.category}`]
      .filter(Boolean)
      .join(". "),
  };
}

async function fetchHimalayasRemoteJobs(): Promise<RemoteJobListing[]> {
  const out: RemoteJobListing[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 2; page += 1) {
    const params = new URLSearchParams({ limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`https://himalayas.app/jobs/api?${params.toString()}`, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) break;
    const data = (await res.json()) as HimalayasApi;
    for (const job of data.jobs ?? []) {
      const normalized = normalizeHimalayas(job);
      if (normalized) out.push(normalized);
    }
    cursor = data.nextCursor;
    if (!cursor) break;
  }
  return out;
}

async function fetchFourDayWeekRemoteJobs(): Promise<RemoteJobListing[]> {
  const res = await fetch("https://4dayweek.io/api/jobs", {
    next: { revalidate: 300 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { jobs?: FourDayWeekJob[] };
  const out: RemoteJobListing[] = [];
  for (const job of data.jobs ?? []) {
    const normalized = normalizeFourDayWeek(job);
    if (normalized) out.push(normalized);
  }
  return out;
}

export async function fetchAggregatedRemoteJobs(): Promise<RemoteJobListing[]> {
  const [remRes, arbRes, rokRes, himalayasRes, fourDayRes, jobicyRes, atsRes] =
    await Promise.allSettled([
    fetch("https://remotive.com/api/remote-jobs", {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    }),
    fetch("https://www.arbeitnow.com/api/job-board-api", {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    }),
    fetch("https://remoteok.com/api", {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    }),
    fetchHimalayasRemoteJobs(),
    fetchFourDayWeekRemoteJobs(),
    fetchJobicyRemoteJobs(),
    fetchAtsRemoteJobs(),
  ]);

  const out: RemoteJobListing[] = [];
  const seen = new Set<string>();

  function push(job: RemoteJobListing | null) {
    if (!job || !job.url) return;
    if (isBlockedListing(job)) return;
    const key = job.url.trim().toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(job);
  }

  if (remRes.status === "fulfilled" && remRes.value.ok) {
    try {
      const data = (await remRes.value.json()) as RemotiveApi;
      for (const j of data.jobs ?? []) {
        push(normalizeRemotive(j as Record<string, unknown>));
      }
    } catch {
      /* ignore */
    }
  }

  if (arbRes.status === "fulfilled" && arbRes.value.ok) {
    try {
      const data = (await arbRes.value.json()) as ArbeitApi;
      for (const j of data.data ?? []) {
        push(normalizeArbeitnow(j));
      }
    } catch {
      /* ignore */
    }
  }

  if (rokRes.status === "fulfilled" && rokRes.value.ok) {
    try {
      const data = (await rokRes.value.json()) as unknown;
      const rows = Array.isArray(data) ? data : [];
      for (const raw of rows) {
        if (!raw || typeof raw !== "object") continue;
        push(normalizeRemoteOk(raw as RemoteOkRow));
      }
    } catch {
      /* ignore */
    }
  }

  if (himalayasRes.status === "fulfilled") {
    for (const j of himalayasRes.value) {
      push(j);
    }
  }

  if (fourDayRes.status === "fulfilled") {
    for (const j of fourDayRes.value) {
      push(j);
    }
  }

  if (jobicyRes.status === "fulfilled") {
    for (const j of jobicyRes.value) {
      push(j);
    }
  }

  if (atsRes.status === "fulfilled") {
    for (const j of atsRes.value) {
      push(j);
    }
  }

  out.sort((a, b) =>
    (b.publication_date || "").localeCompare(a.publication_date || ""),
  );
  return out.slice(0, 800);
}
