import { cn } from '@/lib/utils';

/** P0.2 — 计划内容四态标签 */
export type PlanContentState = 'effective' | 'proposal' | 'draft' | 'pending_apply';

const META: Record<
  PlanContentState,
  { label: string; className: string }
> = {
  effective: {
    label: '当前生效',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  proposal: {
    label: 'AI 建议',
    className: 'bg-muted text-foreground border-border',
  },
  draft: {
    label: '我的修改',
    className: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25',
  },
  pending_apply: {
    label: '等待应用',
    className: 'bg-muted/10 text-muted-foreground dark:text-muted-foreground border-border/25',
  },
};

interface PlanContentStateBadgeProps {
  state: PlanContentState;
  className?: string;
}

export function PlanContentStateBadge({ state, className }: PlanContentStateBadgeProps) {
  const meta = META[state];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none',
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
