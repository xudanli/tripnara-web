import type {
  ApplyPreview,
  CreatePostRequest,
  MatchSquareAccess,
  MatchSquareFilterOptions,
  PostListFilters,
  PostListResponse,
  RecruitmentApplicationCard,
  RecruitmentPostCard,
  RecruitmentPostStatus,
  ReviewApplicationRequest,
  ReviewApplicationResult,
  SubmitApplicationRequest,
} from '@/types/match-square';
import type { SpawnTrekTripPreview, SpawnTrekTripRequest, SpawnTrekTripResult } from '@/types/spawn-trek-trip';
import type { InstantiateTripRequest, TripInstantiationPreview, TripInstantiationResult } from '@/types/trip-instantiation';
import { enrichApplicationsWithDecisionBriefs } from './decision-engine/enrich-application-decision-brief';
import { enrichApplicationsWithMatchInsights } from './match-enrichment';
import { PLANNING_STYLE_CAPSULES } from './constants';
import { buildClarifyDestinationRegions } from './destination-options';
import { applyVibeParseToPost } from './vibe-llm/puzzle-from-vibe';
import { buildVibeLlmParseResponse } from './vibe-llm/normalize-api';
import { vibeLlmFromParse } from './vibe-llm/to-card-view';
import { buildTrekkingOrchestrationPlan } from './trekking-orchestration';
import {
  getMockTrekSpawnState,
  mockGetSpawnTrekTripPreview,
  mockSpawnTrekTrip,
} from './trekking-orchestration/spawn-trek-trip-mock';
import {
  getMockTripInstantiationResult,
  mockGetTripInstantiationPreview,
  mockInstantiateTrip,
} from './trip-instantiation/trip-instantiation-mock';
import {
  CURRENT_USER_ID,
  filterPosts,
  MOCK_APPLICATIONS,
  MOCK_POSTS,
} from './mock-data';
import { getMockAverageStars } from './reputation-mock-store';
import { applyTeamPuzzleToPost } from './team-puzzle';
import { DEFAULT_PHYSICAL_SURVIVAL_QUIZ } from './physical-survival-quiz';

function approvedApplicationsForPost(postId: string): RecruitmentApplicationCard[] {
  return (applications[postId] ?? []).filter((a) => a.status === 'approved');
}

function syncPostTeamState(post: RecruitmentPostCard): RecruitmentPostCard {
  return applyTeamPuzzleToPost(post, approvedApplicationsForPost(post.id));
}

function syncAllPostsTeamState(): void {
  posts = posts.map(syncPostTeamState);
}

let posts = [...MOCK_POSTS];
let applications = structuredClone(MOCK_APPLICATIONS);
let nextPostId = 100;
let nextAppId = 100;

const MOCK_ACCESS: MatchSquareAccess = {
  canBrowse: true,
  canPost: true,
  canApply: true,
  quizComplete: true,
};

const MOCK_FILTER_OPTIONS: MatchSquareFilterOptions = {
  personaQuadrants: [
    { id: 'NT', label: 'NT · 分析型' },
    { id: 'NF', label: 'NF · 理想型' },
    { id: 'SP', label: 'SP · 体验型' },
    { id: 'SJ', label: 'SJ · 守护型' },
  ],
  interactionModes: [
    { id: 'deep_learning', label: '深度共学型' },
    { id: 'easy_companion', label: '轻松陪伴型' },
    { id: 'independent', label: '各自独立型' },
  ],
  teamworkStyles: [
    { id: 'full_managed', label: '全托管', contractCapsule: PLANNING_STYLE_CAPSULES.full_managed },
    { id: 'co_planning', label: '一起策划', contractCapsule: PLANNING_STYLE_CAPSULES.co_planning },
    { id: 'casual_play', label: '一起随便玩', contractCapsule: PLANNING_STYLE_CAPSULES.casual_play },
  ],
  destinationRegions: buildClarifyDestinationRegions(),
};

function delay<T>(value: T, ms = 280): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function attachSpawnState(post: RecruitmentPostCard): RecruitmentPostCard {
  const state = getMockTrekSpawnState(post.id);
  if (!state) return post;
  return { ...post, trekSpawnState: state };
}

function attachTripInstantiationState(post: RecruitmentPostCard): RecruitmentPostCard {
  const result = getMockTripInstantiationResult(post.id) ?? post.tripInstantiationResult;
  if (!result) return post;
  return { ...post, tripInstantiationResult: result };
}

function attachPostSidecars(post: RecruitmentPostCard): RecruitmentPostCard {
  return attachTripInstantiationState(attachSpawnState(post));
}

