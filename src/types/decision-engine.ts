/**
 * 决策引擎 API 类型定义（用户端）
 * 基于 API 文档 v1 规范
 */

// ==================== 通用类型 ====================

export type DecisionStatus = 'pending' | 'completed' | 'failed';
export type FeedbackType = 'rating' | 'implicit';
export type ExplanationDetailLevel = 'brief' | 'standard' | 'detailed';
export type ExplanationLanguage = 'zh' | 'en';
export type TrendDirection = 'stable' | 'increasing' | 'decreasing';

// ==================== 用户偏好 ====================

export interface UserPreferences {
  safety: number;
  experienceDensity: number;
  budgetSensitivity: number;
}

export interface DecisionConstraints {
  maxBudget?: number;
  mustInclude?: string[];
  mustExclude?: string[];
}

export interface DecisionOptions {
  includeExplanation?: boolean;
  maxAlternatives?: number;
  language?: ExplanationLanguage;
}

// ==================== 决策请求/响应 ====================

export interface CreateDecisionRequest {
  tripId: string;
  preferences: UserPreferences;
  constraints?: DecisionConstraints;
  options?: DecisionOptions;
}

export interface PlanItem {
  id: string;
  name?: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  location?: {
    name: string;
    lat: number;
    lng: number;
  };
  type?: string;
  cost?: number;
}

export interface SelectedPlan {
  id: string;
  items: PlanItem[];
  utility: number;
  totalDuration: string;
  estimatedCost: number;
}

export interface AlternativePlan {
  id: string;
  utility: number;
  summary: string;
}

export interface KeyFactor {
  name: string;
  contribution: '正向' | '负向' | 'positive' | 'negative';
  description: string;
  importance?: string;
  value?: string;
  icon?: string;
}

export interface DecisionExplanation {
  summary: string;
  keyFactors: KeyFactor[];
}

export interface CreateDecisionResponse {
  decisionId: string;
  status: DecisionStatus;
  selectedPlan: SelectedPlan;
  alternatives: AlternativePlan[];
  explanation?: DecisionExplanation;
  confidence: number;
  processingTime: number;
}

export interface DecisionMetadata {
  processingTime: number;
  samplesUsed: number;
  constraintsChecked: number;
}

export interface DecisionDetail {
  decisionId: string;
  status: DecisionStatus;
  createdAt: string;
  selectedPlan: SelectedPlan;
  explanation?: DecisionExplanation;
  metadata: DecisionMetadata;
}

// ==================== 方案切换 ====================

export interface SelectPlanRequest {
  planId: string;
  reason?: string;
}

export interface SelectPlanResponse {
  success: boolean;
  selectedPlanId: string;
}

// ==================== 反馈 ====================

export interface DecisionFeedbackRequest {
  type: FeedbackType;
  rating?: number;
  comment?: string;
  selectedOption?: string;
  context?: {
    completedTrip?: boolean;
    weatherCondition?: string;
    [key: string]: unknown;
  };
}

export interface DecisionFeedbackResponse {
  feedbackId: string;
  received: boolean;
  message: string;
}

export interface PreferenceFeedbackRequest {
  type: 'implicit';
  action: string;
  attractionId?: string;
  tripId?: string;
  timestamp: string;
  [key: string]: unknown;
}

// ==================== 解释 ====================

export interface Tradeoff {
  dimensions: string;
  explanation: string;
  recommendation: string;
}

export interface ConstraintStatus {
  name: string;
  status: 'satisfied' | 'violated' | 'not_applicable';
  explanation: string;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high';
  summary: string;
  factors: Array<{
    name: string;
    severity: string;
    description: string;
  }>;
}

export interface Recommendation {
  action: string;
  reasoning: string[];
  caveats: string[];
  nextSteps: string[];
}

export interface DetailedExplanation {
  summary: string;
  keyFactors: Array<{
    name: string;
    importance: string;
    value: string;
    description: string;
    icon?: string;
  }>;
  tradeoffs: Tradeoff[];
  constraints: ConstraintStatus[];
  riskAssessment: RiskAssessment;
  recommendation: Recommendation;
}

export interface NaturalLanguageExplanation {
  text: string;
}

// ==================== 历史记录 ====================

export interface DecisionHistoryQuery {
  page?: number;
  pageSize?: number;
  tripId?: string;
  status?: DecisionStatus;
  from?: string;
  to?: string;
}

export interface DecisionHistoryItem {
  decisionId: string;
  tripId: string;
  status: DecisionStatus;
  utility: number;
  createdAt: string;
  summary: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface DecisionHistoryResponse {
  items: DecisionHistoryItem[];
  pagination: Pagination;
}

export interface PreferenceConfidence {
  confidence: number;
  trend: TrendDirection;
}

export interface LearningProgress {
  totalInteractions: number;
  preferenceLearned: {
    safety: PreferenceConfidence;
    experienceDensity: PreferenceConfidence;
    budgetSensitivity: PreferenceConfidence;
    [key: string]: PreferenceConfidence;
  };
  recommendationAccuracy: number;
  improvementRate: string;
}

// ==================== WebSocket ====================

export type WebSocketMessageType = 
  | 'subscribe'
  | 'unsubscribe'
  | 'progress'
  | 'completed'
  | 'error';

export interface WebSocketSubscribeMessage {
  type: 'subscribe';
  channel: string;
  decisionId?: string;
}

export interface WebSocketProgressMessage {
  type: 'progress';
  stage: string;
  progress: number;
}

export interface WebSocketCompletedMessage {
  type: 'completed';
  decisionId: string;
  utility: number;
}

export interface WebSocketErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

export type WebSocketMessage =
  | WebSocketSubscribeMessage
  | WebSocketProgressMessage
  | WebSocketCompletedMessage
  | WebSocketErrorMessage;
