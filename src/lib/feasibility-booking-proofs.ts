import { format } from 'date-fns';
import type { ItineraryItemDetail, Place, TripDetail } from '@/types/trip';
import type {
  FeasibilityIssueDto,
  FeasibilityProofAtomDto,
} from '@/types/trip-feasibility-report';
import { isCarRentalItineraryItem } from '@/lib/trip-car-rental-status';
import { isAccommodationItineraryItem } from '@/lib/itinerary-item-sort';

const BOOKING_RULE_PREFIX = 'booking.advance_reservation';

const RESERVATION_NOTE_RE =
  /需预约|需要预约|提前预约|提前预订|须预约|预约入场|需预订|须预订|预订门票/i;

const PLACE_RESERVATION_TRUTHY_KEYS = [
  'requiresReservation',
  'requires_reservation',
  'reservationRequired',
  'bookingRequired',
  'advanceBookingRequired',
  'advance_booking_required',
] as const;

export interface PoiBookingProofContext {
  item: ItineraryItemDetail;
  dayNumber: number;
  placeLabel: string;
  visitTimeLabel?: string;
  status: 'required' | 'pending' | 'booked';
  reason: string;
  bookingUrl?: string;
  confirmation?: string;
}

function itemDisplayLabel(item: ItineraryItemDetail): string {
  return item.Place?.nameCN || item.Place?.nameEN || item.note?.split('\n')[0] || '行程项';
}

function formatVisitTime(item: ItineraryItemDetail): string | undefined {
  if (!item.startTime) return undefined;
  try {
    return format(new Date(item.startTime), 'HH:mm');
  } catch {
    return undefined;
  }
}

function readPlaceReservationHint(place: Place | null | undefined): string | undefined {
  if (!place?.metadata) return undefined;
  const meta = place.metadata as Record<string, unknown>;

  for (const key of PLACE_RESERVATION_TRUTHY_KEYS) {
    if (meta[key] === true) return '地点信息标注需提前预约';
  }

  const reservation = meta.reservation;
  if (reservation && typeof reservation === 'object' && !Array.isArray(reservation)) {
    const record = reservation as Record<string, unknown>;
    if (record.required === true || record.advanceBookingRequired === true) {
      if (typeof record.note === 'string' && record.note.trim()) return record.note.trim();
      if (typeof record.leadTime === 'string' && record.leadTime.trim()) {
        return `建议提前 ${record.leadTime.trim()} 预订`;
      }
      return '地点要求提前预约';
    }
  }

  const booking = meta.booking;
  if (booking && typeof booking === 'object' && !Array.isArray(booking)) {
    const record = booking as Record<string, unknown>;
    if (record.required === true || record.advanceRequired === true) {
      return typeof record.note === 'string' ? record.note.trim() : '地点要求提前预订';
    }
  }

  return undefined;
}

function shouldScanItemForPoiBooking(item: ItineraryItemDetail): boolean {
  if (isCarRentalItineraryItem(item)) return false;
  if (item.type === 'TRANSIT' || item.type === 'FLIGHT' || item.type === 'RAIL') return false;
  return true;
}

/** 判断行程项是否涉及需提前预约的 POI/体验 */
export function analyzePoiBookingRequirement(item: ItineraryItemDetail): {
  needsAttention: boolean;
  status: 'required' | 'pending' | 'booked';
  reason?: string;
} {
  if (!shouldScanItemForPoiBooking(item)) {
    return { needsAttention: false, status: 'required' };
  }

  if (item.bookingStatus === 'BOOKED' || item.bookingConfirmation) {
    const placeHint = readPlaceReservationHint(item.Place);
    const noteHint = item.note && RESERVATION_NOTE_RE.test(item.note);
    if (placeHint || noteHint || item.bookingStatus === 'BOOKED') {
      return {
        needsAttention: true,
        status: 'booked',
        reason:
          placeHint ??
          (noteHint ? '行程备注提示需预约' : '行程已记录预订'),
      };
    }
    return { needsAttention: false, status: 'booked' };
  }

  if (item.bookingStatus === 'NEED_BOOKING') {
    return {
      needsAttention: true,
      status: 'pending',
      reason: isAccommodationItineraryItem(item)
        ? '住宿标记为待预订'
        : '行程项标记为待预订',
    };
  }

  if (item.bookingStatus === 'NO_BOOKING') {
    return { needsAttention: false, status: 'required' };
  }

  const placeHint = readPlaceReservationHint(item.Place);
  if (placeHint) {
    return { needsAttention: true, status: 'required', reason: placeHint };
  }

  if (item.note && RESERVATION_NOTE_RE.test(item.note)) {
    return { needsAttention: true, status: 'required', reason: '行程备注提示需预约' };
  }

  return { needsAttention: false, status: 'required' };
}

