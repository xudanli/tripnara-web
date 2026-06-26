/**
 * Gate 1 · 顾问工作台 Advisor Workspace API
 * @see docs/api/advisor-workspace-frontend-integration.md
 */

import { gate1Get, gate1Post } from './gate1-common';
import type {
  CreateGate1AdvisorStrategyRequest,
  Gate1AdvisorDashboard,
  Gate1AdvisorDecision,
  Gate1AdvisorProjectListQuery,
  Gate1CandidateCompareResult,
  Gate1CandidateStrategy,
  Gate1ConflictFindingActionRequest,
  Gate1ConflictFindingFeedbackRequest,
  Gate1ConflictReport,
  Gate1ConstraintsSummary,
  Gate1ParticipantRemindResult,
  Gate1PlanB,
  Gate1PlanBOutcomeRequest,
  Gate1PlanBPreDecisionRequest,
  Gate1ProjectOverview,
  Gate1ProjectWorkLogsResponse,
  Gate1AuditTimeline,
  Gate1RuntimeWorkspace,
  Gate1OrgPortfolio,
  Gate1ProjectListRow,
  Gate1ReadinessFindingActionRequest,
  Gate1ReadinessFindingFeedbackRequest,
  Gate1ReadinessReport,
  Gate1SanitizedConstraint,
  Gate1TrustSurface,
  SubmitGate1DecisionRequest,
} from '@/types/gate1';

function projectPath(projectId: string) {
  return `/advisor/projects/${encodeURIComponent(projectId)}`;
}

function listQueryParams(query?: Gate1AdvisorProjectListQuery): Record<string, string | number> | undefined {
  if (!query) return undefined;
  const params: Record<string, string | number> = {};
  if (query.cohort) params.cohort = query.cohort;
  if (query.experimentStatus) params.experimentStatus = query.experimentStatus;
  if (query.destination) params.destination = query.destination;
  if (query.riskLevel) params.riskLevel = query.riskLevel;
  if (query.sort) params.sort = query.sort;
  if (query.departingWithinDays != null) params.departingWithinDays = query.departingWithinDays;
  return Object.keys(params).length ? params : undefined;
}

