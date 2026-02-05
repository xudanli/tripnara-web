/**
 * 决策反馈相关类型定义
 */

// ==================== 计划变体反馈 ====================

export type VariantStrategy = 'conservative' | 'balanced' | 'aggressive';
export type UserChoice = 'selected' | 'rejected' | 'modified';

export interface PlanVariantFeedbackRequest {
  runId: string;
  variantId: string;
  variantStrategy: VariantStrategy;
  userChoice: UserChoice;
  rating?: number; // 1-5
  reason?: string;
  tripId?: string;
  userId?: string;
}

export interface PlanVariantFeedbackResponse {
  message: string;
}

// ==================== 约束冲突反馈 ====================

export interface ConflictFeedbackRequest {
  runId: string;
  conflictId: string;
  conflictType: string;
  understood: boolean;
  explanationClear: boolean;
  tradeoffOptionsUseful: boolean;
  selectedTradeoffOption?: string;
  tripId?: string;
  userId?: string;
}

export interface ConflictFeedbackResponse {
  message: string;
}

// ==================== 决策质量反馈 ====================

export interface DecisionQualityFeedbackRequest {
  runId: string;
  overallSatisfaction: number; // 1-5
  planQuality: number; // 1-5
  conflictExplanationQuality?: number; // 1-5
  tradeoffOptionsQuality?: number; // 1-5
  decisionSpeed?: number; // 1-5
  additionalFeedback?: string;
  tripId?: string;
  userId?: string;
}

export interface DecisionQualityFeedbackResponse {
  message: string;
}

// ==================== 批量反馈 ====================

export interface BatchFeedbackRequest {
  planVariantFeedbacks?: PlanVariantFeedbackRequest[];
  conflictFeedbacks?: ConflictFeedbackRequest[];
  decisionQualityFeedbacks?: DecisionQualityFeedbackRequest[];
}

export interface BatchFeedbackResponse {
  message: string;
}

// ==================== 反馈统计 ====================

export interface FeedbackStatsQuery {
  userId?: string;
  tripId?: string;
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
}

export interface FeedbackStatsResponse {
  planVariantCount: number;
  conflictCount: number;
  decisionQualityCount: number;
  averageSatisfaction: number;
  averagePlanQuality: number;
}
