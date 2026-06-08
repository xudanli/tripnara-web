import type { RecruitmentPostCard } from '@/types/match-square';
import type { SpawnTrekTripPreview } from '@/types/spawn-trek-trip';
import { buildSpawnPreviewFromOrchestration } from './normalize-spawn-trek-trip';

export function computeSpawnTeamGate(
  post: Pick<RecruitmentPostCard, 'teamStatus'>,
  approvedCount = 0
): { canSpawn: boolean; blockReason: string | null } {
  const needed = post.teamStatus?.slotsNeeded ?? 1;
  const filled = (post.teamStatus?.slotsFilled ?? 1) + approvedCount;
  const remaining = post.teamStatus?.slotsRemaining ?? Math.max(0, needed);

  if (remaining <= 0 || filled >= needed + 1 || approvedCount > 0) {
    return { canSpawn: true, blockReason: null };
  }
  return {
    canSpawn: false,
    blockReason: `还需 ${remaining} 位队员入队后才能 spawn 徒步计划`,
  };
}

/** 后端 spawn preview 未就绪时，从帖内 trekkingOrchestration 本地构建 */
export function buildSpawnPreviewFromPost(
  post: Pick<
    RecruitmentPostCard,
    'trekkingOrchestration' | 'teamStatus' | 'trekSpawnState' | 'routeDirectionId'
  >,
  approvedCount = 0
): SpawnTrekTripPreview | null {
  const orchestration = post.trekkingOrchestration;
  if (!orchestration) return null;

  const gate = computeSpawnTeamGate(post, approvedCount);

  return buildSpawnPreviewFromOrchestration(orchestration, {
    canSpawn: gate.canSpawn,
    blockReason: gate.blockReason,
    alreadySpawned: Boolean(post.trekSpawnState?.hikePlanId),
    existingHikePlanId: post.trekSpawnState?.hikePlanId ?? null,
    postRouteDirectionId: post.routeDirectionId,
  });
}
