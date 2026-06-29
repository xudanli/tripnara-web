import { Eye, EyeOff, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WishVisibility } from '@/lib/wishlist-model';
import { WISH_VISIBILITY_HINTS, WISH_VISIBILITY_LABELS } from '@/lib/wishlist-model';

const OPTIONS: WishVisibility[] = ['private', 'anonymous', 'signed'];

const CARD_META = {
  private: { Icon: EyeOff, hint: '仅自己可见' },
  anonymous: { Icon: Eye, hint: '团队可见，身份隐藏' },
  signed: { Icon: User, hint: '团队可见，显示署名' },
} as const;

interface WishVisibilityCardsProps {
  value: WishVisibility;
  onChange: (value: WishVisibility) => void;
  disabled?: boolean;
  className?: string;
}

/** 协作中心心愿表单：三卡片可见模式选择 */
export function WishVisibilityCards({
  value,
  onChange,
  disabled,
  className,
}: WishVisibilityCardsProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-2', className)} role="radiogroup" aria-label="可见模式">
      {OPTIONS.map((option) => {
        const { Icon, hint } = CARD_META[option];
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            title={WISH_VISIBILITY_HINTS[option]}
            onClick={() => onChange(option)}
            className={cn(
              'rounded-lg border px-2 py-2.5 text-left transition-colors',
              selected
                ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
                : 'border-border/70 hover:bg-muted/30',
              disabled && 'opacity-60',
            )}
          >
            <Icon className={cn('mb-1.5 h-4 w-4', selected ? 'text-primary' : 'text-muted-foreground')} />
            <p className="text-[11px] font-medium text-foreground">
              {WISH_VISIBILITY_LABELS[option]}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{hint}</p>
          </button>
        );
      })}
    </div>
  );
}
