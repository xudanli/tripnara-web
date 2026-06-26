/**
 * Match Square API 契约类型
 * @see Decision OS · Match Square 前端集成指南 v1.0.0
 */

import type { MbtiQuadrant } from '@/types/odyssey-travel-persona';

import type { VibeLlmParseResult } from '@/types/vibe-llm';
import type { TrekkingVibeOrchestrationPlan } from '@/types/trekking-vibe-orchestration';
import type { TripInstantiationResult } from '@/types/trip-instantiation';
import type { TrekSpawnState } from '@/types/spawn-trek-trip';
import type { SovereignForceLockRecord } from '@/types/sovereign-force-lock';

export type InteractionMode = 'deep_learning' | 'easy_companion' | 'independent';

export type TripMoodTag = 'relax' | 'adventure' | 'healing' | 'social';

/** PRD 3.4.4 组队风格 / 策划协作三档 */
export type PlanningStyle = 'full_managed' | 'co_planning' | 'casual_play';

export type TravelMode = 'self_drive' | 'public_transit' | 'mixed' | 'other';

/** Premium Trekking · 徒步场景与广场招募联动 */
export type TrekActivityProfile = 'heavy_pack' | 'light_trek' | 'speed_ascent';

export type RecruitmentPostStatus = 'active' | 'hidden' | 'closed';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export type ApplicationReviewAction = 'approve' | 'reject';

/** GET /api/match-square/access */
export type MatchSquareAccess = {
  canBrowse: boolean;
  canPost: boolean;
  canApply: boolean;
  quizComplete: boolean;
};

export type TeamStatus = {
  slotsFilled: number;
  slotsNeeded: number;
  slotsRemaining: number;
};

export type BudgetRange = {
  minCents: number | null;
  maxCents: number | null;
};

/** PRD 3.1.2 学历认证 — 脱敏展示标签 */
export type EducationDegreeLevel = 'bachelor' | 'master' | 'doctorate';

export type EducationTierTag =
  | '985_211'
  | 'qs_top50'
  | 'overseas_returnee'
  | 'general';

export type EducationCredential = {
  verified: boolean;
  degreeLevel: EducationDegreeLevel;
  tierTags: EducationTierTag[];
  /** 列表气泡，如「🎓 硕士(海归)」 */
  displayLabel: string;
};

/** PRD 3.1.2 工作资历 — 行业圈层（脱敏） */
export type IndustryCluster =
  | 'tech_internet'
  | 'finance_consulting'
  | 'manufacturing'
  | 'education_research'
  | 'creative_media'
  | 'other_white_collar';

export type ProfessionCredential = {
  verified: boolean;
  industryCluster: IndustryCluster;
  /** 脱敏职业身份，不含公司全称 */
  roleTitle: string;
  displayLabel: string;
};

export type ZhimaCreditTier = 'excellent' | 'good' | 'fair' | 'poor';

export type ZhimaCreditCredential = {
  verified: boolean;
  score: number | null;
  tier: ZhimaCreditTier;
  displayLabel: string;
};

/** 广场 Card 列表行 — API headline */
export type VerifiedCredentialsHeadline = {
  /** 脱敏昵称 — GET users/:id/credentials 与 applications 内嵌背书 */
  displayName?: string | null;
  identityHeadline: string;
  trustAssetLine: string;
};

/** 集成指南 §14 · GET /posts verifiedCredentials 原始视图 */
export type VerifiedCredentialsViewHeadline = {
  displayName?: string | null;
  identityHeadline?: string | null;
  professionTags?: string[];
  educationTags?: string[];
  sesameCreditLine?: string | null;
  trustAssetLine?: string | null;
};

export type VerifiedBadgeMeta = {
  verified: boolean;
  badgeLabel: '已认证';
  badgeMark: '✓';
  renderHint: 'vector_component_watermark';
};

/** 集成指南 §14 · dossier 扩展字段（可选） */
export type VerifiedCredentialsViewDossierEducation = {
  displayTag: string;
  degreeLevel: string;
  tierTag: string;
  verified: boolean;
  badge?: VerifiedBadgeMeta;
  verificationChannel?: 'xuexin_online_code';
};

