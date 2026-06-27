import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlanningConstraintDialogShell } from '@/components/plan-studio/PlanningConstraintDialogShell';
import {
  PLANNING_CONSTRAINT_EDIT_META,
  saveConstraintTravelers,
} from '@/lib/planning-constraint-edit-meta';
import { resolveTravelerCount } from '@/lib/planning-constraints.util';
import type { TripDetail } from '@/types/trip';

const PRESET_COUNTS = [1, 2, 3, 4, 6] as const;

export interface PlanningTravelersConstraintsDialogProps {
  trip: TripDetail | null;
  tripId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void | Promise<void>;
  onOpenTeamTab?: () => void;
}

export function PlanningTravelersConstraintsDialog({
  trip,
  tripId,
  open,
  onOpenChange,
  onSaved,
  onOpenTeamTab,
}: PlanningTravelersConstraintsDialogProps) {
  const meta = PLANNING_CONSTRAINT_EDIT_META.travelers;
  const [saving, setSaving] = useState(false);
  const [countInput, setCountInput] = useState('1');

  useEffect(() => {
    if (!open) return;
    const current = trip ? resolveTravelerCount(trip) : 0;
    setCountInput(String(current > 0 ? current : 1));
  }, [open, trip]);

  const parsedCount = Number.parseInt(countInput, 10);
  const countValid = Number.isFinite(parsedCount) && parsedCount >= 1 && parsedCount <= 20;

  const handleSave = async () => {
    if (!tripId || !trip || !countValid) {
      toast.error('请输入 1–20 之间的出行人数');
      return;
    }

    setSaving(true);
    try {
      await saveConstraintTravelers(tripId, trip, parsedCount);
      toast.success('出行人数已更新');
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
      flexKey="travelers"
      tripId={tripId}
      saving={saving}
      saveDisabled={!tripId || !trip || !countValid}
      onSave={handleSave}
      footerExtra={
        onOpenTeamTab ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground"
              onClick={() => {
                onOpenChange(false);
                onOpenTeamTab();
              }}
            >
              邀请同行者 →
            </Button>
          </div>
        ) : null
      }
    >
      <div className="space-y-3">
        <Label htmlFor="constraint-traveler-count">出行人数</Label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COUNTS.map((n) => (
            <Button
              key={n}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 min-w-[2.5rem] text-xs tabular-nums"
              disabled={saving}
              onClick={() => setCountInput(String(n))}
            >
              {n} 人
            </Button>
          ))}
        </div>
        <Input
          id="constraint-traveler-count"
          type="number"
          min={1}
          max={20}
          className="h-9 text-sm tabular-nums"
          value={countInput}
          onChange={(e) => setCountInput(e.target.value)}
        />
        {!countValid && countInput !== '' ? (
          <p className="text-xs text-destructive">请输入 1–20 之间的整数</p>
        ) : (
          <p className="text-xs text-muted-foreground">单人出行选 1 人即可；有协作者时在「同行者」Tab 对齐名单。</p>
        )}
      </div>
    </PlanningConstraintDialogShell>
  );
}
