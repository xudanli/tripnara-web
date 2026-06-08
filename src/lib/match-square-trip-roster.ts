import type { RecruitmentApplicationCard, RecruitmentPostCard } from '@/types/match-square';
import type { CreateTeamRequest, TeamMember } from '@/types/optimization-v2';
import { DEFAULT_WEIGHTS } from '@/types/optimization-v2';
import { getActiveTripInstantiateContext } from '@/features/active-trip/lib/active-trip-context-store';
import {
  resolveApplicantCardTitle,
  resolveApplicantRealName,
} from '@/features/match-square/lib/resolve-applicant-credentials';
import { getMatchSquareInstantiation } from '@/lib/match-square-trip-metadata';

export type MatchSquareRosterMember = {
  userId: string;
  displayName: string;
  role: 'captain' | 'member';
  cardTitle?: string | null;
  mbtiType?: string | null;
  sourceApplicationId?: string;
};

export type MatchSquareRoster = {
  recruitmentPostId: string;
  teamName: string;
  destination?: string;
  members: MatchSquareRosterMember[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** 从行程 metadata 解析搭子招募帖 ID */
export function resolveRecruitmentPostIdFromTrip(
  trip: { metadata?: Record<string, unknown> } | null | undefined
): string | null {
  if (!trip?.metadata) return null;

  const inst = getMatchSquareInstantiation(trip.metadata);
  if (inst?.recruitmentPostId) return inst.recruitmentPostId;

  const flywheel =
    asRecord(trip.metadata.collaborativeTaskFlywheel) ??
    asRecord(trip.metadata.collaborative_task_flywheel);
  const fromFlywheel = flywheel?.recruitmentPostId ?? flywheel?.recruitment_post_id;
  if (fromFlywheel != null) return String(fromFlywheel);

  return null;
}

/** 从成团 instantiate 上下文（localStorage）读取车队名单 */
export function resolveMatchSquareRosterFromContext(tripId: string): MatchSquareRoster | null {
  const ctx = getActiveTripInstantiateContext(tripId);
  if (!ctx?.postSnapshot) return null;
  const approved = ctx.approvedApplications.filter((a) => a.status === 'approved');
  return buildRosterFromPostAndApplications(ctx.postSnapshot, approved);
}

/** 从招募帖 + 已通过申请构建车队名单 */
export function buildRosterFromPostAndApplications(
  post: RecruitmentPostCard,
  approvedApplications: RecruitmentApplicationCard[]
): MatchSquareRoster {
  const members: MatchSquareRosterMember[] = [];
  const seen = new Set<string>();

  const captainUserId = post.captainUserId?.trim();
  if (captainUserId) {
    seen.add(captainUserId);
    members.push({
      userId: captainUserId,
      displayName: post.captainDisplayName?.trim() || '队长',
      role: 'captain',
      cardTitle: post.captainCardTitle,
      mbtiType: post.captainMbtiType,
    });
  }

  for (const app of approvedApplications) {
    if (app.status && app.status !== 'approved') continue;
    const userId = app.applicantUserId?.trim();
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    members.push({
      userId,
      displayName: resolveApplicantRealName(app, app.applicantVerifiedCredentials),
      role: 'member',
      cardTitle: resolveApplicantCardTitle(app, app.applicantVerifiedCredentials),
      mbtiType: app.applicantMbtiType,
      sourceApplicationId: app.id,
    });
  }

  return {
    recruitmentPostId: post.id,
    teamName: post.title?.trim() || `${post.destination} · 搭子车队`,
    destination: post.destination,
    members,
  };
}

/** 将搭子车队转为 Optimization Team 创建请求 */
export function buildCreateTeamRequestFromRoster(roster: MatchSquareRoster): CreateTeamRequest {
  const memberCount = Math.max(1, roster.members.length);
  const teamMembers: TeamMember[] = roster.members.map((member) => ({
    userId: member.userId,
    displayName: member.displayName,
    role: member.role === 'captain' ? 'LEADER' : 'MEMBER',
    decisionWeight: member.role === 'captain' ? 1 : 1 / memberCount,
    fitnessLevel: 'INTERMEDIATE',
    experienceLevel: 'EXPERIENCED',
    personalWeights: DEFAULT_WEIGHTS,
  }));

  return {
    name: roster.teamName,
    type: 'FRIENDS',
    decisionWeightMode: memberCount <= 2 ? 'EQUAL' : 'LEADER_DOMINANT',
    members: teamMembers,
  };
}
