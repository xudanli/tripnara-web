import type { RecruitmentPostCard } from '@/types/match-square';
import type { TripInstantiationPreview } from '@/types/trip-instantiation';
import { buildCollaborativeTaskPreview } from '../decision-engine/collaborative-task-dispatch.engine';

function isTeamFull(post: RecruitmentPostCard): boolean {
  return (
    post.status === 'closed' ||
    (post.teamStatus?.slotsRemaining != null && post.teamStatus.slotsRemaining <= 0)
  );
}

function resolveStrategy(post: RecruitmentPostCard): TripInstantiationPreview['plan']['strategy'] {
  if (post.routeTemplateCatalogId) return 'route_template_v1';
  if (post.vibeLlm?.chips?.length || post.vibeParse?.vibe_chips?.length) {
    return 'vibe_contextual_cards';
  }
  return 'generic_plaza_trip';
}

function contextualCardIds(post: RecruitmentPostCard): string[] {
  const fromLlm = post.vibeLlm?.chips?.map((c) => c.id).filter(Boolean) ?? [];
  if (fromLlm.length) return fromLlm;
  return (post.vibeParse?.vibe_chips ?? []).map((label, i) =>
    label.replace(/[^\w]/g, '').slice(0, 24) || `chip_${i}`
  );
}

/** 后端 preview 未就绪时，从帖状态本地构建 */
export function buildTripInstantiationPreviewFromPost(
  post: RecruitmentPostCard
): TripInstantiationPreview {
  const existingResult = post.tripInstantiationResult ?? null;
  const full = isTeamFull(post);

  if (existingResult?.tripId) {
    return {
      canInstantiate: false,
      blockReason: null,
      plan: {
        strategy: existingResult.plan?.strategy ?? resolveStrategy(post),
        canInstantiate: false,
        contextualCardIds: existingResult.plan?.contextualCardIds ?? contextualCardIds(post),
      },
      existingResult,
    };
  }

  if (!full) {
    return {
      canInstantiate: false,
      blockReason: '车队未满员或未结束招募，暂不可实例化 Active Trip',
      plan: {
        strategy: resolveStrategy(post),
        canInstantiate: false,
        contextualCardIds: contextualCardIds(post),
      },
    };
  }

  const strategy = resolveStrategy(post);
  const collaborativeTaskPreview = buildCollaborativeTaskPreview(post);
  return {
    canInstantiate: true,
    plan: {
      strategy,
      canInstantiate: true,
      contextualCardIds: contextualCardIds(post),
    },
    collaborativeTaskPreview,
  };
}
