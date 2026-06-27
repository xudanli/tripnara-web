/**
 * 行程预约证据 — 用于 POI Access Engine 解除 hard/must 约束
 * @see docs/prd/pre-trip-readiness-p0-prd.md §10.2
 */

import type { PoiTargetResource } from '@/types/poi-access-capacity';

export type TripReservationEvidenceSource = 'manual' | 'booking_module' | 'import';

export interface TripReservationEvidence {
  id: string;
  tripItemId: string;
  targetResource: Extract<PoiTargetResource, 'PARKING' | 'ACTIVITY'> | 'TIMED_ENTRY';
  confirmationCode?: string;
  attachmentId?: string;
  externalUrl?: string;
  source: TripReservationEvidenceSource;
  confirmedAt: string;
  validFrom?: string;
  validTo?: string;
}

/** trip.metadata.reservationEvidence */
export interface TripReservationEvidenceMetadata {
  revision: 'v1';
  items: TripReservationEvidence[];
}

export interface GateExecuteBlockReason {
  code: 'access_hard_blocked' | 'experience_regret_unconfirmed';
  issueId?: string;
  message: string;
}

/** Feasibility / trip detail 可附带的出发门禁（GATE-EXECUTE） */
export interface GateExecuteStatus {
  blocked: boolean;
  reasons: GateExecuteBlockReason[];
}

export interface TripReservationEvidenceCreateRequest {
  tripItemId: string;
  targetResource: TripReservationEvidence['targetResource'];
  confirmationCode?: string;
  attachmentId?: string;
  externalUrl?: string;
  source?: TripReservationEvidenceSource;
  validFrom?: string;
  validTo?: string;
  poiId?: string;
  plannedArrivalAt?: string;
}