export type VerifiedCredentialsViewDossierProfession = {
  displayTags: string[];
  industryTag: string;
  companyTierTag?: string;
  roleLevelTag?: string;
  verified: boolean;
  badge?: VerifiedBadgeMeta;
  verificationChannel?: 'work_email' | 'badge_ocr' | 'oauth_maimai' | 'oauth_linkedin';
};

export type VerifiedCredentialsViewDossier = {
  displayName?: string | null;
  avatarUrl?: string | null;
  education?: VerifiedCredentialsViewDossierEducation | null;
  profession?: VerifiedCredentialsViewDossierProfession | null;
  sesameCredit?: {
    score: number | null;
    label: string | null;
    tier: string | null;
    verified: boolean;
  } | null;
  reputationStars?: number | null;
  safetyNote?: string | null;
  /** legacy tag lists */
  educationTags?: Array<{ id: string; label: string }>;
  professionTags?: Array<{ id: string; label: string }>;
  zhimaCreditLine?: string | null;
};

export type VerifiedCredentialsView = {
  headline: VerifiedCredentialsViewHeadline;
  dossier?: VerifiedCredentialsViewDossier | null;
};

/** GET /api/match-square/users/:userId/credentials */
export type UserCredentialsView = {
  userId: string;
  cardTitle: string;
  mbtiType: string;
  verifiedCredentials: VerifiedCredentialsView | null;
};

/** 详情页信任档案抽屉 — API dossier */
export type VerifiedCredentialsDossier = {
  displayName: string;
  avatarUrl?: string | null;
  educationTags: Array<{ id: string; label: string }>;
  professionTags: Array<{ id: string; label: string }>;
  zhimaCreditLine?: string | null;
  reputationStars?: number | null;
};

/** GET /posts 字段 verifiedCredentials */
export type VerifiedCredentials = {
  headline: VerifiedCredentialsHeadline;
  dossier?: VerifiedCredentialsDossier | null;
  /** 结构化字段 — 客户端匹配 / legacy normalize */
  education?: EducationCredential | null;
  profession?: ProfessionCredential | null;
  zhimaCredit?: ZhimaCreditCredential | null;
};

/** 列表 / 详情 Card */
export type MatchInsightDrawerLine = {
  status: 'ok' | 'warn' | 'neutral';
  label: string;
  detail: string;
};

export type MatchInsightDrawer = {
  headline: string;
  lines: MatchInsightDrawerLine[];
};

export type StructuralMatchSnapshot = {
  baseScore: number;
  teamworkFitPoints: number;
  stressFitPoints: number;
  mbtiSynergyPoints: number;
  algorithm: string;
};

export type VibeLlmChip = { id: string; label: string };

export type VibeLlmCardBlock = {
  chips: VibeLlmChip[];
  /** 与 post.recruitmentVision 同源 · 发帖 vibeFreeText 持久化 */
  visionText?: string | null;
  contractHint?: string | null;
  /** 英文 canonical · 调试/埋点 */
  teamworkContractModel?: string;
  /** 用户可见中文标签 */
  teamworkContractModelLabel?: string | null;
  hardGatesSummary?: string[];
  behavioralContracts?: Array<{ title: string; clauses: string[] }>;
  parseSource?: 'rules' | 'llm';
};

export type TeamDeficitDimension =
  | 'energy_balance'
  | 'risk_resilience'
  | 'trust_alignment'
  | 'collaboration_fit'
  | 'cross_circle_chemistry'
  | 'preference';

export type ViewerPuzzleMatch = {
  isSoulPiece: boolean;
  headline: string;
  matchedSlotIndex: number;
  matchedRoleLabel: string;
  aiRationale?: string | null;
};

