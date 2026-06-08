import type { HikePlanRecord, HikePlanStatus } from '@/types/hike-plan';
import type { HikingPhase, HikingSegment } from '@/types/hiking-embedded';

export const HIKING_PHASE_LABELS: Record<HikingPhase, string> = {
  idle: '未配置徒步',
  configure_segments: '待登记片段',
  link_plans: '待关联计划',
  prep: '行前准备中',
  on_trail: '行中',
  wrap_up: '徒步已完成',
};

export function isKnownHikingPhase(value: string): value is HikingPhase {
  return value in HIKING_PHASE_LABELS;
}

export function hikingPhaseSidebarLine(
  phase: HikingPhase,
  segmentCount: number
): string {
  const n = segmentCount > 0 ? `含 ${segmentCount} 天徒步` : '含徒步';
  return `${n} · ${HIKING_PHASE_LABELS[phase]}`;
}

function planMatchesSegment(plan: HikePlanRecord, segment: HikingSegment): boolean {
  if (segment.hikePlanId && plan.id === segment.hikePlanId) return true;
  if (!segment.hikePlanId && segment.routeDirectionId && plan.routeDirectionId === segment.routeDirectionId) {
    const pd = plan.plannedDate?.split('T')[0];
    const sd = segment.startDate.split('T')[0];
    return pd === sd;
  }
  return false;
}

function isPrepComplete(plan: HikePlanRecord): boolean {
  return Boolean(
    plan.checklistComplete ?? plan.checklistCompleted ?? plan.permitsComplete ?? plan.permitsObtained
  );
}

function readinessBlocked(segment: HikingSegment): boolean {
  const level = segment.readinessSnapshot?.level?.toLowerCase() ?? '';
  return level === 'not_ready' || level === 'blocked' || level === 'no-go';
}

/**
 * 无 hiking-summary API 时的客户端回退（与 P1 枚举对齐）
 */
export function computeHikingPhase(
  segments: HikingSegment[],
  plans: HikePlanRecord[] = []
): HikingPhase {
  if (segments.length === 0) return 'configure_segments';

  const linked = segments.map((seg) => ({
    seg,
    plan: plans.find((p) => planMatchesSegment(p, seg)),
  }));

  if (linked.some((x) => !x.seg.hikePlanId && !x.plan)) return 'link_plans';
  if (linked.some((x) => x.plan?.status === 'in_progress')) return 'on_trail';

  const terminal: HikePlanStatus[] = ['completed', 'cancelled'];
  if (linked.every((x) => x.plan && terminal.includes(x.plan.status))) return 'wrap_up';

  if (linked.some((x) => readinessBlocked(x.seg))) return 'prep';

  const active = linked.filter((x) => x.plan && !terminal.includes(x.plan.status));
  if (active.some((x) => x.plan && !isPrepComplete(x.plan))) return 'prep';
  if (active.some((x) => x.plan?.status === 'ready' || x.plan?.status === 'planning')) return 'prep';

  return 'idle';
}
