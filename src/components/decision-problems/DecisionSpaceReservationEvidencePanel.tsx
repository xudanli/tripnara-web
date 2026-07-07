import ReservationEvidenceForm from '@/components/feasibility-report/ReservationEvidenceForm';
import type { ReservationEvidenceFormContext } from '@/lib/poi-access-reservation-evidence.util';
import { cn } from '@/lib/utils';

export interface DecisionSpaceReservationEvidencePanelProps {
  tripId: string;
  trip?: import('@/types/trip').TripDetail | null;
  context: ReservationEvidenceFormContext;
  className?: string;
  onSaved?: () => void;
}

/** 决策空间 P1 · 内嵌预约凭证上传（无需弹窗） */
export function DecisionSpaceReservationEvidencePanel({
  tripId,
  trip,
  context,
  className,
  onSaved,
}: DecisionSpaceReservationEvidencePanelProps) {
  const poiLabel = context.poiName?.trim() || '该景点';

  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 bg-muted/10 px-3 py-3',
        className,
      )}
    >
      <p className="text-xs font-semibold text-foreground">上传预约凭证</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
        若你已在官网完成 {poiLabel} 的预订，填写确认号即可清除阻断（无需单独 apply-repair）。
      </p>
      <ReservationEvidenceForm
        className="mt-3"
        tripId={tripId}
        trip={trip}
        context={context}
        onSaved={onSaved}
      />
    </div>
  );
}
