/**
 * 统一创建流程壳层 — 探索规划 & 从攻略规划共用
 * 顶栏仅步骤条；标题与返回在主内容区
 */

import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FlowStepper, type FlowStepItem } from '@/components/guide-import/FlowStepper';

export type TripCreationMaxWidth = '5xl' | '6xl' | '7xl';

function maxWidthClass(maxWidth: TripCreationMaxWidth): string {
  if (maxWidth === '7xl') return 'max-w-7xl';
  if (maxWidth === '5xl') return 'max-w-5xl';
  return 'max-w-6xl';
}

interface TripCreationFlowShellProps {
  steps: readonly FlowStepItem[];
  currentStepId: string;
  navAriaLabel: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  maxWidth?: TripCreationMaxWidth;
  dense?: boolean;
  className?: string;
  headerExtra?: ReactNode;
}

export function TripCreationFlowShell({
  steps,
  currentStepId,
  navAriaLabel,
  title,
  subtitle,
  children,
  footer,
  onBack,
  maxWidth = '6xl',
  dense = false,
  className,
  headerExtra,
}: TripCreationFlowShellProps) {
  const maxW = maxWidthClass(maxWidth);

  return (
    <div
      className={cn(
        'flex w-full flex-col bg-background min-h-full min-w-0',
        footer ? 'flex-1' : '',
        className,
      )}
    >
      <header className="flex-shrink-0 border-b border-border bg-background">
        <div
          className={cn(
            maxW,
            'mx-auto px-4 sm:px-6 overflow-x-auto w-full min-w-0',
            dense ? 'py-2' : 'py-3',
          )}
        >
          <FlowStepper
            steps={steps}
            currentStepId={currentStepId}
            navLabel={navAriaLabel}
            compact={dense}
          />
        </div>
      </header>

      <main
        className={cn(
          'mx-auto w-full min-w-0 px-4 sm:px-6',
          maxW,
          footer
            ? cn('flex min-h-0 flex-1 flex-col overflow-y-auto', dense ? 'py-3' : 'py-6 sm:py-8')
            : dense
              ? 'py-3'
              : 'py-6 sm:py-8',
        )}
      >
        <div className={cn('flex items-start gap-2.5 flex-shrink-0', dense ? 'mb-2' : 'mb-6')}>
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn('flex-shrink-0', dense ? 'h-8 w-8 mt-0' : 'h-9 w-9 mt-0.5')}
              onClick={onBack}
              aria-label="返回上一步"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          ) : null}
          <div className={cn(dense ? 'space-y-0.5' : 'space-y-1', 'min-w-0 flex-1')}>
              <h1
                className={cn(
                  'font-semibold tracking-tight text-foreground',
                  dense ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl',
                )}
              >
                {title}
              </h1>
              {subtitle ? (
                <p
                  className={cn(
                    'text-muted-foreground leading-relaxed',
                    dense ? 'text-xs line-clamp-2 max-w-4xl' : 'text-sm max-w-3xl',
                  )}
                >
                  {subtitle}
                </p>
              ) : null}
            </div>
            {headerExtra}
        </div>
        <div>{children}</div>
      </main>

      {footer ? (
        <footer
          className={cn(
            'flex-shrink-0 border-t border-border bg-background',
            dense
              ? ''
              : 'sticky bottom-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
          )}
        >
          <div className={cn(maxW, 'mx-auto px-4 sm:px-6 w-full min-w-0', dense ? 'py-2.5' : 'py-4')}>
            {footer}
          </div>
        </footer>
      ) : null}
    </div>
  );
}
