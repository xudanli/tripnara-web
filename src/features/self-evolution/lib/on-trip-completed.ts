import type {
  TripOutcomeQuestionnaireResponses,
  TripOutcomeResponse,
} from '@/types/self-evolution';
import { tripOutcomeApi } from '@/api/trip-outcome';
import { selfEvolutionMemoryApi } from '@/api/self-evolution-memory';
import { calibrationApi } from '@/api/calibration';
import {
  clearPreTripPrediction,
  getPreTripPrediction,
  recordPreTripPrediction,
} from './pre-trip-prediction-store';

export interface TripCompletedContext {
  tripId: string;
  userIds: string[];
  questionnaireResponses: TripOutcomeQuestionnaireResponses;
  plannedBudget?: number;
  actualSpent?: number;
  plannedActivities?: number;
  completedActivities?: { p0: number; p1: number };
  hasAccidents?: boolean;
  stressEventCount?: number;
  preTripExpectation?: number;
  /** 搭子招募校准：postId + applicationId 对 */
  calibrationTargets?: Array<{ postId: string; applicationId: string; satisfaction: number }>;
}

export interface TripCompletedResult {
  outcome: TripOutcomeResponse;
  episodicMemoryId?: string;
  reflected: boolean;
  tripCount: number;
}

/**
 * 旅行完成后的完整自进化流程：
 * Outcome → Episodic Memory → (每 3 次) Reflect → Trip Count → Calibration
 */
export async function onTripCompleted(ctx: TripCompletedContext): Promise<TripCompletedResult> {
  const primaryUserId = ctx.userIds[0];

  const outcome = await tripOutcomeApi.calculateOutcome(ctx.tripId, {
    userIds: ctx.userIds,
    questionnaireResponses: ctx.questionnaireResponses,
    plannedBudget: ctx.plannedBudget ?? 10000,
    actualSpent: ctx.actualSpent ?? 9500,
    plannedActivities: ctx.plannedActivities ?? 10,
    completedActivities: ctx.completedActivities ?? { p0: 8, p1: 2 },
    hasAccidents: ctx.hasAccidents ?? false,
    stressEventCount: ctx.stressEventCount ?? 0,
    preTripExpectation: ctx.preTripExpectation ?? 5,
  });

  const episodic = await selfEvolutionMemoryApi.generateEpisodicMemory({
    userId: primaryUserId,
    tripId: ctx.tripId,
    events: [],
    attribution: [],
    outcome: outcome.dimensions,
    timestamp: new Date(),
  });

  const { tripCount } = await calibrationApi.updateUserTripCount(primaryUserId);

  let reflected = false;
  if (tripCount % 3 === 0) {
    const recentMemories = await selfEvolutionMemoryApi.retrieveEpisodicMemories(primaryUserId, {
      topK: 10,
    });
    await selfEvolutionMemoryApi.reflect({
      userId: primaryUserId,
      episodicMemories: recentMemories,
    });
    reflected = true;
  }

  if (ctx.calibrationTargets?.length) {
    await Promise.all(
      ctx.calibrationTargets.map(async (target) => {
        const preTrip = getPreTripPrediction(target.applicationId);
        if (!preTrip) return;
        await calibrationApi.recordCalibration({
          postId: target.postId,
          applicationId: target.applicationId,
          preTripPrediction: preTrip.prediction,
          postTripSatisfaction: target.satisfaction,
          dimensionPredictions: preTrip.dimensionPredictions as never,
          tripId: ctx.tripId,
        });
        clearPreTripPrediction(target.applicationId);
      })
    );
  }

  return {
    outcome,
    episodicMemoryId: episodic.id,
    reflected,
    tripCount,
  };
}

/** 招募匹配完成时记录 pre-trip 预测 */
export function onRecruitmentMatched(
  postId: string,
  applicationId: string,
  prediction: number,
  dimensionPredictions?: Record<string, number>
) {
  recordPreTripPrediction(postId, applicationId, prediction, dimensionPredictions);
}
