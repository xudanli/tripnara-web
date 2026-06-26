import type {
  ExperienceExplanationCard,
  ItineraryPresentationBundle,
  TravelUnderstandingCard,
} from '@/types/experience-fulfillment';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function isTravelUnderstandingCard(value: unknown): value is TravelUnderstandingCard {
  if (!isRecord(value)) return false;
  return (
    value.revision === 'v1' &&
    Array.isArray(value.travelGoals) &&
    isRecord(value.experienceIntent)
  );
}

function isExperienceExplanationCard(value: unknown): value is ExperienceExplanationCard {
  if (!isRecord(value)) return false;
  return value.revision === 'v1' && typeof value.overallLabelZh === 'string';
}

/** 从 trip.metadata 读取规划期旅行理解卡 */
export function extractExperienceUnderstanding(
  metadata?: Record<string, unknown> | null,
): TravelUnderstandingCard | undefined {
  if (!metadata) return undefined;
  const raw = metadata.experienceUnderstanding;
  return isTravelUnderstandingCard(raw) ? raw : undefined;
}

/** 从 trip.metadata 读取规划期体验解释（若后端持久化） */
export function extractExperienceExplanation(
  metadata?: Record<string, unknown> | null,
): ExperienceExplanationCard | undefined {
  if (!metadata) return undefined;
  const raw = metadata.experienceExplanation;
  return isExperienceExplanationCard(raw) ? raw : undefined;
}

function isItineraryPresentationBundle(value: unknown): value is ItineraryPresentationBundle {
  if (!isRecord(value)) return false;
  return value.revision === 'v1' && Array.isArray(value.days);
}

/** 从 trip.metadata 读取用户向日程展示层 */
export function extractItineraryPresentation(
  metadata?: Record<string, unknown> | null,
): ItineraryPresentationBundle | undefined {
  if (!metadata) return undefined;
  const raw = metadata.itineraryPresentation;
  return isItineraryPresentationBundle(raw) ? raw : undefined;
}

export function hasExperienceIntentMetadata(metadata?: Record<string, unknown> | null): boolean {
  return Boolean(extractExperienceUnderstanding(metadata) || extractExperienceExplanation(metadata));
}
