import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { workbenchCardFlat, workbenchPanelTitle } from '@/components/plan-studio/workbench/workbench-ui';

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
        workbenchCardFlat,
        'flex min-h-0 flex-col',
        compact ? 'p-3' : 'p-4',
        className,
      )}
      aria-labelledby={titleId}
    >
      <div className={cn('flex items-start justify-between gap-2', compact ? 'mb-2' : 'mb-3')}>
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
      <div className="min-h-0 flex-1">{children}</div>
      {footer ? <div className="mt-auto border-t border-border/50 pt-2.5">{footer}</div> : null}
    </section>
  );
}
