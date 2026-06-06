import type { RoleDefinition } from "@/lib/default-roles";
import type { RemoteJobListing } from "@/lib/types";

export type JobMatchResult = {
  score: number;
  rolePercent: number;
  resumePercent: number;
  matchedRoleKeywords: string[];
  matchedResumeTerms: string[];
};

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ");
}

function jobHaystack(job: RemoteJobListing): string {
  return `${job.title} ${job.category} ${job.company_name} ${stripHtml(job.description)}`.toLowerCase();
}

export function jobMatchesRoles(job: RemoteJobListing, roles: RoleDefinition[]) {
  if (roles.length === 0) return true;
  const hay = jobHaystack(job);
  return roles.some((role) =>
    role.keywords.some((kw) => {
      const k = kw.toLowerCase().trim();
      return k.length > 0 && hay.includes(k);
    }),
  );
}

const RESUME_STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "your",
  "you",
  "our",
  "are",
  "was",
  "were",
  "have",
  "has",
  "had",
  "this",
  "that",
  "will",
  "can",
  "all",
  "any",
  "not",
  "but",
  "into",
  "over",
  "also",
  "using",
  "used",
  "work",
  "team",
  "role",
  "job",
  "year",
  "years",
  "experience",
  "skills",
  "responsible",
  "including",
  "through",
  "during",
  "about",
  "their",
  "they",
  "them",
  "been",
  "being",
  "each",
  "which",
  "while",
  "where",
  "when",
  "what",
  "how",
  "who",
  "may",
  "more",
  "most",
  "other",
  "such",
  "than",
  "then",
  "these",
  "those",
  "very",
  "just",
  "only",
  "well",
  "able",
  "help",
  "make",
  "made",
  "many",
  "much",
  "some",
  "same",
  "like",
  "new",
  "one",
  "two",
  "three",
]);

function extractResumeTerms(resume: string): string[] {
  const words = resume
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !RESUME_STOP.has(w));

  const phrases: string[] = [];
  const lines = resume.split(/\n/);
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("-") || t.startsWith("•")) {
      const p = t.replace(/^[-•]\s*/, "").slice(0, 80).toLowerCase();
      if (p.length >= 8) phrases.push(p);
    }
  }

  return [...new Set([...words, ...phrases])].slice(0, 120);
}

function percentMatched(terms: string[], hay: string): {
  percent: number;
  matched: string[];
} {
  if (terms.length === 0) return { percent: 0, matched: [] };
  const matched = terms.filter((t) => hay.includes(t));
  const percent = Math.round((matched.length / terms.length) * 100);
  return { percent, matched };
}

/** 0–100 fit score from role keywords + resume overlap with the listing. */
export function computeJobMatchScore(
  job: RemoteJobListing,
  roles: RoleDefinition[],
  resumeText: string,
): JobMatchResult {
  const hay = jobHaystack(job);

  const allRoleKeywords = [
    ...new Set(
      roles.flatMap((r) =>
        r.keywords.map((k) => k.toLowerCase().trim()).filter((k) => k.length > 1),
      ),
    ),
  ];
  const roleMatch = percentMatched(allRoleKeywords, hay);

  const resumeTerms = extractResumeTerms(resumeText);
  const resumeMatch = percentMatched(resumeTerms, hay);

  const roleWeight = roles.length > 0 ? 0.55 : 0;
  const resumeWeight = resumeText.trim() ? 0.45 : roles.length > 0 ? 0.45 : 1;

  let score = Math.round(
    roleMatch.percent * roleWeight + resumeMatch.percent * resumeWeight,
  );

  if (roles.length > 0 && roleMatch.matched.length === 0) {
    score = Math.min(score, 35);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    rolePercent: roleMatch.percent,
    resumePercent: resumeMatch.percent,
    matchedRoleKeywords: roleMatch.matched.slice(0, 8),
    matchedResumeTerms: resumeMatch.matched.slice(0, 8),
  };
}

export function matchScoreLabel(score: number): string {
  if (score >= 80) return "Excellent fit";
  if (score >= 60) return "Strong fit";
  if (score >= 40) return "Good fit";
  if (score >= 20) return "Partial fit";
  return "Low fit";
}

export function matchScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 45) return "text-[var(--accent)]";
  if (score >= 25) return "text-amber-300";
  return "text-[var(--muted)]";
}