export type RecruitmentPostCard = {
  id: string;
  status: RecruitmentPostStatus;
  captainUserId: string;
  captainDisplayName?: string | null;
  captainCardTitle: string;
  captainMbtiType: string;
  captainInteractionMode: string;
  captainInteractionModeLabel: string;
  captainReputationStars: number | null;
  /** PRD 3.1.2 · GET /posts verifiedCredentials */
  verifiedCredentials?: VerifiedCredentials | null;
  /** @deprecated 使用 verifiedCredentials */
  captainVerifiedCredentials?: VerifiedCredentials | null;
  /** 队长履约 Hard Gate — 广场列表已过滤 */
  recommendationHidden?: boolean;
  recommendationHiddenReason?: string | null;
  compatibilityPercent: number | null;
  /** v2 Match Engine — 点击 % 气泡展开的抽屉 */
  matchInsightDrawer?: MatchInsightDrawer | null;
  structuralMatch?: StructuralMatchSnapshot | null;
  destination: string;
  /** 招募愿景 · 发帖 vibeFreeText 持久化；详情 hero 引言 */
  recruitmentVision?: string | null;
  /** 可选招募标题；缺省时前端用 destination */
  title?: string | null;
  departureLabel: string | null;
  startDate: string;
  endDate: string;
  teamStatus: TeamStatus;
  captainMessage: string | null;
  itinerarySummary: string;
  budgetRange: BudgetRange | null;
  tripMoodTag: TripMoodTag | null;
  /** 策划协作三档（与 teamworkStyle 同值） */
  planningStyle?: PlanningStyle | null;
  planningStyleLabel?: string | null;
  planningStyleDescription?: string | null;
  teamworkStyle?: PlanningStyle | null;
  /** Card 直接渲染，如「🛡️ 组队风格：全托管」 */
  teamworkStyleCapsule?: string | null;
  /** Hard Gate 熔断时隐藏契合度与申请入口 */
  teamworkMatchBlocked?: boolean;
  teamworkBlockReason?: string | null;
  travelMode: TravelMode | null;
  vehicleInfo?: string | null;
  preferences?: string | null;
  publishedAt: string | null;
  /** 详情接口：当前用户是否为队长 */
  isCaptain?: boolean;
  /** 相对当前用户的 AI 决策翻译（列表 enrich 或 API 下发） */
  matchHighlights?: string[];
  matchWarnings?: string[];
  matchBreakdown?: MatchDimensionBreakdown;
  /** 3.7.1 拼图化缺位（API teamPuzzle） */
  teamPuzzle?: TeamPuzzle;
  /** @deprecated 使用 teamPuzzle.slots；normalize 时同步写入 */
  teamSlots?: TeamSlot[];
  /** 队长「我的招募」雷达红点提示 */
  radarHint?: RadarHint;
  /** 当前用户对该帖的申请状态（列表 API 或客户端合并） */
  viewerApplicationStatus?: ApplicationStatus;
  /** Vibe LLM · 集成指南 §7.0 Card 区块 */
  vibeLlm?: VibeLlmCardBlock | null;
  /** @deprecated 客户端 mock；优先 vibeLlm */
  vibeParse?: VibeLlmParseResult | null;
  /** @deprecated 使用 vibeFreeText / recruitmentVision */
  vibeRawText?: string | null;
  /** @deprecated 读帖用 recruitmentVision */
  vibeFreeText?: string | null;
  /** 关联 RouteDirection 路线 ID（徒步模块 → 广场招募） */
  routeDirectionId?: number | null;
  routeDirectionName?: string | null;
  /** 重装 / 轻装隐居 / 山野速攀 */
  activityProfile?: TrekActivityProfile | null;
  /** §3.10 Trekking Orchestration — GET /posts/:id */
  trekkingOrchestration?: TrekkingVibeOrchestrationPlan | null;
  /** §3.11 绑定的路线模板 catalog id */
  routeTemplateCatalogId?: string | null;
  routeTemplateId?: number | null;
  /** §链路 A · 模板强绑（launch-recruitment） */
  routeTemplateBinding?: import('@/types/launch-recruitment').RouteTemplateBinding | null;
  /** spawn-trek-trip 成团后状态 */
  trekSpawnState?: TrekSpawnState | null;
  /** §3.12 成团 instantiate Active Trip 结果 */
  tripInstantiationResult?: TripInstantiationResult | null;
  /** §3.15 队长强制成团（Sovereign Force Lock） */
  sovereignLock?: SovereignForceLockRecord | null;
  /** Recruiting Runtime · 招募结果评估（行程完成后） */
  outcome?: RecruitingOutcome | null;
};

