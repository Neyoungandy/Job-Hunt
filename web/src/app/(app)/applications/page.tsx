"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppProvider";
import { copyApplicationPackage, openApplyUrl } from "@/lib/apply-package";
import { applicationsToCsv, downloadCsv } from "@/lib/export-csv";
import { getFollowUpReminders } from "@/lib/follow-up-reminders";
import type { ApplicationStatus, SavedApplication } from "@/lib/types";

const statuses: { id: ApplicationStatus; label: string }[] = [
  { id: "saved", label: "Saved" },
  { id: "drafting", label: "Drafting" },
  { id: "ready", label: "Ready to apply" },
  { id: "applied", label: "Applied" },
  { id: "interview", label: "Interview" },
  { id: "closed", label: "Closed" },
];

type ApplicationTextareaProps = {
  value: string;
  onSave: (value: string) => void;
  className: string;
  rows: number;
  placeholder?: string;
};

function ApplicationTextarea({
  value,
  onSave,
  className,
  rows,
  placeholder,
}: ApplicationTextareaProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function saveDraft() {
    if (draft !== value) {
      onSave(draft);
    }
  }

  return (
    <textarea
      className={className}
      rows={rows}
      value={draft}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={saveDraft}
    />
  );
}

function dateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function isoFromDateInput(value: string): string | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const date = new Date(`${trimmedValue}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export default function ApplicationsPage() {
  const {
    hydrated,
    activeProfile,
    state,
    updateApplication,
    removeApplication,
  } = useApp();

  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);

  const [draggedApplicationId, setDraggedApplicationId] = useState<
    string | null
  >(null);

  const [dragOverStatus, setDragOverStatus] =
    useState<ApplicationStatus | null>(null);

  const applications = useMemo(() => {
    const profileId = activeProfile?.id;

    return state.applications.filter(
      (application) =>
        !application.profileId || application.profileId === profileId,
    );
  }, [state.applications, activeProfile?.id]);

  const selectedApplication = useMemo(() => {
    if (!selectedApplicationId) {
      return null;
    }

    return (
      applications.find(
        (application) => application.id === selectedApplicationId,
      ) ?? null
    );
  }, [applications, selectedApplicationId]);

  const followUpById = useMemo(() => {
    const reminders = new Map<
      string,
      "overdue" | "today" | "upcoming"
    >();

    for (const reminder of getFollowUpReminders(
      applications,
      activeProfile?.id,
    )) {
      reminders.set(reminder.application.id, reminder.kind);
    }

    return reminders;
  }, [applications, activeProfile?.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedApplicationId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (selectedApplicationId && !selectedApplication) {
      setSelectedApplicationId(null);
    }
  }, [selectedApplication, selectedApplicationId]);

  function exportCsv() {
    const csv = applicationsToCsv(applications);

    const safeProfileName = (activeProfile?.name ?? "profile")
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase();

    const currentDate = new Date().toISOString().slice(0, 10);

    downloadCsv(
      `job-hunt-tracker-${safeProfileName}-${currentDate}.csv`,
      csv,
    );
  }

  function moveApplicationToStatus(
    applicationId: string,
    newStatus: ApplicationStatus,
  ) {
    const application = applications.find(
      (item) => item.id === applicationId,
    );

    if (!application || application.status === newStatus) {
      return;
    }

    const patch: Partial<SavedApplication> = {
      status: newStatus,
    };

    if (newStatus === "applied" && !application.appliedAt) {
      patch.appliedAt = new Date().toISOString();
    }

    updateApplication(applicationId, patch);
  }

  function updateStatus(
    application: SavedApplication,
    status: ApplicationStatus,
  ) {
    moveApplicationToStatus(application.id, status);
  }

  if (!hydrated) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Job tracker — {activeProfile?.name ?? "Profile"}
            </h1>

            <p className="mt-2 text-sm text-[var(--muted)]">
              Drag an application card to another column to update its status.
              Click a card to view and edit its complete details.
            </p>
          </div>

          {applications.length > 0 && (
            <button
              type="button"
              onClick={exportCsv}
              className="btn-secondary shrink-0 px-4 py-2 text-sm"
            >
              Export CSV
            </button>
          )}
        </header>

        {applications.length === 0 ? (
          <p className="rounded-2xl border border-[var(--hairline)] bg-[var(--panel)] p-8 text-center text-sm text-[var(--muted)]">
            Nothing saved yet. Use Job search → Tailor &amp; save on a
            listing.
          </p>
        ) : (
          <div className="pb-4">
            <div className="grid min-w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {statuses.map((status) => {
                const columnApplications = applications.filter(
                  (application) => application.status === status.id,
                );

                const isDragTarget = dragOverStatus === status.id;

                return (
                  <section
                    key={status.id}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setDragOverStatus(status.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDragOverStatus(status.id);
                    }}
                    onDragLeave={(event) => {
                      const nextTarget = event.relatedTarget;

                      if (
                        nextTarget instanceof Node &&
                        event.currentTarget.contains(nextTarget)
                      ) {
                        return;
                      }

                      setDragOverStatus((currentStatus) =>
                        currentStatus === status.id ? null : currentStatus,
                      );
                    }}
                    onDrop={(event) => {
                      event.preventDefault();

                      const applicationId =
                        event.dataTransfer.getData("text/plain") ||
                        draggedApplicationId;

                      if (applicationId) {
                        moveApplicationToStatus(applicationId, status.id);
                      }

                      setDraggedApplicationId(null);
                      setDragOverStatus(null);
                    }}
                    className={`min-h-[460px] rounded-2xl border bg-[var(--panel)] p-3 transition-all ${
                      isDragTarget
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]/20 ring-2 ring-[var(--accent)]/20"
                        : "border-[var(--hairline)]"
                    }`}
                  >
                    <header className="mb-3 flex items-center justify-between gap-2">
                      <h2 className="font-display text-sm font-semibold">
                        {status.label}
                      </h2>

                      <span className="rounded-full bg-[var(--elevated)] px-2 py-1 text-xs text-[var(--muted)]">
                        {columnApplications.length}
                      </span>
                    </header>

                    <div className="space-y-3">
                      {columnApplications.length === 0 ? (
                        <div
                          className={`rounded-xl border border-dashed p-4 text-center text-xs transition ${
                            isDragTarget
                              ? "border-[var(--accent)] text-[var(--accent)]"
                              : "border-[var(--hairline)] text-[var(--muted)]"
                          }`}
                        >
                          {isDragTarget
                            ? `Drop in ${status.label}`
                            : "No applications"}
                        </div>
                      ) : (
                        columnApplications.map((application) => {
                          const followUpKind = followUpById.get(
                            application.id,
                          );

                          const isDragging =
                            draggedApplicationId === application.id;

                          return (
                            <article
                              key={application.id}
                              draggable
                              role="button"
                              tabIndex={0}
                              aria-label={`${application.title} at ${application.company}`}
                              onDragStart={(event) => {
                                setDraggedApplicationId(application.id);

                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData(
                                  "text/plain",
                                  application.id,
                                );
                              }}
                              onDragEnd={() => {
                                setDraggedApplicationId(null);
                                setDragOverStatus(null);
                              }}
                              onClick={() =>
                                setSelectedApplicationId(application.id)
                              }
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  setSelectedApplicationId(application.id);
                                }
                              }}
                              className={`block w-full cursor-grab rounded-xl border bg-[var(--elevated)] p-3 text-left transition active:cursor-grabbing hover:-translate-y-0.5 hover:border-[var(--accent)]/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 ${
                                isDragging
                                  ? "scale-[0.98] opacity-45"
                                  : "opacity-100"
                              } ${
                                followUpKind === "overdue"
                                  ? "border-red-500/40"
                                  : followUpKind === "today"
                                    ? "border-amber-500/40"
                                    : "border-[var(--hairline)]"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-sm font-semibold leading-snug">
                                  {application.title}
                                </h3>

                                <span
                                  className="shrink-0 select-none text-xs text-[var(--muted)]"
                                  aria-hidden="true"
                                  title="Drag application"
                                >
                                  ⋮⋮
                                </span>
                              </div>

                              <p className="mt-1 text-xs text-[var(--muted)]">
                                {application.company}
                              </p>

                              <p className="mt-2 text-[10px] text-[var(--muted)]">
                                Saved{" "}
                                {new Date(
                                  application.savedAt,
                                ).toLocaleDateString()}
                              </p>

                              {followUpKind === "overdue" && (
                                <span className="mt-2 inline-block rounded-full bg-red-500/20 px-2 py-1 text-[10px] font-semibold text-red-300">
                                  Follow-up overdue
                                </span>
                              )}

                              {followUpKind === "today" && (
                                <span className="mt-2 inline-block rounded-full bg-amber-500/20 px-2 py-1 text-[10px] font-semibold text-amber-200">
                                  Follow-up today
                                </span>
                              )}

                              {followUpKind === "upcoming" && (
                                <span className="mt-2 inline-block rounded-full bg-[var(--accent-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--accent)]">
                                  Follow-up soon
                                </span>
                              )}
                            </article>
                          );
                        })
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedApplication && (
        <div
          className="fixed inset-0 z-50 bg-black/55"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedApplicationId(null);
            }
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedApplication.title} application details`}
            className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-[var(--hairline)] bg-[var(--panel)] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--hairline)] bg-[var(--panel)]/95 p-5 backdrop-blur">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold leading-snug">
                  {selectedApplication.title}
                </h2>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  {selectedApplication.company} · {selectedApplication.source}
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  Saved{" "}
                  {new Date(
                    selectedApplication.savedAt,
                  ).toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedApplicationId(null)}
                className="shrink-0 rounded-xl border border-[var(--hairline)] px-3 py-2 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
                aria-label="Close application details"
              >
                Close
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label
                  htmlFor="application-status"
                  className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
                >
                  Status
                </label>

                <select
                  id="application-status"
                  className="mt-1 w-full rounded-xl border border-[var(--hairline)] bg-[var(--elevated)] px-3 py-2 text-sm"
                  value={selectedApplication.status}
                  onChange={(event) =>
                    updateStatus(
                      selectedApplication,
                      event.target.value as ApplicationStatus,
                    )
                  }
                >
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="application-applied-date"
                    className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
                  >
                    Applied on
                  </label>

                  <input
                    id="application-applied-date"
                    type="date"
                    className="mt-1 w-full rounded-xl border border-[var(--hairline)] bg-[var(--elevated)] px-3 py-2 text-sm"
                    value={dateInputValue(selectedApplication.appliedAt)}
                    onChange={(event) =>
                      updateApplication(selectedApplication.id, {
                        appliedAt: isoFromDateInput(event.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <label
                    htmlFor="application-follow-up-date"
                    className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
                  >
                    Follow-up reminder
                  </label>

                  <input
                    id="application-follow-up-date"
                    type="date"
                    className="mt-1 w-full rounded-xl border border-[var(--hairline)] bg-[var(--elevated)] px-3 py-2 text-sm"
                    value={dateInputValue(
                      selectedApplication.nextFollowUp,
                    )}
                    onChange={(event) =>
                      updateApplication(selectedApplication.id, {
                        nextFollowUp: isoFromDateInput(event.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Notes
                </label>

                <ApplicationTextarea
                  className="mt-1 w-full rounded-xl border border-[var(--hairline)] bg-[var(--elevated)] p-3 text-sm"
                  rows={4}
                  value={selectedApplication.notes ?? ""}
                  placeholder="Recruiter name, referral, thank-you sent…"
                  onSave={(notes) =>
                    updateApplication(selectedApplication.id, { notes })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Tailored resume draft
                </label>

                <ApplicationTextarea
                  className="mt-1 min-h-52 w-full rounded-xl border border-[var(--hairline)] bg-[var(--elevated)] p-3 font-mono text-xs leading-relaxed"
                  rows={12}
                  value={selectedApplication.tailoredResume ?? ""}
                  onSave={(tailoredResume) =>
                    updateApplication(selectedApplication.id, {
                      tailoredResume,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Cover letter
                </label>

                <ApplicationTextarea
                  className="mt-1 min-h-44 w-full rounded-xl border border-[var(--hairline)] bg-[var(--elevated)] p-3 text-sm leading-relaxed"
                  rows={10}
                  value={selectedApplication.coverLetter ?? ""}
                  placeholder="Cover letter draft for this employer…"
                  onSave={(coverLetter) =>
                    updateApplication(selectedApplication.id, {
                      coverLetter,
                    })
                  }
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--hairline)] pt-5">
                <button
                  type="button"
                  className="rounded-xl border border-[var(--hairline)] px-3 py-2 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
                  onClick={() =>
                    void copyApplicationPackage(
                      selectedApplication.title,
                      selectedApplication.company,
                      selectedApplication.tailoredResume,
                      selectedApplication.coverLetter ?? "",
                    ).then((copied) => {
                      if (!copied) {
                        alert(
                          "Clipboard unavailable. Select text manually or try HTTPS/localhost.",
                        );
                      }
                    })
                  }
                >
                  Copy resume + letter
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-[var(--hairline)] px-3 py-2 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
                  onClick={() => openApplyUrl(selectedApplication.url)}
                >
                  Open apply link
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-red-500/30 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10"
                  onClick={() => {
                    if (confirm("Remove this saved application?")) {
                      const applicationId = selectedApplication.id;

                      setSelectedApplicationId(null);
                      removeApplication(applicationId);
                    }
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}