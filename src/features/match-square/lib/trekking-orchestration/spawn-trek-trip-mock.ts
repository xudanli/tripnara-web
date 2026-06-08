import type { RecruitmentApplicationCard, RecruitmentPostCard } from '@/types/match-square';
import type { SpawnTrekTripPreview, SpawnTrekTripRequest, SpawnTrekTripResult } from '@/types/spawn-trek-trip';
import { hikePlanLocalStore } from '@/services/hike-plan-local-store';
import { buildSpawnPreviewFromOrchestration } from './normalize-spawn-trek-trip';
import { computeSpawnTeamGate } from './build-spawn-preview-from-post';
import { resolveLiveRouteDirectionId } from './route-direction-keys';

const spawnStateByPost = new Map<string, NonNullable<RecruitmentPostCard['trekSpawnState']>>();

function approvedCount(apps: RecruitmentApplicationCard[]): number {
  return apps.filter((a) => a.status === 'approved').length;
}

function teamReady(post: RecruitmentPostCard, approved: number): { ok: boolean; reason?: string } {
  const gate = computeSpawnTeamGate(post, approved);
  return { ok: gate.canSpawn, reason: gate.blockReason ?? undefined };
}

function pickRoute(
  preview: SpawnTrekTripPreview,
  body: SpawnTrekTripRequest
): SpawnTrekTripPreview['liveCandidates'][number] | null {
  if (body.routeDirectionId != null) {
    return (
      preview.liveCandidates.find((c) => c.routeDirectionId === body.routeDirectionId) ??
      preview.liveCandidates[0] ??
      null
    );
  }
  if (body.routeDirectionKey) {
    return (
      preview.liveCandidates.find((c) => c.routeDirectionKey === body.routeDirectionKey) ??
      null
    );
  }
  return preview.liveCandidates.find((c) => c.recommended) ?? preview.liveCandidates[0] ?? null;
}

export async function mockGetSpawnTrekTripPreview(
  post: RecruitmentPostCard,
  applications: RecruitmentApplicationCard[]
): Promise<SpawnTrekTripPreview> {
  const orchestration = post.trekkingOrchestration;
  if (!orchestration) {
    return {
      canSpawn: false,
      blockReason: '该招募未绑定 Premium Trekking 编排计划',
      liveCandidates: [],
      plannedCandidates: [],
    };
  }

  const existing = spawnStateByPost.get(post.id);
  const ready = teamReady(post, approvedCount(applications));

  return buildSpawnPreviewFromOrchestration(orchestration, {
    canSpawn: ready.ok,
    blockReason: ready.reason,
    alreadySpawned: Boolean(existing?.hikePlanId),
    existingHikePlanId: existing?.hikePlanId ?? null,
    postRouteDirectionId: post.routeDirectionId,
  });
}

export async function mockSpawnTrekTrip(
  post: RecruitmentPostCard,
  applications: RecruitmentApplicationCard[],
  body: SpawnTrekTripRequest
): Promise<SpawnTrekTripResult> {
  const preview = await mockGetSpawnTrekTripPreview(post, applications);

  if (preview.alreadySpawned && preview.existingHikePlanId) {
    return {
      success: true,
      message: '徒步计划已存在',
      hikePlanId: preview.existingHikePlanId,
      tripId: spawnStateByPost.get(post.id)?.tripId ?? null,
      routeDirectionId: spawnStateByPost.get(post.id)?.routeDirectionId ?? null,
    };
  }

  if (!preview.canSpawn) {
    return {
      success: false,
      message: preview.blockReason ?? '当前无法 spawn 徒步计划',
    };
  }

  const route = pickRoute(preview, body);
  if (!route?.routeDirectionId) {
    return {
      success: false,
      message: '请选择已上线的 live 路线；planned 路线暂不可 spawn',
    };
  }

  const routeDirectionId =
    route.routeDirectionId ??
    resolveLiveRouteDirectionId(route.routeDirectionKey, post.routeDirectionId);

  if (routeDirectionId == null) {
    return { success: false, message: '路线 ID 无效' };
  }

  const plan = await hikePlanLocalStore.create({
    routeDirectionId,
    routeDirectionName: route.routeDirectionKey,
    nameCN: route.label,
    plannedDate: post.startDate || new Date().toISOString().slice(0, 10),
    tripId: `trip-spawn-${post.id}`,
  });

  const tripId = `trip-spawn-${post.id}`;
  spawnStateByPost.set(post.id, {
    spawnedAt: new Date().toISOString(),
    hikePlanId: plan.id,
    tripId,
    routeDirectionId,
    routeDirectionKey: route.routeDirectionKey,
  });

  const orchestration = post.trekkingOrchestration;
  const reasons = orchestration?.dnaEvolution?.preferenceEvolutionReasons;

  return {
    success: true,
    message: '已创建徒步计划并 attach hard-trek 元数据（mock）',
    hikePlanId: plan.id,
    tripId,
    routeDirectionId,
    routeDirectionName: route.label,
    hardTrekTrailPlanAttached: orchestration?.worldModel.profile === 'heavy_offline_dem',
    offlinePackMeta: orchestration?.worldModel.offlineDataPreloadRequired
      ? {
          routeDirectionId,
          demGridMetres: orchestration.worldModel.demGridMetres ?? null,
          preloadRequired: true,
        }
      : null,
    dnaSyncScheduled: Boolean(reasons?.length),
    preferenceEvolutionReasons: reasons,
  };
}

export function getMockTrekSpawnState(postId: string) {
  return spawnStateByPost.get(postId);
}
