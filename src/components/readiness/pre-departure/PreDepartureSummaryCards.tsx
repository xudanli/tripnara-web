import { cn } from '@/lib/utils';
import {
  workbenchPreDepartureMetricToneClass,
  workbenchPreDepartureSummaryCard,
} from '@/components/plan-studio/workbench/workbench-ui';

interface PreDepartureSummaryCardsProps {
  readinessScore: number | null;
  mustHandleCount: number;
  blockerCount: number;
  suggestedCount: number;
  completedTasks: number;
  totalTasks: number;
  className?: string;
}

function SummaryCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'danger' | 'warning' | 'success';
}) {
  return (
    <div className={workbenchPreDepartureSummaryCard}>
      <div className={workbenchPreDepartureMetricToneClass(tone)}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

export default function PreDepartureSummaryCards({
  readinessScore,
  mustHandleCount,
  blockerCount,
  suggestedCount,
  completedTasks,
  totalTasks,
  className,
}: PreDepartureSummaryCardsProps) {
  const mustTone = blockerCount > 0 ? 'danger' : mustHandleCount > 0 ? 'warning' : 'neutral';
  const scoreTone =
    readinessScore == null
      ? 'neutral'
      : readinessScore < 60 || blockerCount > 0
        ? 'danger'
        : readinessScore < 80
          ? 'warning'
          : 'success';

  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}>
      <SummaryCard
        label="准备度"
        value={readinessScore != null ? readinessScore : '—'}
        tone={scoreTone}
      />
      <SummaryCard
        label="必须处理"
        value={mustHandleCount + blockerCount}
        tone={mustTone}
      />
      <SummaryCard label="建议项" value={suggestedCount} />
      <SummaryCard
        label="已完成任务"
        value={totalTasks > 0 ? `${completedTasks}/${totalTasks}` : completedTasks}
        tone={totalTasks > 0 && completedTasks === totalTasks ? 'success' : 'neutral'}
      />
    </div>
  );
}
