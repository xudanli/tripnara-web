import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWishCategories } from '@/hooks/useWishCategories';
import type { WishCategory } from '@/types/trip-wishes';
import { cn } from '@/lib/utils';
import { wishLabel } from './wishlist-ui';

interface WishCategorySelectProps {
  tripId: string;
  value: WishCategory;
  onChange: (value: WishCategory) => void;
  label?: string;
  disabled?: boolean;
  compact?: boolean;
}

export function WishCategorySelect({
  tripId,
  value,
  onChange,
  label = '所属领域',
  disabled,
  compact = false,
}: WishCategorySelectProps) {
  const { categories } = useWishCategories(tripId);

  return (
    <div className={cn(compact ? 'space-y-1' : 'space-y-2')}>
      <Label className={wishLabel}>{label}</Label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as WishCategory)}
        disabled={disabled}
      >
        <SelectTrigger className={cn(compact && 'h-8 text-xs')}>
          <SelectValue placeholder="选择领域" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
