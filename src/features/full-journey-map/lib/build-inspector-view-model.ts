import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type {
  JourneyActivity,
  JourneyDiversion,
  JourneyMapModel,
  JourneyMember,
} from '../types';
import type { JourneyMapInspectorBundle } from '../types-inspector';
import type {
  JourneyInspectorActivityHeader,
  JourneyInspectorDiversionDetail,
  JourneyInspectorDiversionGroupDetail,
  JourneyInspectorEvidenceConclusion,
  JourneyInspectorEvidenceSourceRow,
  JourneyInspectorFitAssessment,
  JourneyInspectorMemberRow,
  JourneyInspectorRiskView,
  JourneyInspectorRouteEvidenceRow,
  JourneyInspectorWeatherSnapshot,
  JourneyInspectorActivitySourceRow,
  JourneyMapInspectorActivityContext,
} from '../types-inspector-view';
import { buildRiskSummary } from './journey-map-inspector.util';
import { normalizeInspectorRiskView } from './resolve-inspector-activity-context';

const MEMBER_ROLE: Record<string, string> = {
  m1: '发起人',
  m2: '摄影爱好者',
  m9: '体力需关注',
  m10: '体力需关注',
};

const MEMBER_TAGS: Record<string, string[]> = {
  m1: ['发起人', '强体力'],
  m2: ['摄影爱好者'],
  m9: ['长者组', '体力需关注'],
  m10: ['长者组', '体力需关注'],
};

const ALT_PLAN: Record<string, string> = {
  m9: '观景咖啡馆',
  m10: '蓝冰洞展览',
};

function formatTs(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  try {
    return formatDistanceToNow(new Date(iso), { locale: zhCN, addSuffix: true });
  } catch {
    return undefined;
  }
}

function intensityLabel(level?: JourneyActivity['intensity']): string | undefined {
  if (level === 'high') return '高强度';
  if (level === 'medium') return '中等强度';
  if (level === 'low') return '低强度';
  return undefined;
}

export function buildInspectorActivityHeader(
  activity: JourneyActivity,
  dayLabel: string,
): JourneyInspectorActivityHeader {
  return {
    title: activity.title,
    titleEn: activity.titleEn,
    dayLabel,
    intensityLabel: intensityLabel(activity.intensity),
    intensityLevel: activity.intensity,
  };
}

export function buildInspectorMemberRows(
  activity: JourneyActivity,
  members: JourneyMember[],
  bff?: JourneyMapInspectorActivityContext,
  options?: { skipDemoEnrichment?: boolean },
): JourneyInspectorMemberRow[] {
  if (bff?.memberRows?.length) return bff.memberRows;

  const participating = new Set(activity.participantIds);
  const nonParticipating = new Set(activity.nonParticipantIds ?? []);
  const useDemo = !options?.skipDemoEnrichment;

  return members
    .filter((m) => participating.has(m.id) || nonParticipating.has(m.id))
    .map((m) => ({
      member: m,
      participating: participating.has(m.id),
      roleLabel: useDemo ? MEMBER_ROLE[m.id] : undefined,
      tags: useDemo ? MEMBER_TAGS[m.id] : undefined,
      alternativePlan: nonParticipating.has(m.id) && useDemo ? ALT_PLAN[m.id] : undefined,
    }));
}

export function buildInspectorFitAssessment(
  activity: JourneyActivity,
  memberRows: JourneyInspectorMemberRow[],
  bff?: JourneyMapInspectorActivityContext,
  options?: { skipDemoEnrichment?: boolean },
): JourneyInspectorFitAssessment | null {
  if (bff?.fitAssessment) return bff.fitAssessment;
  if (memberRows.length === 0) return null;
  if (options?.skipDemoEnrichment && !bff?.fitAssessment) {
    const participating = memberRows.filter((r) => r.participating);
    if (participating.length === 0) return null;
    return {
      suitabilityPercent: Math.round((participating.length / memberRows.length) * 100),
      physicalRequirement:
        activity.intensity === 'high' ? '高' : activity.intensity === 'medium' ? '中' : '低',
      physicalLevel: activity.intensity ?? 'medium',
    };
  }

  const participating = memberRows.filter((r) => r.participating);
  const ratio = participating.length / Math.max(1, memberRows.length);

  return {
    suitabilityPercent: activity.intensity === 'high' ? 92 : Math.round(ratio * 100),
    suitabilityLabel: activity.intensity === 'high' ? '非常适配' : '基本适配',
    physicalRequirement: activity.intensity === 'high' ? '高' : activity.intensity === 'medium' ? '中' : '低',
    physicalLevel: activity.intensity ?? 'medium',
    riskLevel: activity.intensity === 'high' ? '中' : '低',
    weatherImpact: activity.intensity === 'high' ? '中' : '低',
    suggestion:
      activity.intensity === 'high'
        ? '多数成员体力与经验匹配当前活动；注意冰面防滑与保暖准备。'
        : '当前活动强度与参与者整体匹配。',
  };
}

