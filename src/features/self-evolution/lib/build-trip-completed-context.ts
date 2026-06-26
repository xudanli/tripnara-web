import type { TripDetail } from '@/types/trip';
import type { ReviewSummary } from '@/types/trip-review';
import type { TripOutcomeQuestionnaireResponses } from '@/types/self-evolution';
import {
  resolveMatchSquareRosterFromContext,
  resolveRecruitmentPostIdFromTrip,
} from '@/lib/match-square-trip-roster';
import { getPreTripPrediction } from './pre-trip-prediction-store';
import type { TripCompletedContext } from './on-trip-completed';

export function satisfactionFromQuestionnaire(
  responses: TripOutcomeQuestionnaireResponses
): number {
  return (responses.groupDynamics - 1) / 6;
}

export function buildCalibrationTargetsFromTrip(
  trip: TripDetail,
  satisfaction: number
): TripCompletedContext['calibrationTargets'] {
  const postId = resolveRecruitmentPostIdFromTrip(trip);
  if (!postId) return [];

  const roster = resolveMatchSquareRosterFromContext(trip.id);
  if (!roster?.members.length) return [];

  return roster.members
    .filter((member) => member.sourceApplicationId)
    .filter((member) => getPreTripPrediction(member.sourceApplicationId!))
    .map((member) => ({
      postId,
      applicationId: member.sourceApplicationId!,
      satisfaction,
    }));
}

export function resolveTripParticipantIds(
  trip: TripDetail,
  currentUserId: string
): string[] {
  const roster = resolveMatchSquareRosterFromContext(trip.id);
  const fromRoster = roster?.members.map((m) => m.userId).filter(Boolean) ?? [];
  const unique = new Set<string>([currentUserId, ...fromRoster]);
  return [...unique];
}

export function buildTripCompletedContext(params: {
  trip: TripDetail;
  userId: string;
  questionnaireResponses: TripOutcomeQuestionnaireResponses;
  reviewSummary?: ReviewSummary | null;
}): TripCompletedContext {
  const { trip, userId, questionnaireResponses, reviewSummary } = params;
  const satisfaction = satisfactionFromQuestionnaire(questionnaireResponses);
  const completion = reviewSummary?.completion;
  const budget = reviewSummary?.budgetDeviation;
  const risk = reviewSummary?.riskExposure;

  const plannedActivities = completion?.totalPlanItems ?? trip.statistics?.totalItems ?? 0;
  const completedP0 = completion?.completedPlanItems ?? 0;
  const completedP1 = completion?.replacedCompleted ?? 0;

  return {
    tripId: trip.id,
    userIds: resolveTripParticipantIds(trip, userId),
    questionnaireResponses,
    plannedBudget:
      budget?.plannedCost ??
      trip.budgetConfig?.totalBudget ??
      trip.totalBudget ??
      undefined,
    actualSpent: budget?.actualCost ?? trip.statistics?.budgetUsed ?? undefined,
    plannedActivities: plannedActivities || undefined,
    completedActivities:
      plannedActivities > 0 ? { p0: completedP0, p1: completedP1 } : undefined,
    hasAccidents: (risk?.riskEventCount ?? 0) > 2,
    stressEventCount: risk?.riskEventCount ?? 0,
    preTripExpectation: 5,
    calibrationTargets: buildCalibrationTargetsFromTrip(trip, satisfaction),
  };
}
