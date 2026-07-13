import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { analyzeDayAccommodationCoverage } from '@/lib/day-accommodation-coverage';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';

export type ArrangeLodgingNightStatus = {
  dayIndex: number;
  dayNumber: number;
  dateLabel: string;
  weekdayLabel: string;
  needsAccommodation: boolean;
  hasAccommodation: boolean;
  accommodationLabel?: string;
  accommodationItemId?: string;
};

export type ArrangeLodgingCoverageSummary = {
  totalNights: number;
  coveredNights: number;
  missingNights: number;
  nights: ArrangeLodgingNightStatus[];
  missingNightDayIndices: number[];
  isComplete: boolean;
};

function normalizeDayDate(date: string): string {
  return date.includes('T') ? date.split('T')[0]! : date;
}

function formatDayLabels(date: string): { dateLabel: string; weekdayLabel: string } {
  const norm = normalizeDayDate(date);
  try {
    const d = new Date(date);
    return {
      dateLabel: format(d, 'M月d日', { locale: zhCN }),
      weekdayLabel: format(d, '(EEE)', { locale: zhCN }),
    };
  } catch {
    return { dateLabel: norm, weekdayLabel: '' };
  }
}

export function buildArrangeLodgingCoverageSummary(
  trip: TripDetail | null,
  itineraryItemsMap: Map<string, ItineraryItemDetail[]>,
): ArrangeLodgingCoverageSummary {
  const days = trip?.TripDay ?? [];
  if (days.length === 0) {
    return {
      totalNights: 0,
      coveredNights: 0,
      missingNights: 0,
      nights: [],
      missingNightDayIndices: [],
      isComplete: true,
    };
  }

  const nights: ArrangeLodgingNightStatus[] = [];
  let coveredNights = 0;
  let totalNights = 0;
  const missingNightDayIndices: number[] = [];

  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    const day = days[dayIndex]!;
    const coverage = analyzeDayAccommodationCoverage(dayIndex, trip!, itineraryItemsMap);
    if (!coverage.needsAccommodation) continue;

    totalNights += 1;
    const { dateLabel, weekdayLabel } = formatDayLabels(day.date);
    const hasAccommodation = coverage.hasAccommodation;

    if (hasAccommodation) {
      coveredNights += 1;
    } else {
      missingNightDayIndices.push(dayIndex);
    }

    nights.push({
      dayIndex,
      dayNumber: dayIndex + 1,
      dateLabel,
      weekdayLabel,
      needsAccommodation: true,
      hasAccommodation,
      accommodationLabel: coverage.accommodationLabel,
      accommodationItemId: coverage.accommodationItemId,
    });
  }

  return {
    totalNights,
    coveredNights,
    missingNights: totalNights - coveredNights,
    nights,
    missingNightDayIndices,
    isComplete: totalNights === 0 || coveredNights === totalNights,
  };
}

export function buildArrangeLodgingAssistantPrompt(
  summary: ArrangeLodgingCoverageSummary,
  accommodationStandardLabel = '3 星或以上',
): string {
  if (summary.missingNights === 0) {
    return `请检查当前行程每晚住宿是否合理（住宿标准：${accommodationStandardLabel}），并给出优化建议。`;
  }

  const dayLabels = summary.nights
    .filter((night) => !night.hasAccommodation)
    .map((night) => `Day ${night.dayNumber}（${night.dateLabel}）`)
    .join('、');

  return `请根据当前已排好的景点路线，为以下夜晚推荐住宿并加入行程：${dayLabels}。优先减少次日早晨车程，并符合团队住宿标准（${accommodationStandardLabel}）。`;
}
