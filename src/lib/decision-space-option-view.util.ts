import {
  decisionOptionLabel,
  findTradeoffForDimension,
  formatTradeoffCell,
  formatTradeoffUnitValue,
  tradeoffDimensionLabel,
} from '@/lib/decision-problem-display.util';
import { buildDecisionSpaceResultLayers } from '@/lib/decision-space-result-card.util';
import { formatIsoDateTimesInDisplayText } from '@/components/plan-studio/workbench/workbench-format.util';
import type { DecisionCheckerScenarioDto } from '@/types/decision-checker';
import type {
  AffectedScopeDisplay,
  DecisionOption,
  DecisionProblemDetail,
  DecisionTradeoffRow,
  TradeoffDimension,
} from '@/types/decision-problem';

export interface DecisionSpaceOptionMetric {
  key: string;
  label: string;
  displayValue: string;
  tone: 'good' | 'bad' | 'neutral';
}

import type { DecisionSpaceResultLayers } from '@/lib/decision-space-result-card.util';

export interface DecisionSpaceOptionView {
  id: string;
  letter: string;
  title: string;
  description: string;
  badge?: DecisionCheckerScenarioDto['badge'];
  badgeLabel?: string;
  variant: DecisionCheckerScenarioDto['variant'];
  metrics: DecisionSpaceOptionMetric[];
  /** 纯文本对比（降级） */
  comparisonLine?: string;
  /** 结构化对比条（原方案 → 调整后） */
  comparison?: { before: string; after: string };
  routeLabels?: string[];
  predictedSupportPct: number;
  /** 结果卡分层（决策执行空间） */
  resultLayers?: DecisionSpaceResultLayers;
}

const SCENARIO_VARIANTS: Array<'blue' | 'orange' | 'purple'> = ['blue', 'orange', 'purple'];
const LETTERS = ['A', 'B', 'C', 'D'];

const PREFERRED_METRIC_DIMS: TradeoffDimension[] = [
  'FLEXIBILITY',
  'TIME',
  'COST',
  'POI_COVERAGE',
  'FATIGUE',
  'SAFETY',
  'COMFORT',
];

const METRIC_LABEL_OVERRIDE: Partial<Record<TradeoffDimension, string>> = {
  FLEXIBILITY: '可行度',
  TIME: '驾驶时长',
  COST: '预算(人均)',
  POI_COVERAGE: '核心体验保留',
  FATIGUE: '体力消耗',
};

const COMPARISON_ARROW = /(?:→|->|>|>>>|—>)/;

function formatBffDisplayText(text: string | undefined, timezone?: string): string {
  if (!text?.trim()) return '';
  return formatIsoDateTimesInDisplayText(text.trim(), timezone);
}

function polishOptionView(
  view: DecisionSpaceOptionView,
  timezone?: string,
): DecisionSpaceOptionView {
  return {
    ...view,
    title: formatBffDisplayText(view.title, timezone) || view.title,
    description: formatBffDisplayText(view.description, timezone) || view.description,
    comparisonLine: view.comparisonLine
      ? formatBffDisplayText(view.comparisonLine, timezone)
      : undefined,
    comparison: view.comparison
      ? {
          before: formatBffDisplayText(view.comparison.before, timezone) || view.comparison.before,
          after: formatBffDisplayText(view.comparison.after, timezone) || view.comparison.after,
        }
      : undefined,
    metrics: view.metrics.map((metric) => ({
      ...metric,
      displayValue:
        formatBffDisplayText(metric.displayValue, timezone) || metric.displayValue,
    })),
  };
}

/** 从 explanation 解析「原方案 X → 调整后 Y」 */
export function parseTradeoffComparisonSegments(
  text: string | undefined,
): { before: string; after: string } | undefined {
  const normalized = text?.trim();
  if (!normalized || !COMPARISON_ARROW.test(normalized)) return undefined;

  const labeled =
    normalized.match(
      /原(?:方案|计划)\s*(.+?)\s*(?:→|->|>|>>>|—>)\s*(?:调整后|新方案|调整(?:后)?)\s*(.+)/i,
    ) ??
    normalized.match(
      /(?:调整前|原来)\s*(.+?)\s*(?:→|->|>|>>>|—>)\s*(?:调整后|现在|新方案)\s*(.+)/i,
    );
  if (labeled?.[1] && labeled[2]) {
    return { before: labeled[1].trim(), after: labeled[2].trim() };
  }

  const parts = normalized.split(COMPARISON_ARROW).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { before: parts[0]!, after: parts[parts.length - 1]! };
  }
  return undefined;
}

function truncateExplanation(text: string, maxLen = 48): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

function tradeoffTone(row: DecisionTradeoffRow): DecisionSpaceOptionMetric['tone'] {
  if (row.direction === 'IMPROVE') return 'good';
  if (row.direction === 'WORSEN') return 'bad';
  return 'neutral';
}

