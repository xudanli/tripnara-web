import type {
  CommitmentStatus,
  FitDocumentOcrStatus,
  FitDocumentType,
  FitOverallResult,
  ProjectFitApplicationStatus,
  LeaderDecision,
  EligibilitySeverity,
  FitDimensionStatus,
  ProjectFitAppealStatus,
  SystemRecommendation,
  EligibilityRule,
  FitAssessmentDocument,
} from '@/types/project-fit';

const OVERALL_RESULT_LABELS: Record<string, string> = {
  STRONG_FIT: '非常适合',
  HIGH_FIT: '高度适合',
  BASIC_FIT: '基本适合',
  CONDITIONAL: '条件适合',
  NOT_RECOMMENDED: '暂不推荐',
};

const OVERALL_RESULT_DESCRIPTIONS: Record<FitOverallResult, string> = {
  STRONG_FIT: '硬性条件与团队节奏高度匹配，可直接进入正式申请。',
  BASIC_FIT: '整体匹配良好，可能有少量待确认项。',
  CONDITIONAL: '存在需与领队确认的条件，建议先沟通再申请。',
  NOT_RECOMMENDED: '当前不适合加入，不建议提交申请。',
};

export function fitOverallResultLabel(result: FitOverallResult | string | null | undefined): string {
  if (!result) return '待评估';
  return OVERALL_RESULT_LABELS[result as FitOverallResult] ?? String(result);
}

export function fitOverallResultDescription(result: FitOverallResult | string | null | undefined): string {
  if (!result) return '';
  return OVERALL_RESULT_DESCRIPTIONS[result as FitOverallResult] ?? '';
}

export function canSubmitApplicationWithFit(result: FitOverallResult | string | null | undefined): boolean {
  return result !== 'NOT_RECOMMENDED' && result != null;
}

const APPLICATION_STATUS_LABELS: Record<ProjectFitApplicationStatus, string> = {
  DRAFT: '草稿',
  SUBMITTED: '已提交',
  UNDER_REVIEW: '审核中',
  NEEDS_CLARIFICATION: '待补充说明',
  APPROVED: '已通过',
  WAITLISTED: '候补',
  REJECTED: '未通过',
  USER_CONFIRMED: '已确认',
  JOINED: '已入队',
  APPROVAL_REVOKED: '批准已撤销',
  WITHDRAWN: '已撤回',
};

export function projectFitApplicationStatusLabel(status: ProjectFitApplicationStatus | string): string {
  return APPLICATION_STATUS_LABELS[status as ProjectFitApplicationStatus] ?? status;
}

const LEADER_DECISION_LABELS: Record<LeaderDecision, string> = {
  APPROVE: '通过',
  APPROVE_AFTER_CLARIFICATION: '通过（需补充说明）',
  WAITLIST: '加入候补',
  REJECT: '拒绝',
  REVOKE_APPROVAL: '撤销通过',
};

export function leaderDecisionLabel(decision: LeaderDecision | string): string {
  return LEADER_DECISION_LABELS[decision as LeaderDecision] ?? decision;
}

const SEVERITY_LABELS: Record<EligibilitySeverity, string> = {
  BLOCKER: '硬性门槛',
  MUST_CONFIRM: '需确认',
  WARNING: '提示',
};

export function eligibilitySeverityLabel(severity: EligibilitySeverity | string): string {
  return SEVERITY_LABELS[severity as EligibilitySeverity] ?? severity;
}

const DIMENSION_STATUS_LABELS: Record<string, string> = {
  ALIGNED: '匹配',
  NEEDS_CONFIRMATION: '待确认',
  MISALIGNED: '不匹配',
};

export function fitDimensionStatusLabel(status: FitDimensionStatus | string): string {
  return DIMENSION_STATUS_LABELS[status] ?? status;
}

const APPEAL_STATUS_LABELS: Record<ProjectFitAppealStatus, string> = {
  SUBMITTED: '已提交',
  TRIAGED: '已分诊',
  UNDER_REVIEW: '审核中',
  UPHELD: '申诉成立',
  PARTIALLY_UPHELD: '部分成立',
  REJECTED: '申诉驳回',
};

