/** Build search keywords from a role label and optional comma-separated extras. */
export function buildRoleKeywords(
  label: string,
  extraKeywords: string[] = [],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  function add(raw: string) {
    const k = raw.trim().toLowerCase();
    if (k.length < 2 || seen.has(k)) return;
    seen.add(k);
    out.push(k);
  }

  for (const k of extraKeywords) add(k);

  const base = label.trim().toLowerCase();
  if (!base) return out;

  add(base);
  add(base.replace(/\s+/g, ""));
  add(base.replace(/[^a-z0-9\s]/gi, " ").replace(/\s+/g, " ").trim());

  for (const word of base.split(/\s+/)) {
    if (word.length >= 3) add(word);
  }

  return out;
}
