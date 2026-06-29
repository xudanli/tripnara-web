import type { JourneyActivity, JourneyMember } from '../types';
import type {
  JourneyInspectorEvidenceCategory,
  JourneyInspectorEvidenceSourceRow,
  JourneyInspectorMemberRow,
  JourneyInspectorRiskView,
  JourneyMapInspectorActivityContext,
} from '../types-inspector-view';
import type {
  JourneyMapInspectorActivityContextDto,
  JourneyMapInspectorEvidenceSourceWireDto,
} from '@/api/journey-map';

/** 地图 activity id ↔ BFF activityId / itinerary item id */
export function activityIdCandidates(activity: JourneyActivity): string[] {
  const ids = new Set<string>();
  ids.add(activity.id);

  if (activity.id.startsWith('poi-')) {
    ids.add(activity.id.slice(4));
  }
  if (activity.id.startsWith('item-')) {
    ids.add(activity.id.slice(5));
  }

  return [...ids];
}

/** 懒加载 / 写接口使用的 BFF activityId（优先地图 id） */
export function resolveInspectorActivityApiId(activity: JourneyActivity): string {
  return activity.id;
}

const EVIDENCE_ID_CATEGORY: Record<string, JourneyInspectorEvidenceCategory> = {
  weather: 'weather',
  road: 'road',
  hours: 'activity',
  inventory: 'other',
  activity: 'activity',
  transport: 'transport',
};

function statusToUpdatedAtLabel(status?: 'fresh' | 'stale'): string | undefined {
  if (status === 'fresh') return '最新';
  if (status === 'stale') return '可能过期';
  return undefined;
}

export function normalizeEvidenceSourceRow(
  wire: JourneyMapInspectorEvidenceSourceWireDto,
): JourneyInspectorEvidenceSourceRow {
  return {
    id: wire.id,
    name: wire.name ?? wire.label ?? wire.id,
    category: wire.category ?? EVIDENCE_ID_CATEGORY[wire.id] ?? 'other',
    updatedAtLabel:
      wire.updatedAtLabel ??
      wire.updatedAt ??
      statusToUpdatedAtLabel(wire.status) ??
      '—',
    confidencePercent: wire.confidencePercent,
    status: wire.status,
  };
}

export function normalizeInspectorRiskView(
  partial: Partial<JourneyInspectorRiskView> &
    Pick<JourneyInspectorRiskView, 'level' | 'levelLabel' | 'keyRisks'>,
  fallback: { affectedCount: number; totalCount: number },
): JourneyInspectorRiskView {
  return {
    level: partial.level,
    levelLabel: partial.levelLabel,
    score: partial.score,
    updatedAtLabel: partial.updatedAtLabel,
    keyRisks: partial.keyRisks,
    affectedCount: partial.affectedCount ?? fallback.affectedCount,
    totalCount: partial.totalCount ?? fallback.totalCount,
    majorRisks: partial.majorRisks ?? [],
    impactScope: partial.impactScope ?? {},
    mitigations: partial.mitigations ?? [],
  };
}

function hydrateMemberRows(
  rows: JourneyMapInspectorActivityContextDto['memberRows'],
  members: JourneyMember[],
): JourneyInspectorMemberRow[] | undefined {
  if (!rows?.length) return undefined;

  const hydrated: JourneyInspectorMemberRow[] = [];
  for (const row of rows) {
    const member =
      row.member ??
      (row.memberId ? members.find((m) => m.id === row.memberId) : undefined);
    if (!member) continue;
    hydrated.push({
      member,
      participating: row.participating,
      roleLabel: row.roleLabel,
      tags: row.tags,
      alternativePlan: row.alternativePlan,
    });
  }

  return hydrated.length > 0 ? hydrated : undefined;
}

export function normalizeInspectorActivityContext(
  dto: JourneyMapInspectorActivityContextDto,
  members: JourneyMember[],
  fallback?: { affectedCount: number; totalCount: number },
): JourneyMapInspectorActivityContext {
  const riskFallback = fallback ?? {
    affectedCount: 0,
    totalCount: members.length,
  };

  return {
    activityId: dto.activityId,
    activityDetail: dto.activityDetail,
    memberRows: hydrateMemberRows(dto.memberRows, members),
    fitAssessment: dto.fitAssessment,
    diversionDetail: dto.diversionDetail,
    evidenceSources: dto.evidenceSources?.map(normalizeEvidenceSourceRow),
    weatherSnapshot: dto.weatherSnapshot,
    routeEvidence: dto.routeEvidence,
    activitySource: dto.activitySource,
    evidenceConclusion: dto.evidenceConclusion,
    riskView: dto.riskView
      ? normalizeInspectorRiskView(dto.riskView, riskFallback)
      : undefined,
  };
}

/** 按选中活动解析 BFF activityContext（五 Tab 优先数据源） */
export function resolveInspectorActivityContext(
  activity: JourneyActivity | null,
  contexts: JourneyMapInspectorActivityContextDto[] | undefined,
  members: JourneyMember[],
): JourneyMapInspectorActivityContext | undefined {
  if (!activity || !contexts?.length) return undefined;

  const candidates = new Set(activityIdCandidates(activity));
  const dto = contexts.find((c) => candidates.has(c.activityId));
  if (!dto) return undefined;

  return normalizeInspectorActivityContext(dto, members, {
    affectedCount: activity.participantIds.length,
    totalCount: members.length,
  });
}

export function mergeActivityWithInspectorDetail(
  activity: JourneyActivity,
  context?: JourneyMapInspectorActivityContext,
): JourneyActivity {
  const detail = context?.activityDetail;
  if (!detail) return activity;

  return {
    ...activity,
    startTime: detail.startTime ?? activity.startTime,
    endTime: detail.endTime ?? activity.endTime,
    location: detail.location ?? activity.location,
    durationHours: detail.durationHours ?? activity.durationHours,
    transportMinutes: detail.transportMinutes ?? activity.transportMinutes,
    equipment: detail.equipment ?? activity.equipment,
    weatherWindow: detail.weatherWindow ?? activity.weatherWindow,
    guideInfo: detail.guideInfo ?? activity.guideInfo,
    intensityScore: detail.intensityScore ?? activity.intensityScore,
    summary: detail.summary ?? activity.summary,
    intensity: detail.intensity ?? activity.intensity,
  };
}

export function resolveActivityTypeLabel(
  activity: JourneyActivity,
  context?: JourneyMapInspectorActivityContext,
): string {
  if (context?.activityDetail?.activityTypeLabel) {
    return context.activityDetail.activityTypeLabel;
  }
  if (activity.intensity === 'high') return '冰川徒步 / 高强度 / 户外';
  if (activity.kind === 'accommodation') return '住宿';
  if (activity.kind === 'transport') return '交通';
  return '观光活动';
}
