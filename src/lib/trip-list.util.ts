import { differenceInCalendarDays, format, isAfter, isBefore, addDays } from 'date-fns';
import type { TripListItem, TripStatus } from '@/types/trip';
import type { TripListCardDto, TripListSummaryDto } from '@/types/trip-list';
import { resolveTripPlanningAvailability } from '@/lib/trip-content-mode';
import { readTripCoverConfig } from '@/lib/trip-cover.util';
import { resolveDestinationCoverImageUrl } from '@/lib/destination-cover.util';

export type TripListDisplayStatus = 'planning' | 'pre_trip' | 'traveling' | 'completed' | 'cancelled';

export interface TripListCardMetrics {
  hasRealProgress: boolean;
  progressPercent: number | null;
  feasibilityScore: number | null;
  feasibilityLabel: string;
  feasibilityTone: 'verified' | 'confirm' | 'neutral';
  conflictCount: number | null;
  pendingCount: number | null;
  budgetPerPerson: number | null;
  memberCount: number;
}

export interface TripListTravelingSnapshot {
  nextStopName: string | null;
  etaLabel: string | null;
}

function readMeta(trip: TripListItem): Record<string, unknown> {
  return (trip.metadata as Record<string, unknown> | undefined) ?? {};
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function getTripListSummary(trip: TripListItem): TripListSummaryDto | null {
  const summary = (trip as TripListCardDto).listSummary;
  return summary && typeof summary === 'object' ? summary : null;
}

export function resolveTripListDisplayStatus(trip: TripListItem): TripListDisplayStatus {
  const summary = getTripListSummary(trip);
  if (summary?.displayStatus) return summary.displayStatus;

  if (trip.status === 'CANCELLED') return 'cancelled';
  if (trip.status === 'COMPLETED') return 'completed';
  if (trip.status === 'IN_PROGRESS') return 'traveling';

  const start = trip.startDate ? new Date(trip.startDate) : null;
  const now = new Date();
  if (start && !isBefore(start, now)) {
    const daysUntil = differenceInCalendarDays(start, now);
    if (daysUntil <= 14) return 'pre_trip';
  }
  return 'planning';
}

export function getTripListDisplayStatusLabel(
  trip: TripListItem,
  displayStatus?: TripListDisplayStatus,
): string {
  const status = displayStatus ?? resolveTripListDisplayStatus(trip);
  const summary = getTripListSummary(trip);
  if (summary?.displayStatusLabel && summary.displayStatus === status) {
    return summary.displayStatusLabel;
  }
  switch (status) {
    case 'planning':
      return '规划中';
    case 'pre_trip':
      return '行前准备';
    case 'traveling':
      return '旅行中';
    case 'completed':
      return '已完成';
    case 'cancelled':
      return '已取消';
  }
}

export function getTripListDisplayStatusClasses(status: TripListDisplayStatus): string {
  switch (status) {
    case 'planning':
      return 'bg-card/90 text-foreground border-border backdrop-blur-sm';
    case 'pre_trip':
      return 'border-border bg-card/90 text-foreground backdrop-blur-sm';
    case 'traveling':
      return 'border-border bg-card/90 text-foreground backdrop-blur-sm';
    case 'completed':
      return 'bg-muted text-muted-foreground border-border';
    case 'cancelled':
      return 'bg-muted/50 text-muted-foreground border-border';
  }
}

export function resolveTripDurationDays(trip: TripListItem): number {
  const summary = getTripListSummary(trip);
  if (summary?.durationDays != null && summary.durationDays > 0) return summary.durationDays;

  if (trip.days?.length) return trip.days.length;
  if (trip.startDate && trip.endDate) {
    const diff = differenceInCalendarDays(new Date(trip.endDate), new Date(trip.startDate));
    return Math.max(1, diff + 1);
  }
  return 0;
}

export function resolveTripMemberCount(trip: TripListItem): number {
  const summary = getTripListSummary(trip);
  if (summary?.memberCount != null && summary.memberCount > 0) return summary.memberCount;

  const meta = readMeta(trip);
  const travelers = meta.travelers ?? meta.travelerCount ?? meta.memberCount;
  const n = readNumber(travelers);
  if (n != null && n > 0) return Math.round(n);

  const collaborators = meta.collaboratorCount ?? meta.collaboratorsCount;
  const c = readNumber(collaborators);
  if (c != null && c > 0) return Math.round(c) + 1;

  return 1;
}

export function resolveTripCoverImageUrl(
  trip: TripListItem,
  options?: { countryCoverImageUrl?: string | null },
): string | undefined {
  const summary = getTripListSummary(trip);
  const summaryCover =
    typeof summary?.coverImageUrl === 'string' && summary.coverImageUrl.trim()
      ? summary.coverImageUrl.trim()
      : undefined;
  if (summaryCover) return summaryCover;

  const coverConfig = readTripCoverConfig(trip);

  if (coverConfig.coverImageSource === 'poi' || coverConfig.coverImageSource === 'user') {
    if (coverConfig.coverImageUrl) return coverConfig.coverImageUrl;
  } else if (options?.countryCoverImageUrl) {
    // BFF 未返回 cover 时（如 GET /trips 降级），读 CountryProfile.coverImageUrl
    return resolveDestinationCoverImageUrl({
      countryCoverImageUrl: options.countryCoverImageUrl,
    });
  }

  // GET /trips 降级（无 listSummary）时，poi/user 仍可从 metadata 兼容键读取
  const meta = readMeta(trip);
  const candidates = [meta.coverImageUrl, meta.coverImage, meta.heroImage, meta.imageUrl, meta.thumbnail];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return resolveDestinationCoverImageUrl({
    countryCoverImageUrl: options?.countryCoverImageUrl,
  });
}

export function resolveTripListTitle(
  trip: TripListItem,
  countryName: string,
): string {
  if (trip.name?.trim()) return trip.name.trim();
  const destinationLabel = (trip as TripListCardDto).destinationLabel;
  const label = destinationLabel?.trim() || countryName;
  if (trip.destination && trip.startDate) {
    return `${label} ${format(new Date(trip.startDate), 'yyyy-MM-dd')}`;
  }
  return label || '未命名行程';
}

function resolveFeasibilityLabel(score: number): {
  label: string;
  tone: TripListCardMetrics['feasibilityTone'];
} {
  if (score >= 70) return { label: '良好', tone: 'verified' };
  if (score >= 50) return { label: '待优化', tone: 'confirm' };
  return { label: '需关注', tone: 'confirm' };
}

export function resolveTripListCardMetrics(trip: TripListItem): TripListCardMetrics {
  const summary = getTripListSummary(trip);
  const meta = readMeta(trip);
  const memberCount = resolveTripMemberCount(trip);
  const dayCount = resolveTripDurationDays(trip);

  if (summary) {
    const progressFromSummary = readNumber(summary.progressPercent);
    const feasibilityScore = readNumber(summary.feasibilityScore);
    let feasibilityLabel = summary.feasibilityLabel?.trim() || '—';
    let feasibilityTone: TripListCardMetrics['feasibilityTone'] = 'neutral';
    if (feasibilityScore != null) {
      const derived = resolveFeasibilityLabel(feasibilityScore);
      feasibilityLabel = summary.feasibilityLabel?.trim() || derived.label;
      feasibilityTone = derived.tone;
    }

    const budgetPerPerson =
      readNumber(summary.budgetPerPerson) ??
      (trip.totalBudget > 0 && memberCount > 0 ? Math.round(trip.totalBudget / memberCount) : null);

    return {
      hasRealProgress: progressFromSummary != null,
      progressPercent:
        progressFromSummary != null
          ? Math.max(0, Math.min(100, Math.round(progressFromSummary)))
          : null,
      feasibilityScore,
      feasibilityLabel,
      feasibilityTone,
      conflictCount: readNumber(summary.hardConflictCount),
      pendingCount: readNumber(summary.pendingConfirmCount),
      budgetPerPerson,
      memberCount,
    };
  }

  const progressFromMeta = readNumber(meta.progressPercent ?? meta.planningProgress ?? meta.progress);
  let progressPercent: number | null = progressFromMeta;
  let hasRealProgress = progressFromMeta != null;

  if (progressPercent == null) {
    const totalItems = readNumber(meta.totalItems ?? meta.itemCount);
    if (totalItems != null && dayCount > 0) {
      progressPercent = Math.min(100, Math.round((totalItems / Math.max(dayCount * 3, 1)) * 100));
      hasRealProgress = true;
    }
  }

  const feasibilityScore = readNumber(meta.feasibilityScore ?? meta.healthScore ?? meta.overallScore);

  let feasibilityLabel = '—';
  let feasibilityTone: TripListCardMetrics['feasibilityTone'] = 'neutral';
  if (feasibilityScore != null) {
    const derived = resolveFeasibilityLabel(feasibilityScore);
    feasibilityLabel = derived.label;
    feasibilityTone = derived.tone;
  }

  const conflictCount = readNumber(meta.hardConflictCount ?? meta.conflictCount ?? meta.conflicts);
  const pendingCount = readNumber(meta.pendingConfirmCount ?? meta.pendingCount ?? meta.pendingItems);

  const budgetPerPerson =
    trip.totalBudget > 0 && memberCount > 0 ? Math.round(trip.totalBudget / memberCount) : null;

  return {
    hasRealProgress,
    progressPercent:
      progressPercent != null ? Math.max(0, Math.min(100, Math.round(progressPercent))) : null,
    feasibilityScore,
    feasibilityLabel,
    feasibilityTone,
    conflictCount,
    pendingCount,
    budgetPerPerson,
    memberCount,
  };
}

export function resolveTripListTravelingSnapshot(trip: TripListItem): TripListTravelingSnapshot {
  const summary = getTripListSummary(trip);
  if (summary?.traveling) {
    const { nextStopName, nextStopEta } = summary.traveling;
    let etaLabel: string | null = null;
    if (nextStopEta) {
      try {
        etaLabel = format(new Date(nextStopEta), 'HH:mm');
      } catch {
        etaLabel = nextStopEta;
      }
    }
    return {
      nextStopName: nextStopName ?? null,
      etaLabel,
    };
  }

  const meta = readMeta(trip);
  const nextStop = meta.nextStop;
  let nextStopName: string | null = null;
  let etaLabel: string | null = null;

  if (nextStop && typeof nextStop === 'object') {
    const stop = nextStop as Record<string, unknown>;
    nextStopName =
      (typeof stop.placeName === 'string' && stop.placeName) ||
      (typeof stop.name === 'string' && stop.name) ||
      null;
    const startTime = typeof stop.startTime === 'string' ? stop.startTime : null;
    if (startTime) {
      try {
        etaLabel = format(new Date(startTime), 'HH:mm');
      } catch {
        etaLabel = null;
      }
    }
  }

  if (!nextStopName && typeof meta.nextStopName === 'string') {
    nextStopName = meta.nextStopName;
  }

  return { nextStopName, etaLabel };
}

export function resolveTripListPrimaryAction(
  trip: TripListItem,
  displayStatus: TripListDisplayStatus,
): { label: string; variant: 'default' | 'outline' } {
  const summary = getTripListSummary(trip);
  if (summary?.primaryAction?.label) {
    const intent = summary.primaryAction.intent;
    const variant =
      intent === 'open_detail' || intent === 'open_insights' ? 'outline' : 'default';
    return { label: summary.primaryAction.label, variant };
  }

  const availability = resolveTripPlanningAvailability(trip);
  if (availability !== 'ready') {
    return { label: '查看状态', variant: 'outline' };
  }
  switch (displayStatus) {
    case 'traveling':
      return { label: '进入今日行程', variant: 'default' };
    case 'pre_trip':
      return { label: '去确认', variant: 'default' };
    case 'completed':
      return { label: '查看复盘', variant: 'outline' };
    case 'cancelled':
      return { label: '查看详情', variant: 'outline' };
    default:
      return { label: '继续规划', variant: 'default' };
  }
}

export function resolveTripMemberAvatars(
  trip: TripListItem,
): Array<{ userId?: string; name?: string; avatarUrl?: string | null }> {
  const summary = getTripListSummary(trip);
  if (summary?.memberAvatars?.length) return summary.memberAvatars;
  return [];
}

export function sortTripsForList(trips: TripListItem[], collectedIds: Set<string>): TripListItem[] {
  return [...trips].sort((a, b) => {
    if (a.status === 'CANCELLED' && b.status !== 'CANCELLED') return 1;
    if (a.status !== 'CANCELLED' && b.status === 'CANCELLED') return -1;

    const statusRank: Record<TripStatus, number> = {
      IN_PROGRESS: 0,
      PLANNING: 1,
      COMPLETED: 2,
      CANCELLED: 3,
    };
    const rankDiff = statusRank[a.status] - statusRank[b.status];
    if (rankDiff !== 0) return rankDiff;

    const aCollected = collectedIds.has(a.id);
    const bCollected = collectedIds.has(b.id);
    if (aCollected && !bCollected) return -1;
    if (!aCollected && bCollected) return 1;

    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export function isTripUpcomingForWeather(trip: TripListItem): boolean {
  if (!trip.startDate || trip.status === 'CANCELLED') return false;
  const start = new Date(trip.startDate);
  const now = new Date();
  if (isAfter(now, addDays(start, 7))) return false;
  return differenceInCalendarDays(start, now) <= 7 && !isBefore(start, addDays(now, -1));
}
