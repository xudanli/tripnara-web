import { Check, CircleAlert, CircleHelp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  assessmentToneBadgeClass,
} from '@/lib/frontend-constraint-card-view.util';
import type { ConstraintAssessmentLaneBadge } from '@/types/frontend-constraint-assessment-api.types';

function LaneStatusIcon({ status }: { status: ConstraintAssessmentLaneBadge['status'] }) {
  switch (status) {
    case 'PASS':
      return <Check className="h-3 w-3 shrink-0 text-[var(--color-success)]" aria-hidden />;
    case 'BLOCK':
      return <X className="h-3 w-3 shrink-0 text-error" aria-hidden />;
    case 'WARNING':
    case 'REQUIRES_VERIFICATION':
      return <CircleAlert className="h-3 w-3 shrink-0 text-[var(--color-warning)]" aria-hidden />;
    default:
      return <CircleHelp className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />;
  }
}

export interface ConstraintAssessmentLaneBadgesProps {
  badges: ConstraintAssessmentLaneBadge[];
  compact?: boolean;
  className?: string;
}

/** P1-A · 规划 / 执行双 lane 验证行 */
export function ConstraintAssessmentLaneBadges({
  badges,
  compact = false,
  className,
}: ConstraintAssessmentLaneBadgesProps) {
  if (!badges.length) return null;

  return (
    <div
      className={cn(
        'space-y-0.5 border-t border-border/40 pt-1.5',
        compact ? 'text-[9px]' : 'text-[10px]',
        className,
      )}
      data-testid="constraint-assessment-lanes"
    >
      {badges.map((badge) => (
        <div key={badge.laneKey} className="flex items-start gap-1.5 leading-snug">
          <LaneStatusIcon status={badge.status} />
          <p className="min-w-0 flex-1 break-words text-muted-foreground">
            <span className="font-medium text-foreground/85">{badge.laneLabel}:</span>{' '}
            <span className={cn(assessmentToneBadgeClass(badge.tone))}>{badge.statusLabel}</span>
            {badge.detail ? (
              <span className="text-muted-foreground"> · {badge.detail}</span>
            ) : null}
          </p>
        </div>
      ))}
    </div>
  );
}

export interface ConstraintAssessmentSummaryProps {
  contractRequirement?: string | null;
  aggregateLabel?: string | null;
  aggregateTone?: import('@/types/frontend-constraint-assessment-api.types').ConstraintAssessmentUiTone;
  laneBadges?: ConstraintAssessmentLaneBadge[];
  className?: string;
}

/** 卡片 · 合同要求 + 验证状态两块 */
export function ConstraintAssessmentSummary({
  contractRequirement,
  aggregateLabel,
  aggregateTone,
  laneBadges,
  className,
}: ConstraintAssessmentSummaryProps) {
  if (!contractRequirement && !aggregateLabel && !laneBadges?.length) return null;

  return (
    <div className={cn('space-y-1.5', className)} data-testid="constraint-assessment-summary">
      {contractRequirement ? (
        <p className="break-words text-[10px] leading-snug text-muted-foreground">
          <span className="text-muted-foreground/80">要求 </span>
          <span className="font-medium text-foreground/90">{contractRequirement}</span>
        </p>
      ) : null}
      {aggregateLabel ? (
        <p className="break-words text-[10px] leading-snug">
          <span className="text-muted-foreground/80">验证 </span>
          <span
            className={cn(
              'font-medium',
              aggregateTone ? assessmentToneBadgeClass(aggregateTone) : 'text-muted-foreground',
            )}
          >
            {aggregateLabel}
          </span>
        </p>
      ) : null}
      {laneBadges?.length ? (
        <ConstraintAssessmentLaneBadges badges={laneBadges} compact />
      ) : null}
    </div>
  );
}
