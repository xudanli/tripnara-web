import type { TripDetail } from '@/types/trip';
import type {
  FeasibilityIssueDto,
  FeasibilityProofAtomDto,
  FeasibilityRepairOptionDto,
} from '@/types/trip-feasibility-report';
import { filterFeasibilityRepairOptionsForTrip } from '@/lib/feasibility-repair-apply';
import type { FeasibilityTravelTimingViewModel } from '@/lib/feasibility-travel-timing';
import type { PoiBookingProofContext } from '@/lib/feasibility-booking-proofs';
import { analyzePoiBookingRequirement } from '@/lib/feasibility-booking-proofs';
import { buildAccommodationProofAtom } from '@/lib/feasibility-day-accommodation';
import { buildDayBookingProofAtoms } from '@/lib/feasibility-booking-proofs';
import { collapseTravelTimingProofDuplicates } from '@/lib/feasibility-travel-timing-proofs';
import type {
  FeasibilityDayAccommodationDto,
  FeasibilityProofAtomDto,
} from '@/types/trip-feasibility-report';

export interface FeasibilityProofWithPlanB {
  proof: FeasibilityProofAtomDto;
  planBOptions: FeasibilityRepairOptionDto[];
}

function placeLabelFromProofEntity(entity?: string): string | undefined {
  if (!entity) return undefined;
  const parts = entity.split('·');
  const tail = parts[parts.length - 1]?.trim();
  if (!tail) return undefined;
  if (tail.includes('→')) return tail.split('→').pop()?.trim();
  return tail;
}

function dedupeRepairOptions(options: FeasibilityRepairOptionDto[]): FeasibilityRepairOptionDto[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.id)) return false;
    seen.add(option.id);
    return true;
  });
}

export function matchRepairOptionsToProof(
  proof: FeasibilityProofAtomDto,
  options: FeasibilityRepairOptionDto[],
  issue?: FeasibilityIssueDto,
): FeasibilityRepairOptionDto[] {
  const matched: FeasibilityRepairOptionDto[] = [];
  const entityPlace = placeLabelFromProofEntity(proof.entity);

  for (const option of options) {
    const payloadItemId = option.payload?.itemId;
    if (payloadItemId && proof.itemId && payloadItemId === proof.itemId) {
      matched.push(option);
      continue;
    }
    if (payloadItemId && proof.toItemId && payloadItemId === proof.toItemId) {
      matched.push(option);
      continue;
    }
    if (payloadItemId && proof.fromItemId && payloadItemId === proof.fromItemId) {
      matched.push(option);
      continue;
    }
    if (entityPlace && option.label.includes(entityPlace)) {
      matched.push(option);
      continue;
    }
    if (entityPlace && option.description?.includes(entityPlace)) {
      matched.push(option);
    }
  }

  if (issue?.anchors && proof.ruleId?.startsWith('schedule.travel_time')) {
    for (const option of options) {
      const id = option.payload?.itemId;
      if (
        id &&
        (id === issue.anchors.fromItemId ||
          id === issue.anchors.toItemId ||
          matched.some((m) => m.id === option.id))
      ) {
        if (!matched.some((m) => m.id === option.id)) matched.push(option);
      }
    }
  }

  return matched;
}

