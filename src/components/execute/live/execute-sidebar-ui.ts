import {
  workbenchDecisionCheckerBadgeClass,
  workbenchScheduleTimelineTime,
} from '@/components/plan-studio/workbench/workbench-ui';
import { semanticWarnText } from '@/lib/semantic-ui-classes';

/** 执行页左侧栏 · 对齐规划工作台行程 Tab 字号 */
export const executeSidebarUi = {
  cardTitle: 'text-xs font-semibold tracking-tight text-foreground',
  rowLabel: 'text-[10px] text-muted-foreground whitespace-nowrap shrink-0',
  rowValue: 'text-xs font-medium text-foreground',
  rowValueStrong: 'text-xs font-semibold text-foreground',
  rowMeta: 'text-[11px] text-muted-foreground',
  rowTime: workbenchScheduleTimelineTime,
  linkAction:
    'text-[10px] font-normal text-muted-foreground underline-offset-2 hover:text-foreground hover:underline inline-flex items-center gap-0.5 shrink-0',
  iconCell: 'flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground',
  iconSm: 'h-3.5 w-3.5',
  listRow: 'px-2.5 py-1',
  badge: 'text-[10px] h-4 px-1.5 font-medium shrink-0',
  updatedMeta: 'text-[10px] text-muted-foreground',
  badgeTone: workbenchDecisionCheckerBadgeClass,
} as const;

export const executeTimelineUi = {
  stepLabel: 'text-[10px] font-semibold text-foreground',
  stepTitle: 'text-xs font-medium text-foreground',
  stepMeta: 'text-[11px] text-muted-foreground',
  stepHighlight: 'text-[11px] font-semibold text-foreground tabular-nums',
  stepHighlightWarn: `text-[11px] font-semibold tabular-nums ${semanticWarnText}`,
  badge: 'text-[10px] h-4 px-1.5',
} as const;
