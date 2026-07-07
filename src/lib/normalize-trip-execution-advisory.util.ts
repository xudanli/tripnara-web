/**
 * GET /trips/:tripId/in-trip/execution-advisory · causalInsight 归一化
 */
import type { CausalStoryChainNode } from '@/types/causal-trace';
import type {
  ExecutionCausalInsightDto,
  ExecutionCausalPrimaryEnforcement,
  TripExecutionAdvisoryDto,
} from '@/types/trip-execution-advisory';
import type { PrimaryEnforcement } from '@/types/decision-problem';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readString(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function readStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw.map((item) => String(item).trim()).filter(Boolean);
  return items.length ? items : undefined;
}

function normalizeChainNode(raw: unknown, index: number): CausalStoryChainNode | null {
  const record = asRecord(raw);
  if (!record) return null;

  const description = readString(record.description ?? record.message);
  if (!description) return null;

  const nodeId = readString(record.nodeId ?? record.node_id) ?? `node_${index}`;
  const type = readString(record.type) ?? 'RISK';
  const title =
    readString(record.title ?? record.label ?? record.entityLabel ?? record.entity_label) ??
    (type === 'WEATHER'
      ? '天气影响'
      : type === 'TRAVEL_TIME' || type === 'ROUTE'
        ? '通行耗时'
        : type === 'RESERVATION' || type === 'BOOKING'
          ? '预约风险'
          : '因果因子');

  return {
    nodeId,
    type,
    title,
    description,
    sourceRefs: readStringArray(record.sourceRefs ?? record.source_refs),
  };
}

function normalizePrimaryEnforcement(raw: unknown): ExecutionCausalPrimaryEnforcement | undefined {
  const value = readString(raw)?.toUpperCase();
  if (value === 'NOT_EXECUTABLE' || value === 'BLOCK') return 'NOT_EXECUTABLE';
  if (value === 'ADJUST_REQUIRED' || value === 'REQUIRE_ADJUSTMENT') return 'ADJUST_REQUIRED';
  return undefined;
}

/** execution-advisory · causalInsight 块 */
export function normalizeExecutionCausalInsight(
  raw: unknown,
  options?: { fallbackHeadline?: string },
): ExecutionCausalInsightDto | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;

  const guardianHeadline =
    readString(record.guardianHeadline ?? record.guardian_headline) ??
    options?.fallbackHeadline;
  let primaryEnforcement = normalizePrimaryEnforcement(
    record.primaryEnforcement ?? record.primary_enforcement,
  );
  const linkedProblemId = readString(record.linkedProblemId ?? record.linked_problem_id);

  const storyRecord = asRecord(record.causalStory ?? record.causal_story);
  const assessment = readString(storyRecord?.assessment);
  const chainRaw = storyRecord?.chain;
  const chain = Array.isArray(chainRaw)
    ? chainRaw
        .map((node, index) => normalizeChainNode(node, index))
        .filter((node): node is CausalStoryChainNode => Boolean(node))
    : [];

  if (!guardianHeadline) return undefined;
  if (!assessment && !chain.length) return undefined;

  if (!primaryEnforcement) {
    primaryEnforcement = /不建议|不可执行|阻断|not.executable/i.test(guardianHeadline)
      ? 'NOT_EXECUTABLE'
      : 'ADJUST_REQUIRED';
  }

  return {
    guardianHeadline,
    primaryEnforcement,
    causalStory: {
      chain,
      assessment: assessment ?? '',
    },
    linkedProblemId,
  };
}

/** Abu banner · primaryEnforcement 展示映射 */
export function mapExecutionPrimaryEnforcementForBanner(
  value: ExecutionCausalPrimaryEnforcement | PrimaryEnforcement | string | undefined,
): PrimaryEnforcement | string | undefined {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase();
  if (normalized === 'NOT_EXECUTABLE') return 'BLOCK';
  if (normalized === 'ADJUST_REQUIRED') return 'REQUIRE_ADJUSTMENT';
  return value;
}

/** BFF execution-advisory 全量归一化 */
export function normalizeTripExecutionAdvisory(raw: unknown): TripExecutionAdvisoryDto | null {
  const record = asRecord(raw);
  if (!record) return null;

  const verdictRecord = asRecord(record.verdict);
  const verdictHeadline = readString(verdictRecord?.headline);
  const causalInsight = normalizeExecutionCausalInsight(
    record.causalInsight ?? record.causal_insight,
    { fallbackHeadline: verdictHeadline },
  );

  const base = { ...(raw as TripExecutionAdvisoryDto) };
  if (!causalInsight) {
    return base;
  }

  return {
    ...base,
    causalInsight,
  };
}