export const matchSquareMockStore = {
  getAccess: (): Promise<MatchSquareAccess> => delay(MOCK_ACCESS),

  getFilterOptions: (): Promise<MatchSquareFilterOptions> => delay(MOCK_FILTER_OPTIONS),

  listPosts: (filters: PostListFilters = {}): Promise<PostListResponse> => {
    syncAllPostsTeamState();
    const items = filterPosts(posts, filters);
    return delay({ items, total: items.length });
  },

  getPost: (id: string): Promise<RecruitmentPostCard | null> => {
    syncAllPostsTeamState();
    const post = posts.find((p) => p.id === id);
    return delay(post ? attachPostSidecars(post) : null);
  },

  listMyPosts: (): Promise<PostListResponse> => {
    syncAllPostsTeamState();
    return delay({
      items: posts.filter((p) => p.captainUserId === CURRENT_USER_ID),
      total: posts.filter((p) => p.captainUserId === CURRENT_USER_ID).length,
    });
  },

  createPost: (payload: CreatePostRequest): Promise<RecruitmentPostCard> => {
    let item: RecruitmentPostCard = {
      id: `rec-${nextPostId++}`,
      status: 'active',
      captainUserId: CURRENT_USER_ID,
      captainCardTitle: '规划型探索者',
      captainMbtiType: 'INTJ',
      captainInteractionMode: 'deep_learning',
      captainInteractionModeLabel: '深度共学型',
      captainReputationStars: getMockAverageStars(),
      compatibilityPercent: null,
      destination: payload.destination,
      departureLabel: payload.departureLabel ?? null,
      startDate: payload.startDate,
      endDate: payload.endDate,
      teamStatus: {
        slotsFilled: 1,
        slotsNeeded: payload.slotsNeeded,
        slotsRemaining: payload.slotsNeeded,
      },
      captainMessage: payload.captainMessage,
      itinerarySummary: payload.itinerarySummary ?? '',
      budgetRange:
        payload.budgetMinCents != null || payload.budgetMaxCents != null
          ? {
              minCents: payload.budgetMinCents ?? null,
              maxCents: payload.budgetMaxCents ?? null,
            }
          : null,
      tripMoodTag: payload.tripMoodTag ?? null,
      planningStyle: payload.planningStyle,
      teamworkStyle: payload.planningStyle,
      teamworkStyleCapsule: PLANNING_STYLE_CAPSULES[payload.planningStyle],
      travelMode: payload.travelMode ?? null,
      vehicleInfo: payload.vehicleInfo ?? null,
      preferences: payload.preferences ?? null,
      publishedAt: new Date().toISOString(),
      routeDirectionId: payload.routeDirectionId ?? null,
      routeDirectionName: payload.routeDirectionName ?? null,
      activityProfile: payload.activityProfile ?? null,
      trekkingOrchestration: payload.trekkingOrchestration ?? null,
      routeTemplateCatalogId: payload.routeTemplateCatalogId ?? null,
      routeTemplateId: payload.routeTemplateId ?? null,
    };

    const vibeText = payload.vibeFreeText ?? payload.vibeRawText;
    const vibeTextTrimmed = vibeText?.trim() ?? '';

    if (vibeTextTrimmed || payload.vibeParse) {
      const fallbackParsed =
        !payload.vibeParse && vibeTextTrimmed
          ? buildVibeLlmParseResponse({
              freeText: vibeTextTrimmed,
              slotsNeeded: payload.slotsNeeded,
            })
          : null;

      const parse = payload.vibeParse ?? fallbackParsed!.parse;
      const parseSource =
        payload.parseSource ?? fallbackParsed?.parseSource ?? (payload.vibeParse ? 'llm' : 'rules');
      const teamworkContractModelLabel =
        payload.teamworkContractModelLabel ?? fallbackParsed?.teamworkContractModelLabel ?? null;

      item = applyVibeParseToPost(item, parse, vibeTextTrimmed || undefined, {
        parseSource,
        teamworkContractModelLabel,
      });
      item.recruitmentVision = vibeTextTrimmed || item.recruitmentVision;
      item.vibeLlm = vibeLlmFromParse(
        parse,
        parseSource,
        vibeTextTrimmed || undefined,
        teamworkContractModelLabel
      );

      const suggested = fallbackParsed;
      if (!payload.userEdited?.planningStyle && suggested) {
        item.planningStyle = suggested.suggestedPlanningStyle;
        item.teamworkStyle = suggested.suggestedPlanningStyle;
        item.teamworkStyleCapsule = PLANNING_STYLE_CAPSULES[suggested.suggestedPlanningStyle];
      }

      if (!payload.userEdited?.itinerary && !payload.itinerarySummary?.trim() && suggested) {
        item.itinerarySummary = suggested.suggestedItinerarySummary ?? item.itinerarySummary;
      }
      if (
        !payload.userEdited?.captain &&
        payload.captainMessage.trim().length < 5 &&
        suggested?.suggestedCaptainMessage
      ) {
        item.captainMessage = suggested.suggestedCaptainMessage;
      }
    }

    if (!item.trekkingOrchestration) {
      item.trekkingOrchestration =
        payload.trekkingOrchestration ??
        buildTrekkingOrchestrationPlan({
          visionText: vibeTextTrimmed,
          vibeChips: item.vibeLlm?.chips ?? item.vibeParse?.vibe_chips,
          activityProfile: item.activityProfile,
          routeDirectionId: item.routeDirectionId,
          routeDirectionName: item.routeDirectionName,
        });
    }

    posts = [item, ...posts];
    return delay(item);
  },

  updatePostStatus: (id: string, status: RecruitmentPostStatus): Promise<RecruitmentPostCard | null> => {
    const idx = posts.findIndex((p) => p.id === id);
    if (idx < 0) return delay(null);
    posts[idx] = { ...posts[idx], status };
    return delay(posts[idx]);
  },

  getApplyPreview: (postId: string): Promise<ApplyPreview> => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return delay({ canApply: false, blockReason: '招募帖不存在' });
    if (post.teamworkMatchBlocked) {
      return delay({
        canApply: false,
        blockReason: post.teamworkBlockReason ?? '组队风格不匹配',
      });
    }
    const score = post.compatibilityPercent ?? 0;
    const needsTeamwork =
      post.planningStyle === 'full_managed' || post.planningStyle === 'casual_play';
    const vibeContracts =
      post.vibeLlm?.behavioralContracts ??
      post.vibeParse?.behavior_contracts?.map((c) => ({
        title: c.tag,
        clauses: [c.clause],
      })) ??
      [];
    if (post.vibeLlm?.hardGatesSummary?.some((l) => l.includes('高授信'))) {
      return delay({
        canApply: false,
        blockReason: '该招募要求 High 授信等级，请先完成身份认证后再申请。',
        vibeBehavioralContracts: vibeContracts.length ? vibeContracts : undefined,
      });
    }

    const isHeavyTrek = post.routeTemplateCatalogId === 'is_laugavegur_55km_heavy_4d';
    if (isHeavyTrek) {
      const physicalFitnessGate = {
        blocked: false,
        report: {
          fitPercent: score || 78,
          evidenceLabel: '重装进阶 · 高海拔经验',
          lines: ['重装背包日走 18km+', '高海拔营地过夜经验'],
        },
      };
      const heavyPreview: ApplyPreview = {
        canApply: true,
        compatibilityPercent: score || undefined,
        highlights: ['体能档位与重装剧本匹配。'],
        warnings: ['内陆断网段需严格跟从队长安全蓝图。'],
        conflictPrompt: null,
        teamworkCommitmentPrompt: needsTeamwork
          ? {
              required: true,
              dimension: 'teamwork_style',
              teamworkStyle: post.planningStyle ?? 'co_planning',
              message:
                post.planningStyle === 'full_managed'
                  ? '队长选择全托管模式，你是否愿意以体验为主、配合队长决策？'
                  : '队长选择随便玩模式，你是否接受无硬日程、可即兴脱队？',
            }
          : null,
        vibeBehavioralContracts: vibeContracts.length ? vibeContracts : undefined,
        physicalFitnessGate,
        physicalSurvivalQuiz: DEFAULT_PHYSICAL_SURVIVAL_QUIZ,
      };
      return delay(heavyPreview);
    }

    const basePreview: ApplyPreview = {
      canApply: true,
      compatibilityPercent: score || undefined,
      highlights: ['基础人格维度契合，具备同行基础。'],
      warnings: [],
      conflictPrompt: null,
      teamworkCommitmentPrompt: needsTeamwork
        ? {
            required: true,
            dimension: 'teamwork_style',
            teamworkStyle: post.planningStyle ?? 'co_planning',
            message:
              post.planningStyle === 'full_managed'
                ? '队长选择全托管模式，你是否愿意以体验为主、配合队长决策？'
                : '队长选择随便玩模式，你是否接受无硬日程、可即兴脱队？',
          }
        : null,
      vibeBehavioralContracts: vibeContracts.length ? vibeContracts : undefined,
    };

    if (score > 0 && score < 85) {
      return delay({
        ...basePreview,
        compatibilityPercent: score,
        highlights: ['基础人格维度具备同行契合度。'],
        warnings: ['计划硬度存在差异，建议确认行程承诺。'],
        conflictPrompt: {
          required: true,
          dimension: 'planning_hardness',
          message:
            '检测到你们对「计划硬度」的认知存在差异，你是否愿意向队长做出不迟到、配合核心行程的承诺声明？',
        },
      });
    }
    return delay(basePreview);
  },

  listApplications: (
    postId: string,
    status?: ApplicationStatusFilter
  ): Promise<RecruitmentApplicationCard[]> => {
    const post = posts.find((p) => p.id === postId);
    let list = applications[postId] ?? [];
    if (status) list = list.filter((a) => a.status === status);
    if (post) {
      list = enrichApplicationsWithMatchInsights(
        enrichApplicationsWithDecisionBriefs(list, post),
        post
      );
    }
    return delay(list);
  },

  submitApplication: (
    postId: string,
    payload: SubmitApplicationRequest
  ): Promise<RecruitmentApplicationCard> => {
    const app: RecruitmentApplicationCard = {
      id: `app-${nextAppId++}`,
      postId,
      status: 'pending',
      applicantUserId: CURRENT_USER_ID,
      applicantDisplayName: '我',
      applicantCardTitle: '规划型探索者',
      applicantMbtiType: 'INTJ',
      applicantInteractionMode: 'deep_learning',
      applicantInteractionModeLabel: '深度共学型',
      applicantReputationStars: getMockAverageStars(),
      compatibilityPercent: 82,
      highlights: ['基础人格维度契合，具备同行基础。'],
      warnings: [],
      message: payload.message,
      planningCommitmentAccepted: payload.planningCommitmentAccepted ?? false,
      teamworkCommitmentAccepted: payload.teamworkCommitmentAccepted ?? false,
      targetSlotIndex: payload.targetSlotIndex ?? null,
      targetSlotId: payload.targetSlotId ?? null,
      targetSlotLabel: payload.targetSlotLabel ?? null,
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };
    const list = applications[postId] ?? [];
    applications[postId] = [app, ...list];
    return delay(app);
  },

  reviewApplication: (
    postId: string,
    applicationId: string,
    payload: ReviewApplicationRequest
  ): Promise<ReviewApplicationResult | null> => {
    const list = applications[postId];
    if (!list) return delay(null);
    const idx = list.findIndex((a) => a.id === applicationId);
    if (idx < 0) return delay(null);
    list[idx] = {
      ...list[idx],
      status: payload.action === 'approve' ? 'approved' : 'rejected',
      decidedAt: new Date().toISOString(),
    };

    let teamPuzzle;
    if (payload.action === 'approve') {
      const postIdx = posts.findIndex((p) => p.id === postId);
      if (postIdx >= 0) {
        posts[postIdx] = applyTeamPuzzleToPost(posts[postIdx], approvedApplicationsForPost(postId));
        teamPuzzle = posts[postIdx].teamPuzzle;
      }
    }

    return delay({ application: list[idx], teamPuzzle });
  },

  listMyApplications: (): Promise<RecruitmentApplicationCard[]> =>
    delay(
      Object.values(applications)
        .flat()
        .filter((a) => a.applicantUserId === CURRENT_USER_ID)
    ),

  getSpawnTrekTripPreview: (postId: string): Promise<SpawnTrekTripPreview> => {
    syncAllPostsTeamState();
    const post = posts.find((p) => p.id === postId);
    if (!post) {
      return delay({
        canSpawn: false,
        blockReason: '招募帖不存在',
        liveCandidates: [],
        plannedCandidates: [],
      });
    }
    const apps = applications[postId] ?? [];
    return mockGetSpawnTrekTripPreview(post, apps);
  },

  spawnTrekTrip: (postId: string, body: SpawnTrekTripRequest): Promise<SpawnTrekTripResult> => {
    syncAllPostsTeamState();
    const post = posts.find((p) => p.id === postId);
    if (!post) {
      return delay({ success: false, message: '招募帖不存在' });
    }
    const apps = applications[postId] ?? [];
    return mockSpawnTrekTrip(post, apps, body);
  },

  getTripInstantiationPreview: (postId: string): Promise<TripInstantiationPreview> => {
    syncAllPostsTeamState();
    const post = posts.find((p) => p.id === postId);
    if (!post) {
      return delay({
        canInstantiate: false,
        blockReason: '招募帖不存在',
        plan: { strategy: 'generic_plaza_trip', canInstantiate: false },
      });
    }
    return delay(mockGetTripInstantiationPreview(attachPostSidecars(post), approvedApplicationsForPost(postId)));
  },

  instantiateTrip: (postId: string, body: InstantiateTripRequest = {}): Promise<TripInstantiationResult> => {
    syncAllPostsTeamState();
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx < 0) {
      return delay({ success: false, message: '招募帖不存在', plan: null });
    }
    const result = mockInstantiateTrip(posts[idx], body, approvedApplicationsForPost(postId));
    if (result.success && result.tripId) {
      posts[idx] = { ...posts[idx], tripInstantiationResult: result };
    }
    return delay(result);
  },
};

type ApplicationStatusFilter = 'pending' | 'approved' | 'rejected' | 'withdrawn';
