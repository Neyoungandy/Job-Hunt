import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";

type Body = {
  jobTitle: string;
  company: string;
  jobDescription: string;
  baseResume: string;
  headline?: string;
  /** When true, response includes coverLetter (heuristic or OpenAI). */
  includeCoverLetter?: boolean;
};

function heuristicTailor(body: Body): string {
  const jd = `${body.jobTitle}\n${body.jobDescription}`.toLowerCase();
  const lines = body.baseResume.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const prioritized = [...lines].sort((a, b) => {
    const score = (s: string) => {
      const t = s.toLowerCase();
      let n = 0;
      for (const word of jd.split(/[^a-z0-9+#]+/i)) {
        if (word.length > 3 && t.includes(word)) n += 1;
      }
      return n;
    };
    return score(b) - score(a);
  });

  const top = prioritized.slice(0, Math.min(12, prioritized.length));
  const summary = `Target role: ${body.jobTitle} at ${body.company}.\n\nThis draft reorders and lightly trims your base resume so lines that overlap the job description appear first. Replace bracketed notes and verify every claim before you apply.`;

  return `${summary}\n\n---\n\n${top.join("\n")}\n\n---\n\n[Add 2–3 bullets that mirror verbs and tools from the job description, using only experience you can defend in an interview.]`;
}

function topKeywords(text: string, limit: number): string[] {
  const stop = new Set([
    "the", "and", "for", "with", "you", "are", "our", "this", "that", "will",
    "from", "your", "have", "has", "was", "were", "been", "being", "their",
    "they", "them", "work", "team", "role", "job", "all", "any", "not", "but",
  ]);
  const words = text.toLowerCase().match(/[a-z][a-z0-9+#]{3,}/g) ?? [];
  const freq = new Map<string, number>();
  for (const w of words) {
    if (stop.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

function heuristicCoverLetter(body: Body): string {
  const jdWords = topKeywords(body.jobDescription, 12);
  const resumeWords = topKeywords(body.baseResume, 30);
  const overlap = jdWords.filter((w) => resumeWords.includes(w)).slice(0, 6);
  const themes = overlap.length ? overlap.join(", ") : jdWords.slice(0, 5).join(", ");
  const firstLine = body.baseResume.split(/\r?\n/).find((l) => l.trim()) ?? "Candidate";
  const signOff = firstLine.replace(/^#+\s*/, "").slice(0, 80);

  return [
    "Dear Hiring Manager,",
    "",
    `I am interested in the ${body.jobTitle} position at ${body.company}.`,
    "",
    `The posting emphasizes areas such as: ${themes}. In my background I have worked in related contexts and am eager to bring that experience to your team.`,
    "",
    "I would welcome the opportunity to discuss how my skills align with your needs. Thank you for your consideration.",
    "",
    "Sincerely,",
    signOff,
    "",
    "[Edit this letter so every sentence reflects your real experience. Remove anything you cannot support in an interview.]",
  ].join("\n");
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const wantLetter = body.includeCoverLetter !== false;

  if (!body.baseResume?.trim() || !body.jobDescription?.trim()) {
    return NextResponse.json(
      { error: "baseResume and jobDescription are required." },
      { status: 400 },
    );
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const tailored = heuristicTailor(body);
    return NextResponse.json({
      tailored,
      coverLetter: wantLetter ? heuristicCoverLetter(body) : "",
      mode: "heuristic" as const,
      notice:
        "No OPENAI_API_KEY set — using keyword-aware heuristics. Add an API key for stronger resume and letter drafts.",
    });
  }

  try {
    const resumePrompt = `You are an ethical career assistant. Rewrite the candidate's resume text to align with the job, without inventing employers, dates, degrees, certifications, or tools they did not list. Prefer concise bullets. Keep truthfulness; mark uncertain gaps with [verify].

Job title: ${body.jobTitle}
Company: ${body.company}
Headline: ${body.headline ?? ""}

Job description:
${body.jobDescription.slice(0, 12000)}

Base resume:
${body.baseResume.slice(0, 12000)}`;

    const letterPrompt = wantLetter
      ? `Write a concise cover letter (under 280 words) for the same candidate applying to the same job. Do not invent employers, titles, dates, or skills not present in the resume. Tone: professional, specific, confident. Address "Hiring Manager" unless a name appears in the job text. Reference 2–3 real themes from the resume that match the job.

Job title: ${body.jobTitle}
Company: ${body.company}

Job description:
${body.jobDescription.slice(0, 8000)}

Base resume:
${body.baseResume.slice(0, 8000)}`
      : null;

    async function openaiComplete(userContent: string) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You help candidates ethically. Output only the requested document text, no preamble.",
            },
            { role: "user", content: userContent },
          ],
          temperature: 0.35,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "OpenAI request failed");
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty model response");
      return text;
    }

    const tailored = await openaiComplete(resumePrompt);
    let coverLetter = "";
    if (wantLetter && letterPrompt) {
      coverLetter = await openaiComplete(letterPrompt);
    }

    return NextResponse.json({
      tailored,
      coverLetter,
      mode: "openai" as const,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
