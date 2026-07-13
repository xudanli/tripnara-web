import type { TripDetail } from '@/types/trip';
import type { ReviewSummary } from '@/types/trip-review';
import type { TripOutcomeQuestionnaireResponses } from '@/types/self-evolution';
import type { TripCompletedContext } from './on-trip-completed';

export function satisfactionFromQuestionnaire(
  responses: TripOutcomeQuestionnaireResponses
): number {
  return (responses.groupDynamics - 1) / 6;
}

export function buildCalibrationTargetsFromTrip(
  _trip: TripDetail,
  _satisfaction: number
): TripCompletedContext['calibrationTargets'] {
  return [];
}

export function resolveTripParticipantIds(
  _trip: TripDetail,
  currentUserId: string
): string[] {
  return [currentUserId];
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
