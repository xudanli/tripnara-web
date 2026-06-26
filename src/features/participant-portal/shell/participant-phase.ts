/**
 * Gate1 / Participant status → Portal presentation phase
 */

import type { ParticipantStatus } from '@/types/participant-portal';

export type PortalPhase =
  | 'joining'
  | 'consenting'
  | 'profiling'
  | 'active'
  | 'withdrawn'
  | 'declined';

export function mapParticipantStatusToPhase(status: ParticipantStatus): PortalPhase {
  switch (status) {
    case 'INVITED':
    case 'OPENED':
      return 'joining';
    case 'JOINED':
      return 'consenting';
    case 'CONSENTED':
    case 'IN_PROGRESS':
      return 'profiling';
    case 'SUBMITTED':
      return 'active';
    case 'WITHDRAWN':
    case 'DELETED':
      return 'withdrawn';
    case 'DECLINED':
      return 'declined';
    default:
      return 'joining';
  }
}

export function participantInvitePath(token: string): string {
  return `/participant/invites/${encodeURIComponent(token)}`;
}

export function participantProjectPath(token: string, suffix = ''): string {
  const base = `/participant/projects/${encodeURIComponent(token)}`;
  return suffix ? `${base}/${suffix.replace(/^\//, '')}` : base;
}

/** @deprecated use participantProjectPath(token, 'preferences') */
export function portalBasePath(token: string): string {
  return participantProjectPath(token);
}

export function portalPathForPhase(token: string, phase: PortalPhase): string {
  switch (phase) {
    case 'joining':
      return participantInvitePath(token);
    case 'consenting':
      return participantProjectPath(token, 'consent');
    case 'profiling':
      return participantProjectPath(token, 'preferences');
    case 'active':
      return participantProjectPath(token, 'dashboard');
    case 'withdrawn':
      return participantProjectPath(token, 'withdrawn');
    case 'declined':
      return participantProjectPath(token, 'declined');
  }
}

export function portalPhaseLabel(phase: PortalPhase): string {
  const map: Record<PortalPhase, string> = {
    joining: '接受邀请',
    consenting: '知情同意',
    profiling: '填写偏好',
    active: '参与项目',
    withdrawn: '已退出',
    declined: '已拒绝',
  };
  return map[phase];
}
