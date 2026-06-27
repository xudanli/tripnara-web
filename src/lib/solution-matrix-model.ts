import type { KernelGateOptionDelta, OptionComparison, OptionComparisonEntry } from '@/api/planning-workbench';
import { getGateStatusLabel, normalizeGateStatus } from '@/lib/gate-status';
import {
  computeOverallScore,
  formatSolutionScore,
  getSolutionDimensionMeta,
  resolveSolutionDiffTone,
  SOLUTION_MATRIX_DIMENSIONS,
  type SolutionDiffTone,
} from '@/lib/solution-diff.util';

export const SOLUTION_MATRIX_MAX_COLUMNS = 3;

/** M1.5 默认展示行数（不含「查看全部」） */
export const SOLUTION_MATRIX_DEFAULT_VISIBLE_ROWS = 3;

const SCORE_KEY_ALIASES: Record<string, string> = {
  executability: 'executability',
  cost: 'cost',
  fatigue: 'fatigue',
  risk: 'risk',
  pace: 'fatigue',
  budget: 'cost',
};

export interface SolutionMatrixColumn {
  optionId: string;
  label: string;
  isRecommended: boolean;
  caveat?: string;
  gateLabel?: string;
}

export interface SolutionMatrixCell {
  dimensionId: string;
  displayValue: string;
  rawValue: number | null;
  diffTone: SolutionDiffTone;
}

export interface SolutionMatrixRow {
  dimensionId: string;
  label: string;
  cells: SolutionMatrixCell[];
}

export interface SolutionMatrixModel {
  /** ≥2 个方案时可展示 */
  visible: boolean;
  columns: SolutionMatrixColumn[];
  rows: SolutionMatrixRow[];
  recommendedOptionId: string | null;
  optionCount: number;
  divergesFromLlm: boolean;
}

function resolveOptionLabel(entry: OptionComparisonEntry, index: number): string {
  const id = entry.optionId?.trim();
  if (!id) return `方案 ${index + 1}`;
  if (/^opt-[a-z]$/i.test(id)) {
    return index === 0 ? '推荐方案' : `替代 ${String.fromCharCode(64 + index)}`;
  }
  return id;
}

function orderOptions(
  options: OptionComparisonEntry[],
  recommendedId: string | null,
): OptionComparisonEntry[] {
  if (!recommendedId) return options.slice(0, SOLUTION_MATRIX_MAX_COLUMNS);
  const recommended = options.find((o) => o.optionId === recommendedId);
  const rest = options.filter((o) => o.optionId !== recommendedId);
  const ordered = recommended ? [recommended, ...rest] : options;
  return ordered.slice(0, SOLUTION_MATRIX_MAX_COLUMNS);
}

function resolveRowValue(
  dimensionId: string,
  entry: OptionComparisonEntry,
): number | null {
  if (dimensionId === 'overall') {
    return computeOverallScore(entry.scores);
  }
  const scores = entry.scores;
  if (!scores) return null;
  const direct = scores[dimensionId];
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct;
  const alias = Object.entries(SCORE_KEY_ALIASES).find(([, target]) => target === dimensionId)?.[0];
  if (alias && typeof scores[alias] === 'number') return scores[alias] as number;
  return null;
}

function buildCaveat(
  entry: OptionComparisonEntry,
  gateDelta: KernelGateOptionDelta | undefined,
): string | undefined {
  if (gateDelta?.violationCount && gateDelta.violationCount > 0) {
    const types = gateDelta.violationTypes?.slice(0, 2).join('、');
    return types ? `存在 ${gateDelta.violationCount} 项约束问题（${types}）` : `存在 ${gateDelta.violationCount} 项约束问题`;
  }
  const summary = entry.summary?.trim();
  if (summary && summary.length <= 80) return summary;
  if (summary) return `${summary.slice(0, 77)}…`;
  return undefined;
}

export function buildSolutionMatrixModel(
  comparison: OptionComparison | null | undefined,
): SolutionMatrixModel {
  const empty: SolutionMatrixModel = {
    visible: false,
    columns: [],
    rows: [],
    recommendedOptionId: null,
    optionCount: 0,
    divergesFromLlm: false,
  };

  if (!comparison) return empty;

  const options = comparison.options ?? [];
  const recommendedId = comparison.recommendation?.optionId ?? null;
  const optionCount = options.length;

  if (optionCount < 2 && !recommendedId) return empty;

  const ordered = orderOptions(options.length ? options : [{ optionId: recommendedId ?? 'current' }], recommendedId);
  if (ordered.length < 2) return empty;

  const gateByOption = new Map(
    (comparison.kernelGateEval?.optionDeltas ?? []).map((d) => [d.optionId, d]),
  );

  const columns: SolutionMatrixColumn[] = ordered.map((entry, index) => {
    const gateDelta = gateByOption.get(entry.optionId);
    const gateLabel = gateDelta
      ? getGateStatusLabel(normalizeGateStatus(gateDelta.gateStatus))
      : undefined;
    return {
      optionId: entry.optionId,
      label: resolveOptionLabel(entry, index),
      isRecommended: entry.optionId === recommendedId,
      caveat: buildCaveat(entry, gateDelta),
      gateLabel,
    };
  });

  const baselineIndex = columns.findIndex((c) => c.isRecommended);
  const baselineEntry = ordered[baselineIndex >= 0 ? baselineIndex : 0];

  const dimensionIds = SOLUTION_MATRIX_DIMENSIONS.map((d) => d.id).filter((id) => {
    if (id === 'overall') return true;
    return ordered.some((entry) => resolveRowValue(id, entry) != null);
  });

  const rows: SolutionMatrixRow[] = dimensionIds.map((dimensionId) => {
    const meta = getSolutionDimensionMeta(dimensionId);
    const baselineValue = resolveRowValue(dimensionId, baselineEntry);

    return {
      dimensionId,
      label: meta.label,
      cells: ordered.map((entry) => {
        const rawValue = resolveRowValue(dimensionId, entry);
        return {
          dimensionId,
          displayValue: formatSolutionScore(rawValue),
          rawValue,
          diffTone: resolveSolutionDiffTone(baselineValue, rawValue, meta.higherIsBetter),
        };
      }),
    };
  });

  return {
    visible: true,
    columns,
    rows,
    recommendedOptionId: recommendedId,
    optionCount,
    divergesFromLlm: comparison.kernelGateEval?.divergesFromLlmRecommendation === true,
  };
}

export function pickDefaultSelectedOptionId(model: SolutionMatrixModel): string | null {
  if (model.recommendedOptionId) return model.recommendedOptionId;
  return model.columns[0]?.optionId ?? null;
}

export function sliceSolutionMatrixRows(
  rows: SolutionMatrixRow[],
  expanded: boolean,
): SolutionMatrixRow[] {
  if (expanded) return rows;
  return rows.slice(0, SOLUTION_MATRIX_DEFAULT_VISIBLE_ROWS);
}
