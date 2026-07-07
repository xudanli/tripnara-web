import {
  Activity,
  BedDouble,
  ChevronRight,
  Shield,
  Users,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  personaFooterLinkClass,
  personaSectionMinHeight,
} from '@/components/team-collaboration/persona-ui';
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

const DOMAIN_ICONS: Partial<Record<FrictionDomain, typeof Wallet>> = {
  budget: Wallet,
  pace: Activity,
  accommodation: BedDouble,
  activities: Users,
  group_decision: Shield,
};

const DOMAIN_DISPLAY_LABELS: Partial<Record<FrictionDomain, string>> = {
  budget: '预算重叠度',
  pace: '节奏同步',
  accommodation: '舒适度门槛',
  activities: '体验导向',
  group_decision: '风险态度',
};

function severityChipClass(level: 'green' | 'yellow' | 'red'): string {
  if (level === 'red') return workbenchSoftPriorityClass('高');
  if (level === 'yellow') return workbenchSoftPriorityClass('中');
  return workbenchSoftPriorityClass('低');
}

function severityShortLabel(level: 'green' | 'yellow' | 'red'): string {
  if (level === 'red') return '较高摩擦';
  if (level === 'yellow') return '中等摩擦';
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
      className={cn('h-full', personaSectionMinHeight)}
      footer={
        onViewDetail ? (
          <Button
            type="button"
            variant="link"
            className={cn(personaFooterLinkClass, 'h-auto p-0')}
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
        <ul className="space-y-3">
          {domains.map((row) => {
            const clickable = Boolean(onDomainClick) && row.level !== 'green';
            const Tag = clickable ? 'button' : 'div';
            const Icon = DOMAIN_ICONS[row.domain] ?? Activity;
            const label = DOMAIN_DISPLAY_LABELS[row.domain] ?? row.label;
            const barWidth = Math.min(100, Math.max(12, Math.round(row.score)));

            return (
              <li key={row.domain}>
                <Tag
                  type={clickable ? 'button' : undefined}
                  className={cn(
                    'block w-full text-left',
                    clickable &&
                      'rounded-md transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                  onClick={clickable ? () => onDomainClick?.(row.domain) : undefined}
                  disabled={!clickable}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">
                      {label}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 px-1.5 text-[9px] font-normal',
                        severityChipClass(row.level),
                      )}
                    >
                      {severityShortLabel(row.level)}
                    </Badge>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {Math.round(row.score)}/100
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', frictionLevelBarClass(row.level))}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </Tag>
              </li>
            );
          })}
        </ul>
      )}
    </CollabWidgetCard>
  );
}
