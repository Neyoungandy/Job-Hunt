/**
 * Keep listings that can be done from anywhere.
 * Country/city “remote” roles (USA-only, EU-only, etc.) are treated as location-restricted.
 */
export function isOpenWorldwideLocation(
  raw?: string | string[] | null,
): boolean {
  const parts = (Array.isArray(raw) ? raw : [raw ?? ""])
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) return true;

  return parts.every(textLooksWorldwide);
}

function textLooksWorldwide(raw: string): boolean {
  const s = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return true;

  if (
    /\b(only|must be|based in|authorized|authorised|work authorization|visa|citizenship|timezone)\b/.test(
      s,
    ) &&
    !/\b(anywhere|worldwide|global)\b/.test(s)
  ) {
    return false;
  }

  const open =
    /\b(anywhere|worldwide|world-wide|world wide|global|unlimited|no restriction|work from anywhere|planet earth|fully remote worldwide)\b/.test(
      s,
    );
  if (open) return true;

  if (
    /^(remote|fully remote|100% remote|remote first|distributed)$/.test(s)
  ) {
    return true;
  }

  const regional =
    /\b(united states|u\.s\.a?|usa|uk|u\.k\.|united kingdom|canada|europe|emea|apac|latam|latin america|australia|new zealand|india|germany|france|netherlands|ireland|singapore|brazil|mexico|nigeria|south africa|japan|china|israel|uae)\b/.test(
      s,
    );
  if (regional) return false;

  if (/\b(city|county|state of|, [a-z]{2}\b)/.test(s)) return false;

  return false;
}
