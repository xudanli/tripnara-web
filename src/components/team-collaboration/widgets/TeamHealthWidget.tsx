import { cn } from '@/lib/utils';
import type { CollabTeamHealth } from '@/lib/collab-team-health';
import { CollabWidgetCard } from './CollabWidgetCard';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamHealthWidgetProps {
  health: CollabTeamHealth;
  loading?: boolean;
}

function metricTone(value: number, invert = false): string {
  const v = invert ? 100 - value : value;
  if (v >= 75) return 'text-gate-allow-foreground';
  if (v >= 50) return 'text-gate-confirm-foreground';
  return 'text-gate-reject-foreground';
}

function MetricCell({
  label,
  value,
  invert,
}: {
  label: string;
  value: number;
  invert?: boolean;
}) {
  return (
    <div
      className="rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2 text-center"
      role="group"
      aria-label={`${label} ${value}%`}
    >
      <p className={cn('text-lg font-semibold tabular-nums', metricTone(value, invert))}>
        {value}%
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export function TeamHealthWidget({ health, loading }: TeamHealthWidgetProps) {
  return (
    <CollabWidgetCard title="团队健康度">
      {loading ? (
        <div className="grid grid-cols-2 gap-2" aria-busy="true" aria-label="加载团队健康度">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <MetricCell label="参与度" value={health.participation} />
          <MetricCell label="沟通活跃度" value={health.communication} />
          <MetricCell label="决策效率" value={health.decisionEfficiency} />
          <MetricCell label="冲突水平" value={health.conflictLevel} invert />
        </div>
      )}
    </CollabWidgetCard>
  );
}
