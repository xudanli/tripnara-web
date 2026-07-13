import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { workbenchCard, workbenchPanelTitle } from '@/components/plan-studio/workbench/workbench-ui';

interface CollabWidgetCardProps {
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}

export function CollabWidgetCard({
  title,
  description,
  action,
  footer,
  children,
  className,
  compact = false,
}: CollabWidgetCardProps) {
  const titleId = useId();

  return (
    <section
      className={cn(
        workbenchCard,
        'flex min-h-0 flex-col',
        compact ? 'p-2.5' : 'p-3',
        className,
      )}
      aria-labelledby={titleId}
    >
      <div className={cn('flex items-start justify-between gap-2', compact ? 'mb-1.5' : 'mb-2')}>
        <div className="min-w-0">
          <h3
            id={titleId}
            className={cn(workbenchPanelTitle, compact && 'text-xs')}
          >
            {title}
          </h3>
          {description ? (
            <p className={cn('text-muted-foreground', compact ? 'text-[10px]' : 'mt-0.5 text-xs')}>
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div>{children}</div>
      {footer ? <div className="mt-2 border-t border-border/50 pt-2">{footer}</div> : null}
    </section>
  );
}
