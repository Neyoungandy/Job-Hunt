import type { SavedApplication } from "@/lib/types";

export type FollowUpReminder = {
  application: SavedApplication;
  kind: "overdue" | "today" | "upcoming";
  daysUntil: number;
};

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseFollowUpDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

export function getFollowUpReminders(
  applications: SavedApplication[],
  profileId?: string,
  upcomingDays = 7,
): FollowUpReminder[] {
  const today = startOfDay(new Date());
  const scoped = applications.filter(
    (a) =>
      a.nextFollowUp &&
      (!profileId || !a.profileId || a.profileId === profileId) &&
      a.status !== "closed",
  );

  const out: FollowUpReminder[] = [];

  for (const app of scoped) {
    const due = parseFollowUpDate(app.nextFollowUp!);
    if (!due) continue;
    const diffMs = due.getTime() - today.getTime();
    const daysUntil = Math.round(diffMs / (24 * 60 * 60 * 1000));

    if (daysUntil < 0) {
      out.push({ application: app, kind: "overdue", daysUntil });
    } else if (daysUntil === 0) {
      out.push({ application: app, kind: "today", daysUntil });
    } else if (daysUntil <= upcomingDays) {
      out.push({ application: app, kind: "upcoming", daysUntil });
    }
  }

  const order = { overdue: 0, today: 1, upcoming: 2 };
  return out.sort(
    (a, b) =>
      order[a.kind] - order[b.kind] ||
      a.daysUntil - b.daysUntil ||
      a.application.title.localeCompare(b.application.title),
  );
}

export function countUrgentFollowUps(reminders: FollowUpReminder[]): number {
  return reminders.filter((r) => r.kind === "overdue" || r.kind === "today")
    .length;
}
