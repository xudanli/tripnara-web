import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ITINERARY_SPECIAL_DISPLAY_ROLE_OPTIONS,
  type ItinerarySpecialDisplayRole,
} from '@/lib/itinerary-special-display';

interface ItinerarySpecialDisplayRoleFieldProps {
  value: ItinerarySpecialDisplayRole;
  onChange: (role: ItinerarySpecialDisplayRole) => void;
  disabled?: boolean;
}

export function ItinerarySpecialDisplayRoleField({
  value,
  onChange,
  disabled,
}: ItinerarySpecialDisplayRoleFieldProps) {
  const current = ITINERARY_SPECIAL_DISPLAY_ROLE_OPTIONS.find((o) => o.value === value);

  return (
    <div className="space-y-2">
      <Label>特殊展示类型</Label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as ItinerarySpecialDisplayRole)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="选择展示类型" />
        </SelectTrigger>
        <SelectContent>
          {ITINERARY_SPECIAL_DISPLAY_ROLE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {current ? (
        <p className="text-xs text-muted-foreground">{current.description}</p>
      ) : null}
    </div>
  );
}
