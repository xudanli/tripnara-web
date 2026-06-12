import type { RouteAndRunResponse } from '@/api/agent';
import type {
  OrganizationalRobustnessPreview,
  PartyNegotiationPayload,
  RobustnessDashboardPayload,
  RobustnessTimelinePoint,
  TripRobustnessDualCurvePoint,
} from '@/types/robustness-dashboard';

export const DISCARD_REASON_LABELS: Record<string, string> = {
  FATIGUE_OVERFLOW: '疲劳溢出',
  SOCIAL_FRICTION: '社交摩擦',
  WEATHER_BLOCK: '天气阻断',
  TIME_CONFLICT: '时间冲突',
  PREFERENCE_SHIFT: '偏好变化',
  UNKNOWN: '未知原因',
};

export function formatRobustnessPercent(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return '—';
  return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`;
}

export function discardReasonLabel(reason: string | undefined | null): string {
  if (!reason) return '—';
  return DISCARD_REASON_LABELS[reason] ?? reason;
}

export function organizationalCurveValue(socialStressIndex: number | undefined | null): number {
  if (socialStressIndex == null || Number.isNaN(socialStressIndex)) return 0;
  return Math.max(0, Math.min(1, 1 - socialStressIndex));
}

export function isOrgScoreLow(score: number | undefined | null, threshold = 0.7): boolean {
  return score != null && score < threshold;
}

function isRobustnessDashboardPayload(v: unknown): v is RobustnessDashboardPayload {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.physical_robustness_score === 'number' &&
    typeof o.organizational_robustness_score === 'number' &&
    Array.isArray(o.timeline)
  );
}

/** 正式 Dashboard：observability 优先，其次 payload 镜像 */
export function pickRobustnessDashboardFromRouteRun(
  response: RouteAndRunResponse
): RobustnessDashboardPayload | null {
  if (response.result?.status !== 'OK') return null;

  const obs = response.observability as Record<string, unknown> | undefined;
  const metaObs = response.meta?.observability as Record<string, unknown> | undefined;
  const fromObs = obs?.robustness_dashboard ?? metaObs?.robustness_dashboard;
  if (isRobustnessDashboardPayload(fromObs)) return fromObs;

  const payload = response.result?.payload as Record<string, unknown> | undefined;
  const fromPayload = payload?.robustness_dashboard;
  if (isRobustnessDashboardPayload(fromPayload)) return fromPayload;

  return null;
}

export function pickPartyNegotiationFromRouteRun(
  response: RouteAndRunResponse
): PartyNegotiationPayload | null {
  const payload = response.result?.payload as Record<string, unknown> | undefined;
  const decisionMetadata = payload?.decision_metadata as Record<string, unknown> | undefined;
  const planningPhaseIntent = decisionMetadata?.planning_phase_intent as Record<string, unknown> | undefined;
  const partyNegotiation = planningPhaseIntent?.party_negotiation;
  if (!partyNegotiation || typeof partyNegotiation !== 'object') return null;
  return partyNegotiation as PartyNegotiationPayload;
}

export function previewToDashboardPayload(
  preview: OrganizationalRobustnessPreview
): RobustnessDashboardPayload {
  return {
    schema: 'tripnara.robustness_dashboard@v1',
    physical_robustness_score: preview.physical_robustness_score,
    organizational_robustness_score: preview.organizational_robustness_score,
    combined_robustness_score: preview.combined_robustness_score,
    sample_count: preview.sample_count,
    bottlenecks: preview.bottlenecks ?? [],
    timeline: (preview.timeline ?? []).map((p) => ({
      timestamp: p.timestamp,
      nodeId: p.nodeId,
      physicsRobustness: p.physicsRobustness,
      socialStressIndex: p.socialStressIndex,
    })),
    computed_at: undefined,
  };
}

export function dualCurvesFromTimeline(
  timeline: RobustnessTimelinePoint[]
): TripRobustnessDualCurvePoint[] {
  return timeline.map((p) => ({
    node_id: p.nodeId,
    timestamp: p.timestamp,
    physical: p.physicsRobustness,
    organizational: organizationalCurveValue(p.socialStressIndex),
    active_perturbations: p.activePerturbations,
  }));
}

export function dualCurvesFromDashboard(
  rollout: RobustnessDashboardPayload | undefined,
  dualCurves?: TripRobustnessDualCurvePoint[]
): TripRobustnessDualCurvePoint[] {
  if (dualCurves?.length) return dualCurves;
  if (!rollout?.timeline?.length) return [];
  return dualCurvesFromTimeline(rollout.timeline);
}