/** 车队拼图单格 — 兼容 team_deficit_pomdp_v1 API 与客户端兜底 */
export type TeamSlot = {
  id: string;
  kind: 'captain' | 'filled' | 'open';
  label: string;
  filledBy?: string | null;
  highlightForViewer?: boolean;
  slotIndex?: number;
  roleLabel?: string;
  occupantLabel?: string;
  occupantUserId?: string | null;
  aiRationale?: string;
  deficitDimension?: TeamDeficitDimension;
  viewerMatchScore?: number;
};

/** 3.7.1 后端下发的拼图结构 */
export type TeamPuzzle = {
  progressLabel: string;
  algorithm?: 'team_deficit_pomdp_v1';
  slots: TeamSlot[];
  viewerPuzzleMatch?: ViewerPuzzleMatch | null;
};

/** 3.7 Match Flash 灵魂撮合卡 */
export type MatchFlashTheme = 'shimmer_gradient' | 'default';

export type MatchFlashPayload = {
  postId: string;
  compatibilityPercent: number;
  /** 兼容旧字段 */
  verdictTitle: string;
  verdictBody: string;
  headline?: string;
  aiVerdict?: string;
  bullets?: string[];
  rarityTag?: string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaPrimaryAction?: 'flash_apply' | string;
  ctaSecondaryAction?: 'chat_captain' | string;
  theme?: MatchFlashTheme;
  insertAfterIndex?: number;
};

/** 3.7.2 个人旅行意向（反向触达信号） */
export type TravelIntentStatus = {
  active: boolean;
  /** 意向目的地范围，如「新疆」「西北」 */
  destinationScope?: string;
  /** @deprecated 使用 destinationScope；normalize 时同步 */
  destinationHint?: string;
  /** API 标准日期字段 */
  startDate?: string;
  endDate?: string;
  /** 展示用文案（可由 start/end 推导） */
  dateRangeLabel?: string;
  budgetFlex?: 'flexible' | 'moderate' | 'strict';
  /** @deprecated 使用 budgetFlex */
  budgetFlexibility?: 'flexible' | 'moderate' | 'strict';
  openToCarpool?: boolean;
  note?: string;
  updatedAt?: string | null;
};

export type UpsertTravelIntentRequest = {
  destinationScope: string;
  startDate: string;
  endDate: string;
  budgetFlex?: 'flexible' | 'moderate' | 'strict';
  openToCarpool?: boolean;
  note?: string;
};

export type PatchTravelIntentStatusRequest = {
  status: 'active' | 'paused';
  /** 兼容旧 PATCH */
  active?: boolean;
};

/** 队长雷达 · 高契合自由旅伴 */
export type CaptainRadarCandidate = {
  userId: string;
  displayName: string;
  cardTitle: string;
  compatibilityPercent: number;
  departureLabel?: string | null;
  highlights: string[];
  skills?: string[];
  oliveBranchSent?: boolean;
};

export type CaptainRadarResponse = {
  postId: string;
  candidates: CaptainRadarCandidate[];
  /** 后端 radar picks */
  picks?: CaptainRadarCandidate[];
  total: number;
  systemHint?: string | null;
};

export type SendOliveBranchRequest = {
  inviteeUserId: string;
  inviteMessage?: string;
  /** @deprecated */
  candidateUserId?: string;
  message?: string;
};

/** 队员收到的橄榄枝邀请 */
export type OliveBranchInvitation = {
  id: string;
  postId: string;
  postDestination: string;
  captainDisplayName: string;
  captainCardTitle: string;
  message: string | null;
  compatibilityPercent: number | null;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
};

export type RespondOliveBranchRequest = {
  action: 'accept' | 'decline';
};

export type RadarHint = {
  eligibleCount: number;
  topPickDisplayName?: string | null;
};