function formatMetricDisplay(row: DecisionTradeoffRow): string {
  if (row.dimension === 'FLEXIBILITY' && row.value != null && row.unit === 'PERCENT') {
    const sign = row.direction === 'IMPROVE' ? '+' : row.direction === 'WORSEN' ? '−' : '';
    return `${sign}${Math.abs(row.value)}%`;
  }
  if (row.dimension === 'POI_COVERAGE' && row.value != null && row.unit === 'PERCENT') {
    const deltaSign = row.direction === 'IMPROVE' ? '+' : row.direction === 'WORSEN' ? '−' : '';
    const delta = `${deltaSign}${Math.abs(row.value)}%`;
    if (row.baselineValue != null && Number.isFinite(row.baselineValue)) {
      return `${row.baselineValue + (row.direction === 'WORSEN' ? -row.value : row.value)}% (${delta})`;
    }
    return delta;
  }
  if (row.dimension === 'TIME' && row.unit === 'MINUTE' && row.value != null) {
    const hours = Math.floor(row.value / 60);
    const mins = row.value % 60;
    const delta =
      row.direction === 'IMPROVE'
        ? `(-${hours > 0 ? `${hours}h ` : ''}${mins}m)`
        : row.direction === 'WORSEN'
          ? `(+${hours > 0 ? `${hours}h ` : ''}${mins}m)`
          : '';
    const base = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    return delta ? `${base} ${delta}` : base;
  }
  if (row.dimension === 'COST' && row.value != null) {
    const sign = row.direction === 'WORSEN' ? '+' : row.direction === 'IMPROVE' ? '−' : '';
    return `${sign}¥${Math.abs(row.value)}`;
  }
  const explanation = row.explanation?.trim();
  if (explanation) {
    if (row.dimension === 'TIME') {
      const segments = parseTradeoffComparisonSegments(explanation);
      if (segments?.after) return segments.after;
    }
    return truncateExplanation(explanation);
  }
  return formatTradeoffCell(row);
}

function buildMetricsFromTradeoffs(tradeoffs: DecisionTradeoffRow[]): DecisionSpaceOptionMetric[] {
  const metrics: DecisionSpaceOptionMetric[] = [];
  for (const dim of PREFERRED_METRIC_DIMS) {
    const row = findTradeoffForDimension(tradeoffs, dim);
    if (!row) continue;
    metrics.push({
      key: dim,
      label: METRIC_LABEL_OVERRIDE[dim] ?? tradeoffDimensionLabel(dim),
      displayValue: formatMetricDisplay(row),
      tone: tradeoffTone(row),
    });
    if (metrics.length >= 4) break;
  }
  for (const row of tradeoffs) {
    if (metrics.length >= 4) break;
    if (metrics.some((m) => m.key === row.dimension)) continue;
    metrics.push({
      key: row.dimension,
      label: METRIC_LABEL_OVERRIDE[row.dimension] ?? tradeoffDimensionLabel(row.dimension),
      displayValue: formatMetricDisplay(row),
      tone: tradeoffTone(row),
    });
  }
  return metrics;
}

function predictSupportPct(
  tradeoffs: DecisionTradeoffRow[],
  isRecommended: boolean,
  index: number,
): number {
  const improves = tradeoffs.filter((t) => t.direction === 'IMPROVE').length;
  const worsens = tradeoffs.filter((t) => t.direction === 'WORSEN').length;
  const base = isRecommended ? 76 : 58 - index * 6;
  return Math.min(92, Math.max(38, base + improves * 7 - worsens * 5));
}

function buildComparisonFromTradeoffs(
  tradeoffs: DecisionTradeoffRow[],
): { line?: string; segments?: { before: string; after: string } } {
  const time = findTradeoffForDimension(tradeoffs, 'TIME');
  if (time?.explanation?.trim()) {
    const segments = parseTradeoffComparisonSegments(time.explanation);
    if (segments) {
      return { line: time.explanation.trim(), segments };
    }
    return { line: time.explanation.trim() };
  }

  for (const row of tradeoffs) {
    const segments = parseTradeoffComparisonSegments(row.explanation);
    if (segments) {
      return { line: row.explanation?.trim(), segments };
    }
  }
  return {};
}

function routeLabelsFromText(text: string | undefined): string[] | undefined {
  if (!text?.trim()) return undefined;
  const parts = text.split(/→|->|—>|>>>/).map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 ? parts.slice(0, 4) : undefined;
}

function routeLabelsFromOption(
  option: DecisionOption,
  detail?: DecisionProblemDetail | null,
  isRecommended?: boolean,
): string[] | undefined {
  const preview = option.routePreview?.placeNames?.filter(Boolean);
  if (preview && preview.length >= 2) return preview.slice(0, 4);

  const fromDescription = routeLabelsFromText(option.description);
  if (fromDescription) return fromDescription;

  if (isRecommended) {
    return routeLabelsFromScope(detail?.affectedScopeDisplay);
  }
  return undefined;
}