export const gate1AdvisorApi = {
  /** GET /advisor/dashboard */
  getDashboard: (): Promise<Gate1AdvisorDashboard> =>
    gate1Get<Gate1AdvisorDashboard>('/advisor/dashboard'),

  /** GET /advisor/projects */
  listProjects: (query?: Gate1AdvisorProjectListQuery): Promise<Gate1ProjectListRow[]> =>
    gate1Get<Gate1ProjectListRow[]>('/advisor/projects', listQueryParams(query)),

  /** GET /advisor/projects/:projectId/overview */
  getOverview: (projectId: string): Promise<Gate1ProjectOverview> =>
    gate1Get<Gate1ProjectOverview>(`${projectPath(projectId)}/overview`),

  /** GET /advisor/projects/:projectId/trust-surface */
  getTrustSurface: (projectId: string): Promise<Gate1TrustSurface> =>
    gate1Get<Gate1TrustSurface>(`${projectPath(projectId)}/trust-surface`),

  /** GET /advisor/projects/:projectId/constraints */
  getConstraints: (projectId: string): Promise<Gate1ConstraintsSummary> =>
    gate1Get<Gate1ConstraintsSummary>(`${projectPath(projectId)}/constraints`),

  getConflicts: (projectId: string): Promise<Gate1ConflictReport[]> =>
    gate1Get<Gate1ConflictReport[]>(`${projectPath(projectId)}/conflicts`),

  getCandidates: (projectId: string): Promise<Gate1CandidateStrategy[]> =>
    gate1Get<Gate1CandidateStrategy[]>(`${projectPath(projectId)}/candidates`),

  /** GET /advisor/projects/:id/candidates/compare?a=&b= */
  compareCandidates: (
    projectId: string,
    candidateAId: string,
    candidateBId: string,
  ): Promise<Gate1CandidateCompareResult> =>
    gate1Get<Gate1CandidateCompareResult>(`${projectPath(projectId)}/candidates/compare`, {
      a: candidateAId,
      b: candidateBId,
    }),

  /** POST /advisor/projects/:id/strategies */
  createStrategy: (
    projectId: string,
    body: CreateGate1AdvisorStrategyRequest,
  ): Promise<Gate1CandidateStrategy> =>
    gate1Post<Gate1CandidateStrategy>(`${projectPath(projectId)}/strategies`, body),

  /** @deprecated 优先 getConstraints */
  getSanitizedConstraints: (projectId: string): Promise<Gate1SanitizedConstraint[]> =>
    gate1Get<Gate1SanitizedConstraint[]>(`${projectPath(projectId)}/sanitized-constraints`),

  getReadiness: (projectId: string): Promise<Gate1ReadinessReport[]> =>
    gate1Get<Gate1ReadinessReport[]>(`${projectPath(projectId)}/readiness`),

  getPlanB: (projectId: string): Promise<Gate1PlanB[]> =>
    gate1Get<Gate1PlanB[]>(`${projectPath(projectId)}/plan-b`),

  getDecision: (projectId: string): Promise<Gate1AdvisorDecision | null> =>
    gate1Get<Gate1AdvisorDecision | null>(`${projectPath(projectId)}/decision`),

  getDecisions: (projectId: string): Promise<Gate1AdvisorDecision[]> =>
    gate1Get<Gate1AdvisorDecision[]>(`${projectPath(projectId)}/decisions`),

  getWorkLogs: (projectId: string): Promise<Gate1ProjectWorkLogsResponse> =>
    gate1Get<Gate1ProjectWorkLogsResponse>(`${projectPath(projectId)}/work-logs`),

  /** GET /advisor/projects/:projectId/audit-timeline */
  getAuditTimeline: (projectId: string): Promise<Gate1AuditTimeline> =>
    gate1Get<Gate1AuditTimeline>(`${projectPath(projectId)}/audit-timeline`),

  /** GET /advisor/projects/:projectId/runtime-workspace — M3 灰度读 */
  getRuntimeWorkspace: (projectId: string): Promise<Gate1RuntimeWorkspace> =>
    gate1Get<Gate1RuntimeWorkspace>(`${projectPath(projectId)}/runtime-workspace`),

  /** GET /advisor/organizations/:organizationId/portfolio */
  getOrgPortfolio: (organizationId: string): Promise<Gate1OrgPortfolio> =>
    gate1Get<Gate1OrgPortfolio>(
      `/advisor/organizations/${encodeURIComponent(organizationId)}/portfolio`,
    ),

  /** POST /advisor/projects/:projectId/participants/:participantId/remind */
  remindParticipant: (
    projectId: string,
    participantId: string,
  ): Promise<Gate1ParticipantRemindResult> =>
    gate1Post<Gate1ParticipantRemindResult>(
      `${projectPath(projectId)}/participants/${encodeURIComponent(participantId)}/remind`,
    ),

  submitConflictFindingFeedback: (
    findingId: string,
    body: Gate1ConflictFindingFeedbackRequest,
  ): Promise<{ ok: true }> =>
    gate1Post<{ ok: true }>(
      `/advisor/projects/conflicts/findings/${encodeURIComponent(findingId)}/feedback`,
      body,
    ),

  submitConflictFindingAction: (
    findingId: string,
    body: Gate1ConflictFindingActionRequest,
  ): Promise<{ ok: true }> =>
    gate1Post<{ ok: true }>(
      `/advisor/projects/conflicts/findings/${encodeURIComponent(findingId)}/actions`,
      body,
    ),

  submitReadinessFindingFeedback: (
    findingId: string,
    body: Gate1ReadinessFindingFeedbackRequest,
  ): Promise<{ ok: true }> =>
    gate1Post<{ ok: true }>(
      `/advisor/projects/readiness/findings/${encodeURIComponent(findingId)}/feedback`,
      body,
    ),

  submitReadinessFindingAction: (
    findingId: string,
    body: Gate1ReadinessFindingActionRequest,
  ): Promise<{ ok: true }> =>
    gate1Post<{ ok: true }>(
      `/advisor/projects/readiness/findings/${encodeURIComponent(findingId)}/actions`,
      body,
    ),

  submitDecision: (projectId: string, body: SubmitGate1DecisionRequest): Promise<Gate1AdvisorDecision> =>
    gate1Post<Gate1AdvisorDecision>(`${projectPath(projectId)}/decision`, body),

  submitPlanBPreDecision: (planBId: string, body: Gate1PlanBPreDecisionRequest): Promise<Gate1PlanB> =>
    gate1Post<Gate1PlanB>(
      `/advisor/projects/plan-b/${encodeURIComponent(planBId)}/pre-decision`,
      body,
    ),

  submitPlanBOutcome: (
    projectId: string,
    planBId: string,
    body: Gate1PlanBOutcomeRequest,
  ): Promise<Gate1PlanB> =>
    gate1Post<Gate1PlanB>(
      `${projectPath(projectId)}/plan-b/${encodeURIComponent(planBId)}/outcome`,
      body,
    ),
};
