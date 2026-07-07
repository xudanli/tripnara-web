/**
 * Guide-to-Plan Pipeline — 攻略导入规划器类型
 *
 * 攻略解析结果不直接写入 ItineraryItem，而是经三层转换后生成 PlanCandidate（草案）。
 */

import type { ItineraryDraftView } from '@/types/guide-to-plan-api';

/** 信息可信度等级 L1–L5 */
export type SourceConfidenceLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export const SOURCE_CONFIDENCE_LABELS: Record<SourceConfidenceLevel, string> = {
  L1: '攻略作者观点',
  L2: '多篇攻略交叉印证',
  L3: '地图 / POI 数据',
  L4: '官方规则',
  L5: '实时 / 临近出发数据',
};

/** 攻略输入方式 */
export type GuideSourceType = 'link' | 'screenshot' | 'text' | 'inspiration' | 'file';

export interface GuideSource {
  id: string;
  type: GuideSourceType;
  /** 用户可见标题（解析后或手动） */
  title?: string;
  /** 链接 URL */
  url?: string;
  /** 粘贴正文 */
  rawText?: string;
  /** 截图 / 文件引用（前端 blob URL 或上传后 URL） */
  imagePreviewUrl?: string;
  /** 灵感短语 */
  inspirationText?: string;
  addedAt: string;
}

export type GuideClaimType =
  | 'stay_duration'
  | 'best_time'
  | 'avoid_condition'
  | 'booking_required'
  | 'transport_mode'
  | 'seasonal_note'
  | 'queue_tip'
  | 'photo_tip'
  | 'general_opinion';

export type GuideVerificationStatus =
  | 'UNVERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'VERIFIED'
  | 'CONTRADICTED';

export interface GuideClaim {
  id: string;
  claimType: GuideClaimType;
  subjectName?: string;
  subjectPlaceId?: number;
  statement: string;
  sourceGuideId: string;
  confidence: SourceConfidenceLevel;
  applicableSeason?: string;
  applicableTraveler?: string;
  verificationStatus: GuideVerificationStatus;
}

export type ExtractedPlaceCategory =
  | 'attraction'
  | 'restaurant'
  | 'hotel'
  | 'activity'
  | 'area'
  | 'other';

export interface ExtractedPlace {
  id: string;
  name: string;
  nameEN?: string;
  category: ExtractedPlaceCategory;
  sourceGuideIds: string[];
  /** 匹配到的 TripNARA POI */
  matchedPlaceId?: number;
  matchConfidence?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  confidence: SourceConfidenceLevel;
  dayHint?: number;
  orderHint?: number;
}

export interface ExtractedRoute {
  id: string;
  label?: string;
  placeNames: string[];
  sourceGuideId: string;
  transportMode?: string;
  estimatedDrivingMinutes?: number;
}

export interface ExtractedTip {
  id: string;
  text: string;
  sourceGuideId: string;
  confidence: SourceConfidenceLevel;
  category?: 'experience' | 'pitfall' | 'booking' | 'season' | 'photo';
}

export interface GuideRiskHint {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  needsVerification: boolean;
  sourceGuideIds: string[];
}

export interface ImportedGuide {
  id: string;
  source: GuideSource;
  extractedPlaces: ExtractedPlace[];
  extractedClaims: GuideClaim[];
  extractedRoutes: ExtractedRoute[];
  extractedTips: ExtractedTip[];
  riskHints: GuideRiskHint[];
  sourceConfidence: SourceConfidenceLevel;
  importedAt: string;
  parseStatus: 'pending' | 'parsed' | 'failed';
  parseError?: string;
}

/** 多篇攻略合并后的理解结果 */
export interface GuideBundleSummary {
  guideIds: string[];
  themeSummary: string;
  destinationHint?: string;
  suggestedDays?: number;
  places: ExtractedPlace[];
  restaurants: ExtractedPlace[];
  accommodations: ExtractedPlace[];
  tips: ExtractedTip[];
  claims: GuideClaim[];
  routes: ExtractedRoute[];
  riskHints: GuideRiskHint[];
  unmatchedPlaceNames: string[];
  stats: {
    placeCount: number;
    restaurantCount: number;
    accommodationCount: number;
    tipCount: number;
    riskCount: number;
  };
}

/** 用户确认本次旅行条件（关键澄清项） */
export interface GuideTripContext {
  startDate?: string;
  endDate?: string;
  travelerProfile?: 'solo' | 'couple' | 'family_with_kids' | 'family_with_elderly' | 'friends';
  transportMode?: 'self_drive' | 'public_transit' | 'tour' | 'mixed' | 'bus' | 'unknown';
  vehicleType?: '2wd' | '4x4' | 'suv' | 'campervan';
  mustKeepExperiences?: string[];
  destination?: string;
  countryCode?: string;
  travelers?: { adults?: number; children?: number; seniors?: number };
}

export type PlanCandidateStatus = 'DRAFT' | 'PENDING_CONFIRM' | 'ACCEPTED';

export interface PlanAdjustmentRow {
  id: string;
  category: string;
  originalGuide: string;
  adjustedPlan: string;
  reason?: string;
  persona?: 'neptune' | 'abu' | 'dre';
}

export interface PlanCandidate {
  id: string;
  sourceGuideIds: string[];
  status: PlanCandidateStatus;
  tripId?: string;
  retainedItems: string[];
  modifiedItems: string[];
  rejectedItems: string[];
  decisionReasons: string[];
  adjustments: PlanAdjustmentRow[];
  disclaimer: string;
  /** API 草案扩展字段 */
  variant?: string;
  label?: string;
  description?: string;
  recommended?: boolean;
  feasibilityScore?: number;
  pendingConfirmations?: string[];
  warnings?: string[];
  itineraryDraft?: ItineraryDraftView | null;
}

/** API 请求 / 响应 */
export interface ParseGuideRequest {
  source: GuideSource;
  locale?: string;
}

export interface ParseGuideResponse {
  guide: ImportedGuide;
}

export interface MergeGuidesRequest {
  guideIds: string[];
  guides: ImportedGuide[];
}

export interface MergeGuidesResponse {
  summary: GuideBundleSummary;
}

export interface GenerateGuideDraftRequest {
  summary: GuideBundleSummary;
  tripContext: GuideTripContext;
  guideIds: string[];
}

export interface GenerateGuideDraftResponse {
  candidate: PlanCandidate;
}
