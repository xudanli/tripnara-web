import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { OUTCOME_BADGE_LABEL, sortFindingsBySeverity } from '@/lib/trip-executability.util';
import type { PlanningRuleResult, ValidationFinding } from '@/types/trip-executability';
import { AlertTriangle } from 'lucide-react';

export interface ExecutabilityFindingsListProps {
  findings: ValidationFinding[];
  ruleResults?: PlanningRuleResult[];
  onFindingClick?: (finding: ValidationFinding) => void;
  className?: string;
}

function outcomeBadgeVariant(outcome: ValidationFinding['outcome']) {
  switch (outcome) {
    case 'REJECT':
      return 'destructive' as const;
    case 'SUGGEST_REPAIR':
      return 'default' as const;
    case 'NEED_CONFIRM':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
}

export function ExecutabilityFindingsList({
  findings,
  ruleResults = [],
  onFindingClick,
  className,
}: ExecutabilityFindingsListProps) {
  const sorted = sortFindingsBySeverity(findings);
  const degraded = ruleResults.find((r) => r.degraded === true);

  if (sorted.length === 0 && !degraded) return null;

  return (
    <section className={cn('space-y-2', className)} data-testid="executability-findings">
      {degraded ? (
        <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{degraded.degradationReason?.trim() || '部分路况信息待更新'}</span>
        </div>
      ) : null}

      {sorted.length > 0 ? (
        <>
          <h3 className="text-xs font-medium text-muted-foreground">
            待处理 ({sorted.length})
          </h3>
          <ul className="space-y-2">
            {sorted.map((finding) => (
              <li key={finding.findingId}>
                <button
                  type="button"
                  className={cn(
                    'w-full rounded-lg border border-border/70 bg-card px-3 py-2.5 text-left transition-colors',
                    onFindingClick && 'hover:bg-muted/30',
                  )}
                  onClick={() => onFindingClick?.(finding)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm text-foreground">{finding.message}</p>
                    <Badge
                      variant={outcomeBadgeVariant(finding.outcome)}
                      className="shrink-0 text-[10px]"
                    >
                      {OUTCOME_BADGE_LABEL[finding.outcome]}
                    </Badge>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