function buildGroupDetail(
  diversion: JourneyDiversion,
  side: 'A' | 'B',
  model: JourneyMapModel,
): JourneyInspectorDiversionGroupDetail {
  const group = side === 'A' ? diversion.groupA : diversion.groupB;
  const act = model.activities.find((a) => a.id === group.activityId);
  const count = act?.participantIds.length ?? group.participantIds?.length ?? 0;

  if (side === 'A') {
    return {
      label: group.label,
      badge: '主活动组',
      activityType: act?.intensity === 'high' ? '高强度 · 户外' : '活动',
      timeRange: act?.startTime && act?.endTime ? `${act.startTime} – ${act.endTime}` : undefined,
      transport: act?.kind === 'transport' ? act.title : undefined,
      route: act?.location,
      participantCount: count,
    };
  }

  return {
    label: group.label,
    activityType: act?.kind === 'diversion' ? '分流活动' : '活动',
    timeRange: act?.startTime && act?.endTime ? `${act.startTime} – ${act.endTime}` : undefined,
    route: act?.location,
    participantCount: count,
  };
}

export function buildInspectorDiversionDetail(
  diversion: JourneyDiversion,
  model: JourneyMapModel,
  bff?: JourneyMapInspectorActivityContext,
  options?: { skipDemoEnrichment?: boolean },
): JourneyInspectorDiversionDetail {
  const bffDetail = bff?.diversionDetail;
  const useDemo = !options?.skipDemoEnrichment;

  return {
    diversion,
    overview:
      bffDetail?.overview ??
      (useDemo
        ? `${model.days[diversion.dayIndex]?.label ?? `Day ${diversion.dayIndex + 1}`} 上午在瓦特纳区域分流，兼顾徒步体验与轻松观光。`
        : diversion.title),
    splitTime: bffDetail?.splitTime ?? (useDemo ? '10:00 – 13:30' : undefined),
    meetingPoint: bffDetail?.meetingPoint ?? (useDemo ? '瓦特纳冰川停车场' : undefined),
    meetingTime: bffDetail?.meetingTime ?? diversion.merge?.time,
    emergencyContact: bffDetail?.emergencyContact,
    emergencyNote: bffDetail?.emergencyNote,
    groupA: bffDetail?.groupA ?? buildGroupDetail(diversion, 'A', model),
    groupB: bffDetail?.groupB ?? buildGroupDetail(diversion, 'B', model),
  };
}

export function buildInspectorEvidenceSources(
  inspector: JourneyMapInspectorBundle,
  bff?: JourneyMapInspectorActivityContext,
  options?: { skipDemoEnrichment?: boolean },
): JourneyInspectorEvidenceSourceRow[] {
  if (bff?.evidenceSources?.length) return bff.evidenceSources;

  const freshness = inspector.coverage?.dataFreshness;
  const fmt = (iso?: string) => formatTs(iso) ?? '—';

  const fromCoverage: JourneyInspectorEvidenceSourceRow[] = [];
  if (freshness?.weather) {
    fromCoverage.push({
      id: 'weather',
      name: '天气数据',
      category: 'weather',
      updatedAtLabel: fmt(freshness.weather),
    });
  }
  if (freshness?.roadClosure) {
    fromCoverage.push({
      id: 'road',
      name: '道路状况',
      category: 'road',
      updatedAtLabel: fmt(freshness.roadClosure),
    });
  }
  if (fromCoverage.length > 0) return fromCoverage;

  if (options?.skipDemoEnrichment) return [];

  return [
    {
      id: 'weather',
      name: 'Vedur.is',
      category: 'weather',
      updatedAtLabel: fmt(freshness?.weather),
      confidencePercent: 92,
    },
    {
      id: 'road',
      name: 'Road.is',
      category: 'road',
      updatedAtLabel: fmt(freshness?.roadClosure),
      confidencePercent: 88,
    },
    {
      id: 'maps',
      name: 'Google Maps',
      category: 'transport',
      updatedAtLabel: '10 分钟前',
      confidencePercent: 95,
    },
    {
      id: 'operator',
      name: 'Arnar Adventures',
      category: 'activity',
      updatedAtLabel: '1 小时前',
      confidencePercent: 90,
    },
  ];
}

