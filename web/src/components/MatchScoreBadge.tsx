import {
  matchScoreColor,
  matchScoreLabel,
  type JobMatchResult,
} from "@/lib/job-match";

export function MatchScoreBadge({
  match,
  compact = false,
}: {
  match: JobMatchResult;
  compact?: boolean;
}) {
  const color = matchScoreColor(match.score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[var(--elevated)] px-2.5 py-1 text-xs font-semibold ${color}`}
      title={`Role keywords: ${match.rolePercent}% · Resume overlap: ${match.resumePercent}%`}
    >
      <span className="font-display text-sm">{match.score}%</span>
      {!compact && <span className="font-normal opacity-90">{matchScoreLabel(match.score)}</span>}
    </span>
  );
}
