import type { CoverageGap, CoverageMapPoi, CoverageMapResponse, ScoreFinding, ScoreRisk } from '@/api/readiness';
import type {
  DecisionCheckerEvidenceDto,
  DecisionCheckerEvidenceItemDto,
  DecisionCheckerImpactDto,
  DecisionCheckerReliability,
} from '@/types/decision-checker';
import type { JourneyActivity, JourneyMapModel } from '../types';

const RELIABILITY_FROM_COVERAGE: Record<string, DecisionCheckerReliability> = {
  covered: 'high',
  partial: 'medium',
  uncovered: 'low',
};

const GAP_RELIABILITY: Record<string, DecisionCheckerReliability> = {
  high: 'low',
  medium: 'medium',
  low: 'high',
};

function poiToEvidenceItem(poi: CoverageMapPoi): DecisionCheckerEvidenceItemDto {
  const reliability = RELIABILITY_FROM_COVERAGE[poi.coverageStatus] ?? 'medium';
  const types = poi.evidenceTypes?.join('、') || '行程覆盖';
  return {
    id: `coverage-poi-${poi.id}`,
    kind: 'route_engine',
    title: poi.name,
    subtitle: `覆盖状态：${poi.coverageStatus} · 证据类型：${types}${poi.evidenceCount ? ` · ${poi.evidenceCount} 条` : ''}`,
    reliability,
    publisher: '覆盖地图',
    refs: [{ type: 'poi', id: poi.id }],
  };
}

function gapToEvidenceItem(gap: CoverageGap): DecisionCheckerEvidenceItemDto {
  return {
    id: `coverage-gap-${gap.id}`,
    kind: 'weather_road',
    title: gap.type === 'segment' ? '路段缺口' : 'POI 缺口',
    subtitle: gap.message,
    reliability: GAP_RELIABILITY[gap.severity] ?? 'medium',
    publisher: gap.dataSource ?? '覆盖分析',
    refs: [{ type: gap.type, id: gap.relatedId }],
  };
}

export function buildCoverageEvidenceDto(
  coverage: CoverageMapResponse,
  dayIndex: number,
): DecisionCheckerEvidenceDto {
  const dayNumber = dayIndex + 1;
  const pois = coverage.pois.filter((p) => p.day === dayNumber);
  const gaps = coverage.gaps.filter(
    (g) => g.affectedDays?.includes(dayNumber) || g.type === 'poi',
  );

  const items: DecisionCheckerEvidenceItemDto[] = [
    ...pois.map(poiToEvidenceItem),
    ...gaps.map(gapToEvidenceItem),
  ];

  const summary = { high: 0, medium: 0, low: 0 };
  for (const item of items) {
    summary[item.reliability]++;
  }

  return {
    items,
    summary: {
      ...summary,
      lastUpdatedAt: coverage.calculatedAt,
    },
    judgmentExplanation:
      items.length > 0
        ? `基于覆盖地图快照，汇总第 ${dayNumber} 天 POI 与路段证据覆盖情况。`
        : undefined,
  };
}

export function filterEvidenceForActivity(
  evidence: DecisionCheckerEvidenceDto,
  activity: JourneyActivity | null,
  dayIndex: number,
): DecisionCheckerEvidenceDto {
  if (!activity || !evidence.items.length) return evidence;

  const refIds = new Set<string>([
    activity.id,
    activity.id.replace(/^poi-/, ''),
    activity.id.replace(/^item-/, ''),
  ]);

  const filtered = evidence.items.filter((item) => {
    if (item.refs?.some((r) => refIds.has(r.id) || [...refIds].some((id) => r.id.includes(id)))) {
      return true;
    }
    if (activity.location && item.subtitle.includes(activity.location)) return true;
    if (activity.title && item.title.includes(activity.title)) return true;
    return false;
  });

  if (filtered.length > 0) {
    const summary = { high: 0, medium: 0, low: 0 };
    for (const item of filtered) summary[item.reliability]++;
    return {
      ...evidence,
      items: filtered,
      summary: { ...summary, lastUpdatedAt: evidence.summary.lastUpdatedAt },
    };
  }

  const dayScoped = evidence.items.filter(
    (item) =>
      item.subtitle.includes(`第 ${dayIndex + 1} 天`) ||
      item.subtitle.includes(`Day ${dayIndex + 1}`),
  );

  if (dayScoped.length > 0) {
    const summary = { high: 0, medium: 0, low: 0 };
    for (const item of dayScoped) summary[item.reliability]++;
    return {
      ...evidence,
      items: dayScoped,
      summary: { ...summary, lastUpdatedAt: evidence.summary.lastUpdatedAt },
    };
  }

  return evidence;
}

