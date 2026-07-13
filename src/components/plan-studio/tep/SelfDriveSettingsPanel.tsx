import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { tripExecutabilityApi } from '@/api/trip-executability';
import {
  buildSelfDriveMetadataPatch,
  DRIVER_EXPERIENCE_OPTIONS,
  readSelfDriveSettingsFormValues,
  vehicleSourceHint,
  VEHICLE_TYPE_OPTIONS,
  type SelfDriveSettingsFormValues,
} from '@/lib/trip-self-drive-settings.util';
import type { SelfDriveProfile } from '@/types/trip-executability';
import type { TripDetail } from '@/types/trip';
import { cn } from '@/lib/utils';

export interface SelfDriveSettingsPanelProps {
  tripId: string;
  trip?: TripDetail | null;
  profile?: SelfDriveProfile | null;
  constraintsWasConfirmed?: boolean;
  onSaved?: () => void | Promise<void>;
  className?: string;
}

export function SelfDriveSettingsPanel({
  tripId,
  trip,
  profile,
  constraintsWasConfirmed = false,
  onSaved,
  className,
}: SelfDriveSettingsPanelProps) {
  const initial = useMemo(
    () => readSelfDriveSettingsFormValues(trip, profile),
    [trip, profile],
  );
  const [form, setForm] = useState<SelfDriveSettingsFormValues>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const sourceHint = vehicleSourceHint(profile?.vehicle.vehicleSource);

  const handleSave = async () => {
    setSaving(true);
    try {
      await tripExecutabilityApi.saveSelfDriveSettings(
        tripId,
        buildSelfDriveMetadataPatch(form),
      );
      toast.success('自驾设置已保存');
      if (constraintsWasConfirmed) {
        toast.info('约束已变更，请重新确认行程约束');
      }
      await onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className={cn('rounded-xl border border-border/70 bg-card p-3', className)}
      data-testid="self-drive-settings"
    >
      <div className="mb-3 flex items-center gap-2">
        <Car className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-medium text-foreground">自驾执行设置</h3>
      </div>

      {sourceHint ? (
        <p className="mb-3 text-[11px] text-warning-foreground">{sourceHint}</p>
      ) : null}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-[11px]">车型</Label>
          <Select
            value={form.vehicleType}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, vehicleType: value as SelfDriveSettingsFormValues['vehicleType'] }))
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VEHICLE_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-xs">
          <Checkbox
            checked={form.avoidNightDriving}
            onCheckedChange={(checked) =>
              setForm((prev) => ({ ...prev, avoidNightDriving: checked === true }))
            }
          />
          尽量避免夜间驾驶
        </label>

        <div className="space-y-1.5">
          <Label className="text-[11px]">单日驾驶上限（分钟，可选）</Label>
          <Input
            type="number"
            min={60}
            step={30}
            className="h-8 text-xs"
            placeholder="如 480"
            value={form.maxDailyDriveMinutes}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, maxDailyDriveMinutes: e.target.value }))
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px]">驾驶经验</Label>
          <Select
            value={form.driverExperienceLevel}
            onValueChange={(value) =>
              setForm((prev) => ({
                ...prev,
                driverExperienceLevel: value as SelfDriveSettingsFormValues['driverExperienceLevel'],
              }))
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRIVER_EXPERIENCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          size="sm"
          className="h-8 w-full text-xs"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? <Spinner className="mr-1.5 h-3.5 w-3.5" /> : null}
          保存自驾设置
        </Button>
      </div>
    </section>
  );
}
