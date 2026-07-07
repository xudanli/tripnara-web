import type { OptionComparison } from '@/api/planning-workbench';
import type {
  ExplainAlternativeDto,
  SolutionComparisonReadModel,
} from '@/types/solution-comparison';

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

function normalizeStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  return items.length ? items : undefined;
}

export function normalizeExplainAlternativeDto(raw: unknown): ExplainAlternativeDto | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id = pickString(o, 'id', 'option_id', 'optionId');
  if (!id) return null;
  const dimensionScores =
    asRecord(o.dimension_scores) ??
    asRecord(o.dimensionScores) ??
    (typeof o.scores === 'object' ? asRecord(o.scores) : null);
  return {
    id,
    label: pickString(o, 'label', 'name'),
    summary: pickString(o, 'summary', 'description'),
    dimension_scores: dimensionScores as ExplainAlternativeDto['dimension_scores'],
    scores: dimensionScores as Record<string, number> | undefined,
    caveat: pickString(o, 'caveat') ?? (Array.isArray(o.caveats) ? String(o.caveats[0]) : undefined),
    tradeoffs: normalizeStringArray(o.tradeoffs),
    is_recommended: o.is_recommended === true || o.isRecommended === true,
    gate_status: pickString(o, 'gate_status', 'gateStatus'),
  };
}

/** 将 explain.alternatives[] 投影为 OptionComparison（矩阵读模型复用） */
export function buildOptionComparisonFromExplainAlternatives(input: {
  alternatives: ExplainAlternativeDto[];
  recommendedId?: string | null;
  reason?: string;
}): OptionComparison | null {
  const { alternatives, recommendedId, reason } = input;
  if (alternatives.length < 2) return null;

  const recId =
    recommendedId ??
    alternatives.find((a) => a.is_recommended || a.isRecommended)?.id ??
    alternatives[0]?.id;
  if (!recId) return null;

  const options = alternatives.map((alt) => ({
    optionId: alt.id,
    scores: (alt.dimension_scores ?? alt.scores) as Record<string, number> | undefined,
    ...(alt.tradeoffs?.length ? { tradeoffs: alt.tradeoffs } : {}),
  }));

  return {
    options,
    recommendation: {
      optionId: recId,
      reason: reason?.trim() || `推荐方案 ${recId}`,
    },
  };
}

export function parseExplainAlternativesFromRecord(
  record: Record<string, unknown> | null | undefined,
): ExplainAlternativeDto[] {
  if (!record) return [];
  const explain = asRecord(record.explain) ?? record;
  const raw =
    explain.alternatives ??
    asRecord(explain.optimization)?.alternatives ??
    record.alternatives;
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeExplainAlternativeDto)
    .filter((x): x is ExplainAlternativeDto => x != null);
}

export function mergeSolutionComparisonReadModel(
  primary: OptionComparison | null | undefined,
  extensions: {
    alternatives?: ExplainAlternativeDto[];
    source?: SolutionComparisonReadModel['source'];
  },
): SolutionComparisonReadModel | null {
  const fromExplain =
    !primary?.options?.length && extensions.alternatives?.length
      ? buildOptionComparisonFromExplainAlternatives({
          alternatives: extensions.alternatives,
          recommendedId: extensions.alternatives.find((a) => a.is_recommended)?.id,
        })
      : null;

  const comparison = primary?.recommendation ? primary : fromExplain;
  if (!comparison) return null;

  return {
    ...comparison,
    source: extensions.source ?? (primary?.recommendation ? 'workbench' : 'explain_alternatives'),
    ...(extensions.alternatives?.length ? { alternatives: extensions.alternatives } : {}),
  };
}
