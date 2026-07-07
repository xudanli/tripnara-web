import type {
  PlanGateDraftDiff,
  PlanGateMemberChangeKind,
  PlanGateRiskChangeKind,
} from '@/types/plan-gate';
import { formatCurrency } from '@/utils/format';
import type { PlanGateCompareMetricRow } from '@/lib/plan-gate-diff.util';

function formatMinutes(minutes?: number): string {
  if (minutes == null || Number.isNaN(minutes)) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function formatDelta(value: number, formatter: (n: number) => string): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatter(Math.abs(value))}`;
}

export function buildMetricRowsFromDraftDiff(
  draftDiff: PlanGateDraftDiff,
  currency = 'CNY',
): PlanGateCompareMetricRow[] {
  const metrics = draftDiff.metrics;
  const baselineLabel = draftDiff.baselineLabel ?? '基准';
  const draftLabel = draftDiff.draftLabel ?? '草案';

  const rows: PlanGateCompareMetricRow[] = [];

  if (metrics?.executability != null || metrics?.executabilityDelta != null) {
    const delta = metrics.executabilityDelta;
    rows.push({
      id: 'feasibility',
      label: '可执行性',
      baselineLabel,
      baselineValue:
        metrics.executability != null && delta != null
          ? String(Math.round(metrics.executability - delta))
          : '—',
      draftLabel,
      draftValue:
        metrics.executability != null ? String(Math.round(metrics.executability)) : '—',
      delta:
        delta != null
          ? `${delta >= 0 ? '+' : ''}${Math.round(delta)}`
          : undefined,
      tone: delta != null ? (delta >= 0 ? 'good' : 'bad') : 'neutral',
    });
  }

  if (metrics?.budgetPerPerson != null || metrics?.budgetPerPersonDelta != null) {
    const delta = metrics.budgetPerPersonDelta;
    rows.push({
      id: 'budget',
      label: '人均预算',
      baselineLabel,
      baselineValue:
        metrics.budgetPerPerson != null && delta != null
          ? formatCurrency(metrics.budgetPerPerson - delta, currency)
          : '—',
      draftLabel,
      draftValue:
        metrics.budgetPerPerson != null
          ? formatCurrency(metrics.budgetPerPerson, currency)
          : '—',
      delta:
        delta != null ? formatDelta(delta, (n) => formatCurrency(n, currency)) : undefined,
      tone: delta != null ? (delta <= 0 ? 'good' : 'bad') : 'neutral',
    });
  }

  if (metrics?.totalDrivingMinutes != null || metrics?.totalDrivingMinutesDelta != null) {
    const delta = metrics.totalDrivingMinutesDelta;
    rows.push({
      id: 'driving',
      label: '总驾驶',
      baselineLabel,
      baselineValue:
        metrics.totalDrivingMinutes != null && delta != null
          ? formatMinutes(metrics.totalDrivingMinutes - delta)
          : '—',
      draftLabel,
      draftValue:
        metrics.totalDrivingMinutes != null
          ? formatMinutes(metrics.totalDrivingMinutes)
          : '—',
      delta:
        delta != null ? formatDelta(delta, (n) => formatMinutes(n)) : undefined,
      tone: delta != null ? (delta <= 0 ? 'good' : 'bad') : 'neutral',
    });
  }

  const affectedDays =
    metrics?.affectedDays ?? draftDiff.affectedDayCount;
  if (affectedDays != null) {
    rows.push({
      id: 'days',
      label: '影响天数',
      baselineLabel,
      baselineValue: '—',
      draftLabel,
      draftValue: `${affectedDays} 天`,
      tone: 'neutral',
    });
  }

  return rows;
}

export const PLAN_GATE_RISK_CHANGE_LABEL: Record<PlanGateRiskChangeKind, string> = {
  resolved: '已解决',
  new: '新增',
  retained: '保留',
  pending: '待处理',
};

export function planGateRiskChangeClass(kind: string): string {
  switch (kind) {
    case 'resolved':
      return 'text-success bg-muted/10 border-gate-allow-border/50';
    case 'new':
      return 'text-error bg-muted/10 border-border/50';
    case 'retained':
      return 'text-warning bg-muted/10 border-border/50';
    case 'pending':
    default:
      return 'text-muted-foreground bg-muted/30 border-border/60';
  }
}

export const PLAN_GATE_MEMBER_CHANGE_LABEL: Record<PlanGateMemberChangeKind, string> = {
  split_added: '新增分流',
  split_removed: '取消分流',
  meetup_changed: '汇合点变更',
  branch_changed: '分支变更',
  member_assignment_changed: '成员安排变更',
};

export function planGateMemberChangeClass(
  change: { impact: string; missingMeetup?: boolean },
): string {
  if (change.missingMeetup) {
    return 'border-border/50 bg-muted/8';
  }
  switch (change.impact) {
    case 'high':
      return 'border-border/50 bg-muted/8';
    case 'medium':
      return 'border-border/50 bg-muted/8';
    default:
      return 'border-border/60 bg-muted/15';
  }
}

export function formatPlanGateMemberChangeSummary(change: {
  label: string;
  before?: string;
  after?: string;
  day: number;
}): string {
  if (change.before && change.after) {
    return `${change.label}（第 ${change.day} 天）：${change.before} → ${change.after}`;
  }
  return `${change.label}（第 ${change.day} 天）`;
}

export function resolveDraftDiffChangeItems(draftDiff: PlanGateDraftDiff): string[] {
  const items: string[] = [];
  const seen = new Set<string>();

  const push = (text?: string) => {
    const normalized = text?.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    items.push(normalized);
  };

  for (const entry of draftDiff.changeLog ?? []) {
    push(entry);
  }

  for (const change of draftDiff.timelineChanges ?? []) {
    if (change.before && change.after) {
      push(`${change.label ?? change.kind}：${change.before} → ${change.after}`);
    } else if (change.label) {
      push(change.label);
    }
  }

  for (const change of draftDiff.memberChanges ?? []) {
    push(formatPlanGateMemberChangeSummary(change));
  }

  return items.slice(0, 12);
}

export function dispatchPlanGateNextAction(action: string, _tripId: string): void {
  switch (action) {
    case 'view_timeline':
      window.dispatchEvent(
        new CustomEvent('plan-studio:switch-tab', { detail: { tab: 'schedule' } }),
      );
      break;
    case 'view_feasibility_proof':
      window.dispatchEvent(
        new CustomEvent('plan-studio:switch-tab', { detail: { tab: 'feasibility' } }),
      );
      break;
    case 'view_pre_trip_tasks':
    case 'view_tasks':
      window.dispatchEvent(
        new CustomEvent('plan-studio:switch-tab', { detail: { tab: 'tasks' } }),
      );
      break;
    default:
      if (action.startsWith('/')) {
        window.location.assign(action);
      }
      break;
  }
}
