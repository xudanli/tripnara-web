import type { ProfessionalCertificationStatus } from '@/types/account-governance';

export interface ProfessionalCertificationIdentitySection {
  legalName: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export interface ProfessionalCertificationExperienceSection {
  yearsOfExperience: string;
  completedTripCount: string;
  destinationExperience: string;
  activityTypes: string;
}

export interface ProfessionalCertificationQualificationSection {
  certificateType: string;
  issuer: string;
  certificateId: string;
  validUntil: string;
}

export interface ProfessionalCertificationComplianceSection {
  serviceEntityName: string;
  paymentEntityName: string;
  refundPolicySummary: string;
  hasLiabilityInsurance: boolean;
}

export interface ProfessionalCertificationApplicationDraft {
  status: ProfessionalCertificationStatus;
  updatedAt: string;
  identity: ProfessionalCertificationIdentitySection;
  experience: ProfessionalCertificationExperienceSection;
  qualification: ProfessionalCertificationQualificationSection;
  compliance: ProfessionalCertificationComplianceSection;
}

export type ProfessionalCertificationFormStep =
  | 'identity'
  | 'experience'
  | 'qualification'
  | 'compliance'
  | 'review';

export interface SubmitProfessionalCertificationPayload {
  identity: ProfessionalCertificationIdentitySection;
  experience: ProfessionalCertificationExperienceSection;
  qualification: ProfessionalCertificationQualificationSection;
  compliance: ProfessionalCertificationComplianceSection;
}
