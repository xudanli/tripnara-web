import type { PlaceImageInfo } from '@/types/place-image';
import type { Place } from '@/types/trip';

export interface PlaceImageEntry {
  url: string;
  caption?: string;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function resolveImageEntryUrl(entry: unknown): string | undefined {
  if (typeof entry === 'string') return entry.trim() || undefined;
  const obj = readRecord(entry);
  if (typeof obj?.url === 'string') return obj.url.trim() || undefined;
  const urls = readRecord(obj?.urls);
  if (typeof urls?.small === 'string') return urls.small;
  if (typeof urls?.regular === 'string') return urls.regular;
  if (typeof urls?.thumb === 'string') return urls.thumb;
  return undefined;
}

function extractMetadataImageUrls(place?: Place | null): string[] {
  if (!place) return [];

  const urls: string[] = [];
  const root = readRecord(place);
  const metadata = readRecord(place.metadata);

  const pushEntries = (entries: unknown) => {
    if (!Array.isArray(entries)) return;
    entries.forEach((entry) => {
      const url = resolveImageEntryUrl(entry);
      if (url) urls.push(url);
    });
  };

  pushEntries(root?.images);
  pushEntries(metadata?.images);

  const photo = readRecord(metadata?.photo);
  const photoUrls = readRecord(photo?.urls);
  if (typeof photoUrls?.regular === 'string') urls.push(photoUrls.regular);
  if (typeof photoUrls?.small === 'string') urls.push(photoUrls.small);

  for (const key of ['imageUrl', 'coverImage', 'photoUrl'] as const) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim()) urls.push(value.trim());
  }

  return urls;
}

/** 合并上传图片与 Place metadata 图片（与时间轴 ItineraryItemRow 一致） */
export function collectPlaceImages(input: {
  placeImages?: PlaceImageInfo[] | null;
  place?: Place | null;
  fallbackUrl?: string | null;
}): PlaceImageEntry[] {
  const images: PlaceImageEntry[] = [];
  const seen = new Set<string>();

  const add = (url: string, caption?: string) => {
    const trimmed = url.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    images.push({ url: trimmed, caption });
  };

  if (input.placeImages?.length) {
    input.placeImages.forEach((img) => add(img.url, img.caption));
  }

  extractMetadataImageUrls(input.place).forEach((url) => add(url));

  if (input.fallbackUrl) add(input.fallbackUrl);

  return images;
}
