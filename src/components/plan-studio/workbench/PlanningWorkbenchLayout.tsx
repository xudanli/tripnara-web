import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { workbenchShell, workbenchColumnSurface, workbenchScrollable } from './workbench-ui';

export interface PlanningWorkbenchLayoutProps {
  header: ReactNode;
  constraints: ReactNode;
  itinerary: ReactNode;
  decisionChecker: ReactNode;
  className?: string;
}

/** 规划工作台三栏布局：约束 | 行程冲突 | 决策检查器 */
export function PlanningWorkbenchLayout({
  header,
  constraints,
  itinerary,
  decisionChecker,
  className,
}: PlanningWorkbenchLayoutProps) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col', workbenchShell, className)}>
      {header}
      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(228px,16%)_minmax(0,1fr)_minmax(228px,20%)]">
        <aside className={cn('min-h-0 overflow-y-auto border-b border-border/60 xl:border-b-0 xl:border-r', workbenchColumnSurface, workbenchScrollable)}>
          {constraints}
        </aside>
        <main className={cn('min-h-0 overflow-hidden border-b border-border/60 xl:border-b-0 xl:border-r', workbenchColumnSurface)}>
          {itinerary}
        </main>
        <aside className={cn('min-h-0 overflow-y-auto', workbenchColumnSurface, workbenchScrollable)}>
          {decisionChecker}
        </aside>
      </div>
    </div>
  );
}
