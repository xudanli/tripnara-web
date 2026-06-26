/**
 * Project Fit API 类型
 * @see docs/api/project-fit-api.md
 */

import type { ParticipantPortalLink } from '@/types/participant-portal';

// ── 准入规则 ──────────────────────────────────────────────

export type EligibilityRuleType = 'RESOURCE' | 'SAFETY' | 'LEGAL' | 'POLICY';

export type EligibilityConditionKey =
  | 'dates_available'
  | 'age_in_range'
  | 'budget_affordable'
  | 'equipment_ready'
  | 'qualification_required'
  | string;

export type EligibilityOperator = 'EQ' | 'GTE' | 'LTE';

export type EligibilitySeverity = 'BLOCKER' | 'MUST_CONFIRM' | 'WARNING';

export type EvidenceRequirement =
  | 'SELF_DECLARE'
  | 'DOCUMENT'
  | 'VERIFIED_CREDENTIAL'
  | 'MANUAL_REVIEW';

export type WaiverPolicy = 'NOT_ALLOWED' | 'LEADER_APPROVAL' | 'AGENCY_APPROVAL';

export interface EligibilityRule {
  id: string;
  listingId: string;
  ruleType: EligibilityRuleType;
  conditionKey: EligibilityConditionKey;
  operator: EligibilityOperator;
  value: Record<string, unknown>;
  severity: EligibilitySeverity;
  evidenceRequirement: EvidenceRequirement;
  waiverPolicy: WaiverPolicy;
  explanationTemplate?: string | null;
}

export interface CreateEligibilityRuleRequest {
  ruleType: EligibilityRuleType;
  conditionKey: EligibilityConditionKey;
  operator: EligibilityOperator;
  value: Record<string, unknown>;
  severity: EligibilitySeverity;
  evidenceRequirement: EvidenceRequirement;
  waiverPolicy: WaiverPolicy;
  explanationTemplate?: string;
}

// ── 适合度评估 ────────────────────────────────────────────

export type FitOverallResult =
  | 'STRONG_FIT'
  | 'BASIC_FIT'
  | 'CONDITIONAL'
  | 'NOT_RECOMMENDED';

export type FitAssessmentStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'EXPIRED';

export type AnswerSensitivityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface FitAssessmentAnswer {
  questionKey: string;
  answer: boolean | number | string | null;
  sensitivityLevel?: AnswerSensitivityLevel;
}

export interface FitAssessment {
  id: string;
  listingId: string;
  status: FitAssessmentStatus;
  overallResult?: FitOverallResult | null;
  overallResultLabel?: string | null;
  ruleSnapshotVersion?: number | null;
  expiresAt?: string | null;
  createdAt?: string;
  completedAt?: string | null;
}

export interface FitHardResult {
  conditionKey: string;
  passed: boolean;
  severity: EligibilitySeverity;
  explanation?: string | null;
}

export type FitDimensionStatus =
  | 'ALIGNED'
  | 'NEEDS_CONFIRMATION'
  | 'MISALIGNED'
  | string;

export interface FitDimensionResult {
  dimension: string;
  status: FitDimensionStatus;
  summary: string;
}

export interface FitTeamImpact {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  summary: string;
}

export interface FitAssessmentReport {
  overallResult: FitOverallResult;
  overallResultLabel: string;
  report: {
    hardResults: FitHardResult[];
    dimensionResults: FitDimensionResult[];
    teamImpact: FitTeamImpact;
    requiredConfirmations: string[];
    explanations: string[];
  };
}

export type FitReportRole = 'applicant' | 'leader' | 'operator';

// ── 申请 ──────────────────────────────────────────────────

export type ProjectFitApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'NEEDS_CLARIFICATION'
  | 'APPROVED'
  | 'WAITLISTED'
  | 'REJECTED'
  | 'USER_CONFIRMED'
  | 'JOINED'
  | 'APPROVAL_REVOKED'
  | 'WITHDRAWN';

export type CommitmentStatus =
  | 'NOT_REQUIRED'
  | 'DEPOSIT_REQUIRED'
  | 'DEPOSIT_PAID'
  | 'DEPOSIT_WAIVED';

export type LeaderDecision =
  | 'APPROVE'
  | 'APPROVE_AFTER_CLARIFICATION'
  | 'WAITLIST'
  | 'REJECT'
  | 'REVOKE_APPROVAL';

export type StructuredRejectReason =
  | 'HARD_ELIGIBILITY_FAILED'
  | 'TEAM_IMPACT_BLOCKING'
  | string;

export interface ProjectFitApplication {
  id: string;
  listingId: string;
  fitAssessmentId: string;
  applicantUserId: string;
  applicantDisplayName?: string | null;
  status: ProjectFitApplicationStatus;
  message?: string | null;
  leaderDecision?: LeaderDecision | null;
  structuredRejectReason?: StructuredRejectReason | null;
  leaderNotes?: string | null;
  /** R2 · 商业定金 */
  commitmentStatus?: CommitmentStatus | null;
  depositAmountCents?: number | null;
  commercialType?: import('@/types/trusted-projects').TrustedProjectCommercialType | null;
  submittedAt?: string | null;
  decidedAt?: string | null;
  userConfirmedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** 录取确认后自动创建的成员门户 */
  portalEnrolled?: boolean;
  participantPortal?: ParticipantPortalLink | null;
}

