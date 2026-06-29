import type { Place } from '@/types/trip';

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

/** 从 Place / metadata 提取封面图 */
export function extractPlaceImageUrl(place?: Place | null): string | undefined {
  if (!place) return undefined;

  const root = readRecord(place);
  const metadata = readRecord(place.metadata);

  const rootImages = root?.images;
  if (Array.isArray(rootImages) && rootImages.length > 0) {
    const url = resolveImageEntryUrl(rootImages[0]);
    if (url) return url;
  }

  const metaImages = metadata?.images;
  if (Array.isArray(metaImages) && metaImages.length > 0) {
    const url = resolveImageEntryUrl(metaImages[0]);
    if (url) return url;
  }

  const photo = readRecord(metadata?.photo);
  const urls = readRecord(photo?.urls);
  if (typeof urls?.small === 'string') return urls.small;
  if (typeof urls?.regular === 'string') return urls.regular;
  if (typeof urls?.thumb === 'string') return urls.thumb;

  if (typeof metadata?.imageUrl === 'string') return metadata.imageUrl;
  if (typeof metadata?.coverImage === 'string') return metadata.coverImage;
  if (typeof metadata?.photoUrl === 'string') return metadata.photoUrl;

  return undefined;
}

function resolveImageEntryUrl(entry: unknown): string | undefined {
  if (typeof entry === 'string') return entry.trim() || undefined;
  const obj = readRecord(entry);
  if (typeof obj?.url === 'string') return obj.url;
  const urls = readRecord(obj?.urls);
  if (typeof urls?.small === 'string') return urls.small;
  if (typeof urls?.regular === 'string') return urls.regular;
  return undefined;
}

export function extractPlaceAddress(place?: Place | null): string | undefined {
  const address = place?.address?.trim();
  return address || undefined;
}

export function extractPlaceDetail(
  place?: Place | null,
  note?: string | null,
): string | undefined {
  const fromNote = note?.trim();
  if (fromNote && !/^\[timelineDisplayRole:/i.test(fromNote)) return fromNote;
  const desc = place?.description?.trim();
  return desc || undefined;
}

export function extractPoiMetadataImageUrl(metadata?: Record<string, unknown>): string | undefined {
  if (!metadata) return undefined;
  if (typeof metadata.imageUrl === 'string') return metadata.imageUrl;
  if (typeof metadata.photoUrl === 'string') return metadata.photoUrl;
  if (typeof metadata.coverImage === 'string') return metadata.coverImage;
  if (Array.isArray(metadata.images) && metadata.images.length > 0) {
    return resolveImageEntryUrl(metadata.images[0]);
  }
  const photo = readRecord(metadata.photo);
  const urls = readRecord(photo?.urls);
  if (typeof urls?.small === 'string') return urls.small;
  if (typeof urls?.regular === 'string') return urls.regular;
  return undefined;
}

export function extractPoiMetadataDetail(metadata?: Record<string, unknown>): string | undefined {
  if (!metadata) return undefined;
  if (typeof metadata.description === 'string') return metadata.description.trim() || undefined;
  if (typeof metadata.summary === 'string') return metadata.summary.trim() || undefined;
  return undefined;
}

export function extractPoiMetadataAddress(metadata?: Record<string, unknown>): string | undefined {
  if (!metadata) return undefined;
  if (typeof metadata.address === 'string') return metadata.address.trim() || undefined;
  return undefined;
}

export function safeHttpImageUrl(url?: string | null): string | undefined {
  if (!url?.trim()) return undefined;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
