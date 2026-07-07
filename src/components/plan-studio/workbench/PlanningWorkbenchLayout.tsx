import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { WorkbenchMobileColumn } from './workbench-mobile.types';
import { workbenchShell, workbenchColumnSurface, workbenchScrollable } from './workbench-ui';

export interface PlanningWorkbenchLayoutProps {
  header: ReactNode;
  constraints: ReactNode;
  itinerary: ReactNode;
  decisionChecker: ReactNode;
  /** 决策空间：三栏固定视口高度，列内独立滚动 */
  decisionSpaceMode?: boolean;
  /** xl 以下：结论条（固定在列导航上方） */
  conclusionStrip?: ReactNode;
  /** xl 以下：列导航 + 单列内容 */
  mobileColumn?: WorkbenchMobileColumn | null;
  mobileColumnNav?: ReactNode;
  /** xl 以下：摘要列（Gate + 路线 + 天条） */
  mobileSummary?: ReactNode;
  className?: string;
}

/** 规划工作台三栏布局：约束 | 行程冲突 | 决策检查器 */
export function PlanningWorkbenchLayout({
  header,
  constraints,
  itinerary,
  decisionChecker,
  conclusionStrip,
  mobileColumn = null,
  mobileColumnNav,
  mobileSummary,
  decisionSpaceMode = false,
  className,
}: PlanningWorkbenchLayoutProps) {
  const isMobileLayout = mobileColumn != null;

  return (
    <div className={cn('flex h-full min-h-0 flex-col', workbenchShell, className)}>
      {header}
      {isMobileLayout ? (
        <>
          {conclusionStrip}
          {mobileColumnNav}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              className={cn(
                'absolute inset-0 overflow-y-auto',
                workbenchColumnSurface,
                workbenchScrollable,
                mobileColumn !== 'summary' && 'hidden',
              )}
              aria-hidden={mobileColumn !== 'summary'}
            >
              {mobileSummary ?? itinerary}
            </div>
            <aside
              className={cn(
                'absolute inset-0 overflow-y-auto',
                workbenchColumnSurface,
                workbenchScrollable,
                mobileColumn !== 'constraints' && 'hidden',
              )}
              aria-hidden={mobileColumn !== 'constraints'}
            >
              {constraints}
            </aside>
            <main
              className={cn(
                'absolute inset-0 overflow-hidden',
                workbenchColumnSurface,
                mobileColumn !== 'itinerary' && 'hidden',
              )}
              aria-hidden={mobileColumn !== 'itinerary'}
            >
              {itinerary}
            </main>
            <aside
              className={cn(
                'absolute inset-0 flex min-h-0 flex-col overflow-hidden',
                workbenchColumnSurface,
                mobileColumn !== 'decision' && 'hidden',
              )}
              aria-hidden={mobileColumn !== 'decision'}
            >
              {decisionChecker}
            </aside>
          </div>
        </>
      ) : (
        <div
          className={cn(
            'grid min-h-0 flex-1 grid-cols-1',
            decisionSpaceMode
              ? 'xl:grid-cols-[minmax(220px,18%)_minmax(0,1fr)_minmax(260px,26%)]'
              : 'xl:grid-cols-[minmax(240px,16%)_minmax(0,1fr)_minmax(280px,27%)]',
          )}
        >
          <aside
            className={cn(
              'min-h-0 border-b border-border/60 xl:border-b-0 xl:border-r',
              workbenchColumnSurface,
              decisionSpaceMode
                ? 'flex flex-col overflow-hidden'
                : cn('overflow-y-auto', workbenchScrollable),
            )}
          >
            {constraints}
          </aside>
          <main
            className={cn(
              'min-h-0 overflow-hidden border-b border-border/60 xl:border-b-0 xl:border-r',
              workbenchColumnSurface,
            )}
          >
            {itinerary}
          </main>
          <aside className={cn('flex h-full min-h-0 flex-col overflow-hidden', workbenchColumnSurface)}>
            {decisionChecker}
          </aside>
        </div>
      )}
    </div>
  );
}