export interface SubmitApplicationWithFitRequest {
  fitAssessmentId: string;
  message?: string;
}

export interface LeaderApplicationDecisionRequest {
  decision: LeaderDecision;
  structuredRejectReason?: StructuredRejectReason;
  notes?: string;
}

// ── 申诉 ──────────────────────────────────────────────────

export type ProjectFitAppealTargetType =
  | 'APPLICATION'
  | 'FIT_ASSESSMENT'
  | 'ELIGIBILITY_DECISION'
  /** @deprecated R1 aliases */
  | 'PROJECT_FIT_ASSESSMENT'
  | 'TRUSTED_PROJECT_APPLICATION'
  | 'REPUTATION_EVENT';

export interface SubmitProjectFitAppealRequest {
  targetType: ProjectFitAppealTargetType;
  targetId: string;
  reason: string;
}

export interface ProjectFitAppeal {
  id: string;
  targetType: ProjectFitAppealTargetType;
  targetId: string;
  reason: string;
  status: ProjectFitAppealStatus | string;
  resolution?: string | null;
  overturnEffects?: AppealOverturnEffects | null;
  createdAt?: string;
  resolvedAt?: string | null;
}

export interface AppealOverturnEffects {
  reopenedApplicationIds?: string[];
  resetAssessmentIds?: string[];
}

export interface ResolveProjectFitAppealRequest {
  resolution: string;
  status: 'UPHELD' | 'PARTIALLY_UPHELD' | 'REJECTED';
}

export interface TriageProjectFitAppealRequest {
  notes?: string;
}

export type ProjectFitAppealStatus =
  | 'SUBMITTED'
  | 'TRIAGED'
  | 'UNDER_REVIEW'
  | 'UPHELD'
  | 'PARTIALLY_UPHELD'
  | 'REJECTED';

export interface ClarifyApplicationRequest {
  message: string;
}

// ── 问卷 UI 定义 ──────────────────────────────────────────

export interface FitQuestionDefinition {
  questionKey: string;
  label: string;
  description?: string;
  inputType: 'boolean' | 'number' | 'scale' | 'currency';
  sensitivityLevel?: AnswerSensitivityLevel;
  scaleMin?: number;
  scaleMax?: number;
  /** R1 · 动态问卷必填 */
  required?: boolean;
}

export const DEFAULT_FIT_QUESTIONS: FitQuestionDefinition[] = [
  {
    questionKey: 'dates_available',
    label: '我可以在项目日期全程参与',
    inputType: 'boolean',
    sensitivityLevel: 'LOW',
    required: true,
  },
  {
    questionKey: 'budget_cents',
    label: '我可承担的预算（元）',
    description: '仅用于匹配项目费用区间，领队侧脱敏展示',
    inputType: 'currency',
    sensitivityLevel: 'HIGH',
    required: true,
  },
  {
    questionKey: 'pace_acceptance',
    label: '节奏接受度',
    description: '1=非常慢 · 5=高强度',
    inputType: 'scale',
    scaleMin: 1,
    scaleMax: 5,
    sensitivityLevel: 'MEDIUM',
  },
  {
    questionKey: 'risk_acceptance',
    label: '风险承受度',
    description: '1=保守 · 5=接受较高风险',
    inputType: 'scale',
    scaleMin: 1,
    scaleMax: 5,
    sensitivityLevel: 'MEDIUM',
  },
  {
    questionKey: 'accommodation_shared',
    label: '接受合租/拼房安排',
    inputType: 'boolean',
    sensitivityLevel: 'LOW',
  },
];

// ── R1 · 动态问卷 / 配置 / 状态 / 审核队列 ─────────────────

export type FitQuestionnairePhase = 'preview' | 'full';

export interface FitQuestionnaireResponse {
  phase: FitQuestionnairePhase;
  ruleVersion?: number;
  questions: FitQuestionDefinition[];
}

export interface FitConfig {
  listingId: string;
  ruleVersion?: number;
  softDimensions?: string[];
  previewQuestionKeys?: string[];
  reassessmentTtlHours?: number | null;
}

export interface UpdateFitConfigRequest {
  softDimensions?: string[];
  previewQuestionKeys?: string[];
  reassessmentTtlHours?: number;
}

export interface FitReassessmentReasons {
  ruleStale?: boolean;
  timeExpired?: boolean;
}

export interface FitAssessmentStatusResponse {
  needsReassessment: boolean;
  reasons: FitReassessmentReasons;
  currentRuleVersion: number;
  assessment: {
    id: string;
    status: FitAssessmentStatus;
    overallResult?: FitOverallResult | null;
    ruleSnapshotVersion?: number | null;
    expiresAt?: string | null;
  } | null;
}

