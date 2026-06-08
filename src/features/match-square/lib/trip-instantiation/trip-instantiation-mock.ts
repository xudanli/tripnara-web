import type { RecruitmentPostCard } from '@/types/match-square';
import type {
  InstantiateTripRequest,
  TripInstantiationPreview,
  TripInstantiationResult,
} from '@/types/trip-instantiation';
import { buildCollaborativeTaskPreview } from '../decision-engine/collaborative-task-dispatch.engine';
import { mockBuildAndStoreFlywheelForTrip } from '../decision-engine/collaborative-task-flywheel-mock';
import { setActiveTripInstantiateContext } from '@/features/active-trip/lib/active-trip-context-store';
import { buildTripInstantiationPreviewFromPost } from './build-instantiation-preview-from-post';

const instantiationByPost = new Map<string, TripInstantiationResult>();

export function getMockTripInstantiationResult(postId: string): TripInstantiationResult | null {
  return instantiationByPost.get(postId) ?? null;
}

export function setMockTripInstantiationResult(
  postId: string,
  result: TripInstantiationResult
): void {
  instantiationByPost.set(postId, result);
}

export function mockGetTripInstantiationPreview(
  post: RecruitmentPostCard,
  approvedApplications: import('@/types/match-square').RecruitmentApplicationCard[] = []
): TripInstantiationPreview {
  const stored = getMockTripInstantiationResult(post.id);
  const preview = buildTripInstantiationPreviewFromPost({
    ...post,
    tripInstantiationResult: stored ?? post.tripInstantiationResult ?? null,
  });
  const collaborativeTaskPreview =
    preview.collaborativeTaskPreview ??
    buildCollaborativeTaskPreview(post, approvedApplications);
  const withTasks = { ...preview, collaborativeTaskPreview };
  if (stored) {
    return { ...withTasks, existingResult: stored, canInstantiate: false };
  }
  return withTasks;
}

export function mockInstantiateTrip(
  post: RecruitmentPostCard,
  body: InstantiateTripRequest = {},
  approvedApplications: import('@/types/match-square').RecruitmentApplicationCard[] = []
): TripInstantiationResult {
  const existing = getMockTripInstantiationResult(post.id) ?? post.tripInstantiationResult;
  if (existing?.tripId) {
    if (body.skipIfExists) return existing;
    return {
      success: true,
      message: 'Active Trip 已存在',
      tripId: existing.tripId,
      activeTripPath: existing.activeTripPath,
      plan: existing.plan,
      instantiatedAt: existing.instantiatedAt,
    };
  }

  const preview = buildTripInstantiationPreviewFromPost(post);
  if (!preview.canInstantiate) {
    return {
      success: false,
      message: preview.blockReason ?? '暂不可实例化',
      plan: preview.plan,
    };
  }

  const tripId = `trip-${post.id.replace(/^rec-/, '')}-${Date.now().toString(36)}`;
  const flywheel = mockBuildAndStoreFlywheelForTrip(tripId, post, approvedApplications);

  setActiveTripInstantiateContext({
    tripId,
    postId: post.id,
    postSnapshot: post,
    approvedApplications,
    plan: preview.plan,
    instantiatedAt: new Date().toISOString(),
  });

  const result: TripInstantiationResult = {
    success: true,
    message: 'Active Trip 已创建',
    tripId,
    activeTripPath: `/dashboard/trips/${tripId}/active`,
    plan: preview.plan,
    instantiatedAt: new Date().toISOString(),
    collaborativeTaskFlywheel: flywheel,
  };

  setMockTripInstantiationResult(post.id, result);
  return result;
}
