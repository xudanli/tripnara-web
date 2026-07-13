import type { CollabDecisionStats } from '@/hooks/useCollabOverview';
import { workbenchCard } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';

interface CollabDecisionStatsRowProps {
  stats: CollabDecisionStats;
  className?: string;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className={cn(workbenchCard, 'flex items-center gap-2.5 px-3 py-2')}>
      <p className="text-lg font-semibold tabular-nums leading-none text-foreground">{value}</p>
      <div className="min-w-0 leading-tight">
        <p className="text-xs font-medium text-foreground">{label}</p>
        {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

export function CollabDecisionStatsRow({ stats, className }: CollabDecisionStatsRowProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 lg:grid-cols-4', className)}>
      <StatCard label="待决事项" value={stats.pending} hint="需尽快推进" />
      <StatCard label="协商中" value={stats.inNegotiation} hint="进行中议题" />
      <StatCard label="投票中" value={stats.inVoting} hint="开放投票" />
      <StatCard label="已达成共识" value={stats.consensusReached} hint="已完成" />
    </div>
  );
}
