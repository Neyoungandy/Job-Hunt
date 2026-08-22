import type { RemoteJobListing } from "@/lib/types";
import { isOpenWorldwideLocation } from "@/lib/job-location";

type JobicyJob = {
  id?: number | string;
  url?: string;
  jobTitle?: string;
  companyName?: string;
  companyLogo?: string;
  jobIndustry?: string | string[];
  jobType?: string | string[];
  jobGeo?: string;
  jobDescription?: string;
  jobExcerpt?: string;
  pubDate?: string;
  salaryMin?: number | string;
  salaryMax?: number | string;
  salaryCurrency?: string;
};

function asList(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(", ");
  return String(value ?? "").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeJobicy(j: JobicyJob): RemoteJobListing | null {
  const url = String(j.url ?? "").trim();
  const title = String(j.jobTitle ?? "").trim();
  if (!url || !title) return null;
  if (!isOpenWorldwideLocation(j.jobGeo)) return null;

  const min = j.salaryMin != null ? String(j.salaryMin) : "";
  const max = j.salaryMax != null ? String(j.salaryMax) : "";
  const currency = j.salaryCurrency ? String(j.salaryCurrency) : "";
  const salary =
    min && max ? `${currency} ${min}–${max}`.trim() : undefined;

  return {
    id: `jobicy:${j.id ?? url}`,
    source: "Jobicy",
    title,
    company_name: String(j.companyName ?? "—"),
    company_logo: j.companyLogo ? String(j.companyLogo) : undefined,
    category: decodeEntities(asList(j.jobIndustry)) || "Remote",
    job_type: asList(j.jobType) || "Remote",
    publication_date: j.pubDate || new Date().toISOString(),
    candidate_required_location: j.jobGeo || "Anywhere",
    salary,
    url,
    description: String(j.jobDescription || j.jobExcerpt || ""),
  };
}

/** Public Jobicy REST API — no auth. We keep only geo “Anywhere” / worldwide roles. */
export async function fetchJobicyRemoteJobs(): Promise<RemoteJobListing[]> {
  const res = await fetch("https://jobicy.com/api/v2/remote-jobs?count=100", {
    next: { revalidate: 600 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  try {
    const data = (await res.json()) as { jobs?: JobicyJob[] };
    return (data.jobs ?? [])
      .map(normalizeJobicy)
      .filter((j): j is RemoteJobListing => Boolean(j));
  } catch {
    return [];
  }
}
