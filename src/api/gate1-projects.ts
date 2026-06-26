/**
 * Gate 1 · 顾问项目 / Baseline / 邀请 / Outcome
 * @see docs/api/gate1-frontend-integration.md §4.1–4.3, §4.8
 */

import { buildGate1ParticipantInviteUrl, gate1Get, gate1Patch, gate1Post } from './gate1-common';
import type {
  CreateGate1InvitationRequest,
  CreateGate1ProjectRequest,
  CreateGate1TravelEventRequest,
  CreateGate1WorkLogRequest,
  Gate1Baseline,
  Gate1InvitationCreated,
  Gate1OutcomeBundle,
  Gate1ParticipantsProgressResponse,
  Gate1ProjectDetail,
  Gate1ProjectSummary,
  Gate1TravelEvent,
  Gate1WorkLog,
  PatchGate1ProjectStatusRequest,
  SubmitGate1BaselineRequest,
  SubmitGate1OutcomeRequest,
} from '@/types/gate1';

export const gate1ProjectsApi = {
  /** POST /gate1/projects */
  create: (body: CreateGate1ProjectRequest): Promise<Gate1ProjectSummary> =>
    gate1Post<Gate1ProjectSummary>('/gate1/projects', body),

  /** GET /gate1/projects — 兼容旧列表；新页面优先 gate1AdvisorApi.listProjects */
  list: (): Promise<Gate1ProjectSummary[]> =>
    gate1Get<Gate1ProjectSummary[]>('/gate1/projects'),

  /** PATCH /gate1/projects/:id/status */
  patchStatus: (projectId: string, body: PatchGate1ProjectStatusRequest): Promise<Gate1ProjectDetail> =>
    gate1Patch<Gate1ProjectDetail>(
      `/gate1/projects/${encodeURIComponent(projectId)}/status`,
      body,
    ),

  /** GET /gate1/projects/:id */
  getById: (projectId: string): Promise<Gate1ProjectDetail> =>
    gate1Get<Gate1ProjectDetail>(`/gate1/projects/${encodeURIComponent(projectId)}`),

  /** POST /gate1/projects/:id/baseline */
  submitBaseline: (projectId: string, body: SubmitGate1BaselineRequest): Promise<Gate1Baseline> =>
    gate1Post<Gate1Baseline>(`/gate1/projects/${encodeURIComponent(projectId)}/baseline`, body),

  /** GET /gate1/projects/:id/baseline */
  getBaseline: (projectId: string): Promise<Gate1Baseline | null> =>
    gate1Get<Gate1Baseline | null>(`/gate1/projects/${encodeURIComponent(projectId)}/baseline`),

  /** POST /gate1/projects/:projectId/invitations */
  createInvitation: async (
    projectId: string,
    body: CreateGate1InvitationRequest,
  ): Promise<Gate1InvitationCreated & { fullInviteUrl: string }> => {
    const data = await gate1Post<Gate1InvitationCreated>(
      `/gate1/projects/${encodeURIComponent(projectId)}/invitations`,
      body,
    );
    return {
      ...data,
      fullInviteUrl: buildGate1ParticipantInviteUrl(data.inviteUrl),
    };
  },

  /** GET /gate1/projects/:id/participants/progress */
  getParticipantsProgress: (projectId: string): Promise<Gate1ParticipantsProgressResponse> =>
    gate1Get<Gate1ParticipantsProgressResponse>(
      `/gate1/projects/${encodeURIComponent(projectId)}/participants/progress`,
    ),

  /** POST /gate1/projects/:id/travel-events */
  createTravelEvent: (
    projectId: string,
    body: CreateGate1TravelEventRequest,
  ): Promise<Gate1TravelEvent> =>
    gate1Post<Gate1TravelEvent>(
      `/gate1/projects/${encodeURIComponent(projectId)}/travel-events`,
      body,
    ),

  /** GET /gate1/projects/:id/outcome */
  getOutcome: (projectId: string): Promise<Gate1OutcomeBundle> =>
    gate1Get<Gate1OutcomeBundle>(`/gate1/projects/${encodeURIComponent(projectId)}/outcome`),

  /** POST /gate1/projects/:id/outcome */
  submitOutcome: (projectId: string, body: SubmitGate1OutcomeRequest): Promise<Gate1OutcomeBundle> =>
    gate1Post<Gate1OutcomeBundle>(
      `/gate1/projects/${encodeURIComponent(projectId)}/outcome`,
      body,
    ),

  /** POST /gate1/projects/:id/work-logs */
  createWorkLog: (projectId: string, body: CreateGate1WorkLogRequest): Promise<Gate1WorkLog> =>
    gate1Post<Gate1WorkLog>(
      `/gate1/projects/${encodeURIComponent(projectId)}/work-logs`,
      body,
    ),
};
