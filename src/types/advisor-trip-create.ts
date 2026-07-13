/**
 * 顾问（旅行社）代客创建行程
 * @see POST /api/trips/advisor-create
 */

/** 干系人对象形态（API 支持字符串简写或此对象） */
export interface AdvisorTripStakeholder {
  name?: string;
  email?: string;
  phone?: string;
  userId?: string;
}

export type AdvisorTripStakeholderInput = string | AdvisorTripStakeholder;

/** 表单内结构化干系人（提交前映射为 API 形态） */
export interface AdvisorTripContactForm {
  name: string;
  email?: string;
  phone?: string;
  userId?: string;
}

export interface AdvisorTripCreateFormState {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  estimatedHeadcount: number;
  totalBudget: number;
  knownRequirements: string;
  primaryContact: AdvisorTripContactForm;
  payer: AdvisorTripContactForm;
  payerSameAsPrimary: boolean;
  finalConfirmer: AdvisorTripContactForm;
  advisor: AdvisorTripContactForm;
  leader: AdvisorTripContactForm;
  organizationId?: string;
}

export interface CreateAdvisorTripRequest {
  name?: string;
  destination: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  estimatedHeadcount: number;
  totalBudget: number;
  knownRequirements?: string;
  primaryContact: AdvisorTripStakeholderInput;
  payer: AdvisorTripStakeholderInput;
  finalConfirmer: AdvisorTripStakeholderInput;
  advisor: AdvisorTripStakeholderInput;
  leader: AdvisorTripStakeholderInput;
  organizationId?: string;
}

export interface AdvisorTripMemberInviteCode {
  inviteCode: string;
  inviteUrl: string;
  label: string;
  expiresAt?: string;
}

import type { TripResponsibilityOwners } from '@/types/trip-responsibility';

export interface CreateAdvisorTripResponse {
  tripId: string;
  memberInviteCodes: AdvisorTripMemberInviteCode[];
  message?: string;
  /** P1：创建时后端可直接返回责任分配，前端跳过 PATCH */
  responsibilityOwners?: TripResponsibilityOwners;
}

export interface OrganizationStaffOption {
  userId: string;
  displayName: string;
  roles: string[];
}
