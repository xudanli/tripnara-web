/**
 * Participant Portal API（Public inviteToken + 可选 JWT）
 * @see docs/api/participant-portal-frontend-integration.md
 */

import { gate1Get, gate1Patch, gate1Post, gate1Put } from './gate1-common';
import type {
  AcceptParticipantInviteRequest,
  AcceptParticipantInviteResponse,
  AckChangeNoticeRequest,
  AckChangeNoticeResponse,
  ParticipantChangeNotice,
  ParticipantDashboard,
  ParticipantInviteLanding,
  ParticipantMyProjectEntry,
  ParticipantNotification,
  ParticipantOutcomeFeedbackRequest,
  ParticipantPreferencesRequest,
  ParticipantPreferencesResponse,
  ParticipantPrivateConstraintMeta,
  ParticipantProposalDetail,
  ParticipantReadinessResponse,
  ParticipantWithdrawResponse,
  PatchReadinessTaskRequest,
  SubmitParticipantConsentRequest,
  SubmitParticipantConsentResponse,
  SubmitProposalFeedbackRequest,
} from '@/types/participant-portal';
import type { ParticipantTrustSurface } from '@/types/decision-os';

function tokenPath(token: string): string {
  return encodeURIComponent(token);
}

export const participantPortalApi = {
  // ── 多项目（需登录）──────────────────────────────────────────────────────
  listMyProjects: (): Promise<ParticipantMyProjectEntry[]> =>
    gate1Get<ParticipantMyProjectEntry[]>('/participant/me/projects'),

  // ── 邀请落地 ─────────────────────────────────────────────────────────────
  getInvite: (token: string): Promise<ParticipantInviteLanding> =>
    gate1Get<ParticipantInviteLanding>(`/participant/invites/${tokenPath(token)}`),

  /** @deprecated 兼容旧路径 */
  getInvitation: (token: string): Promise<ParticipantInviteLanding> =>
    gate1Get<ParticipantInviteLanding>(`/participant/invitations/${tokenPath(token)}`),

  acceptInvite: (
    token: string,
    body?: AcceptParticipantInviteRequest,
  ): Promise<AcceptParticipantInviteResponse> =>
    gate1Post<AcceptParticipantInviteResponse>(
      `/participant/invites/${tokenPath(token)}/accept`,
      body ?? {},
    ),

  // ── 知情同意 ───────────────────────────────────────────────────────────────
  submitConsent: (
    body: SubmitParticipantConsentRequest,
  ): Promise<SubmitParticipantConsentResponse> =>
    gate1Post<SubmitParticipantConsentResponse>('/participant/consents', body),

  // ── Dashboard ──────────────────────────────────────────────────────────────
  getDashboard: (token: string): Promise<ParticipantDashboard> =>
    gate1Get<ParticipantDashboard>(`/participant/projects/${tokenPath(token)}/dashboard`),

  /** GET /participant/projects/:token/trust-surface — 脱敏信任说明（Sprint 6） */
  getTrustSurface: (token: string): Promise<ParticipantTrustSurface> =>
    gate1Get<ParticipantTrustSurface>(
      `/participant/projects/${tokenPath(token)}/trust-surface`,
    ),

  // ── 偏好与私密约束 ─────────────────────────────────────────────────────────
  getPreferences: (token: string): Promise<ParticipantPreferencesResponse> =>
    gate1Get<ParticipantPreferencesResponse>(
      `/participant/projects/${tokenPath(token)}/preferences`,
    ),

  savePreferences: (
    token: string,
    body: ParticipantPreferencesRequest,
  ): Promise<{ status: ParticipantInviteLanding['participant']['status'] }> =>
    gate1Put<{ status: ParticipantInviteLanding['participant']['status'] }>(
      `/participant/projects/${tokenPath(token)}/preferences`,
      body,
    ),

  listPrivateConstraintMeta: (token: string): Promise<ParticipantPrivateConstraintMeta[]> =>
    gate1Get<ParticipantPrivateConstraintMeta[]>(
      `/participant/projects/${tokenPath(token)}/private-constraints`,
    ),

  // ── 方案与反馈 ─────────────────────────────────────────────────────────────
  getProposal: (token: string, candidateId: string): Promise<ParticipantProposalDetail> =>
    gate1Get<ParticipantProposalDetail>(
      `/participant/projects/${tokenPath(token)}/proposals/${encodeURIComponent(candidateId)}`,
    ),

  submitProposalFeedback: (
    token: string,
    candidateId: string,
    body: SubmitProposalFeedbackRequest,
  ): Promise<{ ok: true }> =>
    gate1Post<{ ok: true }>(
      `/participant/projects/${tokenPath(token)}/proposals/${encodeURIComponent(candidateId)}/feedback`,
      body,
    ),

  // ── Readiness ──────────────────────────────────────────────────────────────
  getReadiness: (token: string): Promise<ParticipantReadinessResponse> =>
    gate1Get<ParticipantReadinessResponse>(
      `/participant/projects/${tokenPath(token)}/readiness`,
    ),

  patchReadinessTask: (
    token: string,
    taskId: string,
    body: PatchReadinessTaskRequest,
  ): Promise<ParticipantReadinessResponse> =>
    gate1Patch<ParticipantReadinessResponse>(
      `/participant/projects/${tokenPath(token)}/readiness/tasks/${encodeURIComponent(taskId)}`,
      body,
    ),

  // ── 行中变化 ───────────────────────────────────────────────────────────────
  listChangeNotices: (token: string): Promise<ParticipantChangeNotice[]> =>
    gate1Get<ParticipantChangeNotice[]>(
      `/participant/projects/${tokenPath(token)}/change-notices`,
    ),

  getChangeNotice: (token: string, noticeId: string): Promise<ParticipantChangeNotice> =>
    gate1Get<ParticipantChangeNotice>(
      `/participant/projects/${tokenPath(token)}/change-notices/${encodeURIComponent(noticeId)}`,
    ),

  ackChangeNotice: (
    token: string,
    noticeId: string,
    body?: AckChangeNoticeRequest,
  ): Promise<AckChangeNoticeResponse> =>
    gate1Post<AckChangeNoticeResponse>(
      `/participant/projects/${tokenPath(token)}/change-notices/${encodeURIComponent(noticeId)}/ack`,
      body ?? {},
    ),

  // ── 应用内通知 ─────────────────────────────────────────────────────────────
  listNotifications: (token: string): Promise<ParticipantNotification[]> =>
    gate1Get<ParticipantNotification[]>(
      `/participant/projects/${tokenPath(token)}/notifications`,
    ),

  // ── 退出与行后反馈 ─────────────────────────────────────────────────────────
  withdraw: (token: string): Promise<ParticipantWithdrawResponse> =>
    gate1Post<ParticipantWithdrawResponse>(
      `/participant/projects/${tokenPath(token)}/withdraw`,
    ),

  submitOutcomeFeedback: (
    token: string,
    body: ParticipantOutcomeFeedbackRequest,
  ): Promise<{ ok: true }> =>
    gate1Post<{ ok: true }>(
      `/participant/projects/${tokenPath(token)}/feedback`,
      body,
    ),
};

/** 邀请 H5 完整 URL */
export function buildParticipantInviteUrl(token: string): string {
  const path = `/participant/invites/${encodeURIComponent(token)}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export function buildParticipantDashboardPath(token: string): string {
  return `/participant/projects/${encodeURIComponent(token)}/dashboard`;
}
