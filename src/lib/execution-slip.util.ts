import { addMinutes, isSameDay, parseISO } from 'date-fns';
import { getDecisionQueue } from '@/api/travel-status-client';
import type {
  ConsumerDecisionItem,
  ConsumerDecisionScheduleContextDto,
  DepartureSlipRequest,
  ExecutionInterventionDto,
  MobileTodayItineraryItemDto,
} from '@/types/mobile-execution';

export const SLIP_DECISION_PROBLEM_PREFIX = 'problem_exec_slip_';
export const EXECUTION_SCHEDULE_INFEASIBLE = 'EXECUTION_SCHEDULE_INFEASIBLE';

export function isSlipDecisionProblem(problemId?: string | null): boolean {
  if (!problemId?.trim()) return false;
  return problemId.startsWith(SLIP_DECISION_PROBLEM_PREFIX);
}

export function isScheduleInfeasibleIntervention(item: ExecutionInterventionDto): boolean {
  if (item.semanticCapability === EXECUTION_SCHEDULE_INFEASIBLE) return true;
  return isSlipDecisionProblem(item.decisionProblemId);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** 与后端 Slip 评估一致：metadata → endTime → startTime */
export function resolvePlannedDepartAt(
  activityId: string,
  item?: MobileTodayItineraryItemDto | null,
): string | null {
  if (!item || item.id !== activityId) return null;

  const fromMetadata =
    item.metadata?.rfc001ExecutionActivityContext?.byActivityId?.[activityId]?.plannedDepartAt;
  if (typeof fromMetadata === 'string' && fromMetadata.trim()) {
    return fromMetadata.trim();
  }
  if (typeof item.endTime === 'string' && item.endTime.trim()) {
    return item.endTime.trim();
  }
  if (typeof item.startTime === 'string' && item.startTime.trim()) {
    return item.startTime.trim();
  }
  return null;
}

export function resolveDepartureSlipObservedAt(input: {
  plannedDepartAt: string;
  delayMinutes: number;
  stillAtPoi: boolean;
  tripDayDate?: string | null;
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  const planned = parseISO(input.plannedDepartAt);

  if (input.stillAtPoi && input.delayMinutes === 0) {
    const tripDay = input.tripDayDate?.trim();
    if (tripDay) {
      const day = parseISO(tripDay.includes('T') ? tripDay : `${tripDay}T12:00:00`);
      if (isSameDay(now, day)) {
        return now.toISOString();
      }
    }
    return planned.toISOString();
  }

  return addMinutes(planned, input.delayMinutes).toISOString();
}

export function buildDepartureSlipRequest(input: {
  activityId: string;
  plannedDepartAt: string;
  delayMinutes: number;
  stillAtPoi: boolean;
  tripDayDate?: string | null;
}): DepartureSlipRequest {
  return {
    activityId: input.activityId,
    observedAt: resolveDepartureSlipObservedAt({
      plannedDepartAt: input.plannedDepartAt,
      delayMinutes: input.delayMinutes,
      stillAtPoi: input.stillAtPoi,
      tripDayDate: input.tripDayDate,
    }),
    stillAtPoi: input.stillAtPoi,
    source: 'USER_REPORT',
  };
}

export function resolveSelectedRepairOptionId(
  decision: ConsumerDecisionItem | null | undefined,
  selectedOptionId?: string | null,
): string | null {
  const options = decision?.repairOptions ?? [];
  const selected = selectedOptionId?.trim();
  if (selected && options.some((opt) => opt.optionId === selected)) {
    return selected;
  }
  const recommended = decision?.recommendation?.recommendedActionId?.trim();
  if (recommended && options.some((opt) => opt.optionId === recommended)) {
    return recommended;
  }
  const firstApplicable = options.find((opt) => opt.canApply !== false);
  return firstApplicable?.optionId ?? options[0]?.optionId ?? null;
}

export function formatScheduleContextEvidence(
  context?: ConsumerDecisionScheduleContextDto | null,
): string | null {
  if (!context) return null;
  const parts: string[] = [];
  if (context.projectedEtaLabel?.trim()) {
    parts.push(`预计 ${context.projectedEtaLabel.trim()} 抵达`);
  }
  if (context.nextLastEntryAtLabel?.trim()) {
    parts.push(`最后入场 ${context.nextLastEntryAtLabel.trim()}`);
  }
  if (context.slipMinutes != null && Number.isFinite(context.slipMinutes)) {
    parts.push(`延误 ${context.slipMinutes} 分钟`);
  }
  return parts.length ? parts.join(' · ') : null;
}

export async function pollSlipDecisionProblemId(
  tripId: string,
  problemId: string,
  options?: { attempts?: number; delayMs?: number },
): Promise<string | null> {
  const attempts = options?.attempts ?? 3;
  const delayMs = options?.delayMs ?? 500;

  for (let i = 0; i < attempts; i += 1) {
    try {
      const queue = await getDecisionQueue(tripId);
      const match = queue.items.find(
        (item) =>
          item.problemId === problemId ||
          (isSlipDecisionProblem(item.problemId) && item.problemId === problemId),
      );
      if (match?.problemId) return match.problemId;
      const latestSlip = [...queue.items]
        .reverse()
        .find((item) => isSlipDecisionProblem(item.problemId));
      if (latestSlip?.problemId) return latestSlip.problemId;
    } catch {
      // queue 404 / 延迟 — 继续短轮询
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
  }
  return isSlipDecisionProblem(problemId) ? problemId : null;
}

export function normalizeConsumerDecisionItem(raw: unknown): ConsumerDecisionItem | null {
  const record = asRecord(raw);
  if (!record) return null;
  const problemId = String(record.problemId ?? record.id ?? '').trim();
  if (!problemId) return null;

  const repairOptionsRaw = Array.isArray(record.repairOptions) ? record.repairOptions : [];
  const repairOptions = repairOptionsRaw
    .map((option) => {
      const opt = asRecord(option);
      if (!opt) return null;
      const optionId = String(opt.optionId ?? opt.id ?? '').trim();
      if (!optionId) return null;
      return {
        optionId,
        title: String(opt.title ?? optionId),
        summary: typeof opt.summary === 'string' ? opt.summary : undefined,
        preserves: Array.isArray(opt.preserves)
          ? opt.preserves.map((v) => String(v))
          : Array.isArray(opt.keeps)
            ? opt.keeps.map((v) => String(v))
            : [],
        sacrifices: Array.isArray(opt.sacrifices)
          ? opt.sacrifices.map((v) => String(v))
          : Array.isArray(opt.costs)
            ? opt.costs.map((v) => String(v))
            : [],
        canApply: opt.canApply !== false,
        changePreview: asRecord(opt.changePreview) as ConsumerDecisionItem['repairOptions'][0]['changePreview'],
        scheduleContext: asRecord(opt.scheduleContext) as ConsumerDecisionItem['repairOptions'][0]['scheduleContext'],
      };
    })
    .filter((opt): opt is NonNullable<typeof opt> => opt != null);

  const actionsRaw = asRecord(record.actions) ?? {};
  const readAction = (key: string) => {
    const action = asRecord(actionsRaw[key]);
    if (!action) return undefined;
    return {
      enabled: action.enabled !== false,
      actionId: typeof action.actionId === 'string' ? action.actionId : undefined,
    };
  };

  const severityRaw = String(record.severity ?? 'VERIFY');
  const severity =
    severityRaw === 'BLOCK' ||
    severityRaw === 'CONFLICT' ||
    severityRaw === 'VERIFY' ||
    severityRaw === 'OPTIMIZE'
      ? severityRaw
      : 'VERIFY';

  const recommendationRaw = asRecord(record.recommendation);
  const recommendation = recommendationRaw
    ? {
        title: String(recommendationRaw.title ?? '推荐方案'),
        summary:
          typeof recommendationRaw.summary === 'string' ? recommendationRaw.summary : undefined,
        keeps: Array.isArray(recommendationRaw.keeps)
          ? recommendationRaw.keeps.map((v) => String(v))
          : [],
        costs: Array.isArray(recommendationRaw.costs)
          ? recommendationRaw.costs.map((v) => String(v))
          : [],
        recommendedActionId:
          typeof recommendationRaw.recommendedActionId === 'string'
            ? recommendationRaw.recommendedActionId
            : undefined,
      }
    : undefined;

  return {
    schemaId: 'tripnara.consumer_decision_item@v1',
    problemId,
    headline: String(record.headline ?? '待处理事项'),
    impact: String(record.impact ?? ''),
    explanation: typeof record.explanation === 'string' ? record.explanation : undefined,
    severity,
    affectedActivities: Array.isArray(record.affectedActivities)
      ? record.affectedActivities
          .map((item) => {
            const row = asRecord(item);
            if (!row) return null;
            const activityId = String(row.activityId ?? row.id ?? '').trim();
            if (!activityId) return null;
            return {
              activityId,
              title: String(row.title ?? activityId),
              dayIndex: typeof row.dayIndex === 'number' ? row.dayIndex : undefined,
            };
          })
          .filter((row): row is NonNullable<typeof row> => row != null)
      : undefined,
    recommendation,
    repairOptions,
    actions: {
      acceptRecommended: readAction('acceptRecommended') ?? { enabled: true },
      keepOriginal: readAction('keepOriginal'),
      viewAlternatives: readAction('viewAlternatives'),
      defer: readAction('defer'),
    },
    requiredAcknowledgements: Array.isArray(record.requiredAcknowledgements)
      ? record.requiredAcknowledgements.map((v) => String(v).trim()).filter(Boolean)
      : undefined,
    scheduleContext: asRecord(record.scheduleContext) as ConsumerDecisionScheduleContextDto | undefined,
  };
}
