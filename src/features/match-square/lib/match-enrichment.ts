import type {
  MatchDimensionBreakdown,
  RecruitmentApplicationCard,
  RecruitmentPostCard,
  VerifiedCredentials,
} from '@/types/match-square';
import type { OdysseyCognitiveScores } from '@/types/odyssey-travel-persona';
import {
  buildMatchInsights,
  computeMatchDimensionBreakdown,
  computeCompatibilityScore,
  computeStructuralMatch,
} from './matching';
import { estimateScoresFromMbti } from './estimate-captain-scores';
import {
  buildCaptainProfileFromPost,
  buildMatchEngineProfile,
  buildViewerProfileFromContext,
  type MatchTripWindow,
} from './match-engine';
import { resolveCaptainCredentials, applyViewerCredentialsToOwnPost } from './verified-credentials';
import { isPostCaptain } from './mock-data';
import { normalizeCompatibilityPercent } from './normalize-compatibility-percent';

function shortenInsight(text: string): string {
  if (text.includes('圈层') || text.includes('带宽')) return '圈层沟通同频';
  if (text.includes('契约') || text.includes('全托管') || text.includes('飞轮')) return '团队契约互补';
  if (text.includes('审美') || text.includes('品质')) return '行中审美需对齐';
  if (text.includes('消费') || text.includes('预算') || text.includes('财务')) return '消费观合拍';
  if (text.includes('MBTI') || text.includes('拼图')) return '角色拼图加成';
  if (text.includes('计划') || text.includes('节奏')) return '行程节奏同频';
  if (text.includes('社交')) return '社交能量需磨合';
  return text.length > 18 ? `${text.slice(0, 18)}…` : text;
}

function compactLines(items: string[], maxItems = 2): string[] {
  return items.slice(0, maxItems).map(shortenInsight);
}

/** 队长看自己发的帖 — 不展示「与本人的契合度」（无业务含义） */
export function stripCaptainSelfMatchInsights(
  post: RecruitmentPostCard,
  options?: { force?: boolean }
): RecruitmentPostCard {
  if (!options?.force && !isPostCaptain(post)) return post;

  const teamPuzzle = post.teamPuzzle
    ? { ...post.teamPuzzle, viewerPuzzleMatch: null }
    : undefined;

  return {
    ...post,
    teamPuzzle,
    compatibilityPercent: undefined,
    matchBreakdown: undefined,
    matchInsightDrawer: undefined,
    structuralMatch: undefined,
    teamworkMatchBlocked: false,
    teamworkBlockReason: null,
    matchHighlights: undefined,
    matchWarnings: undefined,
  };
}

export function enrichPostMatchInsights(
  post: RecruitmentPostCard,
  viewerScores: OdysseyCognitiveScores | null,
  viewerCredentials?: VerifiedCredentials | null,
  viewerMbtiType?: string,
  memberTrip?: MatchTripWindow | null
): RecruitmentPostCard {
  const withOwnCredentials = applyViewerCredentialsToOwnPost(
    post,
    viewerCredentials,
    isPostCaptain(post)
  );

  if (isPostCaptain(withOwnCredentials)) {
    return stripCaptainSelfMatchInsights(withOwnCredentials);
  }

  if (withOwnCredentials.matchHighlights?.length || withOwnCredentials.matchWarnings?.length) {
    return withOwnCredentials;
  }
  if (!viewerScores || !viewerMbtiType) return withOwnCredentials;

  const captainCredentials = resolveCaptainCredentials(withOwnCredentials);
  const captainScores = estimateScoresFromMbti(withOwnCredentials.captainMbtiType);

  const leaderProfile = buildCaptainProfileFromPost(withOwnCredentials, captainCredentials);
  const memberProfile = buildViewerProfileFromContext({
    mbtiType: viewerMbtiType,
    credentials: viewerCredentials,
    cognitiveScores: viewerScores,
    trip: memberTrip,
  });

  const structuralOpts = {
    leaderProfile,
    memberProfile,
    memberTrip,
    skipTimeGate: !memberTrip?.startDate,
  };

  const structural = computeStructuralMatch(structuralOpts);
  const breakdown = computeMatchDimensionBreakdown(
    viewerScores,
    captainScores,
    viewerCredentials,
    captainCredentials,
    structuralOpts
  );
  const { highlights, warnings } = buildMatchInsights(
    viewerScores,
    captainScores,
    viewerCredentials,
    captainCredentials,
    structural
  );

  const percent =
    withOwnCredentials.compatibilityPercent ??
    computeCompatibilityScore(
      viewerScores,
      captainScores,
      viewerCredentials,
      captainCredentials,
      structuralOpts
    );

  return {
    ...withOwnCredentials,
    compatibilityPercent: percent,
    matchHighlights: compactLines(highlights),
    matchWarnings: compactLines(warnings),
    matchBreakdown: breakdown,
    teamworkMatchBlocked: structural.blocked,
    teamworkBlockReason: structural.blockReason ?? undefined,
  };
}

