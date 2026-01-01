import type { BaseEntity } from './common';

// ==================== 复盘状态 ====================

export type ReviewStatus = 'draft' | 'generated' | 'user_confirmed' | 'archived';

// ==================== 事件类型 ====================

export type ExecutionEventType =
  | 'CHECKIN' // 到达
  | 'CHECKOUT' // 离开
  | 'PLAN_ITEM_COMPLETED' // 完成计划项
  | 'PLAN_ITEM_SKIPPED' // 取消计划项
  | 'PLAN_ITEM_REPLACED' // 替换计划项
  | 'DELAY' // 延误（交通/排队/天气）
  | 'RISK_SIGNAL' // 风险信号（风、雪、封路、疲劳）
  | 'BOOKING_FAIL' // 订座失败/无票
  | 'REPAIR_ACTION'; // Neptune 修复动作（换点/换路/加缓冲）

// ==================== 事件原因标签 ====================

export type EventReasonTag =
  | 'weather' // 天气
  | 'road' // 路况
  | 'crowd' // 拥挤
  | 'fatigue' // 疲劳
  | 'preference' // 偏好
  | 'cost' // 成本
  | 'time'; // 时间

// ==================== 洞察类别 ====================

export type InsightCategory =
  | 'highlight' // 高光
  | 'friction' // 摩擦点
  | 'decision' // 决策质量
  | 'rhythm' // 节奏
  | 'cost' // 成本
  | 'safety'; // 安全

// ==================== 洞察用户反馈 ====================

export type InsightVote = 'agree' | 'disagree' | 'edit';

export interface InsightUserFeedback {
  vote: InsightVote;
  note?: string;
}

// ==================== 锚点类型 ====================

export type AnchorType = 'preference' | 'risk_policy' | 'route_pattern' | 'pacing';

export type AnchorScope = 'global' | 'country' | 'trip_type';

export type AnchorStatus = 'saved' | 'suggested' | 'disabled';

// ==================== 事件影响 ====================

export interface EventImpact {
  timeDeltaMin?: number; // 时间变化（分钟，+/-）
  distanceDeltaKm?: number; // 距离变化（公里）
  costDelta?: number; // 成本变化
  riskDelta?: number; // 风险变化（-2 ~ +2）
}

// ==================== 事件证据 ====================

export interface EventEvidence {
  weatherSnapshot?: Record<string, any>; // 天气快照
  roadCondition?: string; // 路况
  userNote?: string; // 用户备注
  photos?: string[]; // 照片URL
  [key: string]: any; // 其他证据字段
}

// ==================== 执行事件（证据事件流）====================

export interface ExecutionEvent extends BaseEntity {
  eventId: string;
  tripId: string;
  dayIndex: number; // 第几天（从0开始）
  timestampStart: string; // ISO 8601
  timestampEnd?: string; // ISO 8601（可选）
  type: ExecutionEventType;
  refPlanItemId?: string; // 关联的计划项ID
  placeId?: number; // 地点ID（可选）
  routeSegmentId?: string; // 路线段ID（可选）
  reasonTags: EventReasonTag[]; // 原因标签
  impact?: EventImpact; // 影响
  evidence?: EventEvidence; // 证据
}

// ==================== 复盘洞察 ====================

export interface ReviewInsight extends BaseEntity {
  insightId: string;
  reviewId: string;
  category: InsightCategory;
  title: string;
  summary: string; // 一句话总结
  confidence: number; // 0-1
  evidenceEventIds: string[]; // 可追溯的事件ID列表
  userFeedback?: InsightUserFeedback; // 用户反馈
  persona?: 'abu' | 'dre' | 'neptune'; // 三人格视角（可选）
  metrics?: Record<string, number>; // 关键数字（可选，如分钟/公里/次数）
}

// ==================== 锚点规则参数 ====================

export interface AnchorParameters {
  maxDailyDriveMin?: number;
  preferGoldenHour?: boolean;
  avoidCrowdLevel?: number;
  maxDailyActivities?: number;
  minRestIntervalHours?: number;
  [key: string]: any; // 其他参数
}

// ==================== 锚点规则 ====================

export interface AnchorRule extends BaseEntity {
  anchorId: string;
  type: AnchorType;
  ruleText: string; // 一句话规则（可编辑）
  parameters?: AnchorParameters; // 结构化字段，给规划引擎用
  evidenceTripIds: string[]; // 来自哪些行程的证据
  strength: number; // 用户确认强度（1-5）
  scope: AnchorScope; // 作用域
  status: AnchorStatus;
}

