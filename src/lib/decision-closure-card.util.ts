/**
 * 决策闭环卡视图模型 — 将 BFF 详情 / 候选 / tradeoffs 投影为用户可感知的决策叙事。
 */
import { summarizeExcludedEvaluateCandidates } from '@/lib/canonical-evaluate-response.util';
import {
  decisionOptionLabel,
  findTradeoffForDimension,
  formatTradeoffCell,
  primaryEnforcementLabel,
  tradeoffDimensionLabel,
} from '@/lib/decision-problem-display.util';
import type { CanonicalL2Phase, Rfc001EvaluateCandidateView } from '@/types/unified-decision';
import type {
  DecisionOption,
  DecisionProblemDetail,
  DecisionTradeoffRow,
} from '@/types/decision-problem';

export type DecisionClosureStatusTone =
  | 'attention'
  | 'progress'
  | 'success'
  | 'warning'
  | 'muted';

export interface DecisionClosureStatusView {
  label: string;
  tone: DecisionClosureStatusTone;
  sublabel?: string;
}

/** 用户向决策状态（非内部 phase 标签） */
export function decisionClosureStatusForPhase(input: {
  l2Phase?: CanonicalL2Phase | null;
  primaryEnforcement?: string | null;
  planVersionStatus?: string | null;
  isLegacy?: boolean;
  /** POST evaluate 请求进行中 */
  evaluating?: boolean;
}): DecisionClosureStatusView {
  const phase = input.l2Phase;
  if (phase === 'EFFECTIVE') {
    return { label: '已生效', tone: 'success', sublabel: '行程已按新方案更新' };
  }
  if (phase === 'ROLLED_BACK') {
    return { label: '已回滚', tone: 'muted', sublabel: '有效行程未变更' };
  }
  if (phase === 'NEEDS_REPAIR') {
    return { label: '需继续修复', tone: 'warning', sublabel: '部分变更未成功应用' };
  }
  if (phase === 'AWAITING_EXECUTE') {
    return {
      label: '等待应用',
      tone: 'progress',
      sublabel: '您已授权，确认后将写入行程',
    };
  }
  if (phase === 'AWAITING_AUTHORIZE') {
    return {
      label: '需要你确认',
      tone: 'attention',
      sublabel: input.planVersionStatus?.toLowerCase().includes('pending')
        ? '确认前当前行程不会修改'
        : '请对比方案并选择',
    };
  }
  if (phase === 'NEEDS_EVALUATE') {
    if (input.evaluating) {
      return {
        label: '正在生成方案',
        tone: 'progress',
        sublabel: 'Decision Core 正在评估并验证候选修复路径…',
      };
    }
    return {
      label: '待生成方案',
      tone: 'attention',
      sublabel: '系统将列出经 Abu / Dr.Dre 验证的可执行路径，供你对比选择',
    };
  }

  if (input.isLegacy && input.primaryEnforcement) {
    const enforcement = primaryEnforcementLabel(input.primaryEnforcement);
    return { label: enforcement, tone: 'attention', sublabel: '请查看影响并选择修复方案' };
  }

  return { label: '处理中', tone: 'progress' };
}

/** 决策叙事去重 — title / description / scope 常来自同一 BFF 字段 */
export function isSameDecisionNarrativeText(
  a?: string | null,
  b?: string | null,
): boolean {
  const na = a?.trim();
  const nb = b?.trim();
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= nb.length && na.includes(nb)) return true;
  if (nb.length >= na.length && nb.includes(na)) return true;
  return false;
}

