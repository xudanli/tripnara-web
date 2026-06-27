import type { RouteAndRunResponse } from '@/api/agent';
import type {
  RelaxationSelectionMode,
  RelaxationSuggestionKind,
  RelaxationSuggestionV1,
  RelaxationSuggestionsBundle,
  RelaxationSuggestionsContextV1,
} from '@/types/relaxation-suggestions';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return undefined;
}

const RELAXATION_KINDS = new Set<RelaxationSuggestionKind>([
  'relaxation',
  'proceed_at_own_risk',
  'accept_no_solution',
  'manual_relax_constraints',
]);

function normalizeKind(raw: unknown): RelaxationSuggestionKind {
  if (typeof raw === 'string' && RELAXATION_KINDS.has(raw as RelaxationSuggestionKind)) {
    return raw as RelaxationSuggestionKind;
  }
  return 'relaxation';
}

function normalizeSelectionMode(raw: unknown): RelaxationSelectionMode {
  return raw === 'multi' ? 'multi' : 'single';
}

export function normalizeRelaxationSuggestionV1(raw: unknown): RelaxationSuggestionV1 | null {
  const o = asRecord(raw);
  if (!o) return null;

  const actionId = pickString(o, 'actionId', 'action_id');
  const labelZh = pickString(o, 'labelZh', 'label_zh', 'label');
  const descriptionZh = pickString(o, 'descriptionZh', 'description_zh', 'description') ?? '';
  if (!actionId || !labelZh) return null;

  const schemaRaw = pickString(o, 'schema');
  if (schemaRaw && schemaRaw !== 'tripnara.relaxation_suggestion@v1') return null;

  const metadataRaw = asRecord(o.metadata);

  return {
    schema: 'tripnara.relaxation_suggestion@v1',
    actionId,
    labelZh,
    descriptionZh,
    kind: normalizeKind(o.kind),
    confidence:
      o.confidence === 'high_probability_fixed' || o.confidence === 'needs_more_changes'
        ? o.confidence
        : undefined,
    score: pickNumber(o, 'score'),
    pathGroup:
      o.pathGroup === 'path_a' || o.pathGroup === 'path_b' || o.pathGroup === 'other'
        ? o.pathGroup
        : o.path_group === 'path_a' || o.path_group === 'path_b' || o.path_group === 'other'
          ? o.path_group
          : undefined,
    recommended: o.recommended === true,
    metadata: metadataRaw
      ? {
          fixed_conflict_types: Array.isArray(metadataRaw.fixed_conflict_types)
            ? metadataRaw.fixed_conflict_types.filter((x): x is string => typeof x === 'string')
            : undefined,
          violations_before: pickNumber(metadataRaw, 'violations_before'),
          violations_after: pickNumber(metadataRaw, 'violations_after'),
        }
      : undefined,
  };
}

export function normalizeRelaxationSuggestionsContextV1(
  raw: unknown,
): RelaxationSuggestionsContextV1 | null {
  const o = asRecord(raw);
  if (!o) return null;

  const questionId = pickString(o, 'questionId', 'question_id');
  if (!questionId) return null;

  const schemaRaw = pickString(o, 'schema');
  if (schemaRaw && schemaRaw !== 'tripnara.relaxation_suggestions@v1') return null;

  return {
    schema: 'tripnara.relaxation_suggestions@v1',
    questionId,
    selectionMode: normalizeSelectionMode(o.selectionMode ?? o.selection_mode),
    headlineZh: pickString(o, 'headlineZh', 'headline_zh'),
    riskLevel: pickString(o, 'riskLevel', 'risk_level'),
    conflictType: pickString(o, 'conflictType', 'conflict_type'),
    failureRiskScore: pickNumber(o, 'failureRiskScore', 'failure_risk_score'),
    failureProbHintZh: pickString(o, 'failureProbHintZh', 'failure_prob_hint_zh'),
  };
}

function readPayloadRecord(source: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!source) return null;
  const result = asRecord(source.result);
  return asRecord(result?.payload) ?? source;
}

function pickRelaxationArrays(payload: Record<string, unknown>): unknown[] {
  const uiDisplay = asRecord(payload.ui_display) ?? asRecord(payload.uiDisplay);
  const raw =
    payload.relaxation_suggestions ??
    payload.relaxationSuggestions ??
    uiDisplay?.relaxation_suggestions ??
    uiDisplay?.relaxationSuggestions;
  return Array.isArray(raw) ? raw : [];
}

function pickRelaxationContext(payload: Record<string, unknown>): unknown {
  const uiDisplay = asRecord(payload.ui_display) ?? asRecord(payload.uiDisplay);
  return (
    payload.relaxation_suggestions_context ??
    payload.relaxationSuggestionsContext ??
    uiDisplay?.relaxation_suggestions_context ??
    uiDisplay?.relaxationSuggestionsContext
  );
}

/** 从 route_and_run 响应体解析 BFF 松弛投影（勿读 clarificationQuestions.options 机器 label） */
export function parseRelaxationSuggestionsBundle(
  response: RouteAndRunResponse | Record<string, unknown> | null | undefined,
): RelaxationSuggestionsBundle | null {
  if (!response) return null;

  const root = asRecord(response);
  if (!root) return null;

  const payload = readPayloadRecord(root);
  if (!payload) return null;

  const context = normalizeRelaxationSuggestionsContextV1(pickRelaxationContext(payload));
  if (!context) return null;

  const suggestions = pickRelaxationArrays(payload)
    .map(normalizeRelaxationSuggestionV1)
    .filter((x): x is RelaxationSuggestionV1 => x != null);

  if (suggestions.length === 0) return null;

  return { suggestions, context };
}

/** 构建 clarification_answers（value 为 actionId 数组，与 BFF 约定一致） */
export function buildRelaxationClarificationAnswers(
  context: RelaxationSuggestionsContextV1,
  actionIds: string[],
): { questionId: string; value: string[] } | null {
  if (!context.questionId || actionIds.length === 0) return null;
  const unique = [...new Set(actionIds.filter(Boolean))];
  if (unique.length === 0) return null;
  if (context.selectionMode === 'single') {
    return { questionId: context.questionId, value: [unique[0]!] };
  }
  return { questionId: context.questionId, value: unique };
}

export function relaxationSuggestionKindLabel(kind: RelaxationSuggestionKind): string {
  switch (kind) {
    case 'proceed_at_own_risk':
      return '自担风险继续';
    case 'accept_no_solution':
      return '接受无解';
    case 'manual_relax_constraints':
      return '手动调整约束';
    default:
      return '松弛方案';
  }
}