function collectBookingContextsForDay(
  trip: TripDetail,
  dayNumber: number,
): PoiBookingProofContext[] {
  const day = trip.TripDay?.[dayNumber - 1];
  if (!day) return [];

  const contexts: PoiBookingProofContext[] = [];
  for (const item of day.ItineraryItem ?? []) {
    const analysis = analyzePoiBookingRequirement(item as ItineraryItemDetail);
    if (!analysis.needsAttention) continue;

    contexts.push({
      item: item as ItineraryItemDetail,
      dayNumber,
      placeLabel: itemDisplayLabel(item as ItineraryItemDetail),
      visitTimeLabel: formatVisitTime(item as ItineraryItemDetail),
      status: analysis.status,
      reason: analysis.reason ?? '需关注预订状态',
      bookingUrl: item.bookingUrl ?? undefined,
      confirmation: item.bookingConfirmation ?? undefined,
    });
  }
  return contexts;
}

export function collectTripBookingContexts(trip: TripDetail): PoiBookingProofContext[] {
  const contexts: PoiBookingProofContext[] = [];
  for (let i = 0; i < (trip.TripDay?.length ?? 0); i += 1) {
    contexts.push(...collectBookingContextsForDay(trip, i + 1));
  }
  return contexts;
}

export function buildBookingProofAtomFromContext(
  context: PoiBookingProofContext,
): FeasibilityProofAtomDto {
  const timePart = context.visitTimeLabel ? `计划 ${context.visitTimeLabel} 到访` : '到访时刻未填';
  const statusLabel =
    context.status === 'booked'
      ? '已预订'
      : context.status === 'pending'
        ? '待预订'
        : '需提前预约';

  const factParts = [
    timePart,
    context.reason,
    `当前状态：${statusLabel}`,
    context.confirmation ? `确认号 ${context.confirmation}` : null,
    context.bookingUrl ? '已附预订链接' : null,
  ].filter(Boolean) as string[];

  const conclusion =
    context.status === 'booked'
      ? '预订状态已记录，可按计划到访'
      : context.status === 'pending'
        ? '已识别为待预订，请尽快完成预约以免无法入场'
        : '尚未完成预订，存在无法入场或错过时段的风险';

  return {
    entity: `第 ${context.dayNumber} 天 · ${context.placeLabel}`,
    constraint: '部分景点、餐厅或体验需提前预约/购票，须在计划到访前完成',
    currentFact: factParts.join('；'),
    evidenceSource: '行程时间轴 / POI 元数据',
    evidenceType: 'L3-PROOF',
    ruleId: `${BOOKING_RULE_PREFIX}.poi`,
    conclusion,
    itemId: context.item.id,
  };
}

export function buildDayBookingProofAtoms(
  trip: TripDetail,
  dayNumber: number,
): FeasibilityProofAtomDto[] {
  return collectBookingContextsForDay(trip, dayNumber).map(buildBookingProofAtomFromContext);
}

function isFrontendBookingProof(proof: FeasibilityProofAtomDto): boolean {
  return Boolean(proof.ruleId?.startsWith(BOOKING_RULE_PREFIX));
}

export function isBookingRelatedIssue(issue: FeasibilityIssueDto): boolean {
  if (issue.issueKind === 'opening_hours') return true;
  if (issue.category === 'booking') return true;
  const text = `${issue.message} ${issue.title ?? ''} ${issue.actionRequired ?? ''}`;
  return /预订|预约|门票|booking|reservation|开放.*订/i.test(text);
}

function buildGenericBookingProofFromIssue(issue: FeasibilityIssueDto): FeasibilityProofAtomDto {
  const day = issue.affectedDays?.[0];
  const entity = day ? `第 ${day} 天 · 预订/开放安排` : '行程预订安排';
  return {
    entity,
    constraint: '部分 POI 需提前预约或在开放窗口内到访',
    currentFact: issue.message,
    evidenceSource: 'constraint-solver / readiness',
    evidenceType: 'L3-PROOF',
    ruleId: `${BOOKING_RULE_PREFIX}.issue`,
    conclusion: issue.actionRequired ?? '请核对预订与开放时间是否满足计划',
  };
}

/** 为预订/开放类 issue 补齐 proofs；有 trip 时按当日 POI 展开 */
export function enrichBookingIssueProofs(
  issue: FeasibilityIssueDto,
  trip?: TripDetail | null,
  dayNumber?: number,
): FeasibilityIssueDto {
  if (!isBookingRelatedIssue(issue)) return issue;

  const existing = issue.proofs ?? [];
  const keptProofs = existing.filter((proof) => !isFrontendBookingProof(proof));

  if (trip) {
    const day = dayNumber ?? issue.affectedDays?.[0];
    const contexts = day
      ? collectBookingContextsForDay(trip, day)
      : collectTripBookingContexts(trip).filter((ctx) =>
          issue.affectedDays?.length
            ? issue.affectedDays.includes(ctx.dayNumber)
            : true,
        );

    const bookingProofs =
      contexts.length > 0
        ? contexts.map(buildBookingProofAtomFromContext)
        : [buildGenericBookingProofFromIssue(issue)];

    return {
      ...issue,
      proofs: [...bookingProofs, ...keptProofs],
    };
  }

  if (existing.some((proof) => isFrontendBookingProof(proof))) return issue;

  return {
    ...issue,
    proofs: [buildGenericBookingProofFromIssue(issue), ...keptProofs],
  };
}
