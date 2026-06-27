import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ReservationEvidenceForm from '@/components/feasibility-report/ReservationEvidenceForm';
import type { ReservationEvidenceFormContext } from '@/lib/poi-access-reservation-evidence.util';
import type { TripDetail } from '@/types/trip';

export interface ReservationEvidenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  trip?: TripDetail | null;
  context: ReservationEvidenceFormContext | null;
  onSaved?: () => void;
}

export default function ReservationEvidenceDialog({
  open,
  onOpenChange,
  tripId,
  trip,
  context,
  onSaved,
}: ReservationEvidenceDialogProps) {
  return (
    <Dialog open={open && Boolean(context)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>上传预约凭证</DialogTitle>
          <DialogDescription>
            {context?.poiName
              ? `${context.poiName} · 填写 Parka 等官方确认号`
              : '填写官方预约确认号以解除准入待办'}
          </DialogDescription>
        </DialogHeader>
        {context ? (
          <ReservationEvidenceForm
            tripId={tripId}
            trip={trip}
            context={context}
            onSaved={() => {
              onOpenChange(false);
              onSaved?.();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
