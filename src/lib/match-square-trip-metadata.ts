import type { HikingProfile } from '@/types/hiking-embedded';
import type { TripInstantiationStrategy } from '@/types/trip-instantiation';
import { getTripHikingProfile } from '@/lib/trip-hiking';

/** POST instantiate-trip 写入 Trip.metadata.matchSquareInstantiation */
export type MatchSquareInstantiationMetadata = {
  strategy?: TripInstantiationStrategy | string;
  hikingProfile?: HikingProfile;
  recruitmentPostId?: string;
  catalogId?: string;
  sealedAt?: string;
};

const HIKING_INSTANTIATION_STRATEGIES = new Set<string>([
  'route_template_v1',
  'embedded_hiking_v1',
  'embedded_hiking',
  'primary_hiking_v1',
  'primary_hiking',
  'spawn_trek_v1',
  'spawn_trek',
  'hard_trek_v1',
  'hard_trek',
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function parseHikingProfile(value: unknown): HikingProfile | undefined {
  if (value === 'embedded' || value === 'primary' || value === 'none') return value;
  return undefined;
}

export function getMatchSquareInstantiation(
  metadata?: Record<string, unknown> | null
): MatchSquareInstantiationMetadata | null {
  const raw =
    asRecord(metadata?.matchSquareInstantiation) ??
    asRecord(metadata?.match_square_instantiation);
  if (!raw) return null;

  const strategyRaw = raw.strategy ?? raw.instantiation_strategy;
  const hikingProfileRaw = raw.hikingProfile ?? raw.hiking_profile;

  return {
    strategy: strategyRaw != null ? String(strategyRaw) : undefined,
    hikingProfile: parseHikingProfile(hikingProfileRaw),
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

function resolveInstantiationHikingProfile(
  metadata: Record<string, unknown>,
  inst: MatchSquareInstantiationMetadata
): HikingProfile {
  if (inst.hikingProfile) return inst.hikingProfile;
  const topLevel = parseHikingProfile(metadata.hikingProfile);
  if (topLevel) return topLevel;
  return getTripHikingProfile({ metadata });
}

function isHikingInstantiationStrategy(strategy: string | undefined): boolean {
  if (!strategy) return false;
  const normalized = strategy.trim().toLowerCase();
  if (HIKING_INSTANTIATION_STRATEGIES.has(normalized)) return true;
  return /(?:^|_)(?:trek|hiking|embedded_hiking|hard_trek)(?:_|$)/i.test(normalized);
}

/**
 * Match Square 成团实例化的徒步行程不走 NL「行程项生成中」门禁。
 * 分支依据：metadata.matchSquareInstantiation.strategy / hikingProfile（及顶层 hikingProfile）。
 */
export function skipsItineraryItemsGenerationGate(
  trip: { metadata?: Record<string, unknown> } | null | undefined
): boolean {
  const metadata = trip?.metadata;
  if (!metadata) return false;

  const inst = getMatchSquareInstantiation(metadata);
  if (!inst) return false;

  const profile = resolveInstantiationHikingProfile(metadata, inst);
  if (profile === 'embedded' || profile === 'primary') return true;

  return isHikingInstantiationStrategy(inst.strategy);
}
