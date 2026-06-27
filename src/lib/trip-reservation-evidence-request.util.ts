import type {
  TripReservationEvidence,
  TripReservationEvidenceCreateRequest,
} from '@/types/trip-reservation-evidence';

export interface BuildReservationEvidenceRequestInput {
  tripItemId: string;
  poiId: string;
  confirmationCode: string;
  targetResource?: TripReservationEvidence['targetResource'];
  attachmentId?: string;
  externalUrl?: string;
  plannedArrivalAt?: string;
  dateISO?: string;
  plannedArrival?: string;
}

function splitPlannedArrival(iso?: string): Pick<
  TripReservationEvidenceCreateRequest,
  'dateISO' | 'plannedArrival'
> {
  if (!iso?.trim()) return {};
  const trimmed = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { dateISO: trimmed };
  }
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (match) {
    return { dateISO: match[1], plannedArrival: match[2] };
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return {};
  const dateISO = trimmed.slice(0, 10);
  const plannedArrival = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  return { dateISO, plannedArrival };
}

/**
 * POST /trips/:tripId/reservation-evidence 请求体
 * 最少：tripItemId + poiId + confirmationCode；dateISO 可省略；有 dateISO 时建议带 plannedArrival（±2h）
 */
export function buildReservationEvidenceCreateRequest(
  input: BuildReservationEvidenceRequestInput,
): TripReservationEvidenceCreateRequest {
  const tripItemId = input.tripItemId?.trim();
  const poiId = input.poiId?.trim();
  const confirmationCode = input.confirmationCode?.trim();

  if (!tripItemId || !poiId || !confirmationCode) {
    throw new Error('缺少 tripItemId、poiId 或 confirmationCode');
  }

  const body: TripReservationEvidenceCreateRequest = {
    tripItemId,
    poiId,
    confirmationCode,
    source: 'manual',
  };

  const fromIso = splitPlannedArrival(input.plannedArrivalAt);
  const dateISO = input.dateISO ?? fromIso.dateISO;
  const plannedArrival = input.plannedArrival ?? fromIso.plannedArrival;

  if (dateISO) {
    body.dateISO = dateISO;
    if (plannedArrival) {
      body.plannedArrival = plannedArrival;
    }
  }

  if (input.targetResource) {
    body.resource = input.targetResource;
  }
  if (input.attachmentId) body.attachmentId = input.attachmentId;
  if (input.externalUrl) body.externalUrl = input.externalUrl;

  return body;
}
