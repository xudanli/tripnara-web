import type { AgencyCertificationStatus } from '@/types/account-governance';

export interface AgencyEntitySection {
  legalName: string;
  unifiedSocialCreditCode: string;
  registeredAddress: string;
  businessScope: string;
}

export interface AgencyAuthorizationSection {
  authorizedPersonName: string;
  authorizedPersonTitle: string;
  contactEmail: string;
  contactPhone: string;
}

export interface AgencyOperationsSection {
  travelLicenseSummary: string;
  serviceRegions: string;
  complaintProcessSummary: string;
}

export interface AgencyFinancialSection {
  paymentEntityName: string;
  refundPolicySummary: string;
  hasLiabilityInsurance: boolean;
}

export interface AgencyCertificationApplicationDraft {
  status: AgencyCertificationStatus;
  workspaceName: string;
  /** 后端 organizationId（创建机构草稿后填充） */
  organizationId?: string;
  updatedAt: string;
  entity: AgencyEntitySection;
  authorization: AgencyAuthorizationSection;
  operations: AgencyOperationsSection;
  financial: AgencyFinancialSection;
}

export type AgencyCertificationFormStep =
  | 'workspace'
  | 'entity'
  | 'authorization'
  | 'operations'
  | 'financial'
  | 'review';

export interface SubmitAgencyCertificationPayload {
  workspaceName: string;
  entity: AgencyEntitySection;
  authorization: AgencyAuthorizationSection;
  operations: AgencyOperationsSection;
  financial: AgencyFinancialSection;
}
