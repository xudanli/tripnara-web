import {
  findTradeoffForDimension,
  formatTradeoffCell,
  tradeoffDimensionLabel,
} from '@/lib/decision-problem-display.util';
import type { DecisionOption, DecisionTradeoffRow } from '@/types/decision-problem';
import type { PlanningDecisionPackOption } from '@/types/planning-decision-pack';
import { resultLayersFromPlanningOption } from '@/lib/planning-decision-pack.adapter';
import type { DecisionAction } from '@/types/unified-decision';

export interface DecisionSpaceResultLayers {
  outcomes: string[];
  costs: string[];
  impactScope: string[];
  systemJudgment?: string;
}

function rowToLine(row: DecisionTradeoffRow): string {
  const label = tradeoffDimensionLabel(row.dimension);
  const value = row.explanation?.trim() || formatTradeoffCell(row);
  return value.includes(label) ? value : `${label}：${value}`;
}

/** 从 tradeoffs 分层提取结果卡信息 */
export function buildDecisionSpaceResultLayers(input: {
  tradeoffs?: DecisionTradeoffRow[];
  description?: string | null;
  expectedImpact?: string | null;
  optionType?: string | null;
}): DecisionSpaceResultLayers {
  const tradeoffs = input.tradeoffs ?? [];
  const outcomes: string[] = [];
  const costs: string[] = [];

  for (const row of tradeoffs) {
    const line = rowToLine(row);
    if (row.direction === 'IMPROVE' || row.direction === 'UNCHANGED') {
      outcomes.push(line);
    } else if (row.direction === 'WORSEN') {
      costs.push(line);
    }
  }

  const impactScope: string[] = [];
  const flexibility = findTradeoffForDimension(tradeoffs, 'FLEXIBILITY');
  const fairness = findTradeoffForDimension(tradeoffs, 'GROUP_FAIRNESS');
  if (flexibility?.explanation?.trim()) {
    impactScope.push(flexibility.explanation.trim());
  }
  if (fairness?.explanation?.trim()) {
    impactScope.push(fairness.explanation.trim());
  }

  const normalizedType = String(input.optionType ?? '').toUpperCase();
  const systemJudgment =
    input.expectedImpact?.trim() ||
    (normalizedType === 'ACCEPT_RISK'
      ? '保留原计划将承担上述风险；系统会持续监控条件变化。'
      : input.description?.trim()) ||
    undefined;

  return {
    outcomes: outcomes.slice(0, 4),
    costs: costs.slice(0, 3),
    impactScope: impactScope.slice(0, 3),
    systemJudgment,
  };
}

export function buildDecisionSpaceResultLayersFromOption(
  option: DecisionOption | null | undefined,
): DecisionSpaceResultLayers {
  if (!option) {
    return { outcomes: [], costs: [], impactScope: [] };
  }
  return buildDecisionSpaceResultLayers({
    tradeoffs: option.tradeoffs,
    description: option.description,
    optionType: option.type,
  });
}

export function buildDecisionSpaceResultLayersFromPlanningOption(
  option: PlanningDecisionPackOption | null | undefined,
): DecisionSpaceResultLayers {
  if (!option) return { outcomes: [], costs: [], impactScope: [] };
  return resultLayersFromPlanningOption(option);
}

export function buildDecisionSpaceResultLayersFromAction(
  action: DecisionAction | null | undefined,
  matchedOption?: DecisionOption | null,
): DecisionSpaceResultLayers {
  if (matchedOption?.tradeoffs?.length) {
    const layers = buildDecisionSpaceResultLayers({
      tradeoffs: matchedOption.tradeoffs,
      description: matchedOption.description ?? action?.summary,
      expectedImpact: action?.expectedImpact,
      optionType: matchedOption.type,
    });
    if (layers.outcomes.length || layers.costs.length) return layers;
  }

  const outcomes: string[] = [];
  const costs: string[] = [];
  const summary = action?.summary?.trim() || action?.description?.trim();
  const impact = action?.expectedImpact?.trim();

  if (summary) outcomes.push(summary);
  if (impact) {
    if (/风险|牺牲|缩短|延迟|可能|代价|影响|不足/u.test(impact)) costs.push(impact);
    else outcomes.push(impact);
  }

  const normalizedType = String(matchedOption?.type ?? '').toUpperCase();
  const systemJudgment =
    normalizedType === 'ACCEPT_RISK'
      ? '保留原计划将承担上述风险；系统会持续监控条件变化。'
      : undefined;

  if (outcomes.length || costs.length) {
    return {
      outcomes: outcomes.slice(0, 4),
      costs: costs.slice(0, 3),
      impactScope: [],
      systemJudgment,
    };
  }

  return buildDecisionSpaceResultLayers({
    tradeoffs: undefined,
    description: action?.summary ?? action?.description,
    expectedImpact: action?.expectedImpact,
  });
}
