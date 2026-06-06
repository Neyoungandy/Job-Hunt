"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppProvider";
import { MatchScoreBadge } from "@/components/MatchScoreBadge";
import { findDuplicateApplication } from "@/lib/application-duplicates";
import { copyApplicationPackage, openApplyUrl } from "@/lib/apply-package";
import {
  computeJobMatchScore,
  jobMatchesRoles,
} from "@/lib/job-match";
import {
  isJobNewSinceLastVisit,
  loadSeenJobIds,
  saveSeenJobIds,
} from "@/lib/search-visit";
import type { RoleDefinition } from "@/lib/default-roles";
import type { RemoteJobListing, SavedApplication } from "@/lib/types";

export default function SearchPage() {
  const { hydrated, roles, activeProfile, addApplication, state } = useApp();
  const [toast, setToast] = useState<string | null>(null);
  const [jobs, setJobs] = useState<RemoteJobListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<RemoteJobListing | null>(null);
  const [seenBefore, setSeenBefore] = useState<Set<string>>(new Set());

  const profileId = activeProfile?.id ?? "";

  const selectedRoles = useMemo(
    () => roles.filter((r) => selectedRoleIds.includes(r.id)),
    [roles, selectedRoleIds],
  );

  useEffect(() => {
    if (!hydrated) return;
    setSelectedRoleIds(roles.map((r) => r.id));
  }, [hydrated, roles]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs");
      const data = (await res.json()) as { jobs?: RemoteJobListing[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setJobs(data.jobs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!profileId) return;
    setSeenBefore(loadSeenJobIds(profileId, profileId));
  }, [profileId]);

  useEffect(() => {
    if (!profileId || jobs.length === 0) return;
    return () => {
      saveSeenJobIds(
        profileId,
        profileId,
        jobs.map((j) => j.id),
      );
    };
  }, [jobs, profileId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (!jobMatchesRoles(j, selectedRoles)) return false;
      if (!q) return true;
      const blob = `${j.title} ${j.company_name} ${j.category}`.toLowerCase();
      return blob.includes(q);
    });
  }, [jobs, query, selectedRoles]);

  const scoredJobs = useMemo(() => {
    const resume = activeProfile?.baseResume ?? "";
    return filtered
      .map((job) => ({
        job,
        match: computeJobMatchScore(job, selectedRoles, resume),
        isNew: isJobNewSinceLastVisit(job.id, seenBefore),
        duplicate: findDuplicateApplication(
          state.applications,
          {
            url: job.url,
            title: job.title,
            company: job.company_name,
          },
          profileId,
        ),
      }))
      .sort((a, b) => b.match.score - a.match.score);
  }, [
    filtered,
    selectedRoles,
    activeProfile?.baseResume,
    seenBefore,
    state.applications,
    profileId,
  ]);

  const newCount = useMemo(
    () => scoredJobs.filter((x) => x.isNew).length,
    [scoredJobs],
  );

  function toggleRole(id: string) {
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {toast && (
        <div className="toast-info">
          {toast}
        </div>
      )}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Job search
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Remotive, Arbeitnow, Remote OK, We Work Remotely, Jobicy, Greenhouse, and Lever — deduped by apply URL. Filter with
            your profile&apos;s role interests and keywords.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh listings"}
        </button>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row">
        <section className="card lg:w-72 lg:shrink-0 space-y-3 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Role filters
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Jobs must match at least one keyword group from a selected role.
          </p>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => {
              const on = selectedRoleIds.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleRole(r.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    on
                      ? "border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--ink)]"
                      : "border-[var(--hairline)] text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          <div className="border-t border-[var(--hairline)] pt-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Text search
            </label>
            <input
              className="input-field mt-2"
              placeholder="Company, title, stack…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </section>

        <section className="min-w-0 flex-1 space-y-3">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <p className="text-sm text-[var(--muted)]">
            Showing {scoredJobs.length} of {jobs.length} listings
            {selectedRoles.length === 0 ? " (no roles selected — nothing matches)" : ""}
            {newCount > 0 ? (
              <span className="ml-2 text-[var(--accent)]">
                · {newCount} new since your last visit
              </span>
            ) : null}
            <span className="ml-2 opacity-70">· Sorted by match %</span>
          </p>
          <ul className="space-y-3">
            {scoredJobs.map(({ job, match, isNew, duplicate }) => (
              <li
                key={job.id}
                className="card-interactive p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {job.company_logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={job.company_logo}
                          alt=""
                          className="h-8 w-8 rounded-md bg-white/10 object-contain"
                        />
                      )}
                      <h3 className="font-display text-lg font-semibold leading-tight text-[var(--ink)]">
                        {job.title}
                      </h3>
                      <MatchScoreBadge match={match} />
                      {isNew && <span className="badge-new">New</span>}
                      {duplicate && (
                        <span
                          className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200"
                          title={`Already in tracker as “${duplicate.status}”`}
                        >
                          Tracked
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      <span className="rounded bg-[var(--elevated)] px-1.5 py-0.5 text-xs text-[var(--accent)]">
                        {job.source}
                      </span>{" "}
                      {job.company_name} · {job.category}
                      {job.job_type ? ` · ${job.job_type}` : ""}
                    </p>
                    {job.salary && (
                      <p className="text-xs text-[var(--accent)]">{job.salary}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-[var(--hairline)] px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
                      onClick={() => setDetail(job)}
                    >
                      Tailor & save
                    </button>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-[var(--elevated)] px-3 py-2 text-sm font-medium text-[var(--ink)] ring-1 ring-[var(--hairline)] hover:ring-[var(--accent)]/40"
                    >
                      Open apply page
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {detail && activeProfile && (
        <JobTailorDrawer
          job={detail}
          profile={activeProfile}
          applyMode={state.applyMode}
          onClose={() => setDetail(null)}
          onSave={({ tailoredResume, coverLetter }) => {
            const dup = findDuplicateApplication(
              state.applications,
              {
                url: detail.url,
                title: detail.title,
                company: detail.company_name,
              },
              activeProfile.id,
            );
            if (dup) {
              const proceed = window.confirm(
                `You already saved “${dup.title}” at ${dup.company} in your tracker (status: ${dup.status}).\n\nSave this listing again anyway?`,
              );
              if (!proceed) return;
            }
            addApplication({
              source: detail.source,
              title: detail.title,
              company: detail.company_name,
              url: detail.url,
              category: detail.category,
              jobType: detail.job_type,
              status: tailoredResume ? "ready" : "drafting",
              notes: "",
              tailoredResume,
              coverLetter,
              jobDescriptionSnippet: stripHtml(detail.description).slice(0, 2000),
              profileId: activeProfile.id,
            });
            setToast(
              dup
                ? "Saved again — duplicate noted in your pipeline."
                : "Saved to your job tracker.",
            );
            setTimeout(() => setToast(null), 5000);
            if (state.applyMode === "assisted") {
              void (async () => {
                const ok = await copyApplicationPackage(
                  detail.title,
                  detail.company_name,
                  tailoredResume,
                  coverLetter,
                );
                openApplyUrl(detail.url);
                setToast(
                  ok
                    ? "Assisted apply: package copied to clipboard; official apply page opened in a new tab — paste there and submit yourself."
                    : "Assisted apply: could not access clipboard (browser blocked it). Open Pipeline to copy your drafts manually; apply page was still opened.",
                );
                setTimeout(() => setToast(null), 9000);
              })();
            }
            setDetail(null);
          }}
          applications={state.applications}
          profileId={activeProfile.id}
          selectedRoles={selectedRoles}
        />
      )}
    </div>
  );
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function JobTailorDrawer({
  job,
  profile,
  applyMode,
  onClose,
  onSave,
  applications,
  profileId,
  selectedRoles,
}: {
  job: RemoteJobListing;
  profile: { id: string; name: string; headline: string; baseResume: string };
  applyMode: "manual" | "assisted";
  onClose: () => void;
  onSave: (payload: { tailoredResume: string; coverLetter: string }) => void;
  applications: SavedApplication[];
  profileId: string;
  selectedRoles: RoleDefinition[];
}) {
  const [tailored, setTailored] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [includeLetter, setIncludeLetter] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const duplicate = findDuplicateApplication(
    applications,
    { url: job.url, title: job.title, company: job.company_name },
    profileId,
  );

  async function runTailor() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: job.title,
          company: job.company_name,
          jobDescription: stripHtml(job.description),
          baseResume: profile.baseResume,
          headline: profile.headline,
          includeCoverLetter: includeLetter,
        }),
      });
      const data = (await res.json()) as {
        tailored?: string;
        coverLetter?: string;
        notice?: string;
        error?: string;
        mode?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Tailor failed");
      setTailored(data.tailored ?? "");
      setCoverLetter(data.coverLetter ?? "");
      if (data.notice) setNotice(data.notice);
      if (data.mode === "heuristic") {
        setNotice(
          data.notice ??
            "Heuristic mode: add OPENAI_API_KEY for richer rewriting (server-side only).",
        );
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-[var(--hairline)] bg-[var(--panel)] shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--hairline)] px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-semibold">{job.title}</h2>
            <p className="text-sm text-[var(--muted)]">
              {job.company_name} · {profile.name}
              {profile.baseResume.trim() && (
                <span className="ml-2">
                  ·{" "}
                  <MatchScoreBadge
                    match={computeJobMatchScore(
                      job,
                      selectedRoles,
                      profile.baseResume,
                    )}
                    compact
                  />
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--elevated)] hover:text-[var(--ink)]"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 lg:flex-row">
          <div className="lg:w-1/2 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Listing
            </h3>
            <div
              className="job-html max-h-64 overflow-y-auto rounded-xl border border-[var(--hairline)] bg-[var(--elevated)] p-3 lg:max-h-[60vh]"
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          </div>
          <div className="lg:w-1/2 flex min-h-0 flex-col gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                checked={includeLetter}
                onChange={(e) => setIncludeLetter(e.target.checked)}
                className="rounded border-[var(--hairline)]"
              />
              Also generate a cover letter (uses job keywords + your resume)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !profile.baseResume.trim()}
                onClick={() => void runTailor()}
                className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-40"
              >
                {busy ? "Generating…" : "Generate resume + letter"}
              </button>
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-[var(--hairline)] px-3 py-2 text-sm text-[var(--ink)]"
              >
                Open official apply link
              </a>
            </div>
            {applyMode === "assisted" && (
              <p className="text-xs text-[var(--accent)]">
                Apply mode is <span className="font-semibold">Assisted</span>:
                saving to the pipeline will copy resume + letter to your clipboard
                and open this job&apos;s apply page.
              </p>
            )}
            {notice && (
              <p className="text-xs text-[var(--warning)]">{notice}</p>
            )}
            {!profile.baseResume.trim() && (
              <p className="text-xs text-[var(--muted)]">
                Add a base resume (or import a PDF) under Resume — required for
                tailoring.
              </p>
            )}
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Tailored resume (edit before you use it anywhere)
            </label>
            <textarea
              className="min-h-[160px] rounded-xl border border-[var(--hairline)] bg-[var(--elevated)] p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-[var(--accent)]"
              value={tailored}
              onChange={(e) => setTailored(e.target.value)}
              placeholder="Generated text appears here. Edit until it is truthful and specific."
            />
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Cover letter
            </label>
            <textarea
              className="min-h-[140px] rounded-xl border border-[var(--hairline)] bg-[var(--elevated)] p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-[var(--accent)]"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder={
                includeLetter
                  ? "Generated letter appears here after you run Generate."
                  : "Enable “Also generate a cover letter” to draft a letter."
              }
              disabled={!includeLetter}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--hairline)] px-5 py-4">
          {duplicate && (
            <span className="mr-auto max-w-md text-xs text-amber-200/90">
              Already in your tracker: &quot;{duplicate.title}&quot; at{" "}
              {duplicate.company} ({duplicate.status}). Saving again will create
              another entry unless you cancel.
            </span>
          )}
          <button
            type="button"
            className="rounded-xl border border-[var(--hairline)] px-4 py-2 text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)]"
            onClick={() =>
              onSave({
                tailoredResume: tailored,
                coverLetter: includeLetter ? coverLetter : "",
              })
            }
          >
            Save to pipeline
          </button>
        </div>
      </div>
    </div>
  );
}