export function mergeApplyPreviewInsights(
  post: RecruitmentPostCard,
  preview?: {
    compatibilityPercent?: number;
    highlights?: string[];
    warnings?: string[];
  } | null
): RecruitmentPostCard {
  if (!preview) return post;
  return {
    ...post,
    compatibilityPercent: preview.compatibilityPercent ?? post.compatibilityPercent,
    matchHighlights: preview.highlights?.length
      ? compactLines(preview.highlights)
      : post.matchHighlights,
    matchWarnings: preview.warnings?.length
      ? compactLines(preview.warnings)
      : post.matchWarnings,
  };
}

/** 队长审批 · 申请人 vs 队长契合度（与广场 browse 视角同一 Match Engine） */
export function computeApplicantPostCompatibility(
  application: RecruitmentApplicationCard,
  post: RecruitmentPostCard
): number {
  const applicantMbtiType = application.applicantMbtiType?.trim() || 'INTJ';
  const captainMbtiType = post.captainMbtiType?.trim() || 'INTJ';

  const captainCredentials = resolveCaptainCredentials(post);
  const applicantCredentials = application.applicantVerifiedCredentials ?? null;

  const leaderProfile = buildCaptainProfileFromPost(post, captainCredentials);
  const memberProfile = buildMatchEngineProfile({
    userId: application.applicantUserId,
    mbtiType: applicantMbtiType,
    credentials: applicantCredentials,
  });

  const structuralOpts = {
    leaderProfile,
    memberProfile,
    skipTimeGate: true,
  };

  const applicantScores = estimateScoresFromMbti(applicantMbtiType);
  const captainScores = estimateScoresFromMbti(captainMbtiType);

  const structuralScore = computeCompatibilityScore(
    applicantScores,
    captainScores,
    applicantCredentials,
    captainCredentials,
    structuralOpts
  );
  if (structuralScore > 0) return structuralScore;

  // 审批页：硬熔断（如圈层带宽）不应把已入队队员展示为 0%
  return computeCompatibilityScore(
    applicantScores,
    captainScores,
    applicantCredentials,
    captainCredentials,
    null
  );
}

/**
 * 审批卡契合度 — API 偶发 1%/0% 或与广场 77% 不一致时，用客户端重算对齐。
 */
export function enrichApplicationMatchInsights(
  application: RecruitmentApplicationCard,
  post: RecruitmentPostCard
): RecruitmentApplicationCard {
  const apiPercent = normalizeCompatibilityPercent(application.compatibilityPercent);
  const computed = computeApplicantPostCompatibility(application, post);

  let compatibilityPercent = apiPercent;
  if (computed > 0 && (apiPercent <= 5 || computed - apiPercent >= 15)) {
    compatibilityPercent = computed;
  } else if (apiPercent <= 0 && computed > 0) {
    compatibilityPercent = computed;
  }

  return { ...application, compatibilityPercent };
}

export function enrichApplicationsWithMatchInsights(
  applications: RecruitmentApplicationCard[],
  post: RecruitmentPostCard
): RecruitmentApplicationCard[] {
  return applications.map((app) => enrichApplicationMatchInsights(app, post));
}

export type { MatchDimensionBreakdown };
