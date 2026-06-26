/**
 * Trusted Projects API 类型
 * @see docs/api/identity-governance-api.md §6
 */

export type TrustedProjectCommercialType = 'NON_COMMERCIAL' | 'COMMERCIAL';

export type TrustedProjectListingStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'closed'
  | 'suspended';

export type TrustedProjectApplicationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export type TrustedProjectPublisherSubjectType = 'USER' | 'ORGANIZATION';

export interface CreateTrustedProjectRequest {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  summary: string;
  commercialType: TrustedProjectCommercialType;
  slotsTotal: number;
  budgetMinCents?: number;
  budgetMaxCents?: number;
  riskDisclosure: string;
  refundPolicy?: string;
  tripId?: string;
  organizationId?: string;
}

export interface TrustedProjectListing {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  summary?: string;
  commercialType: TrustedProjectCommercialType;
  slotsTotal: number;
  slotsRemaining?: number;
  budgetMinCents?: number | null;
  budgetMaxCents?: number | null;
  riskDisclosure?: string;
  refundPolicy?: string | null;
  listingStatus: TrustedProjectListingStatus;
  organizationId?: string | null;
  publisherSubjectType?: TrustedProjectPublisherSubjectType;
  publisherSubjectId?: string;
  publisherDisplayName?: string;
  responsibleUserId?: string;
  responsibleUserDisplayName?: string | null;
  tripId?: string | null;
  createdAt?: string;
  publishedAt?: string | null;
}

export interface TrustedProjectApplication {
  id: string;
  listingId: string;
  applicantUserId: string;
  applicantDisplayName?: string | null;
  status: TrustedProjectApplicationStatus;
  message?: string | null;
  createdAt?: string;
  reviewedAt?: string | null;
}

export interface ReviewTrustedProjectApplicationRequest {
  decision: 'approved' | 'rejected';
  note?: string;
}

export interface TrustedProjectListQuery {
  destination?: string;
  limit?: number;
  offset?: number;
}
