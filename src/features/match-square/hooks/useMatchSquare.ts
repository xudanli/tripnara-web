import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { matchSquareApi } from '@/api/match-square';
import { deriveMatchSquareAccessFromCapabilities } from '@/lib/account-governance';
import { useAccountCapabilities } from '@/hooks/useAccountCapabilities';
import type { PostListFilters, RecruitmentApplicationCard, RecruitmentPostCard, ReviewApplicationAttributionContext, TravelIntentStatus } from '@/types/match-square';
import { loadMyRecruitmentHub } from '../lib/my-recruitments';
import { resolvePostDetailWithFallback } from '../lib/resolve-post-detail-fallback';
import { enrichApplicationsWithApplicantIdentity } from '../lib/enrich-applications-applicant-identity';
import { buildSpawnPreviewFromPost } from '../lib/trekking-orchestration/build-spawn-preview-from-post';

export const MY_RECRUITMENT_HUB_QUERY_KEY = ['match-square', 'my-recruitment-hub'] as const;

const TRAVEL_INTENT_QUERY_KEY = ['match-square', 'travel-intent'] as const;

function mergeTravelIntentCache(
  prev: TravelIntentStatus | undefined,
  next: TravelIntentStatus,
  fallbackActive?: boolean
): TravelIntentStatus {
  const activeFromStatus =
    next.active ||
    fallbackActive === true ||
    (next as { status?: string }).status === 'active';
  return {
    ...(prev ?? { active: false, updatedAt: null }),
    ...next,
    active: activeFromStatus,
  };
}

export function useMatchSquareAccess() {
  const { data: capabilities } = useAccountCapabilities();

  return useQuery({
    queryKey: ['match-square', 'access', capabilities?.userId ?? 'anonymous'],
    queryFn: () => matchSquareApi.getAccess(),
    select: (apiAccess) => {
      if (!capabilities) return apiAccess;
      const governed = deriveMatchSquareAccessFromCapabilities(capabilities);
      return {
        ...apiAccess,
        canPost: governed.canPost,
        canApply: governed.canApply || apiAccess.canApply,
      };
    },
    staleTime: 30_000,
  });
}

export function useMatchSquareFilterOptions() {
  return useQuery({
    queryKey: ['match-square', 'filter-options'],
    queryFn: () => matchSquareApi.getFilterOptions(),
    staleTime: 300_000,
  });
}

export function useMatchSquarePlaza(filters: PostListFilters) {
  return useQuery({
    queryKey: ['match-square', 'posts', filters],
    queryFn: () => matchSquareApi.listPosts(filters),
    staleTime: 15_000,
  });
}

export function usePostDetail(id: string | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['match-square', 'post', id],
    queryFn: () => resolvePostDetailWithFallback(id!, qc),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useMyPosts(enabled = true) {
  return useQuery({
    queryKey: ['match-square', 'my-posts'],
    queryFn: () => matchSquareApi.listMyPosts(),
    staleTime: 15_000,
    enabled,
  });
}

export function useMyRecruitmentHub(enabled = true) {
  return useQuery({
    queryKey: MY_RECRUITMENT_HUB_QUERY_KEY,
    queryFn: () => loadMyRecruitmentHub(),
    staleTime: 15_000,
    enabled,
  });
}

export function usePostApplications(postId: string | undefined, status?: 'pending') {
  return useQuery({
    queryKey: ['match-square', 'applications', postId, status ?? 'all'],
    queryFn: async () => {
      // 先拉全量再客户端筛 pending，避免后端 status 参数/枚举不一致导致空列表
      const all = await matchSquareApi.listApplications(postId!);
      const enriched = await enrichApplicationsWithApplicantIdentity(all);
      if (!status) return enriched;
      return enriched.filter((item) => item.status === status);
    },
    enabled: Boolean(postId),
    staleTime: 10_000,
  });
}

export function useApplyPreview(postId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['match-square', 'apply-preview', postId],
    queryFn: () => matchSquareApi.getApplyPreview(postId!),
    enabled: Boolean(postId) && enabled,
    staleTime: 60_000,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: matchSquareApi.createPost,
    onSuccess: (card: RecruitmentPostCard) => {
      qc.setQueryData(['match-square', 'post', card.id], card);
      qc.invalidateQueries({ queryKey: ['match-square', 'posts'] });
      qc.invalidateQueries({ queryKey: ['match-square', 'my-posts'] });
      qc.invalidateQueries({ queryKey: MY_RECRUITMENT_HUB_QUERY_KEY });
    },
  });
}

export function useUpdatePostStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Parameters<typeof matchSquareApi.updatePostStatus>[1]['status'] }) =>
      matchSquareApi.updatePostStatus(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match-square'] });
    },
  });
}

