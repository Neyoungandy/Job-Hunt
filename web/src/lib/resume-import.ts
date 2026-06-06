import mammoth from "mammoth";

export type ResumeFileKind = "pdf" | "docx";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function detectResumeKind(
  fileName: string,
  mimeType: string,
  buf: Buffer,
): ResumeFileKind | null {
  const name = fileName.toLowerCase();
  const mime = mimeType.toLowerCase();

  if (
    name.endsWith(".pdf") ||
    mime === "application/pdf" ||
    (buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "%PDF")
  ) {
    return "pdf";
  }

  if (
    name.endsWith(".docx") ||
    mime === DOCX_MIME ||
    (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b)
  ) {
    return "docx";
  }

  return null;
}

export function cleanResumeText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractPdfText(buf: Buffer): Promise<string> {
  const {
    PDFParse,
    FormatError,
    InvalidPDFException,
    PasswordException,
  } = await import("pdf-parse");

  const parser = new PDFParse({ data: buf });
  try {
    const textResult = await parser.getText();
    return cleanResumeText(textResult.text);
  } catch (e) {
    if (e instanceof PasswordException) {
      throw new ResumeImportError(
        "This PDF is password-protected. Remove the password and upload again, or paste text manually.",
      );
    }
    if (e instanceof FormatError || e instanceof InvalidPDFException) {
      throw new ResumeImportError(
        "This file does not look like a valid PDF. Try exporting again from your editor.",
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    throw new ResumeImportError(
      "Could not read this PDF. Try another export or paste text manually.",
      msg,
    );
  } finally {
    try {
      await parser.destroy();
    } catch {
      /* ignore */
    }
  }
}

export async function extractDocxText(buf: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer: buf });
    const text = cleanResumeText(result.value);
    if (!text) {
      throw new ResumeImportError(
        "No readable text in this Word file. Save as .docx from Word/Google Docs, or paste text manually.",
      );
    }
    return text;
  } catch (e) {
    if (e instanceof ResumeImportError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new ResumeImportError(
      "Could not read this Word document. Save as .docx (not legacy .doc) and try again.",
      msg,
    );
  }
}

export class ResumeImportError extends Error {
  detail?: string;

  constructor(message: string, detail?: string) {
    super(message);
    this.name = "ResumeImportError";
    this.detail = detail;
  }
}
