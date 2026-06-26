import type {
  ApplicationCenterItem,
  EligibilityRule,
  FitApplicationReviewQueueResponse,
  FitAssessment,
  FitAssessmentDocument,
  FitAssessmentReport,
  FitAssessmentStatusResponse,
  FitConfig,
  FitQuestionnairePhase,
  FitQuestionnaireResponse,
  ManagedApplicationsQuery,
  MineApplicationsQuery,
  ProjectFitApplication,
  ProjectFitRuleTemplate,
} from '@/types/project-fit';
import { DEFAULT_FIT_QUESTIONS } from '@/types/project-fit';

export function buildMockEligibilityRules(listingId: string): EligibilityRule[] {
  return [
    {
      id: 'rule-dates',
      listingId,
      ruleType: 'RESOURCE',
      conditionKey: 'dates_available',
      operator: 'EQ',
      value: { expected: true },
      severity: 'BLOCKER',
      evidenceRequirement: 'SELF_DECLARE',
      waiverPolicy: 'NOT_ALLOWED',
      explanationTemplate: '需能全程参与项目日期',
    },
    {
      id: 'rule-budget',
      listingId,
      ruleType: 'RESOURCE',
      conditionKey: 'budget_affordable',
      operator: 'GTE',
      value: { minCents: 0 },
      severity: 'MUST_CONFIRM',
      evidenceRequirement: 'SELF_DECLARE',
      waiverPolicy: 'LEADER_APPROVAL',
      explanationTemplate: '预算需覆盖项目费用区间',
    },
  ];
}

export function buildMockFitAssessment(listingId: string): FitAssessment {
  return {
    id: `fit-local-${Date.now()}`,
    listingId,
    status: 'IN_PROGRESS',
    overallResult: null,
    overallResultLabel: null,
    ruleSnapshotVersion: 3,
    createdAt: new Date().toISOString(),
  };
}

export function buildMockFitReport(): FitAssessmentReport {
  return {
    overallResult: 'CONDITIONAL',
    overallResultLabel: '条件适合',
    report: {
      hardResults: [
        { conditionKey: 'dates_available', passed: true, severity: 'BLOCKER' },
        { conditionKey: 'budget_affordable', passed: true, severity: 'MUST_CONFIRM' },
      ],
      dimensionResults: [
        {
          dimension: 'pace',
          status: 'NEEDS_CONFIRMATION',
          summary: '你的节奏偏好略高于项目默认强度，建议与领队确认每日里程。',
        },
        {
          dimension: 'risk',
          status: 'ALIGNED',
          summary: '风险承受度与项目披露一致。',
        },
      ],
      teamImpact: {
        level: 'MEDIUM',
        summary: '加入后可能需要局部调整或额外确认',
      },
      requiredConfirmations: ['确认可接受合租安排', '确认预算包含装备租赁'],
      explanations: ['总体结论：CONDITIONAL', '硬性条件已通过', '存在 2 项待确认'],
    },
  };
}

export function buildMockProjectFitApplication(
  listingId: string,
  assessmentId: string
): ProjectFitApplication {
  return {
    id: `pfa-local-${Date.now()}`,
    listingId,
    fitAssessmentId: assessmentId,
    applicantUserId: 'local-user',
    status: 'UNDER_REVIEW',
    message: '希望加入本次行程',
    createdAt: new Date().toISOString(),
  };
}

export function buildMockFitQuestionnaire(
  phase: FitQuestionnairePhase = 'full'
): FitQuestionnaireResponse {
  const questions =
    phase === 'preview'
      ? DEFAULT_FIT_QUESTIONS.slice(0, 2)
      : DEFAULT_FIT_QUESTIONS.map((q) => ({ ...q, required: q.required ?? false }));
  return { phase, ruleVersion: 3, questions };
}

export function buildMockFitConfig(listingId: string): FitConfig {
  return {
    listingId,
    ruleVersion: 3,
    softDimensions: ['pace', 'risk', 'accommodation'],
    previewQuestionKeys: ['dates_available', 'budget_cents'],
    reassessmentTtlHours: 168,
  };
}