export function projectFitAppealStatusLabel(status: ProjectFitAppealStatus | string): string {
  return APPEAL_STATUS_LABELS[status as ProjectFitAppealStatus] ?? status;
}

const SYSTEM_RECOMMENDATION_LABELS: Record<SystemRecommendation, string> = {
  APPROVE: '建议通过',
  CLARIFY: '建议补充沟通',
  WAITLIST: '建议候补',
  REJECT: '建议拒绝',
};

export function systemRecommendationLabel(rec: SystemRecommendation | string): string {
  return SYSTEM_RECOMMENDATION_LABELS[rec as SystemRecommendation] ?? rec;
}

export function confirmSuccessMessage(status: ProjectFitApplicationStatus): string {
  if (status === 'JOINED') return '已入队，行程协作权限已开通';
  if (status === 'USER_CONFIRMED') return '已确认加入意向';
  return '确认成功';
}

const COMMITMENT_STATUS_LABELS: Record<CommitmentStatus, string> = {
  NOT_REQUIRED: '无需定金',
  DEPOSIT_REQUIRED: '待付定金',
  DEPOSIT_PAID: '定金已确认',
  DEPOSIT_WAIVED: '定金已豁免',
};

export function commitmentStatusLabel(status: CommitmentStatus | string | null | undefined): string {
  if (!status) return '';
  return COMMITMENT_STATUS_LABELS[status as CommitmentStatus] ?? status;
}

export function formatDepositAmount(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return `¥${(cents / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
}

const DOCUMENT_TYPE_LABELS: Record<FitDocumentType, string> = {
  ID_CARD: '身份证',
  PASSPORT: '护照',
  QUALIFICATION_CERT: '资质证书',
  MEDICAL_CERT: '医疗证明',
  INSURANCE: '保险',
  OTHER: '其他',
};

export function fitDocumentTypeLabel(type: FitDocumentType | string): string {
  return DOCUMENT_TYPE_LABELS[type as FitDocumentType] ?? type;
}

const OCR_STATUS_LABELS: Record<FitDocumentOcrStatus, string> = {
  PENDING: '待识别',
  PROCESSING: '识别中',
  COMPLETED: '已识别',
  FAILED: '识别失败',
  SKIPPED: '已跳过',
};

export function fitDocumentOcrStatusLabel(status: FitDocumentOcrStatus | string): string {
  return OCR_STATUS_LABELS[status as FitDocumentOcrStatus] ?? status;
}

export function assessmentRequiresDocuments(rules: EligibilityRule[] | undefined): boolean {
  return (rules ?? []).some((r) => r.evidenceRequirement === 'DOCUMENT');
}

export function hasAcceptableFitDocuments(documents: FitAssessmentDocument[] | undefined): boolean {
  return (documents ?? []).some(
    (d) => d.ocrStatus === 'COMPLETED' || d.ocrStatus === 'SKIPPED'
  );
}

export function canConfirmApplication(
  commitmentStatus: CommitmentStatus | string | null | undefined
): boolean {
  return !commitmentStatus || commitmentStatus === 'NOT_REQUIRED' || commitmentStatus === 'DEPOSIT_PAID' || commitmentStatus === 'DEPOSIT_WAIVED';
}

/** 申请中心 Tab 状态分组 */
export const APPLICATION_CENTER_TABS = {
  active: ['UNDER_REVIEW', 'NEEDS_CLARIFICATION', 'WAITLISTED', 'APPROVED'] as ProjectFitApplicationStatus[],
  joined: ['JOINED', 'USER_CONFIRMED'] as ProjectFitApplicationStatus[],
  closed: ['REJECTED', 'WITHDRAWN', 'APPROVAL_REVOKED'] as ProjectFitApplicationStatus[],
};

/** 禁止展示 0–100 综合分 */
export function assertNoCompositeScoreDisplay(_value: unknown): void {
  /* 文档约束：前端不得计算或展示 compositeScore / creditScore */
}