/** 广场混合流条目 */
export type PlazaFeedItem =
  | { kind: 'post'; post: RecruitmentPostCard }
  | { kind: 'match_flash'; post: RecruitmentPostCard; flash: MatchFlashPayload };

export type PostListFilters = {
  destination?: string;
  dateFrom?: string;
  dateTo?: string;
  personaTypes?: string[];
  personaQuadrants?: MbtiQuadrant[];
  interactionModes?: InteractionMode[];
  planningStyles?: PlanningStyle[];
  limit?: number;
  offset?: number;
};

export type PostListResponse = {
  items: RecruitmentPostCard[];
  total: number;
  /** 优先渲染的混合流（含 match_flash） */
  feedItems?: PlazaFeedItem[];
  matchFlash?: MatchFlashPayload | null;
};

export type DestinationSubScopeOption = {
  id: string;
  label: string;
  /** listing 池用的 destination_scope */
  scope?: string;
};

export type DestinationRegionOption = {
  id: string;
  label: string;
  hint?: string;
  subScopes: DestinationSubScopeOption[];
};

export type MatchSquareFilterOptions = {
  personaQuadrants: Array<{ id: MbtiQuadrant; label: string }>;
  interactionModes: Array<{ id: InteractionMode; label: string }>;
  personaTypes?: Array<{ id: string; label: string }>;
  teamworkStyles?: Array<{
    id: PlanningStyle;
    label: string;
    boundary?: string;
    contractCapsule?: string;
  }>;
  /** GET /filters/options · 与 vibe parse suggestedFields 的 region/sub id 对齐 */
  destinationRegions?: DestinationRegionOption[];
};

export type VibeUserEditedFields = {
  itinerary?: boolean;
  captain?: boolean;
  /** @deprecated 使用 planningStyle */
  planning?: boolean;
  planningStyle?: boolean;
  destination?: boolean;
  destinationRegion?: boolean;
  destinationSubScope?: boolean;
  budget?: boolean;
  travelMode?: boolean;
  tripMoodTag?: boolean;
  preferences?: boolean;
};

export type CreatePostRequest = {
  destination: string;
  departureLabel?: string;
  startDate: string;
  endDate: string;
  /** 有 vibeFreeText 时可留空，由服务端补全 */
  itinerarySummary?: string;
  budgetMinCents?: number;
  budgetMaxCents?: number;
  slotsNeeded: number;
  planningStyle: PlanningStyle;
  preferences?: string;
  tripMoodTag?: TripMoodTag;
  travelMode?: TravelMode;
  vehicleInfo?: string;
  captainMessage: string;
  coordinates?: { lat: number; lng: number };
  /** 集成指南 §7.0 — 服务端重新解析并覆盖 planningStyle（除非 userEdited.planningStyle） */
  vibeFreeText?: string;
  /** 用户手动编辑过的字段，服务端不再 AI 覆盖 */
  userEdited?: VibeUserEditedFields;
  /**
   * 发布页 preview parse 快照（与 vibeFreeText 同次 debounce parse）
   * 一并提交，避免 create 时服务端/规则重算导致 chips 与预览不一致
   */
  vibeParse?: VibeLlmParseResult;
  /** 与 vibeParse 同源的 parseSource */
  parseSource?: 'rules' | 'llm';
  teamworkContractModelLabel?: string;
  /** 徒步路线联动 */
  routeDirectionId?: number;
  routeDirectionName?: string;
  activityProfile?: TrekActivityProfile;
  trekkingOrchestration?: TrekkingVibeOrchestrationPlan | null;
  /** §3.11 绑定的路线模板 catalog */
  routeTemplateCatalogId?: string;
  routeTemplateId?: number;
  /** @deprecated 使用 vibeFreeText */
  vibeRawText?: string;
};

export type UpdatePostStatusRequest = {
  status: RecruitmentPostStatus;
};

/** §7.0.3 · Layer 0 体能硬约束 */
export type PhysicalFitnessReport = {
  fitPercent?: number | null;
  evidenceLabel?: string | null;
  lines?: string[];
};

