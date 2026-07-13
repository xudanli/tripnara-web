import type { TripInstantiationStrategy } from '@/types/trip-instantiation';

/** 模板/招募实例化写入 Trip.metadata 的骨架信息 */
export type TripInstantiationMetadata = {
  strategy?: TripInstantiationStrategy | string;
  recruitmentPostId?: string;
  catalogId?: string;
  sealedAt?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function getTripInstantiationMetadata(
  metadata?: Record<string, unknown> | null
): TripInstantiationMetadata | null {
  const raw =
    asRecord(metadata?.matchSquareInstantiation) ??
    asRecord(metadata?.match_square_instantiation);
  if (!raw) return null;

  const strategyRaw = raw.strategy ?? raw.instantiation_strategy;

  return {
    strategy: strategyRaw != null ? String(strategyRaw) : undefined,
    recruitmentPostId:
      raw.recruitmentPostId != null
        ? String(raw.recruitmentPostId)
        : raw.recruitment_post_id != null
          ? String(raw.recruitment_post_id)
          : undefined,
    catalogId:
      raw.catalogId != null
        ? String(raw.catalogId)
        : raw.catalog_id != null
          ? String(raw.catalog_id)
          : undefined,
    sealedAt:
      raw.sealedAt != null
        ? String(raw.sealedAt)
        : raw.sealed_at != null
          ? String(raw.sealed_at)
          : undefined,
  };
}

/**
 * 模板/招募实例化的行程不走 NL「行程项生成中」门禁。
 */
export function skipsItineraryItemsGenerationGate(
  trip: { metadata?: Record<string, unknown> } | null | undefined
): boolean {
  const metadata = trip?.metadata;
  if (!metadata) return false;
  return getTripInstantiationMetadata(metadata) != null;
}