export function buildInspectorWeatherSnapshot(
  activity: JourneyActivity,
  bff?: JourneyMapInspectorActivityContext,
  options?: { skipDemoEnrichment?: boolean },
): JourneyInspectorWeatherSnapshot | null {
  if (bff?.weatherSnapshot) return bff.weatherSnapshot;
  if (options?.skipDemoEnrichment) return null;
  if (!activity.weatherWindow && activity.intensity !== 'high') return null;

  return {
    location: activity.location ?? '瓦特纳冰川集合点',
    temperature: '6°C',
    condition: '多云',
    wind: '8 km/h',
    precipitation: '10%',
    visibility: '20 km',
    hourly: [
      { time: '10:00', temp: '5°', detail: '8km/h · 5%' },
      { time: '11:00', temp: '6°', detail: '10km/h · 8%' },
      { time: '12:00', temp: '6°', detail: '12km/h · 10%' },
      { time: '13:00', temp: '7°', detail: '9km/h · 5%' },
      { time: '13:30', temp: '7°', detail: '8km/h · 5%' },
    ],
  };
}

export function buildInspectorRouteEvidence(
  activity: JourneyActivity,
  model: JourneyMapModel,
  bff?: JourneyMapInspectorActivityContext,
  options?: { skipDemoEnrichment?: boolean },
): JourneyInspectorRouteEvidenceRow | null {
  if (bff?.routeEvidence) return bff.routeEvidence;

  const day = model.days[activity.dayIndex];
  if (!day?.routeLabel) return null;

  if (options?.skipDemoEnrichment) {
    return {
      label: day.routeLabel,
      provider: '覆盖地图',
      distance: day.distanceKm ? `${day.distanceKm} km` : undefined,
    };
  }

  return {
    label: `雷克雅未克 → ${activity.location ?? day.routeLabel.split('→').pop()?.trim() ?? '目的地'}`,
    provider: 'Google Maps 估算 · Route 1',
    duration: activity.transportMinutes ? `${Math.floor(activity.transportMinutes / 60)} 小时 ${activity.transportMinutes % 60} 分` : '4 小时 20 分',
    distance: day.distanceKm ? `${day.distanceKm} km` : undefined,
    statusLabel: '通行正常',
  };
}

export function buildInspectorActivitySource(
  activity: JourneyActivity,
  bff?: JourneyMapInspectorActivityContext,
  options?: { skipDemoEnrichment?: boolean },
): JourneyInspectorActivitySourceRow | null {
  if (bff?.activitySource) return bff.activitySource;
  if (activity.guideInfo) {
    return {
      provider: activity.guideInfo.split('·')[0]?.trim() ?? activity.guideInfo,
      activityName: activity.title,
      statusLabel: '—',
    };
  }
  if (options?.skipDemoEnrichment) return null;
  if (activity.intensity !== 'high') return null;

  return {
    provider: activity.guideInfo?.split('·')[0]?.trim() ?? 'Arnar Adventures',
    activityName: activity.title,
    statusLabel: '正常营业',
    hours: activity.startTime && activity.endTime ? `${activity.startTime} – 15:00` : undefined,
    updatedAtLabel: '1 小时前',
  };
}

export function buildInspectorEvidenceConclusion(
  inspector: JourneyMapInspectorBundle,
  activity: JourneyActivity,
  bff?: JourneyMapInspectorActivityContext,
  options?: { skipDemoEnrichment?: boolean },
): JourneyInspectorEvidenceConclusion | null {
  if (bff?.evidenceConclusion) return bff.evidenceConclusion;

  if (inspector.evidence?.judgmentExplanation) {
    return {
      verdict: activity.intensity === 'high' ? 'caution' : 'executable',
      text: inspector.evidence.judgmentExplanation,
    };
  }

  if (options?.skipDemoEnrichment) return null;

  return {
    verdict: 'executable',
    text: '基于当前证据，满足执行条件。天气窗口良好，路况正常，运营商在营。',
  };
}

