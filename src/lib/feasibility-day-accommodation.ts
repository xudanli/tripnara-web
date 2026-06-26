import { tripsApi } from '@/api/trips';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';
import type {
  FeasibilityDayAccommodationDto,
  FeasibilityDayStatusDto,
  FeasibilityProofAtomDto,
  TripFeasibilityReportDto,
} from '@/types/trip-feasibility-report';
import { analyzeDayAccommodationCoverage } from '@/lib/day-accommodation-coverage';

function normalizeDayDate(dayDate: string): string {
  return dayDate.includes('T') ? dayDate.split('T')[0] : dayDate;
}

export function buildItineraryItemsMapFromTrip(
  trip: TripDetail,
): Map<string, ItineraryItemDetail[]> {
  const map = new Map<string, ItineraryItemDetail[]>();
  for (const day of trip.TripDay ?? []) {
    const items = day.ItineraryItem ?? [];
    if (items.length === 0) continue;
    const norm = normalizeDayDate(day.date);
    map.set(day.date, items);
    map.set(norm, items);
  }
  return map;
}

function coverageToDto(
  coverage: ReturnType<typeof analyzeDayAccommodationCoverage>,
): FeasibilityDayAccommodationDto {
  if (!coverage.needsAccommodation) {
    return {
      needsNightStay: false,
      hasAccommodation: true,
      message: '最后一天无需住宿',
    };
  }
  return {
    needsNightStay: true,
    hasAccommodation: coverage.hasAccommodation,
    label: coverage.accommodationLabel,
    itemId: coverage.accommodationItemId,
    message: coverage.hasAccommodation
      ? coverage.accommodationLabel
        ? `当晚住宿：${coverage.accommodationLabel}`
        : '当晚已安排住宿'
      : coverage.message,
  };
}

export function enrichDayTimelineAccommodation(
  trip: TripDetail | null | undefined,
  dayTimeline: FeasibilityDayStatusDto[],
  itineraryItemsMap?: Map<string, ItineraryItemDetail[]>,
): FeasibilityDayStatusDto[] {
  if (!trip?.TripDay?.length) return dayTimeline;

  const map = itineraryItemsMap ?? buildItineraryItemsMapFromTrip(trip);

  return dayTimeline.map((day) => {
    const dayIndex = day.dayNumber - 1;
    const coverage = analyzeDayAccommodationCoverage(dayIndex, trip, map);
    const computed = coverageToDto(coverage);
    const existing = day.accommodation;
    return {
      ...day,
      accommodation: existing?.label && computed.hasAccommodation
        ? { ...computed, label: existing.label }
        : computed,
    };
  });
}

/** 将当晚住宿状态转为可执行证明原子（供验证依据区展示） */
export function buildAccommodationProofAtom(
  accommodation: FeasibilityDayAccommodationDto,
  dayNumber: number,
): FeasibilityProofAtomDto {
  const entity = `第 ${dayNumber} 天当晚住宿`;
  const constraint = '除最后一天外，每晚应有住宿，以便判断次日出发与跨天交通';

  if (!accommodation.needsNightStay) {
    return {
      entity,
      constraint,
      currentFact: accommodation.message ?? '行程最后一天，无需安排当晚住宿',
      evidenceSource: '行程时间轴',
      evidenceType: 'accommodation-coverage',
      conclusion: '无住宿要求',
      itemId: accommodation.itemId,
    };
  }

  if (accommodation.hasAccommodation) {
    const fact =
      accommodation.message ??
      (accommodation.label ? `已安排：${accommodation.label}` : '已安排住宿');
    return {
      entity,
      constraint,
      currentFact: fact,
      evidenceSource: '行程时间轴',
      evidenceType: 'accommodation-coverage',
      conclusion: '住宿已覆盖，可据此校验退房与出发时间',
      itemId: accommodation.itemId,
    };
  }

  return {
    entity,
    constraint,
    currentFact: accommodation.message ?? '尚未安排当晚住宿',
    evidenceSource: '行程时间轴',
    evidenceType: 'accommodation-coverage',
    conclusion: '缺住宿时，跨天交通与出发时间判断可能不完整',
    itemId: accommodation.itemId,
  };
}

async function loadItineraryItemsMap(trip: TripDetail): Promise<Map<string, ItineraryItemDetail[]>> {
  const map = buildItineraryItemsMapFromTrip(trip);
  const missingDays = (trip.TripDay ?? []).filter((day) => {
    const norm = normalizeDayDate(day.date);
    return !map.has(day.date) && !map.has(norm);
  });

  if (missingDays.length === 0) return map;

  const fetched = await Promise.all(
    missingDays.map(async (day) => {
      const items = await tripsApi.getAll(day.id);
      return { day, items };
    }),
  );

  for (const { day, items } of fetched) {
    const norm = normalizeDayDate(day.date);
    map.set(day.date, items);
    map.set(norm, items);
  }

  return map;
}

/** 为可执行性报告按天补齐住宿安排（BFF 未带 accommodation 时前端计算） */
export async function enrichFeasibilityReportAccommodation(
  tripId: string,
  report: TripFeasibilityReportDto,
): Promise<TripFeasibilityReportDto> {
  try {
    const trip = await tripsApi.getById(tripId);
    const map = await loadItineraryItemsMap(trip);
    return {
      ...report,
      dayTimeline: enrichDayTimelineAccommodation(trip, report.dayTimeline, map),
    };
  } catch {
    return report;
  }
}
