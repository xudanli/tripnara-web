import type {
  ProfessionalCertificationApplicationDraft,
  ProfessionalCertificationComplianceSection,
  ProfessionalCertificationExperienceSection,
  ProfessionalCertificationIdentitySection,
  ProfessionalCertificationQualificationSection,
} from '@/types/professional-certification';

const STORAGE_KEY = 'tripnara_professional_cert_draft';

export function emptyProfessionalCertificationDraft(): ProfessionalCertificationApplicationDraft {
  return {
    status: 'DRAFT',
    updatedAt: new Date().toISOString(),
    identity: {
      legalName: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
    },
    experience: {
      yearsOfExperience: '',
      completedTripCount: '',
      destinationExperience: '',
      activityTypes: '',
    },
    qualification: {
      certificateType: '',
      issuer: '',
      certificateId: '',
      validUntil: '',
    },
    compliance: {
      serviceEntityName: '',
      paymentEntityName: '',
      refundPolicySummary: '',
      hasLiabilityInsurance: false,
    },
  };
}

export function readProfessionalCertificationDraft(): ProfessionalCertificationApplicationDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfessionalCertificationApplicationDraft;
    if (!parsed || typeof parsed !== 'object') return null;
    return { ...emptyProfessionalCertificationDraft(), ...parsed };
  } catch {
    return null;
  }
}

export function writeProfessionalCertificationDraft(
  draft: ProfessionalCertificationApplicationDraft
): void {
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

export function updateProfessionalCertificationDraftSections(sections: {
  identity?: Partial<ProfessionalCertificationIdentitySection>;
  experience?: Partial<ProfessionalCertificationExperienceSection>;
  qualification?: Partial<ProfessionalCertificationQualificationSection>;
  compliance?: Partial<ProfessionalCertificationComplianceSection>;
}): ProfessionalCertificationApplicationDraft {
  const prev = readProfessionalCertificationDraft() ?? emptyProfessionalCertificationDraft();
  const next: ProfessionalCertificationApplicationDraft = {
    ...prev,
    identity: { ...prev.identity, ...sections.identity },
    experience: { ...prev.experience, ...sections.experience },
    qualification: { ...prev.qualification, ...sections.qualification },
    compliance: { ...prev.compliance, ...sections.compliance },
    status: prev.status === 'SUBMITTED' ? prev.status : 'DRAFT',
    updatedAt: new Date().toISOString(),
  };
  writeProfessionalCertificationDraft(next);
  return next;
}

export function markProfessionalCertificationSubmitted(): ProfessionalCertificationApplicationDraft {
  const prev = readProfessionalCertificationDraft() ?? emptyProfessionalCertificationDraft();
  const next: ProfessionalCertificationApplicationDraft = {
    ...prev,
    status: 'SUBMITTED',
    updatedAt: new Date().toISOString(),
  };
  writeProfessionalCertificationDraft(next);
  return next;
}
