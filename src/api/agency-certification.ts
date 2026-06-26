/**
 * Agency 企业认证 API
 * 对接 /identity/organizations/*
 */

import { identityGovernanceApi, isIdentityApiNotReady } from '@/api/identity-governance';
import { isApiNotReadyError } from '@/features/match-square/lib/match-square-api-mode';
import { mapAgencyPayloadToDraftBody } from '@/lib/map-agency-certification';
import {
  markAgencyCertificationSubmitted,
  readAgencyCertificationDraft,
  writeAgencyCertificationDraft,
} from '@/lib/agency-certification-draft';
import type { SubmitAgencyCertificationPayload } from '@/types/agency-certification';

const ORG_ID_STORAGE_KEY = 'tripnara_agency_org_id';

function readStoredOrganizationId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ORG_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredOrganizationId(organizationId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ORG_ID_STORAGE_KEY, organizationId);
  } catch {
    /* ignore */
  }
}

async function resolveOrganizationId(workspaceName: string): Promise<string> {
  const draft = readAgencyCertificationDraft();
  if (draft?.organizationId) return draft.organizationId;

  const stored = readStoredOrganizationId();
  if (stored) return stored;

  const mine = await identityGovernanceApi.getMyOrganizations();
  if (mine.length > 0) {
    writeStoredOrganizationId(mine[0].id);
    return mine[0].id;
  }

  const created = await identityGovernanceApi.createOrganization({
    name: workspaceName || 'agency-draft',
    displayName: workspaceName || undefined,
  });
  writeStoredOrganizationId(created.id);

  const current = readAgencyCertificationDraft();
  if (current) {
    writeAgencyCertificationDraft({ ...current, organizationId: created.id });
  }

  return created.id;
}

export const agencyCertificationApi = {
  getStatus: async (organizationId: string) =>
    identityGovernanceApi.getAgencyCertificationStatus(organizationId),

  saveDraft: async (payload: SubmitAgencyCertificationPayload) => {
    const organizationId = await resolveOrganizationId(payload.workspaceName);
    return identityGovernanceApi.saveAgencyCertificationDraft(
      organizationId,
      mapAgencyPayloadToDraftBody(payload)
    );
  },

  submitApplication: async (
    payload: SubmitAgencyCertificationPayload
  ): Promise<{ workspaceId: string; status: 'SUBMITTED' }> => {
    try {
      const organizationId = await resolveOrganizationId(payload.workspaceName);
      await identityGovernanceApi.saveAgencyCertificationDraft(
        organizationId,
        mapAgencyPayloadToDraftBody(payload)
      );
      await identityGovernanceApi.submitAgencyCertification(organizationId);
      markAgencyCertificationSubmitted();
      return { workspaceId: organizationId, status: 'SUBMITTED' };
    } catch (error) {
      if (import.meta.env.DEV && (isIdentityApiNotReady(error) || isApiNotReadyError(error))) {
        markAgencyCertificationSubmitted();
        return { workspaceId: `local-agency-${Date.now()}`, status: 'SUBMITTED' };
      }
      throw error;
    }
  },
};