export type PhysicalFitnessGate = {
  blocked: boolean;
  blockReason?: string | null;
  report?: PhysicalFitnessReport | null;
};

export type PhysicalSurvivalQuizQuestion = {
  id: string;
  prompt: string;
  options: Array<{ value: string; label: string }>;
};

/** GET /api/match-square/posts/:id/apply-preview */
export type ApplyPreview = {
  canApply: boolean;
  blockReason?: string;
  existingApplicationStatus?: ApplicationStatus;
  /** §7.0.3 · blocked=true 时只展示 blockReason，隐藏申请表单 */
  physicalFitnessGate?: PhysicalFitnessGate | null;
  physicalSurvivalQuiz?: PhysicalSurvivalQuizQuestion[];
  conflictPrompt?: {
    required: true;
    dimension: 'planning_hardness';
    message: string;
  } | null;
  teamworkCommitmentPrompt?: {
    required: true;
    dimension: 'teamwork_style';
    teamworkStyle: PlanningStyle;
    message: string;
  } | null;
  teamworkMatchBlocked?: boolean;
  compatibilityPercent?: number | null;
  highlights?: string[];
  warnings?: string[];
  /** 集成指南 §7.0 · vibeBehavioralContracts */
  vibeBehavioralContracts?: Array<{ title: string; clauses: string[] }>;
  /** @deprecated 使用 vibeBehavioralContracts */
  vibeBehaviorContracts?: Array<{ tag: string; clause: string }>;
};

export type SubmitApplicationRequest = {
  message: string;
  planningCommitmentAccepted?: boolean;
  teamworkCommitmentAccepted?: boolean;
  /** Vibe 动态契约条款确认 */
  vibeContractsAccepted?: boolean;
  /** §3.11 Route Contract Lock — 授权模板里程碑 */
  routeContractAccepted?: boolean;
  /** 认领的拼图缺位（选填；不传 = 让系统匹配） */
  targetSlotIndex?: number;
  targetSlotId?: string;
  targetSlotLabel?: string;
  /** §7.0.3 · Level 4+ 户外生存题答案 */
  physicalSurvivalQuizAnswers?: Record<string, string>;
};

/** Recruiting Runtime · 决策归因 */
export type RecruitingAttributionCauseType =
  | 'USER_ACTION'
  | 'CONSTRAINT'
  | 'GOVERNANCE'
  | 'SYSTEM';

export type RecruitingPrimaryReason =
  | 'COMPATIBILITY_MATCH'
  | 'SKILL_REQUIREMENT'
  | 'SCHEDULE_ALIGNMENT'
  | 'BUDGET_ALIGNMENT'
  | 'PERSONA_FIT'
  | 'CAPTAIN_PREFERENCE'
  | 'SLOT_REQUIREMENT'
  | 'TEAM_BALANCE'
  | 'EXTERNAL_FACTOR'
  | 'GOVERNANCE'
  | 'REPUTATION_SCORE'
  | 'PAST_COLLABORATION';

export type RecruitingAttributionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type RecruitingAttributionMetadata = {
  ruleId?: string;
  alternativeReasons?: string[];
  compatibilityScore?: number;
  skillMatchScore?: number;
  scheduleMatchScore?: number;
  budgetMatchScore?: number;
};

export type RecruitingAttribution = {
  causeType: RecruitingAttributionCauseType;
  primaryReason: RecruitingPrimaryReason;
  reasonCodes: string[];
  signalScores: Record<string, number>;
  confidence: RecruitingAttributionConfidence;
  metadata?: RecruitingAttributionMetadata;
};

/** Recruiting Runtime · 招募结果评估 */
export type RecruitingOutcomeSuccessLevel =
  | 'EXCELLENT'
  | 'GOOD'
  | 'ACCEPTABLE'
  | 'POOR'
  | 'FAILED';

export type RecruitingOutcomeMetrics = {
  timeToFill: number;
  applicationCount: number;
  approvedCount: number;
  rejectedCount: number;
  conversionRate: number;
  matchSuccessRate: number;
  teamPerformance: number;
  attritionRate: number;
};