export function resolveRecommendedDecisionOption(
  options: DecisionOption[],
  preferredId?: string | null,
): DecisionOption | null {
  if (!options.length) return null;

  if (preferredId) {
    const preferred = options.find((o) => o.id === preferredId);
    if (preferred) return preferred;
  }

  const scored = options.map((opt) => {
    let score = 0;
    if (opt.executable === false) score -= 100;
    for (const row of opt.tradeoffs ?? []) {
      if (row.dimension === 'POI_COVERAGE' && row.direction === 'IMPROVE') score += 30;
      if (row.dimension === 'SAFETY' && row.direction === 'IMPROVE') score += 25;
      if (row.dimension === 'SAFETY' && row.direction !== 'WORSEN') score += 10;
      if (row.dimension === 'FATIGUE' && row.direction === 'IMPROVE') score += 15;
      if (row.dimension === 'TIME' && row.direction === 'IMPROVE') score += 8;
      if (row.dimension === 'COST' && row.direction === 'IMPROVE') score += 5;
      if (row.dimension === 'FATIGUE' && row.direction === 'WORSEN') score -= 20;
    }
    return { opt, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.opt ?? options[0];
}

export function buildDecisionRecommendationRationale(option: DecisionOption): string {
  const parts: string[] = [];
  const tradeoffs = option.tradeoffs ?? [];

  const safety = findTradeoffForDimension(tradeoffs, 'SAFETY');
  const fatigue = findTradeoffForDimension(tradeoffs, 'FATIGUE');
  const poi = findTradeoffForDimension(tradeoffs, 'POI_COVERAGE');
  const cost = findTradeoffForDimension(tradeoffs, 'COST');
  const time = findTradeoffForDimension(tradeoffs, 'TIME');

  if (safety && safety.direction !== 'WORSEN') {
    parts.push(safety.explanation?.trim() || '安全约束通过');
  }
  if (fatigue) {
    if (fatigue.direction === 'IMPROVE') {
      parts.push(fatigue.explanation?.trim() || '驾驶负荷可接受');
    } else if (fatigue.direction === 'WORSEN') {
      parts.push(`节奏：${formatTradeoffCell(fatigue)}`);
    } else {
      parts.push('节奏在可接受范围');
    }
  }
  if (poi) {
    parts.push(poi.explanation?.trim() || formatTradeoffCell(poi));
  }
  if (cost && (cost.direction === 'IMPROVE' || cost.value === 0)) {
    parts.push(cost.explanation?.trim() || '无新增费用');
  }
  if (time?.explanation?.trim()) {
    parts.push(time.explanation.trim());
  }

  if (parts.length) return parts.join('；');
  return option.description?.trim() ?? '';
}

export interface DecisionRecommendationMetric {
  label: string;
  value: string;
  tone?: 'good' | 'bad' | 'neutral';
}

const RECOMMENDED_METRIC_DIMS = ['SAFETY', 'FATIGUE', 'POI_COVERAGE', 'COST', 'TIME'] as const;

export function buildRecommendationMetrics(
  option: DecisionOption,
): DecisionRecommendationMetric[] {
  const tradeoffs = option.tradeoffs ?? [];
  const metrics: DecisionRecommendationMetric[] = [];

  for (const dimension of RECOMMENDED_METRIC_DIMS) {
    const row = findTradeoffForDimension(tradeoffs, dimension);
    if (!row) continue;
    metrics.push({
      label: tradeoffDimensionLabel(dimension),
      value: formatTradeoffCell(row),
      tone:
        row.direction === 'IMPROVE'
          ? 'good'
          : row.direction === 'WORSEN'
            ? 'bad'
            : 'neutral',
    });
  }

  return metrics.slice(0, 4);
}

/** 原方案为何失效 — 来自 failed assertions 或 enforcement */
export function collectOriginalPlanJudgmentLines(
  detail?: DecisionProblemDetail | null,
): string[] {
  const fromAssertions =
    detail?.assertions
      ?.filter((a) => a.passed === false)
      .map((a) => a.message ?? a.conclusion ?? '')
      .filter((line): line is string => Boolean(line?.trim())) ?? [];

  if (fromAssertions.length) return fromAssertions.slice(0, 5);

  if (detail?.primaryEnforcement === 'BLOCK') {
    return ['原方案暂不可执行：存在阻断级约束未满足'];
  }
  if (detail?.primaryEnforcement === 'REQUIRE_ADJUSTMENT') {
    return ['原方案需调整：当前安排超出可接受范围'];
  }

  return [];
}

export function optionLetterForIndex(index: number): string {
  return String.fromCharCode(65 + index);
}

export function selectedOptionLetter(
  options: DecisionOption[],
  selectedOptionId?: string | null,
): string {
  if (!selectedOptionId) return 'A';
  const index = options.findIndex((o) => o.id === selectedOptionId);
  return optionLetterForIndex(index >= 0 ? index : 0);
}

export function summarizeExcludedOptions(
  options: DecisionOption[],
  recommendedId: string,
  evaluateCandidates?: Rfc001EvaluateCandidateView[],
): string[] {
  if (evaluateCandidates?.length) {
    const fromEvaluate = summarizeExcludedEvaluateCandidates(evaluateCandidates, recommendedId);
    if (fromEvaluate.length) return fromEvaluate;
  }

  return options
    .filter((opt) => opt.id !== recommendedId && opt.executable === false)
    .map((opt) => `${decisionOptionLabel(opt)}：当前条件下不可行`)
    .slice(0, 3);
}

export function formatTradeoffSummaryLine(row: DecisionTradeoffRow): string {
  return `${tradeoffDimensionLabel(row.dimension)} ${formatTradeoffCell(row)}`;
}
