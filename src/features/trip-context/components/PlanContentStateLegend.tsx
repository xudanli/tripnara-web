import { cn } from '@/lib/utils';
import { PlanContentStateBadge, type PlanContentState } from './PlanContentStateBadge';

const LEGEND: Array<{ state: PlanContentState; hint: string }> = [
  { state: 'effective', hint: '已写入行程、可直接执行' },
  { state: 'proposal', hint: 'AI 生成，待你确认' },
  { state: 'draft', hint: '你的本地或草案修改' },
  { state: 'pending_apply', hint: '决策已接受，等待应用' },
];

interface PlanContentStateLegendProps {
  states?: PlanContentState[];
  className?: string;
  compact?: boolean;
}

/** P0.2 — 计划四态图例（Plan Studio / 时间轴） */
export function PlanContentStateLegend({
  states,
  className,
  compact = false,
}: PlanContentStateLegendProps) {
  const visible = states?.length
    ? LEGEND.filter((entry) => states.includes(entry.state))
    : LEGEND;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1.5',
        compact ? 'text-[10px]' : 'text-xs',
        className,
      )}
      aria-label="计划内容状态说明"
    >
      {visible.map(({ state, hint }) => (
        <span key={state} className="inline-flex items-center gap-1.5 text-muted-foreground">
          <PlanContentStateBadge state={state} />
          {!compact ? <span>{hint}</span> : null}
        </span>
      ))}
    </div>
  );
}
