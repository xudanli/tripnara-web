import type {
  AgencyAuthorizationSection,
  AgencyCertificationApplicationDraft,
  AgencyEntitySection,
  AgencyFinancialSection,
  AgencyOperationsSection,
} from '@/types/agency-certification';

const STORAGE_KEY = 'tripnara_agency_cert_draft';

export function emptyAgencyCertificationDraft(): AgencyCertificationApplicationDraft {
  return {
    status: 'DRAFT',
    workspaceName: '',
    updatedAt: new Date().toISOString(),
    entity: {
      legalName: '',
      unifiedSocialCreditCode: '',
      registeredAddress: '',
      businessScope: '',
    },
    authorization: {
      authorizedPersonName: '',
      authorizedPersonTitle: '',
      contactEmail: '',
      contactPhone: '',
    },
    operations: {
      travelLicenseSummary: '',
      serviceRegions: '',
      complaintProcessSummary: '',
    },
    financial: {
      paymentEntityName: '',
      refundPolicySummary: '',
      hasLiabilityInsurance: false,
    },
  };
}

export function readAgencyCertificationDraft(): AgencyCertificationApplicationDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AgencyCertificationApplicationDraft;
    if (!parsed || typeof parsed !== 'object') return null;
    return { ...emptyAgencyCertificationDraft(), ...parsed };
  } catch {
    return null;
  }
}

export function writeAgencyCertificationDraft(draft: AgencyCertificationApplicationDraft): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() })
    );
  } catch {
    /* ignore */
  }
}

export function updateAgencyCertificationDraftSections(sections: {
  workspaceName?: string;
  entity?: Partial<AgencyEntitySection>;
  authorization?: Partial<AgencyAuthorizationSection>;
  operations?: Partial<AgencyOperationsSection>;
  financial?: Partial<AgencyFinancialSection>;
}): AgencyCertificationApplicationDraft {
  const prev = readAgencyCertificationDraft() ?? emptyAgencyCertificationDraft();
  const next: AgencyCertificationApplicationDraft = {
    ...prev,
    workspaceName: sections.workspaceName ?? prev.workspaceName,
    entity: { ...prev.entity, ...sections.entity },
    authorization: { ...prev.authorization, ...sections.authorization },
    operations: { ...prev.operations, ...sections.operations },
    financial: { ...prev.financial, ...sections.financial },
    status: prev.status === 'SUBMITTED' ? prev.status : 'DRAFT',
    updatedAt: new Date().toISOString(),
  };
  writeAgencyCertificationDraft(next);
  return next;
}

export function markAgencyCertificationSubmitted(): AgencyCertificationApplicationDraft {
  const prev = readAgencyCertificationDraft() ?? emptyAgencyCertificationDraft();
  const next: AgencyCertificationApplicationDraft = {
    ...prev,
    status: 'SUBMITTED',
    updatedAt: new Date().toISOString(),
  };
  writeAgencyCertificationDraft(next);
  return next;
}