function routeLabelsFromScope(scopes?: AffectedScopeDisplay[]): string[] | undefined {
  if (!scopes?.length) return undefined;
  const places = scopes[0]?.placeNames?.filter(Boolean);
  if (places && places.length >= 2) return places.slice(0, 4);
  const label = scopes[0]?.label;
  if (!label) return undefined;
  const parts = label.split(/→|->|—/).map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 ? parts.slice(0, 4) : undefined;
}

function viewFromOption(
  option: DecisionOption,
  index: number,
  detail?: DecisionProblemDetail | null,
  timezone?: string,
): DecisionSpaceOptionView {
  const tradeoffs = option.tradeoffs ?? [];
  const isRecommended = index === 0;
  const comparison = buildComparisonFromTradeoffs(tradeoffs);
  return polishOptionView(
    {
      id: option.id,
      letter: LETTERS[index] ?? String(index + 1),
      title: decisionOptionLabel(option),
      description: option.description?.trim() || '基于当前约束生成的替代方案。',
      badge: isRecommended ? 'recommended' : 'alternative',
      badgeLabel: isRecommended ? '推荐' : '备选',
      variant: SCENARIO_VARIANTS[index] ?? 'blue',
      metrics: buildMetricsFromTradeoffs(tradeoffs),
      comparisonLine: comparison.line,
      comparison: comparison.segments,
      routeLabels: routeLabelsFromOption(option, detail, isRecommended),
      predictedSupportPct: predictSupportPct(tradeoffs, isRecommended, index),
      resultLayers: buildDecisionSpaceResultLayers({
        tradeoffs,
        description: option.description,
        optionType: option.type,
      }),
    },
    timezone,
  );
}

function viewFromScenario(scenario: DecisionCheckerScenarioDto, index: number): DecisionSpaceOptionView {
  const metrics: DecisionSpaceOptionMetric[] = (scenario.metrics ?? []).map((m) => ({
    key: m.key,
    label: m.label,
    displayValue: m.displayValue,
    tone: m.tone === 'good' ? 'good' : m.tone === 'bad' ? 'bad' : 'neutral',
  }));
  const isRecommended = scenario.badge === 'recommended' || scenario.badge === 'best';
  return {
    id: scenario.id,
    letter: scenario.letter ?? LETTERS[index] ?? String(index + 1),
    title: scenario.title,
    description: scenario.description,
    badge: scenario.badge,
    badgeLabel: scenario.badgeLabel,
    variant: scenario.variant ?? SCENARIO_VARIANTS[index] ?? 'blue',
    metrics,
    predictedSupportPct: predictSupportPct([], isRecommended, index),
  };
}

export function buildDecisionSpaceOptionViews(input: {
  options?: DecisionOption[];
  scenarios?: DecisionCheckerScenarioDto[];
  detail?: DecisionProblemDetail | null;
  /** 目的地 IANA 时区，用于格式化 BFF 文案中的 ISO 时间 */
  displayTimezone?: string;
}): DecisionSpaceOptionView[] {
  const { options, scenarios, detail, displayTimezone } = input;
  if (options?.length) {
    return options
      .slice(0, 3)
      .map((option, index) => viewFromOption(option, index, detail, displayTimezone));
  }
  if (scenarios?.length) {
    return scenarios
      .slice(0, 3)
      .map((scenario, index) =>
        polishOptionView(viewFromScenario(scenario, index), displayTimezone),
      );
  }
  return [];
}

/** 私密顾虑：聚合各方案 WORSEN tradeoffs + 问题上下文 */
export function collectPrivateConcernsFromOptions(
  options: DecisionOption[],
  problemDescription?: string,
  displayTimezone?: string,
): string[] {
  const bullets = new Set<string>();

  const costMins: number[] = [];
  const costMaxs: number[] = [];

  for (const option of options) {
    for (const row of option.tradeoffs ?? []) {
      if (row.direction !== 'WORSEN') continue;
      if (row.dimension === 'COST' && row.value != null) {
        costMins.push(row.value);
        costMaxs.push(row.value);
      }
      const text = row.explanation?.trim();
      if (text) bullets.add(text);
      else if (row.value != null && row.unit) {
        bullets.add(
          `${METRIC_LABEL_OVERRIDE[row.dimension] ?? tradeoffDimensionLabel(row.dimension)}：${formatTradeoffUnitValue(row.value, row.unit)}`,
        );
      }
    }
  }

  if (costMins.length > 0) {
    const min = Math.min(...costMins);
    const max = Math.max(...costMaxs);
    bullets.add(
      min === max
        ? `预算可能超限（约 +¥${min}）`
        : `预算可能超限（约 +¥${min} ~ +¥${max}）`,
    );
  }

  if (problemDescription?.includes('驾驶') || problemDescription?.includes('km')) {
    bullets.add('团队中有成员体力一般，超长距离驾驶易疲劳。');
  }
  if (problemDescription?.includes('天') && problemDescription?.includes('缓冲')) {
    bullets.add('增加一天可能影响后续航班/假期安排。');
  }

  return [...bullets]
    .slice(0, 5)
    .map((text) => formatBffDisplayText(text, displayTimezone) || text);
}