function synthesizeBookingPlanB(
  proof: FeasibilityProofAtomDto,
  trip?: TripDetail | null,
): FeasibilityRepairOptionDto[] {
  if (!proof.ruleId?.startsWith('booking.advance_reservation') || !proof.itemId || !trip) {
    return [];
  }

  let item: PoiBookingProofContext['item'] | undefined;
  for (const day of trip.TripDay ?? []) {
    const found = day.ItineraryItem?.find((i) => i.id === proof.itemId);
    if (found) {
      item = found as PoiBookingProofContext['item'];
      break;
    }
  }
  if (!item) return [];

  const analysis = analyzePoiBookingRequirement(item);
  if (!analysis.needsAttention || analysis.status === 'booked') return [];

  const options: FeasibilityRepairOptionDto[] = [
    {
      id: `planb-booking-edit-${item.id}`,
      label: '在时间轴编辑预订信息',
      description: '更新预订状态、确认号，或调整计划到访时刻',
      actionType: 'adjust_time',
      payload: { itemId: item.id, field: 'startTime' },
    },
  ];

  if (item.bookingUrl) {
    options.push({
      id: `planb-booking-url-${item.id}`,
      label: '前往预订页面',
      description: '使用行程项中保存的预订链接完成预约',
    });
  } else {
    options.push({
      id: `planb-booking-mark-${item.id}`,
      label: '完成预约后标记为已预订',
      description: '避免可执行性报告持续提示待预订',
    });
  }

  return options;
}

function synthesizeTravelTimingPlanB(
  proof: FeasibilityProofAtomDto,
  view?: FeasibilityTravelTimingViewModel | null,
  issue?: FeasibilityIssueDto,
): FeasibilityRepairOptionDto[] {
  if (!proof.ruleId?.startsWith('schedule.travel_time')) return [];

  const toItemId = proof.toItemId ?? view?.toItemId ?? issue?.anchors?.toItemId;
  const toLabel = view?.toPlaceLabel ?? issue?.anchors?.toPlaceLabel ?? '下一站';
  const gapMinutes = view?.gapMinutes ?? issue?.anchors?.gapMinutes;
  const isStartTooEarly = view?.isStartTooEarly ?? issue?.anchors?.isStartTooEarly;
  const isTight = gapMinutes != null && gapMinutes <= 30;
  if (!isStartTooEarly && !isTight) return [];

  const options: FeasibilityRepairOptionDto[] = [];

  if (isStartTooEarly && toItemId) {
    options.push({
      id: `planb-travel-delay-${toItemId}`,
      label: `推迟「${toLabel}」开始时间`,
      description: view?.suggestedTimeLabel
        ? `建议不早于 ${view.suggestedTimeLabel}`
        : '使活动开始不早于预计抵达时刻',
      actionType: 'adjust_time',
      payload: { itemId: toItemId, field: 'startTime' },
    });
  }

  if (isTight && toItemId) {
    options.push({
      id: `planb-travel-schedule-${toItemId}`,
      label: '在时间轴调整时刻',
      description: '核对出发、路上耗时与活动开始是否衔接',
      actionType: 'adjust_time',
      payload: { itemId: toItemId },
    });
  }

  return options;
}

function synthesizeAccommodationPlanB(proof: FeasibilityProofAtomDto): FeasibilityRepairOptionDto[] {
  if (proof.evidenceType !== 'accommodation-coverage') return [];
  if (proof.conclusion === '无住宿要求' || proof.conclusion?.includes('已覆盖')) return [];

  const options: FeasibilityRepairOptionDto[] = [
    {
      id: `planb-accommodation-add-${proof.itemId ?? 'day'}`,
      label: '在时间轴添加当晚住宿',
      description: '补齐酒店/民宿后，可继续校验退房与次日出发',
    },
  ];

  if (proof.itemId) {
    options.push({
      id: `planb-accommodation-edit-${proof.itemId}`,
      label: '编辑已选住宿信息',
      description: '确认入住日期与预订状态是否正确',
      actionType: 'adjust_time',
      payload: { itemId: proof.itemId },
    });
  }

  return options;
}

function synthesizePlanBForProof(
  proof: FeasibilityProofAtomDto,
  input: {
    issue?: FeasibilityIssueDto;
    trip?: TripDetail | null;
    travelView?: FeasibilityTravelTimingViewModel | null;
  },
): FeasibilityRepairOptionDto[] {
  if (proof.planBOptions?.length) return proof.planBOptions;
  if (proof.ruleId?.startsWith('booking.')) {
    return synthesizeBookingPlanB(proof, input.trip);
  }
  if (proof.ruleId?.startsWith('schedule.travel_time')) {
    return synthesizeTravelTimingPlanB(proof, input.travelView, input.issue);
  }
  if (proof.evidenceType === 'accommodation-coverage') {
    return synthesizeAccommodationPlanB(proof);
  }
  return [];
}

