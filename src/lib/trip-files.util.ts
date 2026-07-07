import type {
  TripFileItem,
  TripFileOverviewItem,
  TripFileOverviewStatus,
  TripFileSource,
  TripFileStatus,
} from '@/types/trip-files';

export function formatTripFileBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes >= 10_240 ? 0 : 1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatTripFileStorageLabel(usedBytes: number, quotaBytes: number): string {
  return `${formatTripFileBytes(usedBytes)} / ${formatTripFileBytes(quotaBytes)}`;
}

export function tripFileStoragePercent(usedBytes: number, quotaBytes: number): number {
  if (!quotaBytes || quotaBytes <= 0) return 0;
  return Math.min(100, (usedBytes / quotaBytes) * 100);
}

export function resolveTripFileDisplayName(
  item: Pick<TripFileOverviewItem, 'title' | 'fileName' | 'itineraryItemTitle'>,
): string {
  return (
    item.title?.trim() ||
    item.fileName?.trim() ||
    item.itineraryItemTitle?.trim() ||
    '未命名文件'
  );
}

export function tripFileStatusLabel(status: TripFileStatus): string {
  switch (status) {
    case 'UPLOADED':
      return '已上传';
    case 'PENDING':
      return '待补充';
    case 'EXPIRED':
      return '已过期';
  }
}

export function tripFileOverviewStatusLabel(status: TripFileOverviewStatus): string {
  if (status === 'REFERENCE') return '确认资料';
  if (status === 'LINK') return '预订链接';
  return tripFileStatusLabel(status as TripFileStatus);
}

export function tripFileSourceLabel(source: TripFileSource): string {
  switch (source) {
    case 'trip_file':
      return '文件库';
    case 'itinerary_booking':
      return '行程确认';
    case 'itinerary_link':
      return '预订链接';
    case 'itinerary_pending':
      return '缺资料';
  }
}

export function isTripFileOverviewDeletable(item: TripFileOverviewItem): boolean {
  return item.source === 'trip_file';
}

export function isTripFileOverviewDownloadable(item: TripFileOverviewItem): boolean {
  if (item.source === 'itinerary_link' || item.status === 'LINK') {
    return Boolean(item.url);
  }
  if (item.status === 'REFERENCE') {
    return Boolean(item.url);
  }
  return item.source === 'trip_file' && item.status === 'UPLOADED';
}

export function isTripFileOverviewPending(item: TripFileOverviewItem): boolean {
  return item.status === 'PENDING' || item.source === 'itinerary_pending';
}

export function isTripFileOverviewRecent(item: TripFileOverviewItem): boolean {
  if (isTripFileOverviewPending(item)) return false;
  return (
    item.status === 'UPLOADED' ||
    item.status === 'REFERENCE' ||
    item.status === 'LINK'
  );
}

export function tripFileItemToOverviewItem(item: TripFileItem): TripFileOverviewItem {
  return {
    id: item.id,
    source: 'trip_file',
    tripId: item.tripId,
    category: item.category,
    status: item.status,
    fileName: item.fileName,
    mimeType: item.mimeType,
    fileSizeBytes: item.fileSizeBytes,
    title: item.title,
    description: item.description,
    expiresAt: item.expiresAt,
    itineraryItemId: item.itineraryItemId,
    uploadedByUserId: item.uploadedByUserId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function groupTripFilesByCategory(
  items: TripFileOverviewItem[],
): Map<string, TripFileOverviewItem[]> {
  const map = new Map<string, TripFileOverviewItem[]>();
  for (const item of items) {
    const key = item.category || 'team';
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}