export function filterScoreRisksForDay(risks: ScoreRisk[], dayIndex: number): ScoreRisk[] {
  return risks.filter((r) => {
    const msg = r.message.toLowerCase();
    return msg.includes(`day ${dayIndex + 1}`) || msg.includes(`第 ${dayIndex + 1} 天`);
  });
}

export function filterFindingsForDay(findings: ScoreFinding[], dayIndex: number): ScoreFinding[] {
  const dayNumber = dayIndex + 1;
  return findings.filter(
    (f) => f.affectedDays?.includes(dayNumber) || f.tripScope?.day === dayNumber,
  );
}

export interface JourneyMapRiskSummary {
  mapRisks: Array<{ id: string; title: string; description: string; severity: string }>;
  impactSummary?: DecisionCheckerImpactDto['summary'];
  cascadeNodes: DecisionCheckerImpactDto['cascade'];
  scoreRisks: ScoreRisk[];
  findings: ScoreFinding[];
  aiInterpretation?: string;
}

export function buildRiskSummary(input: {
  activity: JourneyActivity | null;
  dayIndex: number;
  mapRiskPoints: JourneyMapModel['riskPoints'];
  impact: DecisionCheckerImpactDto | null;
  scoreRisks: ScoreRisk[];
  findings: ScoreFinding[];
}): JourneyMapRiskSummary {
  const dayRisks = input.mapRiskPoints.filter((r) => r.dayIndex === input.dayIndex);

  return {
    mapRisks: dayRisks.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      severity: r.severity,
    })),
    impactSummary: input.impact?.summary,
    cascadeNodes: input.impact?.cascade ?? [],
    scoreRisks: input.activity
      ? input.scoreRisks
      : filterScoreRisksForDay(input.scoreRisks, input.dayIndex),
    findings: filterFindingsForDay(input.findings, input.dayIndex),
    aiInterpretation: input.impact?.aiInterpretation?.text,
  };
}

/** 演示模式 · 冰岛 demo 证据（BFF 不可用时） */
export function buildDemoEvidenceDto(activity: JourneyActivity | null): DecisionCheckerEvidenceDto {
  const items: DecisionCheckerEvidenceItemDto[] = [
    {
      id: 'demo-ev-1',
      kind: 'route_engine',
      title: '安全区域评估',
      subtitle: 'DEM 地形 + 冰川向导备案 · 瓦特纳冰川安全区',
      reliability: 'high',
      publisher: 'Gate · Abu',
    },
    {
      id: 'demo-ev-2',
      kind: 'inventory',
      title: '装备合规',
      subtitle: '冰爪、头盔来自认证供应商，库存快照已确认',
      reliability: 'high',
      publisher: '供应商合同',
    },
    {
      id: 'demo-ev-3',
      kind: 'persona_trace',
      title: '体力匹配',
      subtitle: '8 名参与者体力自评 ≥ 4/5，与活动强度匹配',
      reliability: 'medium',
      publisher: 'Gate 评估',
    },
  ];

  const filtered =
    activity?.title.includes('冰川') || activity?.intensity === 'high'
      ? items
      : items.slice(0, 1);

  return {
    items: filtered,
    summary: { high: 2, medium: 1, low: 0 },
    judgmentExplanation: '演示数据 · 完整证据链将在决策检查器 BFF 就绪后由后端投影。',
  };
}
