import { tripsApi } from '@/api/trips';
import {
  appendReservationEvidence,
  extractReservationEvidenceList,
} from '@/lib/trip-reservation-evidence.util';
import { buildReservationEvidenceCreateRequest } from '@/lib/trip-reservation-evidence-request.util';
import type { TripReservationEvidence } from '@/types/trip-reservation-evidence';
import type { TripDetail } from '@/types/trip';

export interface SaveReservationEvidenceInput {
  tripItemId: string;
  poiId: string;
  confirmationCode: string;
  targetResource?: TripReservationEvidence['targetResource'];
  attachmentId?: string;
  externalUrl?: string;
  validFrom?: string;
  validTo?: string;
  plannedArrivalAt?: string;
  dateISO?: string;
  plannedArrival?: string;
}

function isEndpointUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  const status = (error as { response?: { status?: number } }).response?.status;
  return code === 'NOT_FOUND' || status === 404 || status === 501;
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return '保存失败，请稍后重试';
}

function buildEvidence(input: SaveReservationEvidenceInput): TripReservationEvidence {
  const now = new Date().toISOString();
  const arrival = input.plannedArrivalAt ? new Date(input.plannedArrivalAt) : null;
  const bufferMs = 2 * 60 * 60 * 1000;
  const targetResource = input.targetResource ?? 'PARKING';
  return {
    id: `rev-${input.tripItemId}-${targetResource}-${Date.now()}`,
    tripItemId: input.tripItemId,
    targetResource,
    confirmationCode: input.confirmationCode.trim(),
    attachmentId: input.attachmentId,
    externalUrl: input.externalUrl,
    source: 'manual',
    confirmedAt: now,
    validFrom:
      input.validFrom ??
      (arrival && !Number.isNaN(arrival.getTime())
        ? new Date(arrival.getTime() - bufferMs).toISOString()
        : undefined),
    validTo:
      input.validTo ??
      (arrival && !Number.isNaN(arrival.getTime())
        ? new Date(arrival.getTime() + bufferMs).toISOString()
        : undefined),
  };
}

/** 保存预约证据：POST /trips/:id/reservation-evidence（不用 readiness 前缀） */
export async function saveTripReservationEvidence(
  tripId: string,
  trip: TripDetail | null | undefined,
  input: SaveReservationEvidenceInput,
): Promise<TripReservationEvidence> {
  const evidence = buildEvidence(input);
  const bffBody = buildReservationEvidenceCreateRequest(input);

  try {
    const res = await tripsApi.saveReservationEvidence(tripId, bffBody);
    return res.evidence ?? evidence;
  } catch (err) {
    if (!isEndpointUnavailable(err)) {
      throw new Error(resolveErrorMessage(err));
    }
    const currentMeta = trip?.metadata ?? {};
    const nextList = appendReservationEvidence(currentMeta, evidence);
    await tripsApi.update(tripId, {
      metadata: {
        ...currentMeta,
        reservationEvidence: nextList,
      },
    });
    return evidence;
  }
}

export function listReservationEvidenceForItem(
  trip: TripDetail | null | undefined,
  tripItemId: string,
): TripReservationEvidence[] {
  return extractReservationEvidenceList(trip?.metadata).filter((item) => item.tripItemId === tripItemId);
}
