import type { CoverageMapPoi } from '@/api/readiness';
import {
  getItineraryItemTimelineTypeBadge,
  isItineraryItemType,
} from '@/lib/itinerary-item-type-display';
import {
  getCrossDayBadgeLabel,
  readCrossDayInfo,
} from '@/lib/itinerary-item-sort';
import {
  isItineraryDeparturePointDisplay,
  isItineraryLandingPointDisplay,
} from '@/lib/itinerary-special-display';
import { isCarRentalItineraryItem } from '@/lib/trip-car-rental-status';
import type { ItineraryItemDetail, Place, TripDetail } from '@/types/trip';
import { isAlwaysOpenHours } from '@/utils/opening-hours-schedule-check';
import type { JourneyActivity } from '../types';
import {
  extractPlaceAddress,
  extractPlaceDetail,
  extractPlaceImageUrl,
  safeHttpImageUrl,
} from './journey-map-place.util';
import { normalizePoiType } from './journey-map-marker-icons';

export interface JourneyMapActivityContextBadge {
  label: string;
  className: string;
}

export interface JourneyMapActivityHoursBadge {
  label: string;
  tone: 'open' | 'closed' | 'neutral';
}

export interface JourneyMapActivityPlaceView {
  title: string;
  imageUrl?: string;
  timeLabel?: string;
  contextBadges: JourneyMapActivityContextBadge[];
  rating?: number;
  address?: string;
  categoryLabel?: string;
  hoursBadge?: JourneyMapActivityHoursBadge;
  description?: string;
  phone?: string;
  website?: string;
  tags?: string[];
  showWeather?: boolean;
  weatherLocation?: { lat: number; lng: number };
}

function extractHm(iso?: string | null): string | undefined {
  if (!iso?.trim()) return undefined;
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m?.[1] ?? iso;
}

function resolveOpeningHoursBadge(place?: Place | null): JourneyMapActivityHoursBadge | undefined {
  const metadata = place?.metadata as Record<string, unknown> | undefined;
  const raw = metadata?.openingHours ?? metadata?.opening_hours;
  if (!raw) return undefined;

  let text: string | undefined;
  if (typeof raw === 'string') {
    text = raw;
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.text === 'string') text = obj.text;
  }

  if (!text?.trim()) return undefined;

  if (metadata?.business_status === 'CLOSED_TEMPORARILY') {
    return { label: '临时关闭', tone: 'closed' };
  }
  if (metadata?.business_status === 'CLOSED_PERMANENTLY') {
    return { label: '已永久关闭', tone: 'closed' };
  }

  if (isAlwaysOpenHours(text)) {
    return { label: '24小时开放 · 营业中', tone: 'open' };
  }

  return { label: text, tone: 'neutral' };
}

function resolveTimeLabel(
  activity: JourneyActivity,
  item: ItineraryItemDetail | null,
): string | undefined {
  const start = item ? extractHm(item.startTime) ?? activity.startTime : activity.startTime;
  const end = item ? extractHm(item.endTime) ?? activity.endTime : activity.endTime;

  if (item) {
    const crossDay = readCrossDayInfo(item);
    const crossLabel = getCrossDayBadgeLabel(item);
    const isCarRental = isCarRentalItineraryItem(item);

    if (isItineraryLandingPointDisplay(item) && start) return `落地 ${start}`;
    if (isItineraryDeparturePointDisplay(item) && start) return `值机 ${start}`;

    if (isCarRental && crossDay?.displayMode === 'checkout' && end) return `还车 ${end}`;
    if (isCarRental && crossLabel === '取车' && start) {
      return end ? `取车 ${start} – ${end}` : `取车 ${start}`;
    }
    if (crossDay?.displayMode === 'checkout' && end) return `退房 ${end}`;
  }

  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  return undefined;
}

