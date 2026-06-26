import { cn } from '@/lib/utils';
import {
  formatTrustConfidenceScore,
  gate1TrustConfidenceLabel,
  trustConfidenceToneClass,
} from '@/lib/gate1-trust-display';
import type { Gate1TrustConfidenceLevel } from '@/types/decision-os';

interface ConfidenceBadgeProps {
  level: Gate1TrustConfidenceLevel | string;
  score?: number | null;
  className?: string;
}

export function ConfidenceBadge({ level, score, className }: ConfidenceBadgeProps) {
  const normalized =
    level === 'HIGH' || level === 'MEDIUM' || level === 'LOW' || level === 'UNKNOWN'
      ? level
      : 'UNKNOWN';
  const scoreLabel = formatTrustConfidenceScore(score);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        trustConfidenceToneClass(normalized),
        className,
      )}
    >
      {gate1TrustConfidenceLabel(normalized)}
      {scoreLabel ? ` · ${scoreLabel}` : null}
    </span>
  );
}
