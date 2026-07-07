import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DecisionSectionProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  /** 工作台决策空间等窄栏场景 — 收紧内边距与标题区高度 */
  compact?: boolean;
}

/** 决策详情 / 抽屉内统一区块卡片 */
export function DecisionSection({
  title,
  icon: Icon,
  children,
  className,
  compact = false,
}: DecisionSectionProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border/60 bg-card/50',
        compact ? 'px-3 py-2' : 'px-3.5 py-3',
        className,
      )}
    >
      <div className={cn('flex items-center gap-1.5', compact ? 'mb-1.5' : 'mb-2')}>
        {Icon ? (
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-md bg-muted/60',
              compact ? 'h-5 w-5' : 'h-6 w-6',
            )}
          >
            <Icon
              className={cn('text-muted-foreground', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')}
              aria-hidden
            />
          </span>
        ) : null}
        <h4
          className={cn(
            'font-semibold tracking-tight text-foreground',
            compact ? 'text-xs' : 'text-[13px]',
          )}
        >
          {title}
        </h4>
      </div>
      <div className={cn('text-foreground/90', compact ? 'text-xs leading-snug' : 'text-sm leading-relaxed')}>
        {children}
      </div>
    </section>
  );
}

export function DecisionSectionStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-3', className)}>{children}</div>;
}

/** 抽屉内分区标题（方案对比、执行结果等） */
export function DecisionDrawerSectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-2 pb-1', className)}>
      <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      {action}
    </div>
  );
}

export function DecisionDrawerSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-border/50 bg-muted/10 p-3.5', className)}>
      {children}
    </section>
  );
}
