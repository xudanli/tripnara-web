/**
 * Gate 1 · 运营控制台 Ops Console
 * @see docs/api/gate1-frontend-integration.md §5
 */

import { gate1Get, gate1Patch, gate1Post } from './gate1-common';
import type {
  AssignGate1PrivacyAnalystRequest,
  CreateGate1CandidateRequest,
  CreateGate1ConflictReportRequest,
  CreateGate1PlanBRequest,
  CreateGate1ReadinessReportRequest,
  CreateGate1SanitizedConstraintRequest,
  Gate1CandidateStrategy,
  Gate1ConflictReport,
  Gate1OpsQueueItem,
  Gate1PlanB,
  Gate1PrivateConstraintRecord,
  Gate1ReadinessReport,
  Gate1SanitizedConstraint,
  PublishGate1OutputRequest,
  ReadGate1PrivateConstraintsRequest,
  ReviewGate1SanitizedConstraintRequest,
} from '@/types/gate1';

export const gate1OpsApi = {
  /** GET /ops/projects/queue */
  getQueue: (): Promise<Gate1OpsQueueItem[]> =>
    gate1Get<Gate1OpsQueueItem[]>('/ops/projects/queue'),

  /** POST /ops/projects/:projectId/privacy-analysts */
  assignPrivacyAnalyst: (
    projectId: string,
    body: AssignGate1PrivacyAnalystRequest,
  ): Promise<{ ok: true }> =>
    gate1Post<{ ok: true }>(
      `/ops/projects/${encodeURIComponent(projectId)}/privacy-analysts`,
      body,
    ),

  /** POST /ops/projects/:projectId/private-constraints/read — 留审计日志 */
  readPrivateConstraints: (
    projectId: string,
    body: ReadGate1PrivateConstraintsRequest,
  ): Promise<Gate1PrivateConstraintRecord[]> =>
    gate1Post<Gate1PrivateConstraintRecord[]>(
      `/ops/projects/${encodeURIComponent(projectId)}/private-constraints/read`,
      body,
    ),

  /** POST /ops/projects/:projectId/sanitized-constraints */
  createSanitizedConstraint: (
    projectId: string,
    body: CreateGate1SanitizedConstraintRequest,
  ): Promise<Gate1SanitizedConstraint> =>
    gate1Post<Gate1SanitizedConstraint>(
      `/ops/projects/${encodeURIComponent(projectId)}/sanitized-constraints`,
      body,
    ),

  /** PATCH /ops/projects/:projectId/sanitized-constraints/:constraintId/review */
  reviewSanitizedConstraint: (
    projectId: string,
    constraintId: string,
    body: ReviewGate1SanitizedConstraintRequest,
  ): Promise<Gate1SanitizedConstraint> =>
    gate1Patch<Gate1SanitizedConstraint>(
      `/ops/projects/${encodeURIComponent(projectId)}/sanitized-constraints/${encodeURIComponent(constraintId)}/review`,
      body,
    ),

  /** POST /ops/projects/:projectId/conflicts — 创建草稿 */
  createConflictReport: (
    projectId: string,
    body: CreateGate1ConflictReportRequest,
  ): Promise<Gate1ConflictReport> =>
    gate1Post<Gate1ConflictReport>(
      `/ops/projects/${encodeURIComponent(projectId)}/conflicts`,
      body,
    ),

  /** POST /ops/projects/:projectId/conflicts/:version/publish */
  publishConflictReport: (
    projectId: string,
    version: number,
    body: PublishGate1OutputRequest,
  ): Promise<Gate1ConflictReport> =>
    gate1Post<Gate1ConflictReport>(
      `/ops/projects/${encodeURIComponent(projectId)}/conflicts/${version}/publish`,
      body,
    ),

  /** POST /ops/projects/:projectId/candidates */
  createCandidate: (
    projectId: string,
    body: CreateGate1CandidateRequest,
  ): Promise<Gate1CandidateStrategy> =>
    gate1Post<Gate1CandidateStrategy>(
      `/ops/projects/${encodeURIComponent(projectId)}/candidates`,
      body,
    ),

  /** POST /ops/projects/:projectId/candidates/:candidateId/publish */
  publishCandidate: (
    projectId: string,
    candidateId: string,
    body: PublishGate1OutputRequest,
  ): Promise<Gate1CandidateStrategy> =>
    gate1Post<Gate1CandidateStrategy>(
      `/ops/projects/${encodeURIComponent(projectId)}/candidates/${encodeURIComponent(candidateId)}/publish`,
      body,
    ),

  /** POST /ops/projects/:projectId/readiness */
  createReadinessReport: (
    projectId: string,
    body: CreateGate1ReadinessReportRequest,
  ): Promise<Gate1ReadinessReport> =>
    gate1Post<Gate1ReadinessReport>(
      `/ops/projects/${encodeURIComponent(projectId)}/readiness`,
      body,
    ),

  /** POST /ops/projects/:projectId/readiness/:version/publish */
  publishReadinessReport: (
    projectId: string,
    version: number,
    body: PublishGate1OutputRequest,
  ): Promise<Gate1ReadinessReport> =>
    gate1Post<Gate1ReadinessReport>(
      `/ops/projects/${encodeURIComponent(projectId)}/readiness/${version}/publish`,
      body,
    ),

  /** POST /ops/projects/:projectId/plan-b */
  createPlanB: (projectId: string, body: CreateGate1PlanBRequest): Promise<Gate1PlanB> =>
    gate1Post<Gate1PlanB>(`/ops/projects/${encodeURIComponent(projectId)}/plan-b`, body),

  /** POST /ops/projects/:projectId/plan-b/:planBId/publish */
  publishPlanB: (
    projectId: string,
    planBId: string,
    body: PublishGate1OutputRequest,
  ): Promise<Gate1PlanB> =>
    gate1Post<Gate1PlanB>(
      `/ops/projects/${encodeURIComponent(projectId)}/plan-b/${encodeURIComponent(planBId)}/publish`,
      body,
    ),
};
