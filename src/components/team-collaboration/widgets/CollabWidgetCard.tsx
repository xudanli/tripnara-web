import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { workbenchCard, workbenchPanelTitle } from '@/components/plan-studio/workbench/workbench-ui';

interface CollabWidgetCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function CollabWidgetCard({
  title,
  description,
  action,
  children,
  className,
}: CollabWidgetCardProps) {
  const titleId = useId();

  return (
    <section
      className={cn(workbenchCard, 'flex h-full flex-col p-4', className)}
      aria-labelledby={titleId}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={titleId} className={workbenchPanelTitle}>
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
