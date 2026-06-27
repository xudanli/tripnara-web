import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PlanningConstraintDialogShell } from '@/components/plan-studio/PlanningConstraintDialogShell';
import {
  PLANNING_CONSTRAINT_EDIT_META,
  saveConstraintTimeRange,
} from '@/lib/planning-constraint-edit-meta';
import { cn } from '@/lib/utils';
import type { TripDetail } from '@/types/trip';

export interface PlanningTimeRangeConstraintsDialogProps {
  trip: TripDetail | null;
  tripId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void | Promise<void>;
}

export function PlanningTimeRangeConstraintsDialog({
  trip,
  tripId,
  open,
  onOpenChange,
  onSaved,
}: PlanningTimeRangeConstraintsDialogProps) {
  const meta = PLANNING_CONSTRAINT_EDIT_META.time_range;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  useEffect(() => {
    if (!open || !trip) return;
    setStartDate(trip.startDate ? new Date(trip.startDate) : undefined);
    setEndDate(trip.endDate ? new Date(trip.endDate) : undefined);
    setError(null);
  }, [open, trip]);

  const handleSave = async () => {
    if (!tripId || !trip || !startDate || !endDate) {
      setError('请选择开始与结束日期');
      return;
    }
    if (endDate < startDate) {
      setError('结束日期不能早于开始日期');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveConstraintTimeRange(
        tripId,
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd'),
        trip.name,
      );
      toast.success('时间范围已更新');
      await onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PlanningConstraintDialogShell
      open={open}
      onOpenChange={onOpenChange}
      meta={meta}
      flexKey="time_range"
      tripId={tripId}
      saving={saving}
      saveDisabled={!tripId || !trip}
      onSave={handleSave}
    >
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="constraint-start-date">出发日期</Label>
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger asChild>
              <Button
                id="constraint-start-date"
                variant="outline"
                data-empty={!startDate}
                className={cn(
                  'w-full justify-start text-left font-normal h-10',
                  'data-[empty=true]:text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'yyyy年M月d日', { locale: zhCN }) : '选择出发日期'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  setStartDate(date);
                  setStartOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="constraint-end-date">返程日期</Label>
          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger asChild>
              <Button
                id="constraint-end-date"
                variant="outline"
                data-empty={!endDate}
                className={cn(
                  'w-full justify-start text-left font-normal h-10',
                  'data-[empty=true]:text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'yyyy年M月d日', { locale: zhCN }) : '选择返程日期'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => {
                  setEndDate(date);
                  setEndOpen(false);
                }}
                disabled={(date) => (startDate ? date < startDate : false)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </PlanningConstraintDialogShell>
  );
}
