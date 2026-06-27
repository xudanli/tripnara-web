import type {
  FeasibilityIssueDto,
  FeasibilityRepairOptionDto,
} from '@/types/trip-feasibility-report';
import type { TripReservationEvidence } from '@/types/trip-reservation-evidence';
import { resolvePoiAccessTripItemId } from '@/lib/poi-access-display.util';

export type ReservationEvidenceTargetResource = TripReservationEvidence['targetResource'];

export interface ReservationEvidenceFormContext {
  tripItemId: string;
  poiId: string;
  targetResource: ReservationEvidenceTargetResource;
  dateISO?: string;
  plannedArrival?: string;
  plannedArrivalAt?: string;
  issueId?: string;
  repairOptionId?: string;
  poiName?: string;
}

function mapTargetResource(raw: string | undefined): ReservationEvidenceTargetResource {
  if (raw === 'ACTIVITY' || raw === 'TIMED_ENTRY') return raw;
  return 'PARKING';
}

/** 是否应打开凭证弹窗，而非直接 apply-repair */
export function shouldOpenReservationEvidenceModal(
  option: FeasibilityRepairOptionDto,
  issue?: FeasibilityIssueDto,
): boolean {
  if (option.actionType !== 'manual_confirm') return false;
  if (option.payload?.ctaHandler === 'open_reservation_evidence_modal') return true;
  if (issue?.uiHints?.ctaModal === 'reservation_evidence') return true;
  if (issue?.issueKind?.startsWith('poi_access_')) return true;
  return false;
}

/** 从 uiHints.reservationEvidenceForm + repair payload + evaluation 合并预填字段 */
export function resolveReservationEvidenceFormContext(
  issue: FeasibilityIssueDto,
  option?: FeasibilityRepairOptionDto,
): ReservationEvidenceFormContext | null {
  const hints = issue.uiHints?.reservationEvidenceForm;
  const evaluation = issue.visitorAccess?.evaluation ?? issue.accessEvaluation;
  const tripItemId =
    hints?.tripItemId ??
    (option?.payload?.itemId as string | undefined) ??
    resolvePoiAccessTripItemId(issue, evaluation);

  if (!tripItemId) return null;

  const poiId =
    hints?.poiId ??
    evaluation?.poiId ??
    (option?.payload?.poiId as string | undefined) ??
    (option?.metadata?.poiId as string | undefined);

  if (!poiId?.trim()) return null;

  const targetResource = mapTargetResource(
    hints?.resource ??
      (option?.payload?.resource as string | undefined) ??
      evaluation?.bottleneckResource,
  );

  const dateISO = hints?.dateISO;
  const plannedArrival = hints?.plannedArrival;
  const plannedArrivalAt =
    hints?.plannedArrivalAt ??
    (dateISO && plannedArrival ? `${dateISO}T${plannedArrival}:00` : dateISO) ??
    evaluation?.plannedArrivalAt;

  return {
    tripItemId,
    poiId: poiId.trim(),
    targetResource,
    dateISO,
    plannedArrival,
    plannedArrivalAt,
    issueId: issue.id,
    repairOptionId: option?.id,
    poiName: evaluation?.poiName ?? issue.title,
  };
}

export function findReservationEvidenceManualConfirmOption(
  issue: FeasibilityIssueDto,
): FeasibilityRepairOptionDto | undefined {
  return (issue.repairOptions ?? []).find(
    (opt) => opt.actionType === 'manual_confirm' && shouldOpenReservationEvidenceModal(opt, issue),
  );
}
