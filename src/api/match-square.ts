/**
 * Match Square API
 * @see Decision OS · Match Square 前端集成指南 v1.0.0
 */

import apiClient from './client';
import { matchSquareMockStore } from '@/features/match-square/lib/mock-store';
import { serializePostListFilters } from '@/features/match-square/lib/query-params';
import {
  getMatchSquareApiMode,
  withMatchSquareFallback,
} from '@/features/match-square/lib/match-square-api-mode';
import { normalizeApplyPreview, normalizeApplicationCard, normalizeApplicationsList, normalizeCaptainRadar, normalizeFilterOptions, normalizeMatchSquareAccess, normalizeMyPostListResponse, normalizePostDetail, normalizePostListResponse, normalizeReviewApplicationResponse, normalizeTravelIntent, normalizeUserCredentialsResponse } from '@/features/match-square/lib/normalize-api-response';
import { serializeSubmitApplicationRequest } from '@/features/match-square/lib/serialize-submit-application';
import { normalizeSpawnTrekTripPreview, normalizeSpawnTrekTripResult } from '@/features/match-square/lib/trekking-orchestration/normalize-spawn-trek-trip';
import {
  normalizeInstantiateTripResult,
  normalizeTripInstantiationPreview,
} from '@/features/match-square/lib/trip-instantiation';
import {
  normalizeSovereignForceLockCommitResult,
  normalizeSovereignForceLockPreview,
} from '@/features/match-square/lib/sovereign-force-lock/normalize-sovereign-force-lock';
import { mergeCreatePostVibeSnapshot } from '@/features/match-square/lib/vibe-llm/puzzle-from-vibe';
import type {
  ApplyPreview,
  CaptainRadarResponse,
  CreatePostRequest,
  MatchSquareAccess,
  MatchSquareFilterOptions,
  OliveBranchInvitation,
  PatchTravelIntentStatusRequest,
  PostListFilters,
  PostListResponse,
  RecruitmentApplicationCard,
  RecruitmentPostCard,
  RespondOliveBranchRequest,
  ReviewApplicationRequest,
  SendOliveBranchRequest,
  SubmitApplicationRequest,
  TravelIntentStatus,
  UpsertTravelIntentRequest,
  UpdatePostStatusRequest,
} from '@/types/match-square';
import type { SpawnTrekTripRequest } from '@/types/spawn-trek-trip';
import type { InstantiateTripRequest } from '@/types/trip-instantiation';
import type { SovereignForceLockRequest } from '@/types/sovereign-force-lock';
import {
  captainRadarMockStore,
  travelIntentMockStore,
} from '@/features/match-square/lib/travel-intent-mock-store';
import { userCredentialsMockStore } from '@/features/match-square/lib/user-credentials-mock-store';

const BASE_PATH = '/match-square';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

function unwrap<T>(payload: SuccessResponse<T> | T): T {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return (payload as SuccessResponse<T>).data;
  }
  return payload as T;
}

export class MatchSquareApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'MatchSquareApiError';
  }
}

function toApiError(error: unknown, fallback: string): MatchSquareApiError {
  const err = error as {
    response?: { data?: { error?: { code?: string; message?: string } } };
    code?: string;
    message?: string;
  };
  const code = err.response?.data?.error?.code ?? err.code ?? 'REQUEST_ERROR';
  const message = err.response?.data?.error?.message ?? err.message ?? fallback;
  return new MatchSquareApiError(code, message);
}

async function live<T>(fn: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toApiError(error, fallback);
  }
}

