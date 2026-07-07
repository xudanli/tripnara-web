import type { DecisionAction } from '@/types/unified-decision';
import type { DecisionProblemDetail, DecisionProblemSummary } from '@/types/decision-problem';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';
import { resolveConflictForDecisionProblem } from '@/lib/planning-conflicts-decision.util';
import {
  findReservationEvidenceManualConfirmOption,
  resolveReservationEvidenceFormContext,
  type ReservationEvidenceFormContext,
} from '@/lib/poi-access-reservation-evidence.util';
import type { TripDetail } from '@/types/trip';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';

/** 选中「上传凭证 / 我已预订」类 action */
export function isReservationEvidenceUploadAction(action: DecisionAction): boolean {
  const blob = [
    action.actionId,
    action.kind,
    action.label,
    action.title,
    action.summary,
    action.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();

  return (
    /UPLOAD|EVIDENCE|ATTACH|CREDENTIAL|MANUAL_CONFIRM|已有.*预订|上传凭证|I.?HAVE.?BOOKED|CONFIRM.*BOOK/.test(
      blob,
    ) || action.kind === 'manual_confirm' || action.kind === 'upload_evidence'
  );
}

function poiNameFromProblem(
  problem?: DecisionProblemSummary | null,
  detail?: DecisionProblemDetail | GatewayDecisionProblemDetailResult | null,
  conflict?: PlanningConflictItem | null,
): string | undefined {
  const title =
    conflict?.issue?.title ??
    problem?.title ??
    detail?.title ??
    conflict?.title ??
    '';
  const cleaned = title
    .replace(/^第\s*\d+\s*天\s*[·・:：\-—]?\s*/u, '')
    .replace(/[:：].*$/, '')
    .replace(/需要预约|需预约|需要预订/g, '')
    .trim();
  return cleaned || undefined;
}

function findTripItemByPoiName(
  trip: TripDetail | null | undefined,
  poiName: string,
  dayNumbers?: number[],
): { tripItemId: string; poiId: string; dateISO?: string; plannedArrival?: string } | null {
  if (!trip?.TripDay?.length) return null;
  const needle = poiName.toLowerCase();
  const dayFilter = dayNumbers?.length ? new Set(dayNumbers) : null;

  for (const day of trip.TripDay) {
    const dayIndex = trip.TripDay.indexOf(day) + 1;
    if (dayFilter && !dayFilter.has(dayIndex)) continue;

    for (const item of day.ItineraryItem ?? []) {
      const name = (item.placeName ?? item.Place?.nameCN ?? '').toLowerCase();
      if (!name || (!name.includes(needle) && !needle.includes(name))) continue;

      const poiId =
        item.placeId != null
          ? String(item.placeId)
          : item.Place?.id != null
            ? String(item.Place.id)
            : undefined;
      if (!poiId) continue;

      return {
        tripItemId: item.id,
        poiId,
        dateISO: day.date?.slice(0, 10),
        plannedArrival: item.startTime?.slice(0, 5),
      };
    }
  }
  return null;
}

function contextFromIssue(issue: FeasibilityIssueDto): ReservationEvidenceFormContext | null {
  const manual = findReservationEvidenceManualConfirmOption(issue);
  return resolveReservationEvidenceFormContext(issue, manual);
}

/** 决策空间 · 内嵌预约凭证表单上下文 */
export function resolveDecisionSpaceReservationEvidenceContext(input: {
  trip?: TripDetail | null;
  problem?: DecisionProblemSummary | null;
  detail?: DecisionProblemDetail | GatewayDecisionProblemDetailResult | null;
  conflict?: PlanningConflictItem | null;
  conflicts?: PlanningConflictItem[];
}): ReservationEvidenceFormContext | null {
  const linkedConflict =
    input.conflict ??
    (input.problem && input.conflicts?.length
      ? resolveConflictForDecisionProblem(input.problem, input.conflicts)
      : undefined);

  if (linkedConflict?.issue?.issueKind?.startsWith('poi_access_')) {
    const fromIssue = contextFromIssue(linkedConflict.issue);
    if (fromIssue) return fromIssue;
  }

  const poiName = poiNameFromProblem(input.problem, input.detail, linkedConflict);
  const fromTrip = poiName
    ? findTripItemByPoiName(
        input.trip,
        poiName,
        input.problem?.affectedDayNumbers ?? linkedConflict?.affectedDays,
      )
    : null;

  if (fromTrip && poiName) {
    return {
      tripItemId: fromTrip.tripItemId,
      poiId: fromTrip.poiId,
      targetResource: 'TIMED_ENTRY',
      dateISO: fromTrip.dateISO,
      plannedArrival: fromTrip.plannedArrival,
      issueId: linkedConflict?.issue?.id,
      poiName,
    };
  }

  return null;
}

export function shouldShowDecisionSpaceReservationEvidence(input: {
  templateSupports: boolean;
  selectedAction?: DecisionAction | null;
}): boolean {
  if (!input.templateSupports) return false;
  if (!input.selectedAction) return true;
  return isReservationEvidenceUploadAction(input.selectedAction);
}
