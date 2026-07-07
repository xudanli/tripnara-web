/**
 * activePacks 展示 — Debug/Ops；勿用于路由（flow + route.resolution 才是 SSOT）。
 */
import type { UnifiedDecisionActivePacks } from '@/types/unified-decision';

export function activePackLayerIds(
  packs?: UnifiedDecisionActivePacks | null,
): string[] {
  if (!packs) return [];
  if (packs.layers?.length) {
    return packs.layers.map((layer) => layer.packId).filter(Boolean);
  }
  if (packs.packIds?.length) return packs.packIds;
  return [];
}

export function formatActivePacksSummary(
  packs?: UnifiedDecisionActivePacks | null,
): string | null {
  const ids = activePackLayerIds(packs);
  if (ids.length === 0) return null;
  return ids.join(' · ');
}

export function destinationPackId(
  packs?: UnifiedDecisionActivePacks | null,
): string | null {
  const destinationLayers = activePackLayerIds(packs).filter((id) =>
    id.startsWith('destination.'),
  );
  if (destinationLayers.length === 0) return null;
  return destinationLayers.find((id) => id !== 'destination.global') ?? destinationLayers[0];
}
