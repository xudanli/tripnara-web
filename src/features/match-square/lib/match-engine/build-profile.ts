import type { PlanningStyle, RecruitmentPostCard, VerifiedCredentials } from '@/types/match-square';
import type { MbtiType, OdysseyCognitiveScores } from '@/types/odyssey-travel-persona';
import type {
  PremiumStressAnswerChoice,
  PremiumStressQuestionId,
} from '@/types/odyssey-travel-persona';
import { estimateScoresFromMbti } from '../estimate-captain-scores';
import { extractCredentialScalars } from './credentials-scoring';
import {
  loadStoredPremiumStressAnswers,
  resolveControlStyleBand,
  resolveStressTraits,
} from './stress-traits';
import type { MatchEngineProfile, MatchTripWindow } from './types';

function mbtiToAxis(mbtiType: string): [number, number, number, number] {
  const t = mbtiType.toUpperCase().slice(0, 4);
  return [
    t[0] === 'E' ? 1 : 0,
    t[1] === 'S' ? 1 : 0,
    t[2] === 'T' ? 1 : 0,
    t[3] === 'J' ? 1 : 0,
  ];
}

export type BuildMatchEngineProfileInput = {
  userId?: string;
  mbtiType: string;
  credentials?: VerifiedCredentials | null;
  cognitiveScores?: OdysseyCognitiveScores | null;
  stressAnswers?: Partial<Record<PremiumStressQuestionId, PremiumStressAnswerChoice>> | null;
  declaredPlanningStyle?: PlanningStyle | null;
  trip?: MatchTripWindow | null;
  /** 浏览者：自动从 localStorage 拉 Premium 抗压题 */
  loadPremiumIntake?: boolean;
};

export function buildMatchEngineProfile(input: BuildMatchEngineProfileInput): MatchEngineProfile {
  const mbtiType = (input.mbtiType || 'INTJ').toUpperCase().slice(0, 4) as MbtiType;
  const credScalars = extractCredentialScalars(input.credentials);
  const stressAnswers =
    input.stressAnswers ??
    (input.loadPremiumIntake ? loadStoredPremiumStressAnswers() : null) ??
    undefined;

  const cognitive =
    input.cognitiveScores ?? (mbtiType ? estimateScoresFromMbti(mbtiType) : null);

  const stressTraits = resolveStressTraits({
    stressAnswers,
    cognitiveScores: cognitive,
    declaredPlanningStyle: input.declaredPlanningStyle,
  });

  const controlStyle = resolveControlStyleBand(
    stressTraits.controlScore,
    input.declaredPlanningStyle
  );

  return {
    userId: input.userId,
    mbtiType,
    mbtiAxis: mbtiToAxis(mbtiType),
    credentials: {
      e1: credScalars.e1,
      e2: credScalars.e2,
      p1: credScalars.p1,
      p2: credScalars.p2,
    },
    socialScore: credScalars.socialScore,
    socialTier: credScalars.socialTier,
    stressTraits,
    controlStyle,
    declaredPlanningStyle: input.declaredPlanningStyle,
    trip: input.trip ?? null,
    stressAnswers,
  };
}

export function buildCaptainProfileFromPost(
  post: RecruitmentPostCard,
  credentials?: VerifiedCredentials | null
): MatchEngineProfile {
  return buildMatchEngineProfile({
    userId: post.captainUserId,
    mbtiType: post.captainMbtiType,
    credentials: credentials ?? post.verifiedCredentials ?? post.captainVerifiedCredentials,
    declaredPlanningStyle: post.planningStyle ?? post.teamworkStyle,
    trip: {
      destination: post.destination,
      startDate: post.startDate,
      endDate: post.endDate,
    },
  });
}

export function buildViewerProfileFromContext(input: {
  mbtiType: string;
  credentials?: VerifiedCredentials | null;
  cognitiveScores?: OdysseyCognitiveScores | null;
  trip?: MatchTripWindow | null;
}): MatchEngineProfile {
  return buildMatchEngineProfile({
    mbtiType: input.mbtiType,
    credentials: input.credentials,
    cognitiveScores: input.cognitiveScores,
    loadPremiumIntake: true,
    trip: input.trip,
  });
}

/** 特征向量序列化（供后端 / 算法团队对齐） */
export function serializeFeatureVector(profile: MatchEngineProfile): number[] {
  const { mbtiAxis, credentials, stressTraits } = profile;
  return [
    ...mbtiAxis,
    credentials.e1,
    credentials.e2,
    credentials.p1,
    credentials.p2,
    stressTraits.controlScore,
    stressTraits.qualityBaseline,
    stressTraits.financialElasticity,
  ];
}