/** 为每条证明匹配或合成 Plan B（每条最多 3 个） */
export function enrichProofsWithPlanB(
  proofs: FeasibilityProofAtomDto[],
  input: {
    repairOptions?: FeasibilityRepairOptionDto[];
    issue?: FeasibilityIssueDto;
    trip?: TripDetail | null;
    travelView?: FeasibilityTravelTimingViewModel | null;
  },
): FeasibilityProofWithPlanB[] {
  const filteredRepairs = filterFeasibilityRepairOptionsForTrip(
    input.repairOptions,
    input.trip,
    input.issue,
  );

  return proofs.map((proof) => {
    const matched = matchRepairOptionsToProof(proof, filteredRepairs, input.issue);
    const synthesized = synthesizePlanBForProof(proof, input);
    const planBOptions = dedupeRepairOptions([
      ...(proof.planBOptions ?? []),
      ...matched,
      ...synthesized,
    ]).slice(0, 3);

    return { proof, planBOptions };
  });
}

/** 从证据行汇总 Plan B（含前端合成的快捷建议） */
export function collectPlanBOptionsFromEvidenceRows(
  enriched: FeasibilityProofWithPlanB[],
): FeasibilityRepairOptionDto[] {
  return dedupeRepairOptions(enriched.flatMap((entry) => entry.planBOptions));
}

export function isSyntheticPlanBRepairOption(option: FeasibilityRepairOptionDto): boolean {
  return option.id.startsWith('planb-');
}

/** 未挂到任何证明上的 issue 级 repair，避免与证明下 Plan B 重复展示 */
export function getUnmatchedRepairOptions(
  repairOptions: FeasibilityRepairOptionDto[] | undefined,
  enriched: FeasibilityProofWithPlanB[],
): FeasibilityRepairOptionDto[] {
  const attachedIds = new Set<string>();
  for (const entry of enriched) {
    for (const option of entry.planBOptions) {
      attachedIds.add(option.id);
    }
  }
  return (repairOptions ?? []).filter((option) => !attachedIds.has(option.id));
}

export function canApplyRepairOption(option: FeasibilityRepairOptionDto): boolean {
  return Boolean(
    option.actionType === 'adjust_time' &&
      option.payload?.itemId &&
      option.payload?.suggestedValue,
  );
}

/** 与可执行证明面板一致的证明列表（含按天住宿/预订合并） */
export function buildFeasibilityEvidenceProofRows(input: {
  proofs?: FeasibilityProofAtomDto[];
  dayNumber?: number;
  accommodation?: FeasibilityDayAccommodationDto;
  trip?: TripDetail | null;
  issue?: FeasibilityIssueDto;
  repairOptions?: FeasibilityRepairOptionDto[];
  travelView?: FeasibilityTravelTimingViewModel | null;
}): FeasibilityProofWithPlanB[] {
  const { proofs, dayNumber, accommodation, trip, issue, repairOptions, travelView } = input;
  const accommodationProofs =
    accommodation != null && dayNumber != null
      ? [buildAccommodationProofAtom(accommodation, dayNumber)]
      : [];
  const bookingProofs =
    trip && dayNumber != null ? buildDayBookingProofAtoms(trip, dayNumber) : [];
  const base = proofs ?? [];
  const merged = [...accommodationProofs, ...bookingProofs, ...base];
  const seen = new Set<string>();
  const deduped = collapseTravelTimingProofDuplicates(
    merged.filter((proof) => {
      const key = `${proof.ruleId ?? proof.evidenceType ?? 'proof'}:${proof.entity ?? proof.currentFact ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );

  return enrichProofsWithPlanB(deduped, {
    repairOptions,
    issue,
    trip,
    travelView,
  });
}
