const PREFIX = "jobhunt:searchSeen:";

function storageKey(userKey: string, profileId: string): string {
  return `${PREFIX}${userKey}:${profileId}`;
}

export function loadSeenJobIds(
  userKey: string,
  profileId: string,
): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(storageKey(userKey, profileId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveSeenJobIds(
  userKey: string,
  profileId: string,
  jobIds: string[],
): void {
  if (typeof window === "undefined") return;
  try {
    const merged = new Set([...loadSeenJobIds(userKey, profileId), ...jobIds]);
    localStorage.setItem(
      storageKey(userKey, profileId),
      JSON.stringify([...merged].slice(-5000)),
    );
  } catch {
    /* ignore quota errors */
  }
}

export function isJobNewSinceLastVisit(
  jobId: string,
  seenBefore: Set<string>,
): boolean {
  return seenBefore.size > 0 && !seenBefore.has(jobId);
}