export function useSubmitApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, payload }: { postId: string; payload: Parameters<typeof matchSquareApi.submitApplication>[1] }) =>
      matchSquareApi.submitApplication(postId, payload),
    onSuccess: (application, variables) => {
      qc.setQueryData<RecruitmentApplicationCard[]>(['match-square', 'my-applications'], (prev) => {
        const rest = (prev ?? []).filter((item) => item.postId !== variables.postId);
        return [application, ...rest];
      });
      qc.invalidateQueries({ queryKey: ['match-square', 'applications', variables.postId] });
      qc.invalidateQueries({ queryKey: ['match-square', 'posts'] });
      qc.invalidateQueries({ queryKey: ['match-square', 'post', variables.postId] });
      qc.invalidateQueries({ queryKey: ['match-square', 'apply-preview', variables.postId] });
      qc.invalidateQueries({ queryKey: ['match-square', 'my-applications'] });
      qc.invalidateQueries({ queryKey: MY_RECRUITMENT_HUB_QUERY_KEY });
    },
  });
}

export function useReviewApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      postId,
      applicationId,
      action,
      attributionContext,
    }: {
      postId: string;
      applicationId: string;
      action: 'approve' | 'reject';
      attributionContext?: ReviewApplicationAttributionContext;
    }) =>
      matchSquareApi.reviewApplication(postId, applicationId, {
        action,
        ...attributionContext,
      }),
    onSuccess: (data, variables) => {
      if (data.teamPuzzle) {
        qc.setQueryData<RecruitmentPostCard>(
          ['match-square', 'post', variables.postId],
          (prev) => (prev ? { ...prev, teamPuzzle: data.teamPuzzle ?? prev.teamPuzzle } : prev)
        );
      }
      qc.invalidateQueries({ queryKey: ['match-square', 'post', variables.postId] });
      qc.invalidateQueries({ queryKey: ['match-square', 'applications', variables.postId] });
      qc.invalidateQueries({ queryKey: ['match-square', 'posts'] });
      qc.invalidateQueries({ queryKey: ['match-square', 'my-posts'] });
      qc.invalidateQueries({ queryKey: ['match-square', 'my-applications'] });
      qc.invalidateQueries({ queryKey: MY_RECRUITMENT_HUB_QUERY_KEY });
    },
  });
}

export function useMyApplications(enabled = true) {
  return useQuery({
    queryKey: ['match-square', 'my-applications'],
    queryFn: async () => {
      const apps = await matchSquareApi.listMyApplications();
      return enrichApplicationsWithApplicantIdentity(apps);
    },
    enabled,
    staleTime: 15_000,
  });
}

export function useTravelIntent() {
  return useQuery({
    queryKey: TRAVEL_INTENT_QUERY_KEY,
    queryFn: () => matchSquareApi.getTravelIntent(),
    staleTime: 30_000,
  });
}

export function useUpsertTravelIntent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: matchSquareApi.upsertTravelIntent,
    onSuccess: (data) => {
      qc.setQueryData<TravelIntentStatus>(TRAVEL_INTENT_QUERY_KEY, (prev) =>
        mergeTravelIntentCache(prev, data)
      );
    },
  });
}

export function usePatchTravelIntentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: matchSquareApi.patchTravelIntentStatus,
    onSuccess: (data, variables) => {
      qc.setQueryData<TravelIntentStatus>(TRAVEL_INTENT_QUERY_KEY, (prev) =>
        mergeTravelIntentCache(
          prev,
          data,
          variables.status === 'active' || variables.active === true
        )
      );
    },
  });
}

export function useCaptainRadar(postId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['match-square', 'captain-radar', postId],
    queryFn: () => matchSquareApi.getCaptainRadar(postId!),
    enabled: Boolean(postId) && enabled,
    staleTime: 20_000,
  });
}

export function useSendOliveBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      postId,
      body,
    }: {
      postId: string;
      body: Parameters<typeof matchSquareApi.sendOliveBranch>[1];
    }) => matchSquareApi.sendOliveBranch(postId, body),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['match-square', 'captain-radar', vars.postId] });
      qc.invalidateQueries({ queryKey: ['match-square', 'my-posts'] });
    },
  });
}

export function useOliveBranchInvitations() {
  return useQuery({
    queryKey: ['match-square', 'olive-branch-invitations'],
    queryFn: () => matchSquareApi.listOliveBranchInvitations(),
    staleTime: 20_000,
    placeholderData: [],
  });
}

export function useRespondOliveBranchInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      invitationId,
      action,
    }: {
      invitationId: string;
      action: 'accept' | 'decline';
    }) => matchSquareApi.respondOliveBranchInvitation(invitationId, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match-square', 'olive-branch-invitations'] });
    },
  });
}

