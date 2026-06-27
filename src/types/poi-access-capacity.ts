/**
 * POI Access & Capacity Engine — 冰岛 MVP 共享类型
 * @see docs/prd/iceland-poi-access-capacity-engine.md
 * @see docs/api/pre-trip-readiness-p0-api.md
 */

/** 规则层：准入限制类型 */
export type PoiAccessRuleType =
  | 'CLOSED'
  | 'SEASONAL_CLOSURE'
  | 'RESERVATION_REQUIRED'
  | 'PARKING_RESERVATION'
  | 'VEHICLE_RESTRICTION'
  | 'TIME_WINDOW'
  | 'CAPACITY_LIMIT'
  | 'TRAIL_RESTRICTION'
  | 'SAFETY_RESTRICTION';

/** 瓶颈资源类型（冰岛场景核心维度） */
export type PoiTargetResource =
  | 'POI'
  | 'PARKING'
  | 'ROAD'
  | 'TRAIL'
  | 'ACTIVITY'
  | 'VIEWPOINT';

export type PoiAccessRuleStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_CONFIRMATION';

export type PoiAccessConfidence = 'OFFICIAL' | 'PARTNER' | 'INFERRED';

/** 规则层实体 — poi_access_rule */
export interface PoiAccessRule {
  id: string;
  poiId: string;
  ruleType: PoiAccessRuleType;
  targetResource: PoiTargetResource;
  validFrom?: string;
  validTo?: string;
  dailyStartTime?: string;
  dailyEndTime?: string;
  quota?: number;
  reservationRequired?: boolean;
  applicableVehicleTypes?: string[];
  status: PoiAccessRuleStatus;
  sourceAuthority: string;
  sourceUrl: string;
  sourceUpdatedAt?: string;
  lastVerifiedAt: string;
  confidence: PoiAccessConfidence;
  /** 人类可读说明，如 Dyrhólaey 鸟类繁殖期限制 */
  notes?: string;
}

/** 库存层：某 POI 某资源在某日/时段的容量 */
export type PoiInventoryKind = 'TIMED_ENTRY' | 'PARKING_SLOT' | 'ACTIVITY_SEAT';

export interface PoiInventorySlot {
  id: string;
  poiId: string;
  targetResource: PoiTargetResource;
  inventoryKind: PoiInventoryKind;
  /** ISO date or datetime window start */
  slotStart: string;
  slotEnd?: string;
  capacity?: number;
  remaining?: number;
  status: 'AVAILABLE' | 'LIMITED' | 'SOLD_OUT' | 'UNKNOWN';
  source: 'OFFICIAL' | 'PARKA' | 'BOKUN' | 'PARTNER' | 'MANUAL';
  sourceUrl?: string;
  observedAt: string;
  validUntil?: string;
}

export type PoiCrowdLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'FULL';

export type PoiCrowdingSignalSource =
  | 'BOOKING'
  | 'PARKING'
  | 'TRAFFIC'
  | 'USER'
  | 'OPERATOR'
  | 'MODEL';

/** 拥堵层快照 — poi_crowding_snapshot */
export interface PoiCrowdingSnapshot {
  poiId: string;
  targetResource: PoiTargetResource;
  observedAt: string;
  parkingOccupancyRatio?: number;
  bookingRemaining?: number;
  bookingCapacity?: number;
  arrivalRatePerHour?: number;
  /** 分钟；必须带来源，不可伪装成闸机排队 */
  predictedWaitP50?: number;
  predictedWaitP90?: number;
  crowdLevel: PoiCrowdLevel;
  signalSources: PoiCrowdingSignalSource[];
  confidenceScore: number;
  /** 如「基于预约库存预测」「模型推算·非现场实测」 */
  disclosureLabel?: string;
}