function severityTone(s: string): 'high' | 'medium' | 'low' {
  if (s.includes('高')) return 'high';
  if (s.includes('中')) return 'medium';
  return 'low';
}

export function buildInspectorRiskView(input: {
  activity: JourneyActivity;
  model: JourneyMapModel;
  inspector: JourneyMapInspectorBundle;
  dayIndex: number;
  bff?: JourneyMapInspectorActivityContext;
  skipDemoEnrichment?: boolean;
}): JourneyInspectorRiskView {
  if (input.bff?.riskView) {
    return normalizeInspectorRiskView(input.bff.riskView, {
      affectedCount: input.activity.participantIds.length,
      totalCount: input.model.members.length,
    })!;
  }

  const summary = buildRiskSummary({
    activity: input.activity,
    dayIndex: input.dayIndex,
    mapRiskPoints: input.model.riskPoints,
    impact: input.inspector.impact,
    scoreRisks: input.inspector.scoreRisks,
    findings: input.inspector.scoreFindings,
  });

  const affected = input.activity.participantIds.length;
  const total = input.model.members.length;
  const highIntensity = input.activity.intensity === 'high';
  const useDemo = !input.skipDemoEnrichment;

  const majorFromFindings = summary.findings.slice(0, 4).map((f) => ({
    description: f.message,
    severity: f.severity === 'high' ? '高' : f.severity === 'medium' ? '中' : '低',
    severityTone: (f.severity ?? 'medium') as 'high' | 'medium' | 'low',
  }));

  const majorFromRisks =
    majorFromFindings.length > 0
      ? majorFromFindings
      : useDemo && highIntensity
        ? [
            { description: '天气快速变化（降雪 / 强风）', severity: '高', severityTone: 'high' as const },
            { description: '冰川表面湿滑导致跌倒或扭伤', severity: '中高', severityTone: 'medium' as const },
            { description: '长时间徒步导致体力透支', severity: '中', severityTone: 'medium' as const },
            { description: '团队队形分散，沟通不畅', severity: '中', severityTone: 'medium' as const },
          ]
        : summary.mapRisks.map((r) => ({
            description: r.description,
            severity: r.severity === 'high' ? '高' : '中',
            severityTone: severityTone(r.severity),
          }));

  const mitigations =
    summary.scoreRisks.flatMap((r) => r.mitigation ?? []).slice(0, 4);

  const defaultMitigations =
    mitigations.length > 0
      ? mitigations
      : useDemo && highIntensity
        ? [
            '装备检查：冰爪、头盔、防水外套、手套等',
            '出发前 3 小时再次查看天气预报',
            '根据体力与天气可缩短路线',
            '天气恶化时切换室内或低风险替代活动',
          ]
        : ['关注当日天气与路况更新'];

  return {
    level: highIntensity ? 'high' : summary.mapRisks.some((r) => r.severity === 'high') ? 'medium' : 'low',
    levelLabel: highIntensity ? '高风险' : summary.mapRisks.length ? '中风险' : '低风险',
    score: useDemo && highIntensity ? 72 : summary.mapRisks.length ? 45 : undefined,
    updatedAtLabel: format(new Date(), 'HH:mm'),
    affectedCount: affected,
    totalCount: total,
    keyRisks: useDemo && highIntensity
      ? ['天气变化', '冰面湿滑', '体力消耗', '协调问题']
      : summary.mapRisks.map((r) => r.title).slice(0, 4),
    majorRisks: majorFromRisks,
    impactScope: {
      hubs: summary.impactSummary?.affectedDays?.value ?? (useDemo && highIntensity ? '2 项' : undefined),
      members: summary.impactSummary?.affectedMembers?.value ?? `${affected} / ${total} 人`,
      time: summary.impactSummary?.experienceCompletion?.value ?? (useDemo && highIntensity ? '+1~2 小时' : undefined),
      budget: summary.impactSummary?.budgetImpact?.value ?? (useDemo && highIntensity ? '$80~$160' : undefined),
    },
    mitigations: defaultMitigations,
  };
}