export function useSpawnTrekTripPreview(
  postId: string | undefined,
  enabled = true,
  post?: Pick<
    RecruitmentPostCard,
    'trekkingOrchestration' | 'teamStatus' | 'trekSpawnState' | 'routeDirectionId'
  > | null
) {
  return useQuery({
    queryKey: ['match-square', 'spawn-trek-trip-preview', postId],
    queryFn: async () => {
      try {
        return await matchSquareApi.getSpawnTrekTripPreview(postId!);
      } catch {
        const local = post ? buildSpawnPreviewFromPost(post) : null;
        if (local) return local;
        throw new Error('spawn preview unavailable');
      }
    },
    enabled: Boolean(postId) && enabled,
    staleTime: 20_000,
  });
}

export function useSpawnTrekTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      body,
      post,
      applications,
    }: {
      postId: string;
      body?: Parameters<typeof matchSquareApi.spawnTrekTrip>[1];
      post?: RecruitmentPostCard;
      applications?: RecruitmentApplicationCard[];
    }) => {
      try {
        return await matchSquareApi.spawnTrekTrip(postId, body);
      } catch {
        if (post) {
          const { mockSpawnTrekTrip } = await import(
            '../lib/trekking-orchestration/spawn-trek-trip-mock'
          );
          return mockSpawnTrekTrip(post, applications ?? [], body ?? {});
        }
        throw new Error('spawn 徒步计划失败');
      }
    },
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ['match-square', 'post', variables.postId] });
      qc.invalidateQueries({
        queryKey: ['match-square', 'spawn-trek-trip-preview', variables.postId],
      });
      qc.invalidateQueries({ queryKey: ['match-square', 'my-posts'] });
    },
  });
}

export function useTripInstantiationPreview(
  postId: string | undefined,
  enabled = true,
  post?: RecruitmentPostCard | null
) {
  return useQuery({
    queryKey: ['match-square', 'trip-instantiation-preview', postId],
    queryFn: async () => {
      try {
        return await matchSquareApi.getTripInstantiationPreview(postId!);
      } catch {
        if (post) {
          const { buildTripInstantiationPreviewFromPost } = await import(
            '../lib/trip-instantiation/build-instantiation-preview-from-post'
          );
          return buildTripInstantiationPreviewFromPost(post);
        }
        throw new Error('instantiation preview unavailable');
      }
    },
    enabled: Boolean(postId) && enabled,
    staleTime: 20_000,
  });
}

export function useInstantiateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      body,
      post,
    }: {
      postId: string;
      body?: Parameters<typeof matchSquareApi.instantiateTrip>[1];
      post?: RecruitmentPostCard;
    }) => {
      try {
        return await matchSquareApi.instantiateTrip(postId, body);
      } catch {
        if (post) {
          const { mockInstantiateTrip } = await import(
            '../lib/trip-instantiation/trip-instantiation-mock'
          );
          return mockInstantiateTrip(post, body ?? {});
        }
        throw new Error('实例化 Active Trip 失败');
      }
    },
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ['match-square', 'post', variables.postId] });
      qc.invalidateQueries({
        queryKey: ['match-square', 'trip-instantiation-preview', variables.postId],
      });
      qc.invalidateQueries({ queryKey: ['match-square', 'my-posts'] });
    },
  });
}

export function useForceLockPreview(
  postId: string | undefined,
  enabled = false,
  post?: RecruitmentPostCard | null
) {
  return useQuery({
    queryKey: ['match-square', 'force-lock-preview', postId],
    queryFn: async () => {
      try {
        return await matchSquareApi.getForceLockPreview(postId!);
      } catch {
        if (post) {
          const { buildForceLockPreviewFromPost } = await import(
            '../lib/sovereign-force-lock/build-force-lock-preview-from-post'
          );
          return buildForceLockPreviewFromPost(post);
        }
        throw new Error('force-lock preview unavailable');
      }
    },
    enabled: Boolean(postId) && enabled,
    staleTime: 10_000,
  });
}

export function useCommitForceLock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      postId,
      body,
    }: {
      postId: string;
      body?: Parameters<typeof matchSquareApi.commitForceLock>[1];
    }) => matchSquareApi.commitForceLock(postId, body),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ['match-square', 'post', variables.postId] });
      qc.invalidateQueries({
        queryKey: ['match-square', 'force-lock-preview', variables.postId],
      });
      qc.invalidateQueries({ queryKey: ['match-square', 'applications', variables.postId] });
      qc.invalidateQueries({ queryKey: ['match-square', 'my-posts'] });
      qc.invalidateQueries({ queryKey: MY_RECRUITMENT_HUB_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['match-square', 'posts'] });
      qc.invalidateQueries({
        queryKey: ['match-square', 'trip-instantiation-preview', variables.postId],
      });
    },
  });
}
