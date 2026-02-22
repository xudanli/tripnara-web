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
      return decisionEngineApi.validateSafety({
        tripId: data.tripId ?? '',
        plan: data.plan as any,
        worldContext: data.worldContext as Record<string, unknown>,
      });
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
      return {
        isValid: result.feasible,
        violations: result.violations as any,
        summary: { errorCount: 0, warningCount: 0, infoCount: 0 },
        conflicts: { conflicts: [], has_conflicts: false, critical_count: 0, high_count: 0, medium_count: 0, low_count: 0 },
        infeasibilityExplanation: result.infeasibilityExplanation as any ?? { feasible: result.feasible, reasons: [], summary: '' },
      };
    }
    return decisionApi.checkConstraintsWithExplanation(data);
  },

  generateMultiplePlans: async (
    data: GenerateMultiplePlansRequest
  ): Promise<GenerateMultiplePlansResponse['data']> => {
    if (USE_V1) {
      const result = await decisionEngineApi.generateMultiplePlans({
        state: data.state,
        constraints: data.constraints,
        count: 3,
      });
      return mapVariantsToLegacy(result.variants, result.log);
    }
    return decisionApi.generateMultiplePlans(data);
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
