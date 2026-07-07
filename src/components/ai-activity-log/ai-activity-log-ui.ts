import { cn } from '@/lib/utils';
import { workbenchCard, workbenchInsetPanel } from '@/components/plan-studio/workbench/workbench-ui';

export const aiActivityLogPageShell = 'mx-auto w-full max-w-[1280px] px-4 py-5 pb-16 sm:px-6';

export const aiActivityLogHeaderCard = cn(workbenchCard, 'px-4 py-4 sm:px-5 sm:py-5');

export const aiActivityLogSummaryCard = cn(
  workbenchCard,
  'flex flex-col gap-2 px-4 py-4 sm:px-5',
);

export const aiActivityLogSectionCard = cn(workbenchCard, 'overflow-hidden');

export const aiActivityLogTimelineItem = cn(
  workbenchInsetPanel,
  'relative cursor-pointer px-3 py-3 transition-colors hover:bg-muted/20 sm:px-4',
);

export const aiActivityLogTimelineItemSelected = cn(
  'border-border/80 bg-muted/20 ring-1 ring-inset ring-foreground/10',
);

export const aiActivityLogDetailCard = cn(workbenchCard, 'flex min-h-0 flex-col p-4 sm:p-5');

export function aiActivityLogStatusBadgeClass(
  tone: 'auto' | 'confirm' | 'neutral' | 'cancelled',
): string {
  const base =
    'inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none';
  switch (tone) {
    case 'auto':
      return cn(
        base,
        'border-gate-allow-border/55 bg-gate-allow/10 text-gate-allow-foreground',
      );
    case 'confirm':
      return cn(
        base,
        'border-gate-confirm-border/55 bg-gate-confirm/10 text-gate-confirm-foreground',
      );
    case 'cancelled':
      return cn(
        base,
        'border-gate-reject-border/55 bg-gate-reject/10 text-gate-reject-foreground',
      );
    case 'neutral':
    default:
      return cn(base, 'border-border/55 bg-muted/25 text-muted-foreground');
  }
}

export function aiActivityLogSummaryIconShell(tone: 'neutral' | 'success' | 'warning' | 'info'): string {
  const base = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border';
  switch (tone) {
    case 'success':
      return cn(base, 'border-gate-allow-border/45 bg-gate-allow/10 text-gate-allow-foreground');
    case 'warning':
      return cn(base, 'border-gate-confirm-border/45 bg-gate-confirm/10 text-gate-confirm-foreground');
    case 'info':
      return cn(base, 'border-border/45 bg-muted/15 text-gate-allow-foreground');
    case 'neutral':
    default:
      return cn(base, 'border-border/45 bg-muted/15 text-muted-foreground');
  }
}