// ==================== 复盘主体 ====================

export interface TripReview extends BaseEntity {
  reviewId: string;
  tripId: string;
  status: ReviewStatus;
  generatedAt?: string; // ISO 8601
  confirmedAt?: string; // ISO 8601
  planVersionId: string; // 复盘基于的计划版本（必须）
  executionVersionId?: string; // 实际执行版本（强烈建议有）
  timezone: string; // 时区（如 'Asia/Shanghai'）
  locale: string; // 语言代码（如 'zh-CN'）
  sources: string[]; // 数据来源（gps、checkin、calendar、manual）
}

// ==================== KPI 指标 ====================

export interface ReviewKPI {
  // 完成度（Completion）
  completion: {
    completedPlanItems: number; // 完成的计划项数
    totalPlanItems: number; // 总计划项数
    replacedCompleted: number; // 替换完成的计划项数
    completionRate: number; // 完成率（0-1）
  };
  
  // 变更强度（Change Rate）
  changeRate: {
    replaced: number; // 替换数
    skipped: number; // 跳过数
    rescheduled: number; // 重新安排数
    totalPlanItems: number;
    changeRate: number; // 变更率（0-1）
  };
  
  // 时间健康度（Schedule Health）
  scheduleHealth: {
    totalDelayMinutes: number; // 总延误分钟数
    usedBufferMinutes?: number; // 使用的缓冲时间（分钟）
    plannedBufferMinutes?: number; // 计划的缓冲时间（分钟）
    bufferUsageRate?: number; // 缓冲使用率（0-1，如果有buffer概念）
  };
  
  // 风险暴露（Risk）
  risk: {
    riskEventCount: number; // 风险事件数
    totalRiskDelta: number; // 总风险影响（Σ impact.riskDelta）
    avgRiskDelta: number; // 平均风险影响
  };
  
  // 预算偏差（Budget，可选）
  budget?: {
    actualCost: number; // 实际成本
    plannedCost: number; // 计划成本
    budgetDelta: number; // 预算偏差
    budgetVarianceRate: number; // 预算偏差率（0-1）
  };
}

// ==================== 复盘汇总数据 ====================

export interface ReviewSummary {
  tripId: string;
  reviewId: string;
  tripName?: string; // 行程名称
  startDate: string; // 开始日期
  endDate: string; // 结束日期
  totalDays: number; // 总天数
  mode?: string; // 模式（如 '自驾'、'公共交通'）
  kpi: ReviewKPI; // KPI 指标
}

// ==================== 完整的复盘数据（包含所有层）====================

export interface TripReviewData {
  review: TripReview; // 复盘主体
  summary: ReviewSummary; // 汇总数据
  events: ExecutionEvent[]; // 证据事件流
  insights: ReviewInsight[]; // 系统洞察
  anchorsSuggested: AnchorRule[]; // 建议的锚点（待用户确认）
  anchorsSaved: AnchorRule[]; // 已保存的锚点
}

// ==================== API 请求/响应类型 ====================

export interface GenerateReviewRequest {
  tripId: string;
  planVersionId?: string; // 可选，如果不提供则使用最新版本
  executionVersionId?: string; // 可选
}

export interface GenerateReviewResponse {
  review: TripReview;
  summary: ReviewSummary;
  insights: ReviewInsight[];
  anchorsSuggested: AnchorRule[];
}

export interface UpdateEventRequest {
  eventId: string;
  timestampStart?: string;
  timestampEnd?: string;
  reasonTags?: EventReasonTag[];
  impact?: EventImpact;
  evidence?: EventEvidence;
}

export interface SaveAnchorRequest {
  anchorId: string; // 来自建议的锚点ID，或新建时为空
  type: AnchorType;
  ruleText: string;
  parameters?: AnchorParameters;
  scope: AnchorScope;
}

export interface UpdateAnchorRequest {
  anchorId: string;
  ruleText?: string;
  parameters?: AnchorParameters;
  status?: AnchorStatus;
  strength?: number;
}

export interface ExportReviewRequest {
  tripId: string;
  format: 'pdf' | 'markdown'; // 导出格式
}

export interface ExportReviewResponse {
  url: string; // 导出文件URL
  expiresAt: string; // URL过期时间
}

