import { DateTime } from 'luxon';
import type {
  FeasibilityIssueAnchorsDto,
  FeasibilityIssueDto,
  FeasibilityProofAtomDto,
} from '@/types/trip-feasibility-report';
import {
  formatTravelDistanceLabel,
  formatTravelMinutesLabel,
  isInterDayTravelIssue,
  parseTravelRouteFromMessage,
  resolveAnchorsTravelMinutes,
  type FeasibilityTravelTimingViewModel,
} from '@/lib/feasibility-travel-timing';

const TRAVEL_TIMING_RULE_PREFIX = 'schedule.travel_time';

function anchorHm(
  anchors: FeasibilityIssueAnchorsDto | undefined,
  kind: 'depart' | 'arrive' | 'start',
  timezone: string,
): string | undefined {
  if (!anchors) return undefined;
  const iso =
    kind === 'depart'
      ? anchors.departAt ?? anchors.fromTime
      : kind === 'arrive'
        ? anchors.arriveAt
        : anchors.activityStartAt ?? anchors.toTime;
  if (!iso) return undefined;
  const dt = DateTime.fromISO(iso, { zone: 'utc' }).setZone(timezone);
  if (!dt.isValid) return undefined;

  const fromDay = anchors.fromDayNumber;
  const toDay = anchors.toDayNumber;
  if (kind === 'start' && fromDay != null && toDay != null && toDay > fromDay) {
    return toDay === fromDay + 1 ? `次日 ${dt.toFormat('HH:mm')}` : `第 ${toDay} 天 ${dt.toFormat('HH:mm')}`;
  }
  if (kind === 'arrive' && fromDay != null && toDay != null && toDay > fromDay) {
    return toDay === fromDay + 1 ? `次日 ${dt.toFormat('HH:mm')}` : `第 ${toDay} 天 ${dt.toFormat('HH:mm')}`;
  }
  return dt.toFormat('HH:mm');
}

function isFrontendTravelTimingProof(proof: FeasibilityProofAtomDto): boolean {
  return Boolean(proof.ruleId?.startsWith(TRAVEL_TIMING_RULE_PREFIX));
}

function buildTimingConclusion(input: {
  missingTimes: boolean;
  isTooEarly?: boolean;
  shortfallMinutes?: number;
  gapMinutes?: number;
}): string {
  if (input.missingTimes) {
    return '出发、抵达或活动开始时间不完整，无法完成交通衔接验算';
  }
  if (input.isTooEarly) {
    const shortfall = input.shortfallMinutes ?? Math.abs(Math.round(input.gapMinutes ?? 0));
    return shortfall > 0
      ? `按当前时刻表无法按时抵达，时间不足约 ${shortfall} 分钟`
      : '按当前时刻表无法按时抵达下一站';
  }
  if (input.gapMinutes != null && input.gapMinutes <= 30) {
    return `能赶上首项开始，但抵达后缓冲仅约 ${Math.round(input.gapMinutes)} 分钟，建议核对出发时刻`;
  }
  if (input.gapMinutes != null && input.gapMinutes > 30) {
    return `时间衔接可行，抵达后距活动开始约 ${Math.round(input.gapMinutes)} 分钟`;
  }
  return '请核对出发、路上耗时与下一站开始时间是否衔接合理';
}

/** 合并后端可能仍返回的 route + timing 双证明 */
export function collapseTravelTimingProofDuplicates(
  proofs: FeasibilityProofAtomDto[],
): FeasibilityProofAtomDto[] {
  const travel = proofs.filter((proof) => proof.ruleId?.startsWith(TRAVEL_TIMING_RULE_PREFIX));
  if (travel.length <= 1) return proofs;

  const other = proofs.filter((proof) => !proof.ruleId?.startsWith(TRAVEL_TIMING_RULE_PREFIX));
  const groups = new Map<string, FeasibilityProofAtomDto[]>();
  for (const proof of travel) {
    const key = proof.entity ?? proof.ruleId ?? 'travel';
    const list = groups.get(key) ?? [];
    list.push(proof);
    groups.set(key, list);
  }

  const mergedTravel = Array.from(groups.values()).map((group) => {
    if (group.length === 1) return group[0];
    const timing =
      group.find((p) => p.ruleId?.endsWith('.timing') || p.ruleId?.endsWith('.segment')) ??
      group[0];
    const route = group.find((p) => p.ruleId?.endsWith('.route'));
    if (!route || route === timing) return timing;

    const facts = new Set<string>();
    for (const part of [route.currentFact, timing.currentFact].filter(Boolean)) {
      part!.split('；').forEach((segment) => {
        const trimmed = segment.trim();
        if (trimmed) facts.add(trimmed);
      });
    }

    return {
      ...timing,
      currentFact: Array.from(facts).join('；'),
      evidenceSource: [route.evidenceSource, timing.evidenceSource]
        .filter(Boolean)
        .join(' · '),
      ruleId: `${TRAVEL_TIMING_RULE_PREFIX}.segment`,
    };
  });

  return [...other, ...mergedTravel];
}

