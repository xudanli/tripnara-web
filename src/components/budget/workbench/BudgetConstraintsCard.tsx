import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { workbenchCard } from '@/components/plan-studio/workbench/workbench-ui';
import type { BudgetConstraintRow } from './budget-constraints-card.util';

export interface BudgetConstraintsCardProps {
  isZh: boolean;
  rows: BudgetConstraintRow[];
  onEdit?: () => void;
}

function toneBadge(tone: BudgetConstraintRow['tone'], isZh: boolean) {
  if (tone === 'soft') {
    return {
      label: isZh ? '软约束' : 'Soft',
      className: 'border-gate-confirm-border/60 bg-gate-confirm/15 text-gate-confirm-foreground',
    };
  }
  return {
    label: isZh ? '硬约束' : 'Hard',
    className: 'border-gate-reject-border/60 bg-gate-reject/10 text-gate-reject-foreground',
  };
}

export function BudgetConstraintsCard({ isZh, rows, onEdit }: BudgetConstraintsCardProps) {
  return (
    <section className={cn(workbenchCard, 'p-3')}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">
          {isZh ? '预算约束' : 'Budget constraints'}
        </h3>
        {onEdit ? (
          <Button
            type="button"
            variant="link"
            className="h-auto px-0 text-xs text-primary"
            onClick={onEdit}
          >
            {isZh ? '编辑' : 'Edit'}
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {isZh ? '尚未设置预算约束，点击编辑添加' : 'No budget constraints yet. Tap Edit to add.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((row) => {
            const badge = toneBadge(row.tone, isZh);
            return (
              <li key={row.id} className="flex items-start gap-2 text-xs leading-snug">
                <span
                  className={cn(
                    'mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                    badge.className,
                  )}
                >
                  {badge.label}
                </span>
                <span className="min-w-0 text-foreground">{row.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
