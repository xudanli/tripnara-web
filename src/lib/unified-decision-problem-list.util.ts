/**
 * Gateway 统一问题列表 → DecisionProblemSummary 投影。
 * GET /trips/:tripId/decision-problems（tripnara.unified_decision_problems@v1/v2）
 */
import {
  classifyCanonicalL2Phase,
  personaLabelForSemanticCapability,
  titleForSemanticCapability,
} from '@/generated/unified-decision-contracts';
import { filterDecisionQueueSummaries } from '@/lib/decision-problem-queue-filter.util';
import {
  resolveDecisionWriteChain,
  legacyFlowFromWriteChain,
} from '@/lib/decision-write-chain.util';
import type {
  DecisionProblemStatus,
  DecisionProblemSummary,
  PrimaryEnforcement,
} from '@/types/decision-problem';
import type {
  DecisionWriteChain,
  Rfc001DecisionCenterProblemView,
  Rfc001SemanticCapability,
  UnifiedDecisionProblemListItem,
  UnifiedDecisionProblemListView,
} from '@/types/unified-decision';
import { extractImpactScopeFromPayload } from '@/lib/impact-scope-view.util';
import { extractCausalTraceFromPayload, resolveGuardianCausalHeadline } from '@/lib/causal-trace-view.util';
import { inferDecisionProblemScope } from '@/lib/decision-problem-queue-context.util';
import { resolveDecisionProblemQueueDisplay } from '@/lib/decision-problem-queue-display.util';

export function isUnifiedDecisionProblemListView(
  data: unknown,
): data is UnifiedDecisionProblemListView {
  if (!data || typeof data !== 'object') return false;
  const record = data as Record<string, unknown>;
  if (
    record.schemaId === 'tripnara.unified_decision_problems@v1' ||
    record.schemaId === 'tripnara.unified_decision_problems@v2'
  ) {
    return true;
  }
  const meta = record.meta;
  if (meta && typeof meta === 'object' && 'canonicalCount' in meta && 'legacyCount' in meta) {
    return true;
  }
  const items = record.items;
  if (!Array.isArray(items) || items.length === 0) return false;
  const first = items[0] as Record<string, unknown>;
  return (
    first.flow === 'CANONICAL_L2' ||
    first.flow === 'LEGACY_V15' ||
    first.actionability != null ||
    first.writeChain != null
  );
}

function resolveItemWriteChain(item: UnifiedDecisionProblemListItem): DecisionWriteChain {
  return resolveDecisionWriteChain({
    actionability: item.actionability,
    flow: item.flow,
  });
}

function mapUnifiedStatus(
  item: UnifiedDecisionProblemListItem,
  writeChain: DecisionWriteChain,
): DecisionProblemSummary['status'] {
  if (item.workflowStatus) {
    const ws = String(item.workflowStatus).toUpperCase();
    if (ws === 'RESOLVED' || ws === 'DISMISSED') {
      return ws as DecisionProblemStatus;
    }
  }

  if (writeChain === 'EVALUATE_AUTHORIZE_EXECUTE' && item.canonicalSummary) {
    const phase = classifyCanonicalL2Phase({
      semanticCapability: item.semanticCapability ?? item.semanticKey,
      recordStatus: item.canonicalSummary.record?.recordStatus,
      planVersionStatus: item.canonicalSummary.planVersion?.status,
      requiresUserConfirmation: item.canonicalSummary.requiresUserConfirmation,
      problemStatus: item.status,
    });
    if (phase === 'EFFECTIVE') return 'RESOLVED';
  }
  return (item.status as DecisionProblemStatus) ?? 'OPEN';
}

function buildCanonicalView(item: UnifiedDecisionProblemListItem): Rfc001DecisionCenterProblemView {
  const semanticCapability = (item.semanticCapability ??
    item.semanticKey ??
    '') as Rfc001SemanticCapability;
  return {
    problemId: item.problemId,
    rfc001Problem: {
      semanticCapability,
      status: item.status,
      title: item.title,
      description: item.canonicalSummary?.description,
    },
    leadingPersona: item.canonicalSummary?.leadingPersona,
    requiresUserConfirmation: item.canonicalSummary?.requiresUserConfirmation,
    candidates: item.canonicalSummary?.candidates,
    record: item.canonicalSummary?.record,
    planVersion: item.canonicalSummary?.planVersion,
    route: item.route,
  };
}

function resolvePrimaryEnforcement(item: UnifiedDecisionProblemListItem): PrimaryEnforcement {
  const enforcement = item.enforcement ?? item.legacySummary?.primaryEnforcement;
  if (enforcement) return enforcement as PrimaryEnforcement;
  return resolveItemWriteChain(item) === 'EVALUATE_AUTHORIZE_EXECUTE'
    ? 'REQUIRE_CONFIRMATION'
    : 'BLOCK';
}