export type RecruitingOutcomeFactor = {
  type: string;
  impact: number;
  description: string;
  details?: Record<string, unknown>;
};

export type RecruitingOutcome = {
  id: string;
  postId: string;
  tripId?: string;
  successLevel: RecruitingOutcomeSuccessLevel;
  metrics: RecruitingOutcomeMetrics;
  factors: RecruitingOutcomeFactor[];
  recommendations: string[];
  computedAt: string;
  dataQuality: number;
  confidence: number;
};

/** PATCH 审批时可选归因上下文 */
export type ReviewApplicationAttributionContext = {
  compatibilityScore?: number;
  mbtiCompatibility?: 'high' | 'medium' | 'low';
  requiredSkills?: string[];
  applicantSkills?: string[];
  scheduleConflict?: boolean;
  timeAvailability?: 'excellent' | 'good' | 'poor';
  budgetFit?: 'perfect' | 'acceptable' | 'poor';
  captainPreference?: string;
  slotRequirement?: string;
  teamBalance?: {
    genderBalance?: number;
    ageBalance?: number;
    roleBalance?: number;
  };
  reputationScore?: number;
  pastCollaboration?: boolean;
  governanceFlags?: string[];
};

export type ReviewApplicationRequest = ReviewApplicationAttributionContext & {
  action: ApplicationReviewAction;
};

/** PATCH approve/reject — 响应含更新后的 teamPuzzle（§8） */
export type ReviewApplicationResult = {
  application: RecruitmentApplicationCard;
  teamPuzzle?: TeamPuzzle | null;
};

/** 客户端匹配算法分解（人格 + 圈层同频 + Premium 结构稳定性） */
export type MatchDimensionBreakdown = {
  planning: number;
  socialEnergy: number;
  decisionSpeed: number;
  riskTolerance: number;
  spending: number;
  /** PRD 3.5.1 背景对齐度（15%） */
  socialBackground?: number;
  /** 背景背书加成分（+2 ~ +18） */
  backgroundBonus?: number;
  /** Match Engine v2 — 组队契约互补 */
  teamworkFit?: number;
  /** Match Engine v2 — 抗压/品质对齐 */
  stressFit?: number;
  /** Match Engine v2 — MBTI 角色拼图加成 */
  mbtiSynergy?: number;
  /** 麦肯锡风格结构报告行 */
  structuralInsights?: StructuralMatchInsight[];
};

export type StructuralMatchInsightLevel = 'pass' | 'warn' | 'fail';

export type StructuralMatchInsight = {
  level: StructuralMatchInsightLevel;
  label: string;
  detail: string;
};

/** GET /api/match-square/posts/:id/applications */
export type RecruitmentApplicationCard = {
  id: string;
  postId: string;
  status: ApplicationStatus;
  applicantUserId: string;
  applicantDisplayName: string;
  applicantCardTitle: string;
  applicantMbtiType: string;
  applicantInteractionMode: string;
  applicantInteractionModeLabel: string;
  applicantReputationStars: number | null;
  /** PRD 3.1.2 · 申请人脱敏背书（审核卡片） */
  applicantVerifiedCredentials?: VerifiedCredentials | null;
  safetyWarning?: string | null;
  compatibilityPercent: number;
  highlights: string[];
  warnings: string[];
  message: string;
  planningCommitmentAccepted: boolean;
  teamworkCommitmentAccepted: boolean;
  createdAt: string;
  decidedAt: string | null;
  /** 申请时认领的拼图缺位（选填） */
  targetSlotIndex?: number | null;
  targetSlotId?: string | null;
  targetSlotLabel?: string | null;
  /** §3.13 · 拼团前置决策 brief（队长审批） */
  decisionBrief?: import('@/types/collaborative-task-flywheel').PreMatchDecisionBrief | null;
  /** §7.0.3 · 体能拟合报告（审批卡片） */
  physicalFitnessReport?: PhysicalFitnessReport | null;
  /** Recruiting Runtime · 审批决策归因 */
  attribution?: RecruitingAttribution | null;
};
