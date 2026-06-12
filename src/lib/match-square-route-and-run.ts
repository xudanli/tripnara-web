import type { RouteAndRunRequest } from '@/api/agent';
import type { PartyNegotiationMemberProfile } from '@/types/robustness-dashboard';
import type { RecruitmentApplicationCard, RecruitmentPostCard } from '@/types/match-square';
import { getActiveTripInstantiateContext } from '@/features/active-trip/lib/active-trip-context-store';
import { estimateScoresFromMbti } from '@/features/match-square/lib/estimate-captain-scores';
import { resolveStressTraits } from '@/features/match-square/lib/match-engine/stress-traits';
import {
  buildRosterFromPostAndApplications,
  resolveMatchSquareRosterFromContext,
  type MatchSquareRoster,
  type MatchSquareRosterMember,
} from '@/lib/match-square-trip-roster';
import { getMatchSquareRosterCache, setMatchSquareRosterCache } from '@/lib/match-square-roster-cache';

export type MatchSquarePartySource = {
  roster: MatchSquareRoster;
  post?: RecruitmentPostCard;
  applications?: RecruitmentApplicationCard[];
};

export type MatchSquarePartyFields = {
  party_profile: {
    party_total: number;
    fitness_level?: string;
    risk_tolerance?: string;
  };
  member_profiles: PartyNegotiationMemberProfile[];
};

type AggregatedRisk = 'LOW' | 'MEDIUM' | 'HIGH';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function mergePartyProfileFields(
  existing: Record<string, unknown> | undefined,
  fields: MatchSquarePartyFields['party_profile']
): Record<string, unknown> {
  const out = { ...(existing ?? {}) };
  if (out.party_total == null) out.party_total = fields.party_total;
  if (!out.fitness_level && fields.fitness_level) out.fitness_level = fields.fitness_level;
  if (!out.risk_tolerance && fields.risk_tolerance) out.risk_tolerance = fields.risk_tolerance;
  return out;
}

function paceFromPlanningIndex(planningIndex: number): 'intensive' | 'relaxed' | 'moderate' {
  if (planningIndex >= 2) return 'intensive';
  if (planningIndex <= -1) return 'relaxed';
  return 'moderate';
}

function riskToleranceFromTraits(traits: {
  controlScore: number;
  qualityBaseline: number;
  financialElasticity: number;
}): AggregatedRisk {
  const adventureSignal = (traits.financialElasticity + (10 - traits.qualityBaseline)) / 2;
  if (adventureSignal >= 7) return 'HIGH';
  if (adventureSignal <= 4) return 'LOW';
  return 'MEDIUM';
}

function adventureWeightFromScores(scores: {
  ambiguity_tolerance: number;
  financial_flexibility: number;
}): number {
  const raw = (scores.ambiguity_tolerance + scores.financial_flexibility) / 2;
  return Math.max(0, Math.min(1, (raw + 3) / 6));
}

function fitnessLevelFromFitPercent(fitPercent: number | null | undefined): string | undefined {
  if (fitPercent == null || Number.isNaN(fitPercent)) return undefined;
  if (fitPercent < 50) return 'low';
  if (fitPercent < 75) return 'medium';
  return 'high';
}

function aggregateFitnessLevel(levels: string[]): string | undefined {
  const normalized = levels.filter(Boolean);
  if (normalized.length === 0) return undefined;
  if (normalized.includes('low')) return 'low';
  if (normalized.includes('medium')) return 'medium';
  return 'high';
}

function aggregateRiskTolerance(risks: AggregatedRisk[]): AggregatedRisk | undefined {
  if (risks.length === 0) return undefined;
  if (risks.includes('LOW')) return 'LOW';
  if (risks.includes('MEDIUM')) return 'MEDIUM';
  return 'HIGH';
}

function memberProfileFromSignals(input: {
  memberId: string;
  mbtiType?: string | null;
  planningStyle?: RecruitmentPostCard['planningStyle'];
  fitPercent?: number | null;
  role?: MatchSquareRosterMember['role'];
}): PartyNegotiationMemberProfile {
  const mbti = (input.mbtiType ?? 'INTJ').toUpperCase().slice(0, 4);
  const cognitive = estimateScoresFromMbti(mbti);
  const stress = resolveStressTraits({
    cognitiveScores: cognitive,
    declaredPlanningStyle: input.planningStyle ?? undefined,
  });

  const profile: PartyNegotiationMemberProfile = {
    member_id: input.memberId,
    pace: paceFromPlanningIndex(cognitive.planning_index),
    risk_tolerance: riskToleranceFromTraits(stress),
    adventure_weight: adventureWeightFromScores(cognitive),
  };

  const fitness = fitnessLevelFromFitPercent(input.fitPercent);
  if (fitness) profile.fitness_level = fitness;
  if (input.role) profile.role = input.role;
  if (input.mbtiType) profile.mbti_type = mbti;

  return profile;
}

function findApplicationForMember(
  member: MatchSquareRosterMember,
  applications?: RecruitmentApplicationCard[]
): RecruitmentApplicationCard | undefined {
  if (!applications?.length) return undefined;
  if (member.sourceApplicationId) {
    return applications.find((app) => app.id === member.sourceApplicationId);
  }
  return applications.find((app) => app.applicantUserId === member.userId);
}

