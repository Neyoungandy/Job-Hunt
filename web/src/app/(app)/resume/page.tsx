"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppProvider";

export default function ResumePage() {
  const { hydrated, activeProfile, upsertProfile } = useApp();
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMsg, setPdfMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [saveMsg, setSaveMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  /** True while local headline/body differ from what we last synced from the server. */
  const dirtyRef = useRef(false);
  const lastProfileIdRef = useRef<string | null>(null);

  const pid = activeProfile?.id ?? "";
  const serverHeadline = activeProfile?.headline ?? "";
  const serverBody = activeProfile?.baseResume ?? "";

  useEffect(() => {
    if (!pid) return;
    if (lastProfileIdRef.current !== pid) {
      lastProfileIdRef.current = pid;
      dirtyRef.current = false;
      setHeadline(serverHeadline);
      setBody(serverBody);
      return;
    }
    if (!dirtyRef.current) {
      setHeadline(serverHeadline);
      setBody(serverBody);
    }
  }, [pid, serverHeadline, serverBody]);

  async function persist(
    patch: { headline?: string; baseResume?: string; resumePdfFileName?: string },
    okMessage: string,
  ) {
    if (!activeProfile) return;
    setSaveMsg(null);
    try {
      await upsertProfile({
        id: activeProfile.id,
        ...patch,
      });
      dirtyRef.current = false;
      setSaveMsg({ kind: "ok", text: okMessage });
    } catch (e) {
      const text =
        e instanceof Error ? e.message : "Could not save. Check your connection.";
      setSaveMsg({ kind: "err", text });
    }
  }

  async function onPdfSelected(file: File | null) {
    setPdfMsg(null);
    if (!file || !activeProfile) return;
    setPdfBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/parse-pdf", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        text?: string;
        fileName?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const text = data.text ?? "";
      setBody(text);
      dirtyRef.current = false;
      await upsertProfile({
        id: activeProfile.id,
        baseResume: text,
        resumePdfFileName: data.fileName ?? file.name,
      });
      setPdfMsg({
        kind: "ok",
        text: `Imported text from “${data.fileName ?? file.name}”. Review for accuracy.`,
      });
      setSaveMsg({
        kind: "ok",
        text: "Resume text saved to your workspace.",
      });
    } catch (e) {
      setPdfMsg({
        kind: "err",
        text: e instanceof Error ? e.message : "Could not read PDF.",
      });
    } finally {
      setPdfBusy(false);
    }
  }

  if (!hydrated || !activeProfile) {
    return (
      <div className="text-sm text-[var(--muted)]">Loading profile…</div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Base resume — {activeProfile.name}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Upload a PDF or Word (.docx) to extract text automatically, or paste/edit
          directly. Tailoring and cover letters always use this text — keep it
          truthful.
        </p>
      </div>

      <div className="card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Resume import
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          The file is not stored on the server — only extracted text is saved to
          your account. Supports PDF and Word (.docx). Image-only scans may not
          extract; export a text-based PDF or .docx from Word/Google Docs if
          needed.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="btn-primary cursor-pointer px-4 py-2">
            {pdfBusy ? "Reading file…" : "Choose PDF or Word"}
            <input
              type="file"
              accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
              className="hidden"
              disabled={pdfBusy}
              onChange={(e) => void onPdfSelected(e.target.files?.[0] ?? null)}
            />
          </label>
          {activeProfile.resumePdfFileName && (
            <span className="text-xs text-[var(--muted)]">
              Last import: {activeProfile.resumePdfFileName}
            </span>
          )}
        </div>
        {pdfMsg && (
          <p
            className={`mt-3 text-sm ${
              pdfMsg.kind === "ok"
                ? "text-emerald-400/90"
                : "text-[var(--warning)]"
            }`}
          >
            {pdfMsg.text}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Headline / summary line
        </label>
        <input
          className="input-field"
          value={headline}
          onChange={(e) => {
            dirtyRef.current = true;
            setHeadline(e.target.value);
          }}
          onBlur={() =>
            void persist({ headline }, "Headline saved.")
          }
          placeholder="e.g. Full-stack engineer · TypeScript · customer-obsessed"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Full resume (editable text)
        </label>
        <textarea
          className="input-field min-h-[420px] font-mono leading-relaxed"
          value={body}
          onChange={(e) => {
            dirtyRef.current = true;
            setBody(e.target.value);
          }}
          onBlur={() => void persist({ baseResume: body }, "Resume saved.")}
          placeholder={"# Your Name\n## Experience\n- Bullet with metric…"}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-secondary disabled:opacity-50"
          onClick={() =>
            void persist({ headline, baseResume: body }, "Resume saved.")
          }
        >
          Save now
        </button>
        {saveMsg && (
          <span
            className={`text-sm ${
              saveMsg.kind === "ok"
                ? "text-emerald-400/90"
                : "text-[var(--warning)]"
            }`}
            role="status"
          >
            {saveMsg.text}
          </span>
        )}
      </div>
    </div>
  );
}
