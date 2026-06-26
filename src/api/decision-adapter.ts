/**
 * 决策 API 适配层
 * 通过 VITE_USE_DECISION_ENGINE_V1 切换新旧 API
 * 参考: docs/api/decision-engine-implementation-plan.md
 */

import { decisionEngineApi } from './decision-engine';
import { decisionApi } from './decision';
import type {
  ValidateSafetyRequest,
  ValidateSafetyResponse,
  AdjustPacingRequest,
  AdjustPacingResponse,
  ReplaceNodesRequest,
  ReplaceNodesResponse,
} from '@/types/strategy';
import type {
  CheckConstraintsRequest,
  CheckConstraintsResponse,
  GenerateMultiplePlansRequest,
  GenerateMultiplePlansResponse,
} from '@/types/constraints';
import type { PlanVariant } from '@/types/constraints';

const USE_V1 = import.meta.env.VITE_USE_DECISION_ENGINE_V1 === 'true';

/** 将新 API 的 variants 映射为旧格式，供 PlanVariantsPage 等组件使用 */
function mapVariantsToLegacy(
  variants: Array<{ id: string; plan?: any; score?: Record<string, number>; tradeoffs?: any[]; [key: string]: any }>,
  log: { runId?: string; explanation?: string; [key: string]: unknown }
): GenerateMultiplePlansResponse['data'] {
  const legacyVariants: PlanVariant[] = variants.map((v) => ({
    id: (['conservative', 'balanced', 'aggressive'].includes(v.id) ? v.id : 'balanced') as PlanVariant['id'],
    score: v.score
      ? {
          total: v.score.total ?? Object.values(v.score).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0),
          breakdown: {
            satisfaction: v.score.satisfaction ?? 0,
            violationRisk: v.score.violationRisk ?? 0,
            robustness: v.score.robustness ?? 0,
            cost: v.score.cost ?? 0,
          },
        }
      : { total: 0, breakdown: { satisfaction: 0, violationRisk: 0, robustness: 0, cost: 0 } },
    tradeoffs: (v.tradeoffs || []).map((t: any) => ({
      constraint: t.constraint ?? '',
      sacrificed: t.sacrificed ?? '',
      reason: t.reason ?? '',
      can_adjust: t.can_adjust ?? false,
      impact_score: t.impact_score ?? 0,
    })),
    feasibility: {
      isValid: true,
      violations: 0,
      conflicts: 0,
    },
    planSummary: {
      days: Array.isArray(v.plan?.days) ? v.plan.days.length : 0,
      totalActivities: 0,
    },
    plan: v.plan,
    metadata: v.metadata,
  }));
  return {
    variants: legacyVariants,
    log: {
      runId: log.runId ?? '',
      explanation: log.explanation ?? '',
    },
  };
}

/**
 * 决策 API 适配层
 * - USE_V1=true: 使用 /api/decision-engine/v1/*
 * - USE_V1=false: 使用 /decision/*（默认）
 */
export const decisionAdapter = {
  validateSafety: async (
    data: ValidateSafetyRequest
  ): Promise<ValidateSafetyResponse['data']> => {
    if (USE_V1) {
      const result = await decisionEngineApi.validateSafety({
        tripId: data.tripId ?? '',
        plan: data.plan as any,
        worldContext: data.worldContext as unknown as Record<string, unknown>,
      });
      return result as ValidateSafetyResponse['data'];
    }
    return decisionApi.validateSafety(data);
  },

  adjustPacing: async (
    data: AdjustPacingRequest
  ): Promise<AdjustPacingResponse['data']> => {
    if (USE_V1) {
      return decisionEngineApi.adjustPacing(data);
    }
    return decisionApi.adjustPacing(data);
  },

  replaceNodes: async (
    data: ReplaceNodesRequest
  ): Promise<ReplaceNodesResponse['data']> => {
    if (USE_V1) {
      return decisionEngineApi.replaceNodes(data);
    }
    return decisionApi.replaceNodes(data);
  },

  checkConstraintsWithExplanation: async (
    data: CheckConstraintsRequest
  ): Promise<CheckConstraintsResponse['data']> => {
    if (USE_V1) {
      const result = await decisionEngineApi.checkConstraints({
        state: data.state,
        plan: data.plan,
      });
      const feasible = Boolean((result as { feasible?: boolean }).feasible);
      const violations = (result as { violations?: unknown }).violations;
      const infeasibilityExplanation = (result as { infeasibilityExplanation?: unknown })
        .infeasibilityExplanation;
      return {
        isValid: feasible,
        violations: violations as any,
        summary: { errorCount: 0, warningCount: 0, infoCount: 0 },
        conflicts: { conflicts: [], has_conflicts: false, critical_count: 0, high_count: 0, medium_count: 0, low_count: 0 },
        infeasibilityExplanation: (infeasibilityExplanation as any) ?? { feasible, reasons: [], summary: '' },
      };
    }
    return decisionApi.checkConstraintsWithExplanation(data);
  },

  generateMultiplePlans: async (
    data: GenerateMultiplePlansRequest
  ): Promise<GenerateMultiplePlansResponse['data']> => {
    const payload = {
      tripId: data.tripId,
      state: data.state,
      constraints: data.constraints,
      count: data.count ?? 3,
    };

    if (!payload.state || !payload.constraints) {
      throw new Error('state 和 constraints 是必需的参数');
    }

    const runV1 = async () => {
      const result = await decisionEngineApi.generateMultiplePlans(payload);
      const variants =
        (result as { variants?: Array<{ id: string; plan?: any; score?: Record<string, number>; tradeoffs?: any[]; [key: string]: any }> }).variants ?? [];
      const log =
        (result as { log?: { runId?: string; explanation?: string; [key: string]: unknown } }).log ?? {};
      return mapVariantsToLegacy(variants, log);
    };

    if (USE_V1) {
      return runV1();
    }

    try {
      return await runV1();
    } catch (v1Err: unknown) {
      const status = (v1Err as { response?: { status?: number } })?.response?.status;
      if (status && status !== 404 && status !== 501) {
        throw v1Err;
      }
      return decisionApi.generateMultiplePlans({
        state: data.state,
        constraints: data.constraints,
      });
    }
  },

  // 以下接口新 API 暂无，始终走旧 API
  detectConflicts: decisionApi.detectConflicts,
  submitPlanVariantFeedback: decisionApi.submitPlanVariantFeedback,
  submitConflictFeedback: decisionApi.submitConflictFeedback,
  submitDecisionQualityFeedback: decisionApi.submitDecisionQualityFeedback,
  submitBatchFeedback: decisionApi.submitBatchFeedback,
  getFeedbackStats: decisionApi.getFeedbackStats,
};

/** 是否使用决策引擎 v1 API */
export const isUsingDecisionEngineV1 = (): boolean => USE_V1;
