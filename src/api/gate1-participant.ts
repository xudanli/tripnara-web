/**
 * Gate 1 · 成员门户（兼容层，委托 participant-portal API）
 * @deprecated 新代码请使用 `@/api/participant-portal`
 */

import { participantPortalApi } from './participant-portal';
import type {
  Gate1ConsentRequest,
  Gate1ConsentResponse,
  Gate1InvitationLanding,
  Gate1ParticipantFeedbackRequest,
  Gate1PreferencesRequest,
  Gate1WithdrawResponse,
} from '@/types/gate1';
import type {
  ParticipantInviteLanding,
  SubmitParticipantConsentRequest,
} from '@/types/participant-portal';

function toLegacyLanding(landing: ParticipantInviteLanding): Gate1InvitationLanding {
  const catalog = landing.consentCatalog;
  const legacyText =
    catalog?.items.map((i) => i.text ?? i.description ?? i.label).join('\n\n') ??
    landing.consent?.text ??
    '';

  return {
    project: {
      id: landing.project.id,
      title: landing.project.title,
      destination: landing.project.destination,
      cohort: landing.project.cohort,
    },
    participant: {
      id: landing.participant.id,
      displayName: landing.participant.displayName,
      status: landing.participant.status as Gate1InvitationLanding['participant']['status'],
    },
    consent: {
      version: catalog?.version ?? landing.consent?.version ?? 'unknown',
      text: legacyText,
    },
  };
}

function toConsentRequest(body: Gate1ConsentRequest): SubmitParticipantConsentRequest {
  return {
    inviteToken: body.inviteToken,
    action: body.action,
    declineReason: body.declineReason,
    consents:
      body.action === 'ACCEPT'
        ? {
            BASE_SERVICE: true,
            HUMAN_ASSISTED: true,
          }
        : undefined,
  };
}

export const gate1ParticipantApi = {
  getInvitation: async (token: string): Promise<Gate1InvitationLanding> =>
    toLegacyLanding(await participantPortalApi.getInvite(token)),

  submitConsent: async (body: Gate1ConsentRequest): Promise<Gate1ConsentResponse> => {
    const res = await participantPortalApi.submitConsent(toConsentRequest(body));
    return { status: res.status as Gate1ConsentResponse['status'] };
  },

  savePreferences: (token: string, body: Gate1PreferencesRequest) =>
    participantPortalApi.savePreferences(token, body),

  withdraw: async (token: string): Promise<Gate1WithdrawResponse> => {
    const res = await participantPortalApi.withdraw(token);
    return {
      status: res.status as Gate1WithdrawResponse['status'],
      deletionTicket: res.deletionTicket ?? '',
    };
  },

  submitFeedback: (token: string, body: Gate1ParticipantFeedbackRequest) =>
    participantPortalApi.submitOutcomeFeedback(token, body),
};
