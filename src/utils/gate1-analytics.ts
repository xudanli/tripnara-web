/**
 * Gate 1 埋点（附录 B 核心事件）
 */

export const GATE1_ANALYTICS_EVENTS = {
  PROJECT_CREATED: 'gate1_project_created',
  BASELINE_SUBMITTED: 'baseline_submitted',
  INVITATION_SENT: 'invitation_sent',
  INVITATION_OPENED: 'invitation_opened',
  CONSENT_ACCEPTED: 'consent_accepted',
  PREFERENCE_FORM_STARTED: 'preference_form_started',
  PREFERENCE_FORM_SUBMITTED: 'preference_form_submitted',
  CONFLICT_REPORT_PUBLISHED: 'conflict_report_published',
  ADVISOR_DECISION_SUBMITTED: 'advisor_decision_submitted',
} as const;

function track(eventName: string, properties?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.log('[Gate1Analytics]', eventName, properties);
  }
  if (typeof window !== 'undefined' && (window as unknown as { dataLayer?: unknown[] }).dataLayer) {
    (window as unknown as { dataLayer: unknown[] }).dataLayer.push({
      event: eventName,
      ...properties,
    });
  }
}

export function trackGate1ProjectCreated(payload: {
  projectId: string;
  cohort: string;
  organizationId?: string;
}): void {
  track(GATE1_ANALYTICS_EVENTS.PROJECT_CREATED, {
    project_id: payload.projectId,
    cohort: payload.cohort,
    org_id: payload.organizationId,
  });
}

export function trackGate1BaselineSubmitted(payload: {
  projectId: string;
  expectedHours?: number;
}): void {
  track(GATE1_ANALYTICS_EVENTS.BASELINE_SUBMITTED, {
    project_id: payload.projectId,
    expected_hours: payload.expectedHours,
  });
}

export function trackGate1InvitationSent(payload: {
  projectId: string;
  participantId: string;
}): void {
  track(GATE1_ANALYTICS_EVENTS.INVITATION_SENT, {
    project_id: payload.projectId,
    participant_id: payload.participantId,
  });
}

export function trackGate1InvitationOpened(payload: {
  projectId: string;
  participantId: string;
}): void {
  track(GATE1_ANALYTICS_EVENTS.INVITATION_OPENED, {
    project_id: payload.projectId,
    participant_id: payload.participantId,
  });
}

export function trackGate1ConsentAccepted(payload: {
  projectId: string;
  participantId: string;
  consentVersion: string;
}): void {
  track(GATE1_ANALYTICS_EVENTS.CONSENT_ACCEPTED, {
    project_id: payload.projectId,
    participant_id: payload.participantId,
    consent_version: payload.consentVersion,
  });
}

export function trackGate1PreferenceFormStarted(payload: {
  projectId: string;
  participantId: string;
}): void {
  track(GATE1_ANALYTICS_EVENTS.PREFERENCE_FORM_STARTED, {
    project_id: payload.projectId,
    participant_id: payload.participantId,
  });
}

export function trackGate1PreferenceFormSubmitted(payload: {
  projectId: string;
  participantId: string;
  durationMs?: number;
  privateUsed?: boolean;
}): void {
  track(GATE1_ANALYTICS_EVENTS.PREFERENCE_FORM_SUBMITTED, {
    project_id: payload.projectId,
    participant_id: payload.participantId,
    duration_ms: payload.durationMs,
    private_used: payload.privateUsed,
  });
}

export function trackGate1AdvisorDecisionSubmitted(payload: {
  projectId: string;
  materialChange: boolean;
  changeTypes?: string[];
}): void {
  track(GATE1_ANALYTICS_EVENTS.ADVISOR_DECISION_SUBMITTED, {
    project_id: payload.projectId,
    material_change: payload.materialChange,
    change_type: payload.changeTypes,
  });
}
