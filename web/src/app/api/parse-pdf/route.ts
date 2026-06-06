import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  detectResumeKind,
  extractDocxText,
  extractPdfText,
  ResumeImportError,
} from "@/lib/resume-import";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: 'Expected multipart/form-data with field "file".' },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Resume file must be 8MB or smaller." },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const kind = detectResumeKind(file.name, file.type, buf);

  if (!kind) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Upload a PDF (.pdf) or Word document (.docx). Legacy .doc files: open in Word and Save As .docx.",
      },
      { status: 400 },
    );
  }

  try {
    const text =
      kind === "pdf" ? await extractPdfText(buf) : await extractDocxText(buf);

    if (!text) {
      return NextResponse.json(
        {
          error:
            "No readable text found (often image-only scans). Export a text-based PDF or .docx from Word/Google Docs, or paste text manually.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      text,
      fileName: file.name || (kind === "pdf" ? "resume.pdf" : "resume.docx"),
      kind,
    });
  } catch (e) {
    if (e instanceof ResumeImportError) {
      if (process.env.NODE_ENV === "development" && e.detail) {
        console.error("[parse-pdf]", e.detail, e);
      }
      return NextResponse.json(
        {
          error: e.message,
          ...(process.env.NODE_ENV === "development" && e.detail
            ? { detail: e.detail.slice(0, 500) }
            : {}),
        },
        { status: 422 },
      );
    }

    const msg = e instanceof Error ? e.message : String(e);
    console.error("[parse-pdf]", msg, e);
    return NextResponse.json(
      {
        error:
          "Could not read this resume file. Try another export or paste text manually.",
        ...(process.env.NODE_ENV === "development" ? { detail: msg.slice(0, 500) } : {}),
      },
      { status: 422 },
    );
  }
}
