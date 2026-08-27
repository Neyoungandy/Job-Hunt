/**
 * Public ATS job board endpoints are **per employer** (no global “all jobs” API).
 * - Greenhouse: `boards-api.greenhouse.io/v1/boards/{token}/jobs`
 * - Lever: `api.lever.co/v0/postings/{site}?mode=json` (and EU mirror)
 *
 * Override lists with env vars (comma-separated) if you want different employers.
 */

const DEFAULT_GREENHOUSE_BOARDS = [
  "stripe",
  "anthropic",
  "notion",
  "figma",
  "dropbox",
  "mongodb",
  "hashicorp",
  "gitlab",
  "snyk",
  "cloudflare",
  "tailscale",
  "vercel",
  "block",
  "hubspot",
  "twilio",
  "okta",
  "airbnb",
  "lyft",
  "instacart",
  "datadog",
  "elastic",
  "databricks",
  "duolingo",
] as const;

/** Real employer boards on jobs.lever.co — never include Lever’s fictional `leverdemo` site. */
const DEFAULT_LEVER_SITES = ["palantir", "kraken", "wealthsimple"] as const;

function parseSlugList(raw: string | undefined, max: number): string[] {
  if (!raw?.trim()) return [];
  const parts = raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z0-9][a-z0-9-]{0,63}$/.test(s));
  return [...new Set(parts)].slice(0, max);
}

export function greenhouseBoardTokens(): string[] {
  const fromEnv = parseSlugList(process.env.ATS_GREENHOUSE_BOARDS, 40);
  if (fromEnv.length) return fromEnv;
  return [...DEFAULT_GREENHOUSE_BOARDS];
}

export function leverSiteSlugs(): string[] {
  const fromEnv = parseSlugList(process.env.ATS_LEVER_SITES, 25);
  const sites = fromEnv.length ? fromEnv : [...DEFAULT_LEVER_SITES];
  return sites.filter((slug) => slug !== "leverdemo" && !slug.includes("demo"));
}

const DEFAULT_ASHBY_BOARDS = [
  "linear",
  "ramp",
  "mercury",
  "openai",
  "perplexity",
  "huggingface",
  "airtable",
  "superhuman",
  "cal",
  "replicate",
] as const;

export function ashbyBoardSlugs(): string[] {
  const fromEnv = parseSlugList(process.env.ATS_ASHBY_BOARDS, 25);
  return fromEnv.length ? fromEnv : [...DEFAULT_ASHBY_BOARDS];
}
