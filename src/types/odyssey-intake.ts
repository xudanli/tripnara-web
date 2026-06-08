/**
 * Odyssey Intake API 契约类型
 * @see Decision OS 前端集成指南 v1.0.0
 */

export type MbtiQuadrant = 'NT' | 'NF' | 'SP' | 'SJ';

export type OdysseyOnboardingStep = 'quiz' | 'trust_verify' | 'view_card' | 'match';

export type OdysseyOnboardingStatus = {
  quizComplete: boolean;
  trustVerified: boolean;
  cardReady: boolean;
  canMatch: boolean;
  nextStep?: OdysseyOnboardingStep;
};

export type OdysseyIdentityCardTheme = {
  quadrant: MbtiQuadrant;
  gradientFrom: string;
  gradientTo: string;
  accentColor?: string;
};

export type OdysseyIdentityCard = {
  mbtiType: string;
  title: string;
  subtitle: string;
  theme: OdysseyIdentityCardTheme;
  radar: Record<string, number>;
};

export type OdysseyTripIntentOption = {
  id: string;
  label: string;
};

export type OdysseyProfileCardUi = {
  placement: 'profile_header_third';
  showShimmerRefresh: boolean;
  refreshMessage?: string;
  gyroscopeEnabled: boolean;
  cta: { label: string; action: 'trip_intent' };
  tripIntentTagOptions: OdysseyTripIntentOption[];
};

export type OdysseyTripMeta = {
  destination: string;
  startDate: string;
  endDate: string;
};

export type OdysseyTrustStatus = {
  verified: boolean;
  provider?: string;
};

export type OdysseyProfileSummary = {
  mbtiType: string;
  card: OdysseyIdentityCard;
  tripIntentTags?: string[];
  profileRefreshPending?: boolean;
  profileRefreshMessage?: string;
};

export type OdysseyProfileCardView = {
  completed: boolean;
  profile: OdysseyProfileSummary | null;
  tripMeta: OdysseyTripMeta | null;
  trust: OdysseyTrustStatus | null;
  ui: OdysseyProfileCardUi;
};

export type OdysseyWallpaper = {
  key: string;
  url: string;
  blurHash?: string;
};

export type OdysseyQuestionOption = {
  id: 'A' | 'B' | 'C';
  label: string;
};

export type OdysseyQuestion = {
  id: string;
  order: number;
  title: string;
  scenario: string;
  wallpaperKey: string;
  wallpaper: OdysseyWallpaper;
  options: OdysseyQuestionOption[];
};

export type OdysseyQuestionsResponse = {
  questions: OdysseyQuestion[];
};

/** GET /premium-stress-test/questions · Premium v2 行中博弈题（A/B） */
export type PremiumStressQuestionOptionApi = {
  id: 'A' | 'B';
  label: string;
  tag?: string;
};

export type PremiumStressQuestionApi = {
  id: string;
  order: number;
  title: string;
  scenario: string;
  wallpaperKey?: string;
  wallpaperGradient?: string;
  options: PremiumStressQuestionOptionApi[];
};

export type PremiumStressQuestionsResponse = {
  questions: PremiumStressQuestionApi[];
};

export type OdysseyAnswerPayload = {
  scenarioId: string;
  optionId: 'A' | 'B' | 'C';
};

export type OdysseyIntakeVersion = 'legacy_v1' | 'premium_v2';

export type OdysseySubmitRequest = {
  answers: OdysseyAnswerPayload[];
  /** Premium v2：用户自选的 MBTI 四字母类型 */
  mbtiType?: string;
  intakeVersion?: OdysseyIntakeVersion;
  /** 重新入网 / v1 升级 Premium v2 */
  retake?: boolean;
};

export type OdysseySubmitResult = {
  mbtiType: string;
  card: OdysseyIdentityCard;
  onboarding: OdysseyOnboardingStatus;
};

export type OdysseyTrustVerifyRequest = {
  provider: 'zhima_credit' | string;
  authToken?: string;
  creditScore?: number;
};

export type OdysseyTrustVerifyResult = {
  verified: boolean;
  provider: string;
  onboarding: OdysseyOnboardingStatus;
};

export type OdysseyTripMetaRequest = {
  destination: string;
  startDate: string;
  endDate: string;
};

export type OdysseyTripMetaResult = {
  tripMeta: OdysseyTripMeta;
  onboarding: OdysseyOnboardingStatus;
};

export type OdysseyTripIntentRequest = {
  tripIntentTag: string;
};

export type CompanionMatchDimensionBreakdown = {
  eiFit: number;
  tfFit: number;
  energyFit: number;
  ambiguityFit: number;
};

export type CompanionMatch = {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  mbtiType: string;
  cardTitle: string;
  compatibilityScore: number;
  dimensionBreakdown: CompanionMatchDimensionBreakdown;
  destination?: string;
  dateRange?: string;
};

export type OdysseyMatchResult = {
  matches: CompanionMatch[];
};

export type OdysseySubmitAndMatchResult = {
  mbtiType: string;
  card: OdysseyIdentityCard;
  matches: CompanionMatch[];
  onboarding: OdysseyOnboardingStatus;
};

export type OdysseyPeerFeedbackTag =
  | 'too_stingy'
  | 'always_late'
  | 'great_communicator';

export type OdysseyPeerFeedbackRequest = {
  targetUserId: string;
  tripId?: string;
  tag: OdysseyPeerFeedbackTag;
};

export type OdysseyAckRefreshResult = {
  profileRefreshPending: false;
};

/** GET /api/odyssey-intake/credentials/me · Identity Hub 背书资产 */
export type OdysseyCredentialsMe = {
  verifiedCredentials?: unknown;
  education?: unknown;
  profession?: unknown;
  zhimaCredit?: unknown;
  headline?: unknown;
  dossier?: unknown;
};

export type OdysseyVerifyEducationRequest = {
  /** 学信网在线验证码 — 网关 POST /v1/verify */
  verificationCode: string;
  /** @deprecated 兼容旧客户端 */
  chsiVerificationCode?: string;
  /** 仅 stub/hybrid 无网关时 dev 模拟 */
  degreeLevel?: 'bachelor' | 'master' | 'doctorate';
  tierTag?: '985_211' | 'qs_top50' | 'overseas' | 'general';
};

export type OdysseySendWorkEmailCodeRequest = {
  workEmail: string;
};

export type OdysseySendWorkEmailCodeResponse = {
  sent: boolean;
  /** hybrid + 无 MAIL 网关时后端返回 */
  devCode?: string;
};

export type OdysseyVerifyWorkEmailRequest = {
  workEmail: string;
  code: string;
};

export type OdysseyBadgeUploadResponse = {
  imageToken: string;
};

export type OdysseyVerifyBadgeRequest = {
  imageToken: string;
};

export type OdysseyOAuthProvider = 'maimai' | 'linkedin';

export type OdysseyVerifyOAuthRequest = {
  provider: OdysseyOAuthProvider;
  authToken: string;
};

/** @deprecated 使用分通道 API */
export type OdysseyVerifyProfessionRequest = {
  channel?: 'work_email' | 'badge_ocr' | 'oauth_maimai' | 'oauth_linkedin';
  workEmail?: string;
  emailOtp?: string;
  industryTag?: 'tech' | 'finance' | 'manufacturing' | 'creative' | 'other';
  roleDisplayTag?: string;
  skillDisplayTag?: string;
  authToken?: string;
};
