import type {
  TripReservationEvidence,
  TripReservationEvidenceMetadata,
} from '@/types/trip-reservation-evidence';

const DEFAULT_SLOT_BUFFER_MS = 2 * 60 * 60 * 1000;

function isEvidenceMetadata(value: unknown): value is TripReservationEvidenceMetadata {
  return (
    value != null &&
    typeof value === 'object' &&
    (value as TripReservationEvidenceMetadata).revision === 'v1' &&
    Array.isArray((value as TripReservationEvidenceMetadata).items)
  );
}

export function extractReservationEvidenceList(
  metadata?: Record<string, unknown> | null,
): TripReservationEvidence[] {
  if (!metadata) return [];
  const raw = metadata.reservationEvidence;
  if (Array.isArray(raw)) return raw as TripReservationEvidence[];
  if (isEvidenceMetadata(raw)) return raw.items;
  return [];
}

/** 计划到达时刻是否被某条预约证据覆盖（默认 ±2h） */
export function hasReservationEvidenceForSlot(
  metadata: Record<string, unknown> | null | undefined,
  tripItemId: string,
  plannedArrivalAt?: string | null,
  bufferMs = DEFAULT_SLOT_BUFFER_MS,
): boolean {
  const items = extractReservationEvidenceList(metadata).filter(
    (item) => item.tripItemId === tripItemId,
  );
  if (items.length === 0) return false;

  if (!plannedArrivalAt) {
    return items.some((item) => item.confirmationCode || item.attachmentId);
  }

  const arrival = new Date(plannedArrivalAt).getTime();
  if (Number.isNaN(arrival)) {
    return items.some((item) => item.confirmationCode || item.attachmentId);
  }

  return items.some((item) => {
    if (item.confirmationCode || item.attachmentId) {
      const from = item.validFrom ? new Date(item.validFrom).getTime() : arrival - bufferMs;
      const to = item.validTo ? new Date(item.validTo).getTime() : arrival + bufferMs;
      return arrival >= from && arrival <= to;
    }
    return false;
  });
}

export function appendReservationEvidence(
  metadata: Record<string, unknown> | null | undefined,
  evidence: TripReservationEvidence,
): TripReservationEvidenceMetadata {
  const existing = extractReservationEvidenceList(metadata);
  const withoutDup = existing.filter((item) => item.id !== evidence.id);
  return {
    revision: 'v1',
    items: [...withoutDup, evidence],
  };
}