export const matchSquareApi = {
  getAccess: () =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<MatchSquareAccess | unknown>>(
            `${BASE_PATH}/access`
          );
          return normalizeMatchSquareAccess(unwrap(response.data));
        }, '获取广场权限失败'),
      () => matchSquareMockStore.getAccess()
    ),

  getFilterOptions: () =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<MatchSquareFilterOptions | unknown>>(
            `${BASE_PATH}/filters/options`
          );
          return normalizeFilterOptions(unwrap(response.data));
        }, '获取筛选选项失败'),
      () => matchSquareMockStore.getFilterOptions()
    ),

  listPosts: (filters: PostListFilters = {}) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<PostListResponse | unknown>>(
            `${BASE_PATH}/posts`,
            { params: serializePostListFilters(filters) }
          );
          return normalizePostListResponse(unwrap(response.data));
        }, '获取招募列表失败'),
      () => matchSquareMockStore.listPosts(filters)
    ),

  getPost: (id: string) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<RecruitmentPostCard | unknown>>(
            `${BASE_PATH}/posts/${id}`
          );
          return normalizePostDetail(unwrap(response.data));
        }, '获取招募详情失败'),
      async () => {
        const post = await matchSquareMockStore.getPost(id);
        if (!post) throw new MatchSquareApiError('NOT_FOUND', '招募帖不存在');
        return post;
      }
    ),

  listMyPosts: () =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<PostListResponse | unknown>>(
            `${BASE_PATH}/my/posts`
          );
          return normalizeMyPostListResponse(unwrap(response.data));
        }, '获取我的招募失败'),
      async () => {
        const list = await matchSquareMockStore.listMyPosts();
        return normalizeMyPostListResponse(list);
      }
    ),

  createPost: (payload: CreatePostRequest) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<RecruitmentPostCard | unknown>>(
            `${BASE_PATH}/posts`,
            payload
          );
          const card = normalizePostDetail(unwrap(response.data));
          return mergeCreatePostVibeSnapshot(card, payload);
        }, '发布招募失败'),
      () => matchSquareMockStore.createPost(payload)
    ),

  updatePostStatus: (id: string, payload: UpdatePostStatusRequest) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.patch<SuccessResponse<RecruitmentPostCard | unknown>>(
            `${BASE_PATH}/posts/${id}/status`,
            payload
          );
          return normalizePostDetail(unwrap(response.data));
        }, '更新招募状态失败'),
      async () => {
        const post = await matchSquareMockStore.updatePostStatus(id, payload.status);
        if (!post) throw new MatchSquareApiError('NOT_FOUND', '招募帖不存在');
        return post;
      }
    ),

  getApplyPreview: (postId: string) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<ApplyPreview>>(
            `${BASE_PATH}/posts/${postId}/apply-preview`
          );
          return normalizeApplyPreview(unwrap(response.data));
        }, '获取申请预览失败'),
      () => matchSquareMockStore.getApplyPreview(postId)
    ),

  listApplications: (postId: string, status?: 'pending') =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const load = async (path: string) => {
            const response = await apiClient.get<SuccessResponse<unknown>>(path, {
              params: status ? { status } : undefined,
            });
            return normalizeApplicationsList(unwrap(response.data));
          };

          let list: RecruitmentApplicationCard[] = [];
          try {
            list = await load(`${BASE_PATH}/posts/${postId}/applications`);
          } catch {
            list = [];
          }

          if (!list.length) {
            try {
              list = await load(`${BASE_PATH}/my/posts/${postId}/applications`);
            } catch {
              /* 队长专用路径不可用时忽略 */
            }
          }

          if (!status) return list;
          return list.filter((item) => item.status === status);
        }, '获取申请列表失败'),
      () => matchSquareMockStore.listApplications(postId, status)
    ),

  submitApplication: (postId: string, payload: SubmitApplicationRequest) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<RecruitmentApplicationCard>>(
            `${BASE_PATH}/posts/${postId}/applications`,
            serializeSubmitApplicationRequest(payload)
          );
          return normalizeApplicationCard(unwrap(response.data));
        }, '提交申请失败'),
      () => matchSquareMockStore.submitApplication(postId, payload)
    ),

  reviewApplication: (
    postId: string,
    applicationId: string,
    payload: ReviewApplicationRequest
  ) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.patch<SuccessResponse<unknown>>(
            `${BASE_PATH}/posts/${postId}/applications/${applicationId}`,
            payload
          );
          return normalizeReviewApplicationResponse(unwrap(response.data));
        }, '审批申请失败'),
      async () => {
        const result = await matchSquareMockStore.reviewApplication(
          postId,
          applicationId,
          payload
        );
        if (!result) throw new MatchSquareApiError('NOT_FOUND', '申请不存在');
        return result;
      }
    ),

  listMyApplications: () =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<unknown>>(
            `${BASE_PATH}/my/applications`
          );
          return normalizeApplicationsList(unwrap(response.data));
        }, '获取我的申请失败'),
      () => matchSquareMockStore.listMyApplications()
    ),

  getTravelIntent: () =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<TravelIntentStatus>>(
            `${BASE_PATH}/my/travel-intent`
          );
          return normalizeTravelIntent(unwrap(response.data));
        }, '获取旅行意向失败'),
      () => travelIntentMockStore.get()
    ),

  upsertTravelIntent: (body: UpsertTravelIntentRequest) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<TravelIntentStatus>>(
            `${BASE_PATH}/my/travel-intent`,
            body
          );
          return normalizeTravelIntent(unwrap(response.data));
        }, '更新旅行意向失败'),
      () => travelIntentMockStore.upsert(body)
    ),

  patchTravelIntentStatus: (body: PatchTravelIntentStatusRequest) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.patch<SuccessResponse<TravelIntentStatus>>(
            `${BASE_PATH}/my/travel-intent/status`,
            { status: body.status ?? (body.active ? 'active' : 'paused') }
          );
          return normalizeTravelIntent(unwrap(response.data));
        }, '更新意向广播状态失败'),
      () => travelIntentMockStore.patchStatus(body)
    ),

  getCaptainRadar: (postId: string) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<CaptainRadarResponse | unknown>>(
            `${BASE_PATH}/posts/${postId}/radar`
          );
          return normalizeCaptainRadar(unwrap(response.data), postId);
        }, '获取雷达候选失败'),
      async () => {
        const post = await matchSquareMockStore.getPost(postId);
        if (!post) throw new MatchSquareApiError('NOT_FOUND', '招募帖不存在');
        return captainRadarMockStore.getCandidates(post);
      }
    ),

  sendOliveBranch: (postId: string, body: SendOliveBranchRequest) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          await apiClient.post(`${BASE_PATH}/posts/${postId}/olive-branch`, {
            inviteeUserId: body.inviteeUserId ?? body.candidateUserId,
            inviteMessage: body.inviteMessage ?? body.message,
          });
        }, '投递橄榄枝失败'),
      () => captainRadarMockStore.sendOliveBranch(postId, body)
    ),

  listOliveBranchInvitations: () =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<
            SuccessResponse<{ items: OliveBranchInvitation[] } | OliveBranchInvitation[]>
          >(`${BASE_PATH}/my/olive-branch-invitations`);
          const data = unwrap(response.data);
          if (Array.isArray(data)) return data;
          if (data && typeof data === 'object') {
            const record = data as { items?: OliveBranchInvitation[]; invitations?: OliveBranchInvitation[] };
            return record.items ?? record.invitations ?? [];
          }
          return [];
        }, '获取橄榄枝邀请失败'),
      () => travelIntentMockStore.listInvitations()
    ),

  respondOliveBranchInvitation: (invitationId: string, body: RespondOliveBranchRequest) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.patch<SuccessResponse<OliveBranchInvitation>>(
            `${BASE_PATH}/olive-branch-invitations/${invitationId}`,
            body
          );
          return unwrap(response.data);
        }, '回应橄榄枝失败'),
      () => travelIntentMockStore.respondInvitation(invitationId, body)
    ),

  /** §14 · 他人只读背书（审批 / 雷达） */
  getUserCredentials: (
    userId: string,
    ctx?: { postId?: string; cardTitle?: string; mbtiType?: string }
  ) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const params = ctx?.postId ? { postId: ctx.postId } : undefined;
          const response = await apiClient.get<SuccessResponse<unknown>>(
            `${BASE_PATH}/users/${userId}/credentials`,
            { params }
          );
          const normalized = normalizeUserCredentialsResponse(unwrap(response.data));
          return normalized?.credentials ?? null;
        }, '获取用户背书失败'),
      async () => {
        const result = await userCredentialsMockStore.get(userId, ctx);
        return result.credentials;
      }
    ),

  getUserCredentialsBundle: (
    userId: string,
    ctx?: { postId?: string; cardTitle?: string; mbtiType?: string }
  ) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const params = ctx?.postId ? { postId: ctx.postId } : undefined;
          const response = await apiClient.get<SuccessResponse<unknown>>(
            `${BASE_PATH}/users/${userId}/credentials`,
            { params }
          );
          return normalizeUserCredentialsResponse(unwrap(response.data));
        }, '获取用户背书失败'),
      async () => {
        const result = await userCredentialsMockStore.get(userId, ctx);
        return {
          userId,
          cardTitle: result.cardTitle,
          mbtiType: result.mbtiType,
          credentials: result.credentials,
        };
      }
    ),

  /** §3.10 · 成团 spawn 徒步计划预览 */
  getSpawnTrekTripPreview: (postId: string) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<unknown>>(
            `${BASE_PATH}/posts/${postId}/spawn-trek-trip/preview`
          );
          return normalizeSpawnTrekTripPreview(unwrap(response.data));
        }, '获取 spawn 预览失败'),
      () => matchSquareMockStore.getSpawnTrekTripPreview(postId)
    ),

  /** §3.10 · 成团后 spawn TripNARA 徒步计划 */
  spawnTrekTrip: (postId: string, body: SpawnTrekTripRequest = {}) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<unknown>>(
            `${BASE_PATH}/posts/${postId}/spawn-trek-trip`,
            body
          );
          return normalizeSpawnTrekTripResult(unwrap(response.data));
        }, 'spawn 徒步计划失败'),
      () => matchSquareMockStore.spawnTrekTrip(postId, body)
    ),

  /** §3.12 · 成团 Active Trip 预览 */
  getTripInstantiationPreview: (postId: string) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<unknown>>(
            `${BASE_PATH}/posts/${postId}/instantiation/preview`
          );
          return normalizeTripInstantiationPreview(unwrap(response.data));
        }, '获取 instantiate 预览失败'),
      () => matchSquareMockStore.getTripInstantiationPreview(postId)
    ),

  /** §3.12 · 实例化 Active Trip */
  instantiateTrip: (postId: string, body: InstantiateTripRequest = {}) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<unknown>>(
            `${BASE_PATH}/posts/${postId}/instantiate-trip`,
            body
          );
          return normalizeInstantiateTripResult(unwrap(response.data));
        }, '实例化 Active Trip 失败'),
      () => matchSquareMockStore.instantiateTrip(postId, body)
    ),

  /** §3.15 · 队长强制成团预览 */
  getForceLockPreview: (postId: string) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<unknown>>(
            `${BASE_PATH}/posts/${postId}/force-lock/preview`
          );
          return normalizeSovereignForceLockPreview(unwrap(response.data));
        }, '获取锁团预览失败'),
      async () => {
        const post = await matchSquareMockStore.getPost(postId);
        if (!post) throw new MatchSquareApiError('NOT_FOUND', '招募帖不存在');
        const { buildForceLockPreviewFromPost } = await import(
          '@/features/match-square/lib/sovereign-force-lock/build-force-lock-preview-from-post'
        );
        return buildForceLockPreviewFromPost(post);
      }
    ),

  /** §3.15 · 执行队长强制成团 */
  commitForceLock: (postId: string, body: SovereignForceLockRequest = {}) =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<unknown>>(
            `${BASE_PATH}/posts/${postId}/force-lock`,
            body
          );
          return normalizeSovereignForceLockCommitResult(unwrap(response.data));
        }, '锁死阵容失败'),
      async () => {
        const { mockCommitForceLock } = await import(
          '@/features/match-square/lib/sovereign-force-lock/force-lock-mock'
        );
        return mockCommitForceLock(postId, body);
      }
    ),
};

export const isMatchSquareMockEnabled = getMatchSquareApiMode() !== 'live';
