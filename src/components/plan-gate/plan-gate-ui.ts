import { cn } from '@/lib/utils';
import { workbenchCard, workbenchPanelTitle, workbenchPrimaryAction } from '@/components/plan-studio/workbench/workbench-ui';

export const planGateShell = 'flex h-full min-h-0 flex-col bg-background';
export const planGateBody = 'min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-auto-hide';
export const planGateFooter = 'sticky bottom-0 z-10 shrink-0 border-t border-border/60 bg-card/95 px-5 py-3 backdrop-blur-sm';
export const planGateSectionTitle = cn(workbenchPanelTitle, 'text-sm');
export const planGateCard = cn(workbenchCard, 'p-3');
export const planGatePrimaryButton = cn('h-10 rounded-lg text-xs', workbenchPrimaryAction);
export const planGateMetricGrid = 'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5';
export const planGateMetricCell = 'rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2';
export const planGateMetricLabel = 'text-[10px] text-muted-foreground';
export const planGateMetricValue = 'mt-0.5 text-xs font-medium tabular-nums text-foreground';
export const planGateStepTrack = 'flex items-center gap-1 overflow-x-auto pb-1 scrollbar-auto-hide';
export const planGateStepItem =
  'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] transition-colors';
export const planGateStepActive = 'border-primary/30 bg-primary/5 text-foreground font-medium';
export const planGateStepDone = 'border-border/60 bg-muted/20 text-muted-foreground';
export const planGateStepPending = 'border-border/40 bg-background text-muted-foreground/70';
export const planGateTwoColumn = 'grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]';

export type PlanGateStepId = 'generate' | 'verify' | 'tradeoffs' | 'compare' | 'submit';

export const PLAN_GATE_STEPS: Array<{ id: PlanGateStepId; label: string }> = [
  { id: 'generate', label: '生成' },
  { id: 'verify', label: '验证' },
  { id: 'tradeoffs', label: '确认' },
  { id: 'compare', label: '对比' },
  { id: 'submit', label: '提交' },
];

export function resolvePlanGateStepIndex(step: string): number {
  if (step === 'generating') return 0;
  if (step === 'success') return 4;
  const idx = PLAN_GATE_STEPS.findIndex((s) => s.id === step);
  return idx >= 0 ? idx : 0;
}
