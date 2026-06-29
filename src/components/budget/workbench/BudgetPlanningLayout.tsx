import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { workbenchColumnSurface, workbenchShell } from '@/components/plan-studio/workbench/workbench-ui';

export interface BudgetPlanningLayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  main: ReactNode;
  checker: ReactNode;
  className?: string;
}

/** 预算工作台三栏：概览/约束 | 分析/明细 | 检查器 */
export function BudgetPlanningLayout({
  header,
  sidebar,
  main,
  checker,
  className,
}: BudgetPlanningLayoutProps) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col', workbenchShell, className)}>
      {header}
      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(240px,18%)_minmax(0,1fr)_minmax(280px,22%)]">
        <aside
          className={cn(
            'min-h-0 overflow-y-auto border-b border-border/60 xl:border-b-0 xl:border-r',
            workbenchColumnSurface,
          )}
        >
          {sidebar}
        </aside>
        <main
          className={cn(
            'min-h-0 overflow-y-auto border-b border-border/60 xl:border-b-0 xl:border-r',
            workbenchColumnSurface,
          )}
        >
          {main}
        </main>
        <aside className={cn('min-h-0 overflow-y-auto', workbenchColumnSurface)}>{checker}</aside>
      </div>
    </div>
  );
}
