/**
 * Professional 认证 API
 * 对接 /identity/professional/*
 */

import { identityGovernanceApi, isIdentityApiNotReady } from '@/api/identity-governance';
import { isApiNotReadyError } from '@/features/match-square/lib/match-square-api-mode';
import { mapProfessionalPayloadToDraftBody } from '@/lib/map-professional-certification';
import { markProfessionalCertificationSubmitted } from '@/lib/professional-certification-draft';
import type { ProfessionalStatus } from '@/types/identity-governance';
import type { SubmitProfessionalCertificationPayload } from '@/types/professional-certification';

export const professionalCertificationApi = {
  getStatus: (): Promise<ProfessionalStatus> => identityGovernanceApi.getProfessionalStatus(),

  saveDraft: async (payload: SubmitProfessionalCertificationPayload): Promise<ProfessionalStatus> => {
    const body = mapProfessionalPayloadToDraftBody(payload);
    try {
      return await identityGovernanceApi.saveProfessionalDraft(body);
    } catch (error) {
      if (import.meta.env.DEV && (isIdentityApiNotReady(error) || isApiNotReadyError(error))) {
        return { isVerifiedProfessional: false, status: 'DRAFT' };
      }
      throw error;
    }
  },

  submitApplication: async (
    payload: SubmitProfessionalCertificationPayload
  ): Promise<{ applicationId: string; status: 'SUBMITTED' }> => {
    try {
      await identityGovernanceApi.saveProfessionalDraft(mapProfessionalPayloadToDraftBody(payload));
      const result = await identityGovernanceApi.submitProfessional();
      return {
        applicationId: result.submittedAt ?? `prof-${Date.now()}`,
        status: 'SUBMITTED',
      };
    } catch (error) {
      if (import.meta.env.DEV && (isIdentityApiNotReady(error) || isApiNotReadyError(error))) {
        markProfessionalCertificationSubmitted();
        return { applicationId: `local-${Date.now()}`, status: 'SUBMITTED' };
      }
      throw error;
    }
  },
};
