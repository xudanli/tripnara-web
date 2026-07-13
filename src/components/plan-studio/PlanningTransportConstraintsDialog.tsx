import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlanningConstraintDialogShell } from '@/components/plan-studio/PlanningConstraintDialogShell';
import {
  PLANNING_CONSTRAINT_EDIT_META,
  isSelfDriveOnlyTransportContext,
  resolveConstraintTransportDefault,
  resolveConstraintTransportOptions,
  saveConstraintTransport,
  type ConstraintTransportValue,
} from '@/lib/planning-constraint-edit-meta';
import { IntentTravelMode } from '@/types/trip';
import type { TripDetail } from '@/types/trip';

export interface PlanningTransportConstraintsDialogProps {
  trip: TripDetail | null;
  tripId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void | Promise<void>;
}

export function PlanningTransportConstraintsDialog({
  trip,
  tripId,
  open,
  onOpenChange,
  onSaved,
}: PlanningTransportConstraintsDialogProps) {
  const meta = PLANNING_CONSTRAINT_EDIT_META.transport;
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<ConstraintTransportValue | ''>('');

  useEffect(() => {
    if (!open) return;
    setMode(resolveConstraintTransportDefault(trip));
  }, [open, trip]);

  const selfDriveOnly = isSelfDriveOnlyTransportContext(trip?.destination);
  const transportOptions = resolveConstraintTransportOptions({ destination: trip?.destination });

  const handleSave = async () => {
    if (!tripId || !trip) {
      toast.error('行程数据未加载');
      return;
    }
    const effectiveMode = selfDriveOnly ? IntentTravelMode.DRIVING : mode;
    if (!effectiveMode) {
      toast.error('请选择基础交通方式');
      return;
    }

    setSaving(true);
    try {
      await saveConstraintTransport(tripId, trip, effectiveMode);
      toast.success('基础交通已更新');
      await onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PlanningConstraintDialogShell
      open={open}
      onOpenChange={onOpenChange}
      meta={meta}
      flexKey="transport"
      tripId={tripId}
      saving={saving}
      saveDisabled={!tripId || !trip || (!selfDriveOnly && !mode)}
      onSave={handleSave}
    >
      <div className="space-y-2">
        <Label htmlFor="constraint-transport-mode">基础交通方式</Label>
        {selfDriveOnly ? (
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
            <p className="text-sm font-medium text-foreground">自驾</p>
            <p className="mt-1 text-xs text-muted-foreground">
              冰岛行程当前仅支持自驾模式。
            </p>
          </div>
        ) : (
          <Select
            value={mode || undefined}
            onValueChange={(value) => setMode(value as ConstraintTransportValue)}
          >
            <SelectTrigger id="constraint-transport-mode" className="h-10">
              <SelectValue placeholder="选择出行方式" />
            </SelectTrigger>
            <SelectContent>
              {transportOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground">
          保存后系统将按此方式评估路线与时间轴交通段是否一致。
        </p>
      </div>
    </PlanningConstraintDialogShell>
  );
}
