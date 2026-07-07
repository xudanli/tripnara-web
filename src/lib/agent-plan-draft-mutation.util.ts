import type { AgentPlanDraftMutation } from '@/types/agent-plan-draft-mutation';
import type { ItineraryDiffEntry } from '@/types/feasibility-repair';
import type { PlanGateDraftDiff, PlanGateTimelineChange } from '@/types/plan-gate';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeItineraryDiff(raw: unknown): ItineraryDiffEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = asRecord(item);
      if (!row || typeof row.slotId !== 'string' || typeof row.changeType !== 'string') {
        return null;
      }
      return {
        slotId: row.slotId,
        changeType: row.changeType as ItineraryDiffEntry['changeType'],
        dayNumber: typeof row.dayNumber === 'number' ? row.dayNumber : 0,
        before: asRecord(row.before) as ItineraryDiffEntry['before'],
        after: asRecord(row.after) as ItineraryDiffEntry['after'],
      };
    })
    .filter((item): item is ItineraryDiffEntry => item != null);
}

function normalizeTimelineChanges(raw: unknown): PlanGateTimelineChange[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = asRecord(item);
      if (!row || typeof row.kind !== 'string') return null;
      return {
        kind: row.kind,
        day: typeof row.day === 'number' ? row.day : undefined,
        label: typeof row.label === 'string' ? row.label : undefined,
        before: typeof row.before === 'string' ? row.before : undefined,
        after: typeof row.after === 'string' ? row.after : undefined,
        impact: typeof row.impact === 'string' ? row.impact : undefined,
      };
    })
    .filter((item): item is PlanGateTimelineChange => item != null);
}

export function normalizeAgentPlanDraftMutation(raw: unknown): AgentPlanDraftMutation | null {
  const record = asRecord(raw);
  if (!record) return null;

  const itineraryDiff = normalizeItineraryDiff(record.itineraryDiff);
  const timelineChanges = normalizeTimelineChanges(record.timelineChanges);
  const operations = Array.isArray(record.operations)
    ? record.operations
        .map((item) => {
          const op = asRecord(item);
          if (!op) return null;
          return {
            type: typeof op.type === 'string' ? op.type : undefined,
            label: typeof op.label === 'string' ? op.label : undefined,
            description: typeof op.description === 'string' ? op.description : undefined,
            dayNumber: typeof op.dayNumber === 'number' ? op.dayNumber : undefined,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item != null)
    : [];

  const hasContent =
    Boolean(record.headline || record.summary || record.problemId) ||
    itineraryDiff.length > 0 ||
    timelineChanges.length > 0 ||
    operations.length > 0;

  if (!hasContent) return null;

  return {
    problemId: typeof record.problemId === 'string' ? record.problemId : undefined,
    headline: typeof record.headline === 'string' ? record.headline : undefined,
    summary: typeof record.summary === 'string' ? record.summary : undefined,
    status: typeof record.status === 'string' ? record.status : undefined,
    itineraryDiff: itineraryDiff.length ? itineraryDiff : undefined,
    timelineChanges: timelineChanges.length ? timelineChanges : undefined,
    operations: operations.length ? operations : undefined,
  };
}

/** 从 planState.metadata.agentPlanDraftMutation 读取拟议变更 */
export function readAgentPlanDraftMutation(
  planState: { metadata?: unknown } | null | undefined,
): AgentPlanDraftMutation | null {
  const metadata = asRecord(planState?.metadata);
  if (!metadata) return null;
  return normalizeAgentPlanDraftMutation(metadata.agentPlanDraftMutation);
}

/** planGate.draftDiff 降级展示（metadata 缺失时） */
export function agentPlanDraftMutationFromPlanGateDiff(
  draftDiff: PlanGateDraftDiff | null | undefined,
  problemId?: string | null,
): AgentPlanDraftMutation | null {
  if (!draftDiff) return null;
  const timelineChanges = draftDiff.timelineChanges ?? [];
  const memberChanges = (draftDiff.memberChanges ?? []).map((change) => ({
    kind: 'member',
    day: change.day,
    label: change.label,
    before: change.before,
    after: change.after,
    impact: change.impact,
  }));
  const merged = [...timelineChanges, ...memberChanges];
  if (!merged.length && !draftDiff.baselineLabel) return null;

  return {
    problemId: problemId ?? undefined,
    headline: draftDiff.draftLabel
      ? `拟议方案 ${draftDiff.draftLabel}`
      : draftDiff.baselineLabel
        ? `相对 ${draftDiff.baselineLabel} 的变更`
        : '拟议行程变更',
    summary: draftDiff.metrics?.executabilityDelta != null
      ? `可执行性变化 ${draftDiff.metrics.executabilityDelta > 0 ? '+' : ''}${draftDiff.metrics.executabilityDelta}`
      : undefined,
    timelineChanges: merged.length ? merged : undefined,
  };
}

export function resolveAgentPlanDraftMutationForDisplay(input: {
  planState?: { metadata?: unknown } | null;
  draftDiff?: PlanGateDraftDiff | null;
}): AgentPlanDraftMutation | null {
  return (
    readAgentPlanDraftMutation(input.planState) ??
    agentPlanDraftMutationFromPlanGateDiff(input.draftDiff)
  );
}

export function agentPlanDraftMutationHasChanges(mutation: AgentPlanDraftMutation | null): boolean {
  if (!mutation) return false;
  return Boolean(
    mutation.itineraryDiff?.length ||
      mutation.timelineChanges?.length ||
      mutation.operations?.length,
  );
}
