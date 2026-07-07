import { cn } from '@/lib/utils';
import { workbenchCard, workbenchInsetPanel } from '@/components/plan-studio/workbench/workbench-ui';
import type { AutomationCategoryStatus } from '@/lib/trip-automation-authorization.util';

export const tripAutomationPageShell = 'mx-auto w-full max-w-[1280px] px-4 py-5 pb-16 sm:px-6';

export const tripAutomationHeaderCard = cn(workbenchCard, 'px-4 py-4 sm:px-5 sm:py-5');

export const tripAutomationSectionCard = cn(workbenchCard, 'overflow-hidden');

export const tripAutomationLevelCard = cn(
  workbenchInsetPanel,
  'p-3.5 transition-[border-color,background-color] hover:bg-muted/15',
);

export const tripAutomationLevelCardSelected = cn(
  'border-border/80 bg-muted/20 ring-1 ring-inset ring-foreground/10',
);

export const tripAutomationCategoryRow = cn(
  workbenchInsetPanel,
  'flex items-start gap-3 p-3.5 sm:p-4',
);

export const tripAutomationSidebarCard = cn(workbenchCard, 'p-4');

export const tripAutomationQuickActionBtn = cn(
  workbenchInsetPanel,
  'flex h-auto min-h-[72px] flex-col items-center justify-center gap-1.5 px-2 py-3 text-center transition-colors hover:bg-muted/20',
);

export function tripAutomationCategoryStatusBadgeClass(
  status: AutomationCategoryStatus,
): string {
  const base = 'inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none';
  switch (status) {
    case 'all_auto':
    case 'partial_auto':
      return cn(
        base,
        'border-gate-allow-border/55 bg-gate-allow/10 text-gate-allow-foreground',
      );
    case 'partial_confirm':
    case 'needs_confirm':
      return cn(
        base,
        'border-gate-confirm-border/55 bg-gate-confirm/10 text-gate-confirm-foreground',
      );
    case 'prohibited':
      return cn(
        base,
        'border-gate-reject-border/55 bg-gate-reject/10 text-gate-reject-foreground',
      );
  }
}

export function tripAutomationLevelBadgeClass(recommended?: boolean): string {
  const base = 'rounded-full border px-2 py-0.5 text-[10px] font-semibold';
  if (recommended) {
    return cn(
      base,
      'border-border/55 bg-muted/15 text-gate-allow-foreground',
    );
  }
  return cn(base, 'border-border/55 bg-muted/25 text-muted-foreground');
}