/** 约束求解器 / 独立模块对单个 POI 的判定（后端 canonical） */
export type PoiAccessVerdictCanonical =
  | 'FEASIBLE'
  | 'FEASIBLE_WITH_RISK'
  | 'BLOCKED'
  | 'NEEDS_CONFIRMATION'
  | 'RESERVATION_REQUIRED';

/** @deprecated 读模型历史值；新接口用 NEEDS_CONFIRMATION，前端 normalize 后兼容 UNKNOWN */
export type PoiAccessVerdictLegacy = 'UNKNOWN';

export type PoiAccessVerdict =
  | PoiAccessVerdictCanonical
  | PoiAccessVerdictLegacy;

/** Plan B 动作 — 与 GET /poi-access-capacity/evaluate、itinerary.verify 一致 */
export type PoiAccessPlanBAction =
  | 'SHIFT_ARRIVAL'
  | 'BOOK_NOW'
  | 'USE_ALTERNATIVE'
  | 'CHANGE_DATE';

export interface PoiAccessPlanBOption {
  id: string;
  label?: string;
  description?: string;
  action: PoiAccessPlanBAction;
  alternativePoiId?: string;
  externalUrl?: string;
  suggestedArrivalAt?: string;
  suggestedDayNumber?: number;
}

export interface PoiAccessPlanBHint {
  id: string;
  label: string;
  description?: string;
  /** 旧读模型字符串；新接口优先 action */
  actionType?: string;
  action?: PoiAccessPlanBAction;
  alternativePoiId?: string;
  externalUrl?: string;
}

/** 综合评估 — 引擎输出，映射到 Feasibility issue */
export interface PoiAccessEvaluation {
  id: string;
  tripItemId: string;
  poiId: string;
  poiName?: string;
  dayNumber: number;
  plannedArrivalAt?: string;
  bottleneckResource: PoiTargetResource;
  verdict: PoiAccessVerdict;
  /** 硬约束 / 软约束 / 待确认 */
  constraintTier: 'hard' | 'soft' | 'unknown';
  message: string;
  detail?: string;
  applicableRules?: PoiAccessRule[];
  inventorySlot?: PoiInventorySlot;
  crowding?: PoiCrowdingSnapshot;
  planBHints?: PoiAccessPlanBHint[];
  /** 与 planBHints 同义；独立模块 / verify 新字段 */
  planB?: PoiAccessPlanBOption[];
  lastEvaluatedAt: string;
  reason?: string;
}

/** Readiness / Feasibility 读模型扩展字段（挂在 issue.visitorAccess 上） */
export interface PoiVisitorAccessIssuePayload {
  evaluation: PoiAccessEvaluation;
  deferredLive?: boolean;
  hasReservationEvidence?: boolean;
}

// ── 独立模块 GET /poi-access-capacity/*（裸 JSON，无 success 包装）──

export interface PoiAccessEvaluateQuery {
  poiId: string;
  tripId?: string;
  tripItemId?: string;
  plannedArrivalAt?: string;
  country?: string;
}

export interface PoiAccessEvaluateResponse {
  evaluation: PoiAccessEvaluation;
}

export interface PoiAccessRuleStatusOverride {
  ruleId: string;
  status: PoiAccessRuleStatus;
  reason?: string;
  validFrom?: string;
  validTo?: string;
  sourceUrl?: string;
  updatedAt?: string;
}

export interface PoiAccessRulesResponse {
  poiId: string;
  rules: PoiAccessRule[];
  statusOverrides?: PoiAccessRuleStatusOverride[];
}

export interface PoiAccessExecutionFeedbackPayload {
  tripId: string;
  poiId: string;
  tripItemId?: string;
  targetResource?: PoiTargetResource;
  arrivedAt?: string;
  parkedAt?: string;
  parkingWaitMinutes?: number;
  couldNotPark?: boolean;
  gaveUp?: boolean;
  crowdLevelSelf?: PoiCrowdLevel;
  note?: string;
}

export interface PoiAccessFeedbackResponse {
  accepted: boolean;
  observedAt?: string;
}
