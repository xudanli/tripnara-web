import type { OdysseyProfileCardView } from '@/types/odyssey-intake';

function readTag(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** 从 API 各种响应形态中提取当前出行状态 tag（camelCase + snake_case） */
export function extractTripIntentTags(raw: unknown): string[] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;

  const rootCandidates = [
    data.tripIntentTags,
    data.trip_intent_tags,
    data.tripIntentTag,
    data.trip_intent_tag,
    data.currentTripIntentTag,
    data.current_trip_intent_tag,
  ];

  for (const candidate of rootCandidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      const tags = candidate.map(readTag).filter(Boolean) as string[];
      if (tags.length > 0) return tags;
    }
    const single = readTag(candidate);
    if (single) return [single];
  }

  const profile = data.profile;
  if (profile && typeof profile === 'object') {
    return extractTripIntentTags(profile);
  }

  return undefined;
}

export function resolveSelectedTripIntentTag(
  view: OdysseyProfileCardView | null | undefined,
  fallbackOptionId?: string
): string | undefined {
  const fromProfile = view?.profile?.tripIntentTags?.[0];
  if (fromProfile) return fromProfile;

  const fromPatch = extractTripIntentTags(view)?.[0];
  if (fromPatch) return fromPatch;

  return fallbackOptionId;
}

export function tripIntentLabel(
  tagId: string | undefined,
  options: Array<{ id: string; label: string }>
): string | undefined {
  if (!tagId) return undefined;
  return options.find((o) => o.id === tagId)?.label ?? tagId;
}

/** 开发联调：PATCH 响应是否带回出行状态 */
export function patchIncludesTripIntent(raw: unknown): boolean {
  return extractTripIntentTags(raw) != null;
}
