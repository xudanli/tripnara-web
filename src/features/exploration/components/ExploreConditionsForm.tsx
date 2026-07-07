import { MapPin, Calendar, Users, Wallet, Truck, Shield, KeyRound, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  ConditionsCatalogInsuranceTier,
  ConditionsCatalogVehicleType,
} from '../api/types';
import type {
  ConditionsFormFieldErrors,
  ExplorationConditionsFormState,
} from '../conditions-form.util';
import { INSURANCE_TIER_OPTIONS, VEHICLE_TYPE_OPTIONS } from '../conditions-form.util';
import { cn } from '@/lib/utils';

interface ExploreConditionsFormProps {
  value: ExplorationConditionsFormState;
  onChange: (next: ExplorationConditionsFormState) => void;
  disabled?: boolean;
  lockedFields?: string[];
  vehicleOptions?: ConditionsCatalogVehicleType[];
  insuranceOptions?: ConditionsCatalogInsuranceTier[];
  errors?: ConditionsFormFieldErrors;
}

function isLocked(lockedFields: string[] | undefined, field: string): boolean {
  return lockedFields?.includes(field) ?? false;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] text-destructive leading-snug">{message}</p>;
}

export function ExploreConditionsForm({
  value,
  onChange,
  disabled,
  lockedFields,
  vehicleOptions = VEHICLE_TYPE_OPTIONS,
  insuranceOptions = INSURANCE_TIER_OPTIONS,
  errors,
}: ExploreConditionsFormProps) {
  const patch = (partial: Partial<ExplorationConditionsFormState>) =>
    onChange({ ...value, ...partial });

  const fieldDisabled = (field: string) => disabled || isLocked(lockedFields, field);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          目的地
        </Label>
        <Select
          value={value.destinationCode}
          onValueChange={(v) => patch({ destinationCode: v })}
          disabled={fieldDisabled('destinationCodes')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="IS">冰岛</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          出发日期
        </Label>
        <Input
          type="date"
          value={value.startDate}
          onChange={(e) => patch({ startDate: e.target.value })}
          disabled={fieldDisabled('dateRange')}
          aria-invalid={Boolean(errors?.startDate)}
          className={cn(errors?.startDate && 'border-destructive')}
        />
        <FieldError message={errors?.startDate} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          返回日期
        </Label>
        <Input
          type="date"
          value={value.endDate}
          onChange={(e) => patch({ endDate: e.target.value })}
          disabled={fieldDisabled('dateRange')}
          aria-invalid={Boolean(errors?.endDate)}
          className={cn(errors?.endDate && 'border-destructive')}
        />
        <FieldError message={errors?.endDate} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          成人人数
        </Label>
        <Input
          type="number"
          min={1}
          max={8}
          value={value.adultCount}
          onChange={(e) => patch({ adultCount: Number(e.target.value) || 1 })}
          disabled={fieldDisabled('travelers')}
          aria-invalid={Boolean(errors?.adultCount)}
          className={cn(errors?.adultCount && 'border-destructive')}
        />
        <FieldError message={errors?.adultCount} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          预算下限 ({value.currency})
        </Label>
        <Input
          type="number"
          min={0}
          value={value.budgetMin}
          onChange={(e) => patch({ budgetMin: Number(e.target.value) })}
          disabled={fieldDisabled('budget')}
          aria-invalid={Boolean(errors?.budgetMin)}
          className={cn(errors?.budgetMin && 'border-destructive')}
        />
        <FieldError message={errors?.budgetMin} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          预算上限 ({value.currency})
        </Label>
        <Input
          type="number"
          min={0}
          value={value.budgetMax}
          onChange={(e) => patch({ budgetMax: Number(e.target.value) })}
          disabled={fieldDisabled('budget')}
          aria-invalid={Boolean(errors?.budgetMax)}
          className={cn(errors?.budgetMax && 'border-destructive')}
        />
        <FieldError message={errors?.budgetMax} />
      </div>

      <div className={cn('space-y-2 sm:col-span-2')}>
        <Label className="text-xs flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5" />
          车辆类型
        </Label>
        <Select
          value={value.vehicleType}
          onValueChange={(v) =>
            patch({ vehicleType: v as ExplorationConditionsFormState['vehicleType'] })
          }
          disabled={fieldDisabled('mobilityContext')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {vehicleOptions.map((opt) => (
              <SelectItem key={opt.code} value={opt.code}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          保险档位
        </Label>
        <Select
          value={value.insuranceCoverageTier}
          onValueChange={(v) =>
            patch({
              insuranceCoverageTier:
                v as ExplorationConditionsFormState['insuranceCoverageTier'],
            })
          }
          disabled={fieldDisabled('insuranceContext')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {insuranceOptions.map((opt) => (
              <SelectItem key={opt.code} value={opt.code}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5" />
          取车地点
        </Label>
        <Input
          value={value.rentalPickupLocation}
          onChange={(e) => patch({ rentalPickupLocation: e.target.value })}
          placeholder="KEF"
          disabled={fieldDisabled('rentalContext')}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          首日取车时间
        </Label>
        <Input
          type="time"
          value={value.rentalPickupTimeLocal}
          onChange={(e) => patch({ rentalPickupTimeLocal: e.target.value })}
          disabled={fieldDisabled('rentalContext')}
        />
      </div>

      <div className={cn('flex items-center gap-2 sm:col-span-2')}>
        <Checkbox
          id="after-hours-pickup"
          checked={value.afterHoursPickupConfirmed}
          onCheckedChange={(checked) =>
            patch({ afterHoursPickupConfirmed: checked === true })
          }
          disabled={fieldDisabled('rentalContext')}
        />
        <Label htmlFor="after-hours-pickup" className="text-xs font-normal cursor-pointer">
          已确认非营业时间取车
        </Label>
      </div>
    </div>
  );
}