/** 将交通衔接 issue 转为 L3 可执行证明原子（后端未带 proofs 时前端合成） */
export function buildTravelTimingProofAtoms(
  issue: FeasibilityIssueDto,
  view?: FeasibilityTravelTimingViewModel | null,
): FeasibilityProofAtomDto[] {
  const anchors = issue.anchors;
  const parsed = parseTravelRouteFromMessage(issue.message);
  const timezone = view?.timezone ?? 'UTC';

  const fromPlace =
    view?.fromPlaceLabel ?? anchors?.fromPlaceLabel ?? parsed?.fromPlaceLabel ?? '起点';
  const toPlace =
    view?.toPlaceLabel ?? anchors?.toPlaceLabel ?? parsed?.toPlaceLabel ?? '终点';
  const dayNumber =
    view?.fromDayNumber ??
    anchors?.fromDayNumber ??
    parsed?.dayNumber ??
    issue.affectedDays?.[0];

  const distanceMeters =
    view?.travelDistanceMeters ??
    anchors?.travelDistanceMeters ??
    parsed?.distanceMeters;
  const distanceLabel = view?.travelDistanceLabel ?? formatTravelDistanceLabel(distanceMeters);
  const travelMinutes =
    view?.travelMinutes ??
    (anchors
      ? resolveAnchorsTravelMinutes(anchors)
      : parsed?.distanceMeters
        ? Math.max(1, Math.round((parsed.distanceMeters / 1000) * 1.2))
        : 0);

  const entity = dayNumber
    ? `第 ${dayNumber} 天 · ${fromPlace} → ${toPlace}`
    : `${fromPlace} → ${toPlace}`;

  const fromItemId = view?.fromItemId ?? issue.anchors?.fromItemId;
  const toItemId = view?.toItemId ?? issue.anchors?.toItemId;

  const departLabel = view?.departAtLabel ?? anchorHm(anchors, 'depart', timezone);
  const arriveLabel = view?.arriveAtLabel ?? anchorHm(anchors, 'arrive', timezone);
  const startLabel = view?.activityStartLabel ?? anchorHm(anchors, 'start', timezone);
  const gapMinutes = view?.gapMinutes ?? anchors?.gapMinutes;
  const shortfallMinutes = view?.shortfallMinutes ?? anchors?.shortfallMinutes;
  const isTooEarly = view?.isStartTooEarly ?? anchors?.isStartTooEarly;

  const missingTimes =
    view?.statusTone === 'missing_times' ||
    anchors?.timingSource === 'missing_times' ||
    (!departLabel && !startLabel && !arriveLabel);

  const factParts = [
    distanceLabel ? `路程约 ${distanceLabel}` : null,
    anchors?.travelMode ? `方式 ${anchors.travelMode}` : null,
    departLabel ? `出发 ${departLabel}` : null,
    travelMinutes > 0 ? `路上约 ${formatTravelMinutesLabel(travelMinutes)}` : null,
    arriveLabel ? `约 ${arriveLabel} 抵达` : null,
    startLabel ? `下一站开始 ${startLabel}` : null,
  ].filter(Boolean) as string[];

  const segmentProof: FeasibilityProofAtomDto = {
    entity,
    constraint:
      '本段路程与行驶耗时应纳入日程，且抵达时刻须与下一站开始时间衔接（含合理缓冲）',
    currentFact:
      factParts.length > 0
        ? factParts.join('；')
        : issue.message.trim() || '路程与时刻待路线服务或行程项确认',
    evidenceSource: 'route-engine / travel-info · 行程时间轴',
    evidenceType: 'L3-PROOF',
    ruleId: `${TRAVEL_TIMING_RULE_PREFIX}.segment`,
    conclusion: buildTimingConclusion({
      missingTimes,
      isTooEarly,
      shortfallMinutes,
      gapMinutes,
    }),
    itemId: toItemId,
    fromItemId,
    toItemId,
  };

  return [segmentProof];
}

/** 为交通衔接类 issue 补齐 proofs；有 view 时会用更准确的数据覆盖前端合成证明 */
export function enrichTravelTimingIssueProofs(
  issue: FeasibilityIssueDto,
  view?: FeasibilityTravelTimingViewModel | null,
): FeasibilityIssueDto {
  if (!isInterDayTravelIssue(issue)) return issue;

  const existing = issue.proofs ?? [];
  const keptProofs = existing.filter((proof) => !isFrontendTravelTimingProof(proof));

  if (!view && existing.some((proof) => isFrontendTravelTimingProof(proof))) {
    return issue;
  }

  const travelProofs = buildTravelTimingProofAtoms(issue, view);
  if (travelProofs.length === 0) return issue;

  return {
    ...issue,
    proofs: collapseTravelTimingProofDuplicates([...travelProofs, ...keptProofs]),
  };
}
