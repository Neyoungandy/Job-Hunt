import type { RemoteJobListing } from "@/lib/types";
import { fetchJobicyRemoteJobs, fetchWwrRemoteJobs } from "@/lib/job-sources-rss";
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

function normalizeRemotive(j: Record<string, unknown>): RemoteJobListing {
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

export async function fetchAggregatedRemoteJobs(): Promise<RemoteJobListing[]> {
  const [remRes, arbRes, rokRes, wwrRes, jobicyRes, atsRes] = await Promise.allSettled([
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
    fetchWwrRemoteJobs(),
    fetchJobicyRemoteJobs(),
    fetchAtsRemoteJobs(),
  ]);

  const out: RemoteJobListing[] = [];
  const seen = new Set<string>();

  function push(job: RemoteJobListing | null) {
    if (!job || !job.url) return;
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

  if (wwrRes.status === "fulfilled") {
    for (const j of wwrRes.value) {
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
