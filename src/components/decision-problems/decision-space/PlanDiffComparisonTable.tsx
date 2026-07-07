import { cn } from '@/lib/utils';
import type { PlanDiffChangeRow, PlanDiffDeltaTone } from '@/lib/decision-space-plan-diff-view.util';

const DELTA_CLASS: Record<Exclude<PlanDiffDeltaTone, 'buffer'>, string> = {
  good: 'text-gate-allow-foreground',
  bad: 'text-gate-reject-foreground',
  neutral: 'text-muted-foreground',
};

const SIGNED_MINUTES = /^([+-]?\d+)\s*分钟$/;

function signedMinutesClass(value: string): string {
  const match = value.trim().match(SIGNED_MINUTES);
  if (!match) return 'text-muted-foreground';
  const minutes = Number(match[1]);
  if (minutes > 0) return 'text-gate-allow-foreground';
  if (minutes < 0) return 'text-gate-reject-foreground';
  return 'text-muted-foreground';
}

function cellClass(row: PlanDiffChangeRow, column: 'before' | 'after' | 'delta'): string {
  if (row.deltaTone !== 'buffer') {
    if (column === 'delta') return DELTA_CLASS[row.deltaTone];
    return column === 'before' ? 'text-muted-foreground' : 'text-foreground';
  }
  if (column === 'before') return cn('tabular-nums', signedMinutesClass(row.before));
  if (column === 'after') return cn('tabular-nums', signedMinutesClass(row.after));
  return cn('font-medium tabular-nums text-gate-confirm-foreground');
}

export function PlanDiffComparisonTable({
  rows,
  compact = false,
}: {
  rows: PlanDiffChangeRow[];
  compact?: boolean;
}) {
  if (!rows.length) return null;

  const cellPad = compact ? 'px-1.5 py-1' : 'px-2.5 py-2';

  return (
    <div className="overflow-x-auto rounded-md border border-border/60">
      <table className={cn('w-full min-w-[280px] border-collapse', compact ? 'text-[10px]' : 'text-[11px]')}>
        <thead>
          <tr className="border-b border-border/50 bg-muted/15 text-left">
            <th className={cn(cellPad, 'font-medium text-muted-foreground')}>项目</th>
            <th className={cn(cellPad, 'font-medium text-muted-foreground')}>原计划</th>
            <th className={cn(cellPad, 'font-medium text-muted-foreground')}>新计划</th>
            <th className={cn(cellPad, 'font-medium text-muted-foreground')}>变化</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/30 last:border-0">
              <td className={cn(cellPad, 'text-foreground')}>{row.label}</td>
              <td className={cn(cellPad, cellClass(row, 'before'))}>{row.before}</td>
              <td className={cn(cellPad, cellClass(row, 'after'))}>{row.after}</td>
              <td className={cn(cellPad, cellClass(row, 'delta'))}>{row.delta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