/** 同步解析：instantiate 上下文 → 内存 cache → localStorage roster */
export function resolveMatchSquarePartySource(tripId: string): MatchSquarePartySource | null {
  const id = tripId?.trim();
  if (!id) return null;

  const ctx = getActiveTripInstantiateContext(id);
  if (ctx?.postSnapshot) {
    const approved = ctx.approvedApplications.filter((a) => a.status === 'approved');
    return {
      roster: buildRosterFromPostAndApplications(ctx.postSnapshot, approved),
      post: ctx.postSnapshot,
      applications: approved,
    };
  }

  const cached = getMatchSquareRosterCache(id);
  if (cached?.roster.members.length) {
    return {
      roster: cached.roster,
      post: cached.post,
      applications: cached.applications,
    };
  }

  const roster = resolveMatchSquareRosterFromContext(id);
  if (roster?.members.length) {
    return { roster };
  }

  return null;
}

export function buildMatchSquarePartyFieldsFromSource(
  source: MatchSquarePartySource
): MatchSquarePartyFields {
  const { roster, post, applications } = source;
  const memberProfiles: PartyNegotiationMemberProfile[] = [];
  const fitnessLevels: string[] = [];
  const riskLevels: AggregatedRisk[] = [];

  for (const member of roster.members) {
    const memberId = member.userId?.trim();
    if (!memberId) continue;

    if (member.role === 'captain') {
      const profile = memberProfileFromSignals({
        memberId,
        mbtiType: member.mbtiType ?? post?.captainMbtiType,
        planningStyle: post?.planningStyle ?? post?.teamworkStyle,
        role: member.role,
      });
      memberProfiles.push(profile);
      if (profile.fitness_level) fitnessLevels.push(String(profile.fitness_level));
      if (profile.risk_tolerance) riskLevels.push(profile.risk_tolerance as AggregatedRisk);
      continue;
    }

    const app = findApplicationForMember(member, applications);
    const profile = memberProfileFromSignals({
      memberId,
      mbtiType: member.mbtiType ?? app?.applicantMbtiType,
      planningStyle: post?.planningStyle ?? post?.teamworkStyle,
      fitPercent: app?.physicalFitnessReport?.fitPercent,
      role: member.role,
    });
    memberProfiles.push(profile);
    if (profile.fitness_level) fitnessLevels.push(String(profile.fitness_level));
    if (profile.risk_tolerance) riskLevels.push(profile.risk_tolerance as AggregatedRisk);
  }

  return {
    party_profile: {
      party_total: roster.members.length,
      fitness_level: aggregateFitnessLevel(fitnessLevels),
      risk_tolerance: aggregateRiskTolerance(riskLevels),
    },
    member_profiles: memberProfiles,
  };
}

export function buildMatchSquarePartyFieldsForTrip(tripId: string): MatchSquarePartyFields | null {
  const source = resolveMatchSquarePartySource(tripId);
  if (!source) return null;
  return buildMatchSquarePartyFieldsFromSource(source);
}

function hasPartyNegotiationMemberProfiles(options: RouteAndRunRequest['options']): boolean {
  const list = options?.party_negotiation_member_profiles;
  return Array.isArray(list) && list.length > 0;
}

/**
 * 将 Match Square 车队 roster 写入 route_and_run：
 * - 顶层 `party_profile`（party_total / fitness_level / risk_tolerance）
 * - `preference_profile.party_profile` 镜像（兼容 Hydrator 旧路径）
 * - `options.party_negotiation_member_profiles[]`
 *
 * 已有字段按项保留，不整包覆盖。
 */
export function enrichRouteAndRunRequestWithMatchSquareParty(
  request: RouteAndRunRequest
): RouteAndRunRequest {
  const tripId = request.trip_id ?? request.tripId;
  if (!tripId) return request;

  const fields = buildMatchSquarePartyFieldsForTrip(String(tripId));
  if (!fields || fields.member_profiles.length === 0) return request;

  const existingTopParty = asRecord(request.party_profile) ?? undefined;
  const existingPrefParty = asRecord(request.preference_profile?.party_profile) ?? undefined;

  const nextTopParty = mergePartyProfileFields(existingTopParty, fields.party_profile);
  const nextPrefParty = mergePartyProfileFields(existingPrefParty, fields.party_profile);

  const nextOptions = { ...request.options };
  if (!hasPartyNegotiationMemberProfiles(nextOptions)) {
    nextOptions.party_negotiation_member_profiles = fields.member_profiles;
  }

  return {
    ...request,
    party_profile: nextTopParty,
    preference_profile: {
      ...(request.preference_profile ?? {}),
      party_profile: mergePartyProfileFields(
        existingPrefParty,
        fields.party_profile
      ),
    },
    options: nextOptions,
  };
}

/** 供 hook / 页面写入异步拉取到的 roster，供 route_and_run enrich 读取 */
export function cacheMatchSquarePartySource(tripId: string, source: MatchSquarePartySource): void {
  setMatchSquareRosterCache(tripId, {
    roster: source.roster,
    post: source.post,
    applications: source.applications,
  });
}