/** 单条 Gateway list item → L1 卡片模型（SSOT v2 字段优先，flow 仅作兼容投影） */
export function unifiedListItemToSummary(
  item: UnifiedDecisionProblemListItem,
): DecisionProblemSummary {
  const writeChain = resolveItemWriteChain(item);
  const semanticCapability = item.semanticCapability ?? item.semanticKey;
  const legacy = item.legacySummary;
  const canonical = item.canonicalSummary;
  const scopeView =
    extractImpactScopeFromPayload(item) ??
    extractImpactScopeFromPayload(canonical) ??
    item.impactScopeView ??
    canonical?.impactScopeView;
  const causalFields = extractCausalTraceFromPayload(item);

  const title =
    item.title.trim() ||
    (semanticCapability
      ? titleForSemanticCapability(semanticCapability as Rfc001SemanticCapability)
      : item.problemId);

  const summary: DecisionProblemSummary = {
    id: item.problemId,
    title,
    type:
      (legacy?.type as DecisionProblemSummary['type']) ??
      (writeChain === 'EVALUATE_AUTHORIZE_EXECUTE' ? 'RISK' : 'INFEASIBILITY'),
    status: mapUnifiedStatus(item, writeChain),
    primaryEnforcement: resolvePrimaryEnforcement(item),
    detectedBy: legacy?.detectedBy as DecisionProblemSummary['detectedBy'],
    semanticKey: item.semanticKey ?? semanticCapability,
    instanceKey: item.instanceKey,
    workflowStatus: item.workflowStatus ?? (item.status as DecisionProblemSummary['workflowStatus']),
    executionStatus: item.executionStatus,
    actionability: item.actionability ?? { writeChain },
    writeChain,
    flowKind: legacyFlowFromWriteChain(writeChain),
    optionsCount:
      canonical?.candidates?.length ?? canonical?.optionsCount ?? legacy?.optionsCount,
    evidenceValidUntil: legacy?.evidenceValidUntil,
    affectedScopeSummary: legacy?.affectedScopeSummary,
    affectedDayNumbers: legacy?.affectedDayNumbers,
    scope: item.scope,
    affectedMemberIds: legacy?.affectedMemberIds,
    categoryLabel: item.categoryLabel?.trim() || legacy?.categoryLabel?.trim() || undefined,
    description: item.summary?.trim() || legacy?.description?.trim() || undefined,
    route: item.route,
    impactScopeView: scopeView ?? undefined,
    causalStoryHeadline: causalFields.causalStoryView?.headline,
    guardianCausalHeadline:
      resolveGuardianCausalHeadline(item) ?? causalFields.guardianCausalStoryView?.headline,
  };

  if (writeChain === 'EVALUATE_AUTHORIZE_EXECUTE' && canonical) {
    summary.canonicalView = buildCanonicalView(item);
    summary.personaLabel = personaLabelForSemanticCapability(
      semanticCapability as Rfc001SemanticCapability,
    );
  }

  const inferred = inferDecisionProblemScope(summary);
  if (inferred.affectedDayNumbers?.length) {
    summary.affectedDayNumbers = inferred.affectedDayNumbers;
  }
  if (inferred.affectedScopeSummary) {
    summary.affectedScopeSummary = inferred.affectedScopeSummary;
  }

  return summary;
}

/** Legacy 按天次/路段/语义去重；Canonical L2 按 instanceKey 或 semanticCapability 去重 */
function dedupeScore(item: DecisionProblemSummary): number {
  let score = 0;
  const view = item.canonicalView;
  if (view?.record?.decisionId) score += 20;
  if (view?.planVersion?.status === 'PENDING_AUTHORIZATION') score += 10;
  if ((view?.candidates?.length ?? 0) > 0) score += 5;
  if (item.optionsCount) score += item.optionsCount * 3;
  score += LEGACY_ENFORCEMENT_SCORE[item.primaryEnforcement] ?? 0;
  if (item.status === 'WAITING_DECISION' || item.status === 'ASSESSING') score += 2;
  const tail = item.id.split('_').pop();
  const ts = tail ? Number(tail) : 0;
  if (Number.isFinite(ts)) score += ts / 1e15;
  return score;
}

function dedupeKey(item: DecisionProblemSummary): string {
  if (item.writeChain === 'EVALUATE_AUTHORIZE_EXECUTE') {
    const instance = item.instanceKey?.trim();
    if (instance) return `instance:${instance}`;

    const semantic =
      item.semanticKey ?? item.canonicalView?.rfc001Problem.semanticCapability ?? item.title.trim();
    return `canonical:${semantic}`;
  }

  // Legacy 队列：按天次/路段/语义合并，勿因 instanceKey 不同重复展示
  return legacyDedupeKey(item);
}

const LEGACY_ENFORCEMENT_SCORE: Partial<Record<PrimaryEnforcement, number>> = {
  BLOCK: 40,
  REQUIRE_ADJUSTMENT: 30,
  REQUIRE_CONFIRMATION: 20,
  ADVISE: 10,
};

function legacyAffectedDays(item: DecisionProblemSummary): string {
  if (item.affectedDayNumbers?.length) {
    return item.affectedDayNumbers.join(',');
  }
  const fromTitle = item.title.match(/第(\d+)天/);
  if (fromTitle) return fromTitle[1];
  return 'trip';
}