function resolveContextBadges(item: ItineraryItemDetail | null): JourneyMapActivityContextBadge[] {
  if (!item) return [];

  const badges: JourneyMapActivityContextBadge[] = [];
  const crossLabel = getCrossDayBadgeLabel(item);

  if (isItineraryDeparturePointDisplay(item)) {
    badges.push({
      label: '离境点',
      className: 'border-border/60 bg-muted/40 text-muted-foreground',
    });
  }
  if (isItineraryLandingPointDisplay(item)) {
    badges.push({
      label: '落地点',
      className: 'border-nara-glacier-border bg-nara-glacier-muted text-nara-glacier-foreground',
    });
  }
  if (isCarRentalItineraryItem(item) && !crossLabel) {
    badges.push({
      label: '租车',
      className: 'border-amber-200 bg-amber-50 text-amber-800',
    });
  }
  if (crossLabel) {
    badges.push({
      label: crossLabel,
      className:
        crossLabel === '退房' || crossLabel === '还车'
          ? 'border-orange-200 bg-orange-50 text-orange-600'
          : 'border-nara-glacier-border bg-nara-glacier-muted text-nara-glacier-foreground',
    });
  }
  if (item.isRequired || item.note?.includes('[必游]')) {
    badges.push({
      label: '必游',
      className: 'border-foreground/15 bg-foreground text-background',
    });
  }

  return badges;
}

const POI_TYPE_LABELS: Record<string, string> = {
  city: '城市',
  attraction: '景点',
  hotel: '住宿',
  restaurant: '餐饮',
  transport: '交通',
  other: '其他',
};

function resolveCategoryLabel(
  activity: JourneyActivity,
  item: ItineraryItemDetail | null,
  poi: CoverageMapPoi | null,
): string | undefined {
  if (item) {
    return getItineraryItemTimelineTypeBadge(item).label;
  }
  if (poi?.type) {
    return POI_TYPE_LABELS[normalizePoiType(poi.type)] ?? POI_TYPE_LABELS.other;
  }
  if (activity.poiType) {
    return POI_TYPE_LABELS[normalizePoiType(activity.poiType)] ?? POI_TYPE_LABELS.other;
  }
  if (activity.kind === 'accommodation') return '住宿';
  if (activity.kind === 'transport') return '交通';
  return '游玩';
}

function isOutdoorActivity(activity: JourneyActivity, item: ItineraryItemDetail | null): boolean {
  if (activity.intensity === 'high') return true;
  if (item && isItineraryItemType(item.type) && item.type === 'ACTIVITY') return true;
  return activity.kind === 'activity';
}

export function buildJourneyMapActivityPlaceView(input: {
  activity: JourneyActivity;
  item?: ItineraryItemDetail | null;
  poi?: CoverageMapPoi | null;
  trip?: TripDetail | null;
}): JourneyMapActivityPlaceView {
  const { activity, item = null, poi = null } = input;
  const place = item?.Place ?? null;

  const imageUrl =
    safeHttpImageUrl(activity.imageUrl) ??
    safeHttpImageUrl(extractPlaceImageUrl(place));

  const address =
    extractPlaceAddress(place) ??
    activity.address?.trim() ??
    activity.location?.trim();

  const description =
    extractPlaceDetail(place, item?.note) ??
    activity.placeDetail?.trim() ??
    (activity.summary && !/^\[timelineDisplayRole:/i.test(activity.summary)
      ? activity.summary
      : undefined) ??
    place?.description?.trim() ??
    undefined;

  const metadata = place?.metadata as Record<string, unknown> | undefined;

  return {
    title: activity.title,
    imageUrl,
    timeLabel: resolveTimeLabel(activity, item),
    contextBadges: resolveContextBadges(item),
    rating: typeof place?.rating === 'number' ? place.rating : undefined,
    address,
    categoryLabel: resolveCategoryLabel(activity, item, poi),
    hoursBadge: resolveOpeningHoursBadge(place),
    description,
    phone: typeof metadata?.phone === 'string' ? metadata.phone : undefined,
    website: typeof metadata?.website === 'string' ? metadata.website : undefined,
    tags: Array.isArray(metadata?.tags)
      ? metadata.tags.filter((t): t is string => typeof t === 'string')
      : undefined,
    showWeather: isOutdoorActivity(activity, item),
    weatherLocation: { lat: activity.lat, lng: activity.lng },
  };
}

export function resolveItineraryItemForActivity(
  activity: JourneyActivity,
  items: ItineraryItemDetail[],
  selectionItem: ItineraryItemDetail | null | undefined,
): ItineraryItemDetail | null {
  if (selectionItem) return selectionItem;
  if (activity.id.startsWith('item-')) {
    const id = activity.id.slice('item-'.length);
    return items.find((i) => i.id === id) ?? null;
  }
  return null;
}
