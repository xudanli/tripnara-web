import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { aggregateFrictionByDomain } from '@/lib/collab-friction-domains';
import { frictionLevelBarClass } from '@/components/decision-profiling/decision-profiling-ui';
import type { FrictionDomain, FrictionMatrixPair } from '@/types/trip-decision-profiling';
import { cn } from '@/lib/utils';
import { workbenchSoftPriorityClass } from '@/components/plan-studio/workbench/workbench-ui';
import { CollabWidgetCard } from './CollabWidgetCard';

interface FrictionMatrixCompactWidgetProps {
  pairs: FrictionMatrixPair[];
  onDomainClick?: (domain: FrictionDomain) => void;
  onViewDetail?: () => void;
}

function severityChipClass(level: 'green' | 'yellow' | 'red'): string {
  if (level === 'red') return workbenchSoftPriorityClass('高');
  if (level === 'yellow') return workbenchSoftPriorityClass('中');
  return workbenchSoftPriorityClass('低');
}

function severityShortLabel(level: 'green' | 'yellow' | 'red'): string {
  if (level === 'red') return '较高摩擦';
  if (level === 'yellow') return '中摩擦';
  return '较低摩擦';
}

export function FrictionMatrixCompactWidget({
  pairs,
  onDomainClick,
  onViewDetail,
}: FrictionMatrixCompactWidgetProps) {
  const domains = aggregateFrictionByDomain(pairs);

  return (
    <CollabWidgetCard
      title="团队摩擦矩阵"
      action={
        onViewDetail ? (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-[10px] text-primary"
            onClick={onViewDetail}
          >
            查看摩擦详情
            <ChevronRight className="ml-0.5 h-3 w-3" />
          </Button>
        ) : undefined
      }
    >
      {domains.length === 0 ? (
        <p className="text-xs text-muted-foreground">完成团队调查后生成摩擦矩阵。</p>
      ) : (
        <ul className="space-y-2.5">
          {domains.map((row) => {
            const clickable = Boolean(onDomainClick) && row.level !== 'green';
            const Tag = clickable ? 'button' : 'div';
            const barWidth = row.level === 'green' ? 30 : row.level === 'yellow' ? 60 : 90;

            return (
              <li key={row.domain}>
                <Tag
                  type={clickable ? 'button' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2 text-left',
                    clickable &&
                      'rounded-md px-1 py-0.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                  onClick={clickable ? () => onDomainClick?.(row.domain) : undefined}
                  disabled={!clickable}
                >
                  <span className="w-14 shrink-0 text-xs font-medium text-foreground">
                    {row.label}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 text-[10px] font-normal',
                      severityChipClass(row.level),
                    )}
                  >
                    {severityShortLabel(row.level)}
                  </Badge>
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', frictionLevelBarClass(row.level))}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                    {Math.round(row.score)}
                  </span>
                </Tag>
              </li>
            );
          })}
        </ul>
      )}
    </CollabWidgetCard>
  );
}
