import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';
import { ArrangeItineraryEntryDetailPanel } from './ArrangeItineraryEntryDetailPanel';

export interface ArrangeItineraryEntryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  trip: TripDetail | null;
  itineraryByDay: Map<string, ItineraryItemDetail[]>;
  onEdit?: (itemId: string) => void;
  onDelete?: (itemId: string) => void;
  onAskNara?: (item: ItineraryItemDetail, question: string) => void;
  onOpenFullSchedule?: (dayIndex: number) => void;
}

export function ArrangeItineraryEntryDetailDialog({
  open,
  onOpenChange,
  itemId,
  trip,
  itineraryByDay,
  onEdit,
  onDelete,
  onAskNara,
  onOpenFullSchedule,
}: ArrangeItineraryEntryDetailDialogProps) {
  return (
    <Dialog open={open && itemId != null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,760px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        {itemId ? (
          <ArrangeItineraryEntryDetailPanel
            className="min-h-0 flex-1"
            trip={trip}
            itemId={itemId}
            itineraryByDay={itineraryByDay}
            onEdit={onEdit}
            onDelete={onDelete}
            onAskNara={onAskNara}
            onOpenFullSchedule={onOpenFullSchedule}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
