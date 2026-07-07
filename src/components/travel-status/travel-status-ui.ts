import { cn } from '@/lib/utils';
import {
  workbenchCard,
  workbenchCardFlat,
  workbenchHeaderShell,
  workbenchHeaderSubtitle,
  workbenchHeaderTitle,
  workbenchInsetPanel,
  workbenchNlSurface,
  workbenchPreDepartureColumnBody,
  workbenchPreDepartureColumnHeader,
  workbenchPreDepartureColumnTitle,
  workbenchPreDepartureMetricToneClass,
  workbenchPreDepartureStatusPillClass,
  workbenchPreDepartureSummaryCard,
  workbenchScrollable,
  workbenchShell,
} from '@/components/plan-studio/workbench/workbench-ui';
import type { ExecutabilityStatus, MonitoringItemStatus } from '@/api/travel-status.types';

export {
  workbenchScrollable,
  workbenchShell,
  workbenchCard,
  workbenchNlSurface,
};

export const travelStatusPageShell = cn(workbenchShell, 'min-h-full');

export const travelStatusContentWrap =
  'mx-auto w-full max-w-6xl px-4 py-5 pb-16 sm:px-6 lg:px-8';

export const travelStatusHeaderShell = cn(
  workbenchHeaderShell,
  'sticky top-0 z-20 -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8',
);

export const travelStatusHeroCard = cn(
  workbenchCard,
  'overflow-hidden p-0',
);

export const travelStatusSectionShell = cn(workbenchCard, 'flex flex-col');

export const travelStatusSectionShellCompact = cn(
  workbenchCard,
  'flex flex-col overflow-hidden',
);

export const travelStatusSnapshotShell = cn(
  workbenchCard,
  'overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
);

export const travelStatusSnapshotBody = 'px-4 py-3.5 sm:px-5 sm:py-4';

export const travelStatusSnapshotMetrics = cn(
  'grid grid-cols-2 divide-y divide-border/50 border-t border-border/50',
  'sm:grid-cols-4 sm:divide-x sm:divide-y-0',
);

export const travelStatusSnapshotMetricCell = cn(
  'px-3 py-3 text-left transition-colors sm:px-4',
  'hover:bg-muted/15',
);

export const travelStatusSectionHeader = cn(
  workbenchPreDepartureColumnHeader,
  'px-4 py-3 sm:px-4',
);

export const travelStatusSectionTitle = cn(
  workbenchPreDepartureColumnTitle,
  'text-[13px] font-semibold tracking-tight',
);

export const travelStatusSectionDescription =
  'mt-0.5 text-[11px] leading-relaxed text-muted-foreground';

export const travelStatusSectionBody = cn(
  workbenchPreDepartureColumnBody,
  'px-4 py-3 sm:px-4',
);

export const travelStatusMetricCard = cn(
  workbenchPreDepartureSummaryCard,
  'px-3.5 py-3',
);

export const travelStatusMetricValue = workbenchPreDepartureMetricToneClass;

export const travelStatusMetricLabel =
  'mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground';

export const travelStatusEmptyState = cn(
  workbenchInsetPanel,
  'px-4 py-6 text-center',
);

export function travelStatusMetricValueClass(
  value: number | string,
  tone: 'neutral' | 'danger' | 'warning' | 'success' = 'neutral',
): string {
  const numeric = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  const isZero = !Number.isNaN(numeric) && numeric === 0;
  if (isZero && tone === 'neutral') {
    return 'font-mono-brand text-2xl font-semibold tabular-nums tracking-tight text-muted-foreground/70';
  }
  if (isZero && tone === 'success') {
    return cn(workbenchPreDepartureMetricToneClass('success'), 'text-2xl');
  }
  return cn(workbenchPreDepartureMetricToneClass(tone), 'text-2xl');
}

export function travelStatusExecutabilityAccent(status: ExecutabilityStatus): string {
  switch (status) {
    case 'READY':
      return 'border-l-gate-allow-foreground/70';
    case 'BLOCKED':
      return 'border-l-gate-reject-foreground/80';
    case 'NEEDS_ATTENTION':
    default:
      return 'border-l-gate-confirm-foreground/80';
  }
}

export const travelStatusListItem = cn(
  workbenchInsetPanel,
  'px-3 py-2.5 transition-colors hover:bg-muted/25',
);

export function travelStatusExecutabilityShell(status: ExecutabilityStatus): string {
  return cn(
    'border-l-[3px] bg-card',
    travelStatusExecutabilityAccent(status),
  );
}

export function travelStatusExecutabilityIconShell(status: ExecutabilityStatus): string {
  switch (status) {
    case 'READY':
      return 'border-border/45 bg-muted/15 text-gate-allow-foreground';
    case 'BLOCKED':
      return 'border-gate-reject-border/40 bg-gate-reject/10 text-gate-reject-foreground';
    case 'NEEDS_ATTENTION':
    default:
      return 'border-gate-confirm-border/40 bg-gate-confirm/10 text-gate-confirm-foreground';
  }
}

export function travelStatusExecutabilityPill(status: ExecutabilityStatus): string {
  switch (status) {
    case 'READY':
      return workbenchPreDepartureStatusPillClass('success');
    case 'BLOCKED':
      return workbenchPreDepartureStatusPillClass('danger');
    case 'NEEDS_ATTENTION':
    default:
      return workbenchPreDepartureStatusPillClass('warning');
  }
}

export function travelStatusExecutabilityLabel(status: ExecutabilityStatus): string {
  switch (status) {
    case 'READY':
      return '可以出发';
    case 'BLOCKED':
      return '暂不可执行';
    case 'NEEDS_ATTENTION':
    default:
      return '需要关注';
  }
}

export const travelStatusPageTitle = workbenchHeaderTitle;

export const travelStatusPageSubtitle = workbenchHeaderSubtitle;

export const travelStatusQuickActionBar = cn(
  workbenchCardFlat,
  'flex flex-wrap items-center gap-2 p-2',
);

/** 监控项 · 状态标签（gate / nara 语义，与 workbench pill 对齐） */
export const travelStatusMonitoringBadgeBase =
  'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none';

export function travelStatusMonitoringStatusBadgeClass(status: MonitoringItemStatus): string {
  switch (status) {
    case 'ALERT':
      return cn(
        travelStatusMonitoringBadgeBase,
        'border border-gate-reject-border/55 bg-gate-reject/10 text-gate-reject-foreground',
      );
    case 'ACTIVE':
      return cn(
        travelStatusMonitoringBadgeBase,
        'border border-border/55 bg-muted/15 text-gate-allow-foreground',
      );
    case 'PAUSED':
      return cn(
        travelStatusMonitoringBadgeBase,
        'border border-border/55 bg-muted/30 text-muted-foreground',
      );
    case 'PENDING':
    default:
      return cn(
        travelStatusMonitoringBadgeBase,
        'border border-gate-confirm-border/45 bg-gate-confirm/10 text-gate-confirm-foreground',
      );
  }
}

export function travelStatusMonitoringStatusLabel(status: MonitoringItemStatus): string {
  switch (status) {
    case 'ALERT':
      return '异常';
    case 'ACTIVE':
      return '正常';
    case 'PAUSED':
      return '已暂停';
    case 'PENDING':
    default:
      return '待扫';
  }
}

export function travelStatusMonitoringListItemTone(status: MonitoringItemStatus): string {
  switch (status) {
    case 'ALERT':
      return 'border-gate-reject-border/40 bg-gate-reject/5';
    case 'ACTIVE':
      return 'border-border/30 bg-muted/15';
    default:
      return '';
  }
}
