import type { Collaborator } from '@/types/trip';
import type { TripDetail, Traveler } from '@/types/trip';
import { DEFAULT_WEIGHTS, type CreateTeamRequest, type TeamMember } from '@/types/optimization-v2';
import { resolveTravelerCount } from '@/lib/planning-constraints.util';

function mobilityToFitness(mobilityTag?: Traveler['mobilityTag']) {
  if (mobilityTag === 'CITY_POTATO') return 'BEGINNER' as const;
  if (mobilityTag === 'IRON_LEGS') return 'EXPERT' as const;
  return 'INTERMEDIATE' as const;
}

export function defaultNegotiationTeamName(trip: TripDetail): string {
  const name = trip.name?.trim();
  if (name) return `${name} · 协商团队`;
  const destination = trip.destination?.trim();
  if (destination) return `${destination} · 协商团队`;
  return '行程协商团队';
}

function placeholderDisplayName(index: number, total: number): string {
  if (total === 2 && index === 1) return '同行者';
  return `同行者 ${index + 1}`;
}

/** 按约束出行人数生成协商团队；优先填入行程协作者，不足时用占位成员补齐 */
export function buildCreateTeamRequestFromPlannedTravelers(input: {
  trip: TripDetail;
  currentUserId: string;
  currentUserDisplayName: string;
  collaborators?: Collaborator[];
}): CreateTeamRequest {
  const targetCount = Math.max(1, resolveTravelerCount(input.trip));
  const pacingTravelers = input.trip.pacingConfig?.travelers ?? [];
  const members: TeamMember[] = [];
  const seen = new Set<string>();

  members.push({
    userId: input.currentUserId,
    displayName: input.currentUserDisplayName.trim() || '我',
    role: 'LEADER',
    decisionWeight: 1,
    fitnessLevel: mobilityToFitness(pacingTravelers[0]?.mobilityTag),
    experienceLevel: 'EXPERIENCED',
    personalWeights: DEFAULT_WEIGHTS,
  });
  seen.add(input.currentUserId);

  for (const collaborator of input.collaborators ?? []) {
    if (members.length >= targetCount) break;
    const userId = collaborator.userId?.trim();
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    members.push({
      userId,
      displayName:
        collaborator.displayName?.trim() ||
        collaborator.email?.split('@')[0]?.trim() ||
        '协作者',
      role: 'MEMBER',
      decisionWeight: 0,
      fitnessLevel: mobilityToFitness(pacingTravelers[members.length]?.mobilityTag),
      experienceLevel: 'EXPERIENCED',
      personalWeights: DEFAULT_WEIGHTS,
    });
  }

  while (members.length < targetCount) {
    const index = members.length;
    members.push({
      userId: `guest_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 9)}`,
      displayName: placeholderDisplayName(index, targetCount),
      role: 'MEMBER',
      decisionWeight: 0,
      fitnessLevel: mobilityToFitness(pacingTravelers[index]?.mobilityTag),
      experienceLevel: 'EXPERIENCED',
      personalWeights: DEFAULT_WEIGHTS,
    });
  }

  const memberCount = members.length;
  const decisionWeightMode = memberCount <= 2 ? 'EQUAL' : 'LEADER_DOMINANT';
  const equalWeight = 1 / memberCount;

  for (const member of members) {
    member.decisionWeight =
      decisionWeightMode === 'EQUAL'
        ? equalWeight
        : member.role === 'LEADER'
          ? 1
          : equalWeight;
  }

  return {
    name: defaultNegotiationTeamName(input.trip),
    type: memberCount <= 3 ? 'FAMILY' : 'FRIENDS',
    decisionWeightMode,
    members,
  };
}
