import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function DecisionSpaceNumberedSection({
  index,
  title,
  subtitle,
  children,
  className,
  compact = false,
}: {
  index: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section className={cn(compact ? 'space-y-1' : 'space-y-2', className)}>
      <div>
        <h3
          className={cn(
            'font-semibold text-foreground',
            compact ? 'text-[11px] leading-snug' : 'text-[13px]',
          )}
        >
          <span className="mr-1 text-muted-foreground">{index}</span>
          {title}
          {compact && subtitle ? (
            <span className="font-normal text-muted-foreground"> · {subtitle}</span>
          ) : null}
        </h3>
        {!compact && subtitle ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function DecisionSpaceDemoHint({ visible }: { visible?: boolean }) {
  if (!visible) return null;
  return (
    <p className="rounded-md border border-dashed border-border/60 bg-muted/10 px-2 py-1 text-[10px] text-muted-foreground">
      布局预览 · 选择方案并加载 preview 后将展示真实差异
    </p>
  );
}
