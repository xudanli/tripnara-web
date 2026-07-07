import { tripDetailUi } from '@/components/trips/detail/trip-detail-ui';
import { workbenchLinkClass } from '@/components/plan-studio/workbench/workbench-ui';

/** 执行页中栏 UI token — 复用 Trip Detail 规范，行中强调态单独补充 */
export const executeCenterUi = {
  ...tripDetailUi,
  sectionTitle: 'text-base font-semibold text-foreground',
  sectionSub: 'text-xs text-muted-foreground',
  linkAction: workbenchLinkClass,
  progressCard: 'rounded-xl border border-border/70 bg-muted/15 p-3 shadow-sm',
  summaryCard: 'rounded-xl border border-border bg-card p-3 shadow-sm',
  badgeSuccess: tripDetailUi.tagAllow,
  badgeWarning: tripDetailUi.tagSuggest,
  badgeDanger: tripDetailUi.tagReject,
  badgeNeutral: 'border-border bg-muted/20 text-muted-foreground',
  timelineCurrent: 'bg-muted/15 border-l border-l-foreground/40 pl-1.5',
  timelineDone: 'opacity-80',
  reunionBar:
    'rounded-lg border border-border bg-muted/30 px-3 py-2.5 min-h-[44px] flex items-center text-xs text-muted-foreground leading-snug',
} as const;
