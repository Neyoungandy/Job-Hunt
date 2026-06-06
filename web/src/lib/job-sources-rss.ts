import type { RemoteJobListing } from "@/lib/types";

function rssItemBlocks(xml: string): string[] {
  const re = /<item>([\s\S]*?)<\/item>/gi;
  return [...xml.matchAll(re)].map((m) => m[1] ?? "");
}

function decodeXmlText(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function firstTag(block: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${tag}>`,
    "i",
  );
  const m = block.match(re);
  const raw = (m?.[1] ?? m?.[2] ?? "").trim();
  return decodeXmlText(raw);
}

function firstAttr(block: string, tag: string, attr: string): string {
  const re = new RegExp(
    `<${tag}[^>]*\\b${attr}="([^"]*)"[^>]*>`,
    "i",
  );
  const m = block.match(re);
  return m?.[1]?.trim() ?? "";
}

/** We Work Remotely: skip rows whose region ends with a hard geo restriction (e.g. USA Only). */
function wwrRegionOpen(region: string): boolean {
  const s = region.trim().toLowerCase();
  if (!s) return true;
  if (/\bonly\b/.test(s)) {
    return /anywhere|worldwide|global|international|planet/i.test(s);
  }
  return true;
}

function parseWwrItems(xml: string): RemoteJobListing[] {
  const out: RemoteJobListing[] = [];
  for (const block of rssItemBlocks(xml)) {
    const title = firstTag(block, "title");
    const link = firstTag(block, "link");
    const pubDate = firstTag(block, "pubDate");
    const category = firstTag(block, "category");
    const jobType = firstTag(block, "type");
    const region = firstTag(block, "region");
    const desc = firstTag(block, "description");
    const logo =
      firstAttr(block, "media:content", "url") ||
      firstAttr(block, "media:thumbnail", "url");

    if (!title || !link) continue;
    if (!wwrRegionOpen(region)) continue;

    let company = "";
    let jobTitle = title;
    const colon = title.indexOf(":");
    if (colon > 0 && colon < title.length - 1) {
      company = title.slice(0, colon).trim();
      jobTitle = title.slice(colon + 1).trim();
    }

    const idSlug = link.replace(/^https?:\/\/[^/]+\//i, "").replace(/\W+/g, "-");
    out.push({
      id: `wwr:${idSlug}`,
      source: "We Work Remotely",
      title: jobTitle || title,
      company_name: company || "—",
      company_logo: logo || undefined,
      category: category || "Remote",
      job_type: jobType || "Remote",
      publication_date: pubDate || new Date().toISOString(),
      candidate_required_location: region || undefined,
      url: link,
      description: desc,
    });
  }
  return out;
}

/** Jobicy asks not to hammer the feed; we cache via fetch revalidate. */
function parseJobicyItems(xml: string): RemoteJobListing[] {
  const out: RemoteJobListing[] = [];
  for (const block of rssItemBlocks(xml)) {
    const title = firstTag(block, "title");
    const link = firstTag(block, "link");
    const pubDate = firstTag(block, "pubDate");
    const desc = firstTag(block, "description");
    const id = firstTag(block, "id");
    const company = firstTag(block, "job_listing:company");
    const loc = firstTag(block, "job_listing:location");
    const jobType = firstTag(block, "job_listing:job_type");
    const logo = firstAttr(block, "media:content", "url");

    if (!title || !link) continue;

    out.push({
      id: `jobicy:${id || link.replace(/\W/g, "").slice(0, 80)}`,
      source: "Jobicy",
      title,
      company_name: company || "—",
      company_logo: logo || undefined,
      category: "Remote",
      job_type: jobType || "Remote",
      publication_date: pubDate || new Date().toISOString(),
      candidate_required_location: loc || undefined,
      url: link,
      description: desc,
    });
  }
  return out;
}

export async function fetchWwrRemoteJobs(): Promise<RemoteJobListing[]> {
  const res = await fetch("https://weworkremotely.com/remote-jobs.rss", {
    next: { revalidate: 600 },
    headers: { Accept: "application/rss+xml, application/xml, text/xml" },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  try {
    return parseWwrItems(xml);
  } catch {
    return [];
  }
}

export async function fetchJobicyRemoteJobs(): Promise<RemoteJobListing[]> {
  const res = await fetch("https://jobicy.com/?feed=job_feed", {
    next: { revalidate: 600 },
    headers: { Accept: "application/rss+xml, application/xml, text/xml" },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  try {
    return parseJobicyItems(xml);
  } catch {
    return [];
  }
}