export type SystemRecommendation = 'APPROVE' | 'CLARIFY' | 'WAITLIST' | 'REJECT';

export interface FitApplicationReviewSummary {
  overallResult: FitOverallResult | string;
  teamImpactLevel: string;
  hardBlockers: string[];
  pendingConfirmations: string[];
}

export interface FitApplicationReviewQueueItem {
  applicationId: string;
  applicantDisplayName?: string | null;
  status?: ProjectFitApplicationStatus;
  fitSummary: FitApplicationReviewSummary;
  systemRecommendation: SystemRecommendation;
}

export interface FitApplicationReviewQueueResponse {
  items: FitApplicationReviewQueueItem[];
}

// ── R2 · 申请中心 / 模板 / 证件 / 定金 ─────────────────────

export interface ApplicationCenterFitSummary {
  overallResult: FitOverallResult | string;
  overallResultLabel?: string | null;
  teamImpactLevel?: string | null;
  pendingConfirmations?: number | string[] | null;
  systemRecommendation?: SystemRecommendation | null;
}

export interface ApplicationCenterItem {
  applicationId: string;
  listingId: string;
  listingTitle: string;
  destination?: string | null;
  startDate?: string | null;
  commercialType?: import('@/types/trusted-projects').TrustedProjectCommercialType | null;
  status: ProjectFitApplicationStatus;
  submittedAt?: string | null;
  decidedAt?: string | null;
  userConfirmedAt?: string | null;
  commitmentStatus?: CommitmentStatus | null;
  depositAmountCents?: number | null;
  applicantUserId?: string | null;
  fitSummary?: ApplicationCenterFitSummary | null;
  portalEnrolled?: boolean;
  participantPortal?: ParticipantPortalLink | null;
}

export interface MineApplicationsResponse {
  items: ApplicationCenterItem[];
  nextCursor?: string | null;
}

export interface ManagedApplicationsSummary {
  total: number;
  byStatus: Partial<Record<ProjectFitApplicationStatus, number>>;
}

export interface ManagedApplicationsResponse {
  summary: ManagedApplicationsSummary;
  items: ApplicationCenterItem[];
}

export interface MineApplicationsQuery {
  status?: ProjectFitApplicationStatus | string;
  limit?: number;
  cursor?: string;
}

export interface ManagedApplicationsQuery {
  listingId?: string;
  status?: ProjectFitApplicationStatus | string;
  limit?: number;
}

export type RuleTemplateOwnerType = 'PLATFORM' | 'ORGANIZATION';

export type RuleTemplateStatus = 'ACTIVE' | 'ARCHIVED';

export interface RuleTemplateFitConfig {
  enabledSoftDimensions?: string[];
  previewQuestionKeys?: string[];
}

export interface ProjectFitRuleTemplate {
  id: string;
  ownerSubjectType: RuleTemplateOwnerType;
  ownerSubjectId: string;
  name: string;
  description?: string | null;
  destinationTag?: string | null;
  commercialType?: import('@/types/trusted-projects').TrustedProjectCommercialType | null;
  rules: CreateEligibilityRuleRequest[];
  fitConfig?: RuleTemplateFitConfig | null;
  status: RuleTemplateStatus;
  version?: number;
}

export interface CreateRuleTemplateRequest {
  ownerSubjectType: RuleTemplateOwnerType;
  ownerSubjectId: string;
  name: string;
  description?: string;
  destinationTag?: string;
  commercialType?: import('@/types/trusted-projects').TrustedProjectCommercialType;
  rules: CreateEligibilityRuleRequest[];
  fitConfig?: RuleTemplateFitConfig;
}

export interface ApplyRuleTemplateRequest {
  templateId: string;
}

export interface ApplyRuleTemplateResponse {
  templateId: string;
  rulesApplied: number;
  rules: EligibilityRule[];
}

export type FitDocumentType =
  | 'ID_CARD'
  | 'PASSPORT'
  | 'QUALIFICATION_CERT'
  | 'MEDICAL_CERT'
  | 'INSURANCE'
  | 'OTHER';

export type FitDocumentOcrStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

export interface FitDocumentExtractedFields {
  fullName?: string | null;
  documentNumber?: string | null;
  expiryDate?: string | null;
  qualificationTypes?: string[] | null;
  [key: string]: unknown;
}

export interface FitAssessmentDocument {
  id: string;
  assessmentId: string;
  documentType: FitDocumentType;
  fileName: string;
  mimeType?: string | null;
  fileUrl?: string | null;
  fileSize?: number | null;
  ocrStatus: FitDocumentOcrStatus;
  extractedFields?: FitDocumentExtractedFields | null;
  linkedQuestionKey?: string | null;
  createdAt?: string;
}

export interface UploadFitDocumentBase64Request {
  documentType: FitDocumentType;
  fileName: string;
  mimeType: string;
  contentBase64: string;
  linkedQuestionKey?: string;
  locale?: string;
}
