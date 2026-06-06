import type { SavedApplication } from "@/lib/types";

function csvCell(value: string | null | undefined): string {
  const s = (value ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

export function applicationsToCsv(applications: SavedApplication[]): string {
  const headers = [
    "Title",
    "Company",
    "Status",
    "Source",
    "Apply URL",
    "Saved At",
    "Applied At",
    "Follow-up Date",
    "Category",
    "Job Type",
    "Notes",
    "Tailored Resume",
    "Cover Letter",
    "Job Description Snippet",
  ];

  const rows = applications.map((a) =>
    [
      a.title,
      a.company,
      a.status,
      a.source,
      a.url,
      a.savedAt,
      a.appliedAt ?? "",
      a.nextFollowUp ?? "",
      a.category ?? "",
      a.jobType ?? "",
      a.notes,
      a.tailoredResume,
      a.coverLetter ?? "",
      a.jobDescriptionSnippet,
    ]
      .map(csvCell)
      .join(","),
  );

  return [headers.map(csvCell).join(","), ...rows].join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
