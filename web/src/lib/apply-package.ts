export function applicationPackageText(
  jobTitle: string,
  company: string,
  resume: string,
  letter: string,
): string {
  return [
    `Job: ${jobTitle} @ ${company}`,
    "",
    "--- TAILORED RESUME (paste where the form asks for resume / CV) ---",
    "",
    resume.trim(),
    "",
    "--- COVER LETTER (paste where the form asks for cover letter) ---",
    "",
    letter.trim(),
  ].join("\n");
}

export async function copyApplicationPackage(
  jobTitle: string,
  company: string,
  resume: string,
  letter: string,
): Promise<boolean> {
  try {
    const text = applicationPackageText(jobTitle, company, resume, letter);
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function openApplyUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