export function buildMockFitAssessmentStatus(
  listingId: string,
  needsReassessment = false
): FitAssessmentStatusResponse {
  const assessment = buildMockFitAssessment(listingId);
  return {
    needsReassessment,
    reasons: {
      ruleStale: needsReassessment,
      timeExpired: false,
    },
    currentRuleVersion: 3,
    assessment: needsReassessment
      ? null
      : {
          id: assessment.id,
          status: 'COMPLETED',
          overallResult: buildMockFitReport().overallResult,
          ruleSnapshotVersion: 3,
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
  };
}

export function buildMockReviewQueue(): FitApplicationReviewQueueResponse {
  return {
    items: [
      {
        applicationId: 'pfa-demo-1',
        applicantDisplayName: '示例申请人',
        status: 'UNDER_REVIEW',
        fitSummary: {
          overallResult: 'CONDITIONAL',
          teamImpactLevel: 'MEDIUM',
          hardBlockers: [],
          pendingConfirmations: ['确认预算包含装备租赁'],
        },
        systemRecommendation: 'CLARIFY',
      },
    ],
  };
}

export function buildMockPendingAppeals(): import('@/types/project-fit').ProjectFitAppeal[] {
  return [
    {
      id: 'appeal-demo-1',
      targetType: 'APPLICATION',
      targetId: 'pfa-demo-1',
      reason: '领队误判预算区间，我有充足预算证明',
      status: 'SUBMITTED',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'appeal-demo-2',
      targetType: 'FIT_ASSESSMENT',
      targetId: 'fit-local-demo',
      reason: '评估结论与问卷答案不一致',
      status: 'TRIAGED',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];
}

export function updateMockFitConfig(
  listingId: string,
  body: import('@/types/project-fit').UpdateFitConfigRequest
): FitConfig {
  const base = buildMockFitConfig(listingId);
  return {
    ...base,
    softDimensions: body.softDimensions ?? base.softDimensions,
    previewQuestionKeys: body.previewQuestionKeys ?? base.previewQuestionKeys,
    reassessmentTtlHours: body.reassessmentTtlHours ?? base.reassessmentTtlHours,
    ruleVersion: (base.ruleVersion ?? 3) + 1,
  };
}

export function buildMockMineApplications(query?: MineApplicationsQuery) {
  const items: ApplicationCenterItem[] = [
    {
      applicationId: 'pfa-demo-1',
      listingId: 'tp-demo-1',
      listingTitle: '冰岛高地徒步',
      destination: 'Iceland',
      startDate: '2026-09-01T00:00:00.000Z',
      commercialType: 'NON_COMMERCIAL',
      status: 'UNDER_REVIEW',
      submittedAt: new Date(Date.now() - 86400000).toISOString(),
      fitSummary: {
        overallResult: 'CONDITIONAL',
        overallResultLabel: '条件适合',
        teamImpactLevel: 'MEDIUM',
        pendingConfirmations: 1,
        systemRecommendation: 'CLARIFY',
      },
    },
    {
      applicationId: 'pfa-demo-2',
      listingId: 'tp-demo-2',
      listingTitle: '商业潜水团',
      destination: 'Maldives',
      commercialType: 'COMMERCIAL',
      status: 'APPROVED',
      commitmentStatus: 'DEPOSIT_REQUIRED',
      depositAmountCents: 100000,
      submittedAt: new Date(Date.now() - 172800000).toISOString(),
      fitSummary: {
        overallResult: 'STRONG_FIT',
        overallResultLabel: '非常适合',
        teamImpactLevel: 'LOW',
        systemRecommendation: 'APPROVE',
      },
    },
  ];
  const filtered = query?.status
    ? items.filter((i) => i.status === query.status)
    : items;
  return { items: filtered, nextCursor: null };
}

export function buildMockManagedApplications(query?: ManagedApplicationsQuery) {
  const items = buildMockMineApplications().items.map((item) => ({
    ...item,
    applicantUserId: 'user-demo-1',
  }));
  const filtered = query?.listingId
    ? items.filter((i) => i.listingId === query.listingId)
    : items;
  return {
    summary: {
      total: filtered.length,
      byStatus: { UNDER_REVIEW: 1, APPROVED: 1 },
    },
    items: filtered,
  };
}

export function buildMockRuleTemplates(): ProjectFitRuleTemplate[] {
  return [
    {
      id: 'tpl-platform-trek',
      ownerSubjectType: 'PLATFORM',
      ownerSubjectId: 'platform',
      name: '标准徒步准入包',
      description: '平台默认 · 日期 + 预算 + 节奏',
      destinationTag: 'TREK',
      commercialType: 'NON_COMMERCIAL',
      status: 'ACTIVE',
      version: 1,
      fitConfig: {
        enabledSoftDimensions: ['pace', 'risk'],
        previewQuestionKeys: ['dates_available', 'budget_cents'],
      },
      rules: [
        {
          ruleType: 'RESOURCE',
          conditionKey: 'dates_available',
          operator: 'EQ',
          value: { expected: true },
          severity: 'BLOCKER',
          evidenceRequirement: 'SELF_DECLARE',
          waiverPolicy: 'NOT_ALLOWED',
          explanationTemplate: '需能完整参与项目日期',
        },
      ],
    },
  ];
}

export function buildMockFitDocuments(assessmentId: string): FitAssessmentDocument[] {
  return [
    {
      id: 'doc-demo-1',
      assessmentId,
      documentType: 'PASSPORT',
      fileName: 'passport.jpg',
      mimeType: 'image/jpeg',
      ocrStatus: 'COMPLETED',
      extractedFields: {
        fullName: '张*',
        documentNumber: '****5678',
        expiryDate: '2028-12-31',
      },
      createdAt: new Date().toISOString(),
    },
  ];
}
