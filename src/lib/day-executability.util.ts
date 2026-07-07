import type { DecisionQueueItem, TravelStatusResponse } from '@/api/travel-status.types';

export type DayExecutionStatus = 'executable' | 'attention' | 'blocked' | 'monitoring';

export interface DayExecutabilityView {
  dayNumber: number;
  status: DayExecutionStatus;
  label: string;
  reasons: string[];
  impacts: string[];
  problemIds: string[];
}

const STATUS_LABELS: Record<DayExecutionStatus, string> = {
  executable: '可执行',
  attention: '需关注',
  blocked: '不可执行',
  monitoring: '持续监控',
};

function severityToStatus(severity: DecisionQueueItem['severity']): DayExecutionStatus {
  if (severity === 'BLOCK') return 'blocked';
  if (severity === 'CONFLICT') return 'attention';
  if (severity === 'VERIFY') return 'attention';
  return 'monitoring';
}

function mergeStatus(current: DayExecutionStatus, next: DayExecutionStatus): DayExecutionStatus {
  const rank: Record<DayExecutionStatus, number> = {
    blocked: 4,
    attention: 3,
    monitoring: 2,
    executable: 1,
  };
  return rank[next] > rank[current] ? next : current;
}

export function buildDayExecutabilityMap(
  status: TravelStatusResponse | null | undefined,
): Map<number, DayExecutabilityView> {
  const map = new Map<number, DayExecutabilityView>();
  if (!status) return map;

  for (const decision of status.openDecisions ?? []) {
    const days = decision.affectedDayNumbers?.length
      ? decision.affectedDayNumbers
      : inferDayNumbersFromText(`${decision.headline} ${decision.impact}`);
    if (!days.length) continue;

    const nextStatus = severityToStatus(decision.severity);
    for (const dayNumber of days) {
      const existing = map.get(dayNumber);
      const mergedStatus = existing ? mergeStatus(existing.status, nextStatus) : nextStatus;
      map.set(dayNumber, {
        dayNumber,
        status: mergedStatus,
        label: STATUS_LABELS[mergedStatus],
        reasons: [...(existing?.reasons ?? []), decision.headline].slice(0, 4),
        impacts: [...(existing?.impacts ?? []), decision.impact].filter(Boolean).slice(0, 4) as string[],
        problemIds: [...(existing?.problemIds ?? []), decision.problemId],
      });
    }
  }

  return map;
}

function inferDayNumbersFromText(text: string): number[] {
  const matches = text.match(/第\s*(\d+)\s*天/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => Number.parseInt(m.replace(/\D/g, ''), 10)).filter(Number.isFinite))];
}

export function dayExecutionStatusTone(status: DayExecutionStatus): string {
  switch (status) {
    case 'executable':
      return 'text-gate-allow-foreground bg-gate-allow/10 border-gate-allow-border/40';
    case 'attention':
      return 'text-gate-confirm-foreground bg-gate-confirm/10 border-gate-confirm-border/40';
    case 'monitoring':
      return 'text-muted-foreground bg-muted/30 border-border';
    case 'blocked':
    default:
      return 'text-gate-reject-foreground bg-gate-reject/10 border-gate-reject-border/40';
  }
}
