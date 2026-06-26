import type { FeasibilityIssuePriority, FeasibilityVerdictStatus } from '@/types/trip-feasibility-report';
import {
  getGateStatusClasses,
  getGateStatusIcon,
  type GateStatus,
} from '@/lib/gate-status';
import { feasibilityVerdictBadgeLabel } from '@/lib/trip-feasibility-report.adapter';

/** 可执行性裁决 → Gate 四态（视觉系统对齐） */
export function feasibilityVerdictToGate(status: FeasibilityVerdictStatus): GateStatus {
  switch (status) {
    case 'EXECUTABLE':
      return 'ALLOW';
    case 'ADJUST_REQUIRED':
      return 'SUGGEST_REPLACE';
    case 'NOT_EXECUTABLE':
      return 'REJECT';
    case 'STALE':
      return 'NEED_CONFIRM';
    case 'UNKNOWN':
      return 'NEED_CONFIRM';
    default:
      return 'NEED_CONFIRM';
  }
}

export function feasibilityVerdictLabel(status: FeasibilityVerdictStatus): string {
  return feasibilityVerdictBadgeLabel(status);
}

export function feasibilityVerdictGateClasses(status: FeasibilityVerdictStatus): string {
  return getGateStatusClasses(feasibilityVerdictToGate(status));
}

export function feasibilityVerdictIcon(status: FeasibilityVerdictStatus) {
  return getGateStatusIcon(feasibilityVerdictToGate(status));
}

export function priorityToGate(priority: FeasibilityIssuePriority): GateStatus {
  switch (priority) {
    case 'must_handle':
      return 'REJECT';
    case 'suggest_adjust':
      return 'SUGGEST_REPLACE';
    case 'pending_confirm':
      return 'NEED_CONFIRM';
    default:
      return 'NEED_CONFIRM';
  }
}

export function priorityLabel(priority: FeasibilityIssuePriority): string {
  switch (priority) {
    case 'must_handle':
      return '必须处理';
    case 'suggest_adjust':
      return '建议调整';
    case 'pending_confirm':
      return '需确认安排';
    default:
      return priority;
  }
}

export function priorityBadgeClasses(priority: FeasibilityIssuePriority): string {
  return getGateStatusClasses(priorityToGate(priority));
}

export function dayStatusGate(status: 'ok' | 'warning' | 'blocked'): GateStatus {
  switch (status) {
    case 'ok':
      return 'ALLOW';
    case 'warning':
      return 'SUGGEST_REPLACE';
    case 'blocked':
      return 'REJECT';
  }
}

export function dimensionScoreAccent(score: number): string {
  if (score >= 80) return 'border-l-gate-allow-border';
  if (score >= 60) return 'border-l-gate-suggest-border';
  return 'border-l-gate-reject-border';
}

export function dimensionScoreLabel(score: number): string {
  if (score >= 80) return 'text-foreground';
  if (score >= 60) return 'text-gate-suggest-foreground';
  return 'text-gate-reject-foreground';
}

export function verdictAccentBorder(status: FeasibilityVerdictStatus): string {
  switch (status) {
    case 'EXECUTABLE':
      return 'border-l-gate-allow-border';
    case 'ADJUST_REQUIRED':
      return 'border-l-gate-suggest-border';
    case 'NOT_EXECUTABLE':
      return 'border-l-gate-reject-border';
    case 'STALE':
      return 'border-l-gate-confirm-border';
    default:
      return 'border-l-border';
  }
}

export function dayStatusAccentBorder(status: 'ok' | 'warning' | 'blocked'): string {
  switch (status) {
    case 'ok':
      return 'border-l-gate-allow-border';
    case 'warning':
      return 'border-l-gate-suggest-border';
    case 'blocked':
      return 'border-l-gate-reject-border';
  }
}

export function priorityAccentBorder(priority: FeasibilityIssuePriority): string {
  switch (priorityToGate(priority)) {
    case 'ALLOW':
      return 'border-l-gate-allow-border';
    case 'SUGGEST_REPLACE':
      return 'border-l-gate-suggest-border';
    case 'REJECT':
      return 'border-l-gate-reject-border';
    default:
      return 'border-l-gate-confirm-border';
  }
}

export function scoreBarClass(score: number): string {
  if (score >= 80) return 'bg-gate-allow-border';
  if (score >= 60) return 'bg-gate-suggest-border';
  return 'bg-gate-reject-border';
}

export function issueCountBadgeClasses(status: 'ok' | 'warning' | 'blocked', selected?: boolean): string {
  const gate = dayStatusGate(status);
  if (!selected) return 'bg-muted text-muted-foreground';
  switch (gate) {
    case 'ALLOW':
      return 'bg-gate-allow text-gate-allow-foreground border border-gate-allow-border';
    case 'SUGGEST_REPLACE':
      return 'bg-gate-suggest text-gate-suggest-foreground border border-gate-suggest-border';
    case 'REJECT':
      return 'bg-gate-reject text-gate-reject-foreground border border-gate-reject-border';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