function normalizePlaceToken(text: string): string {
  return text
    .replace(/长距离行驶.*/u, '')
    .replace(/驾车.*/u, '')
    .replace(/建议.*/u, '')
    .replace(/[（(][^)）]*[)）]/g, '')
    .replace(/约?\s*\d+[\d.]*\s*(km|分钟|h|小时)?/gi, '')
    .replace(/[^\u4e00-\u9fff\w]/g, '')
    .trim()
    .slice(0, 16);
}

/** 同天 + 同路段/语义 的 Legacy 合并键 */
export function legacyDedupeKey(item: DecisionProblemSummary): string {
  const days = legacyAffectedDays(item);

  if (/交通缓冲/u.test(item.title) || item.id.includes('same_day_travel')) {
    const segment = resolveDecisionProblemQueueDisplay(item).contextLine;
    if (segment) {
      const token = segment
        .replace(/[^\u4e00-\u9fff\w]/g, '')
        .trim()
        .slice(0, 24);
      if (token) return `legacy:${days}:travel_buffer:${token}`;
    }
    return `legacy:${days}:travel_buffer`;
  }

  const withoutDay = item.title.replace(/第\d+天\s*[··.]?\s*/u, '');
  const segments = withoutDay.split(/→|->|—/);
  if (segments.length >= 2) {
    const from = normalizePlaceToken(segments[0]);
    const to = normalizePlaceToken(segments[1]);
    if (from && to) return `legacy:${days}:route:${from}|${to}`;
  }

  if (/长距离|驾驶超时|拆分/u.test(item.title)) {
    const places = withoutDay.match(/[\u4e00-\u9fff]{2,8}/g)?.slice(0, 2).join('|');
    if (places) return `legacy:${days}:drive:${places}`;
  }

  const semantic = item.semanticKey?.trim();
  if (semantic) return `legacy:${days}:semantic:${semantic}`;

  return `legacy:unique:${item.id}`;
}

export function dedupeDecisionProblemSummaries(
  items: DecisionProblemSummary[],
): DecisionProblemSummary[] {
  const best = new Map<string, DecisionProblemSummary>();
  const order: string[] = [];

  for (const item of items) {
    const key = dedupeKey(item);
    if (!best.has(key)) order.push(key);
    const existing = best.get(key);
    if (!existing || dedupeScore(item) > dedupeScore(existing)) {
      best.set(key, item);
    }
  }

  return order
    .map((key) => best.get(key))
    .filter((item): item is DecisionProblemSummary => Boolean(item));
}

export function mapUnifiedDecisionProblemList(
  view: UnifiedDecisionProblemListView,
): DecisionProblemSummary[] {
  const mapped = dedupeDecisionProblemSummaries((view.items ?? []).map(unifiedListItemToSummary));
  return filterDecisionQueueSummaries(mapped);
}

/** @deprecated 使用 mapUnifiedDecisionProblemList（后端已去重） */
export function mergeDecisionProblemLists(input: {
  legacyItems: DecisionProblemSummary[];
  canonicalProblems?: Rfc001DecisionCenterProblemView[] | null;
}): DecisionProblemSummary[] {
  void input;
  return [];
}

/** @deprecated 使用 unifiedListItemToSummary */
export function canonicalProblemToSummary(
  problem: Rfc001DecisionCenterProblemView,
): DecisionProblemSummary {
  return unifiedListItemToSummary({
    problemId: problem.problemId,
    flow: 'CANONICAL_L2',
    route: problem.route ?? { resolution: 'PRIMARY' },
    semanticCapability: problem.rfc001Problem.semanticCapability,
    semanticKey: problem.rfc001Problem.semanticCapability,
    title:
      problem.rfc001Problem.title?.trim() ||
      titleForSemanticCapability(problem.rfc001Problem.semanticCapability),
    status: problem.rfc001Problem.status ?? 'OPEN',
    actionability: { writeChain: 'EVALUATE_AUTHORIZE_EXECUTE' },
    canonicalSummary: {
      leadingPersona: problem.leadingPersona,
      requiresUserConfirmation: problem.requiresUserConfirmation,
      candidates: problem.candidates,
      record: problem.record,
      planVersion: problem.planVersion,
      description: problem.rfc001Problem.description,
      optionsCount: problem.candidates?.length,
    },
  });
}

export function findCanonicalProblemView(
  items: DecisionProblemSummary[] | null | undefined,
  problemId: string | null | undefined,
): Rfc001DecisionCenterProblemView | undefined {
  if (!problemId || !items?.length) return undefined;
  return items.find((p) => p.id === problemId)?.canonicalView;
}

export function resolveEngineIdForProblem(input: {
  problemId: string;
  items?: DecisionProblemSummary[] | null;
}): string | undefined {
  const item = input.items?.find((p) => p.id === input.problemId);
  if (item?.route?.engineId) return item.route.engineId;
  return item?.canonicalView?.route?.engineId;
}
