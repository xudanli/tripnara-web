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
  compact?: boolean;
}

/** 协作中心心愿表单：三卡片可见模式选择 */
export function WishVisibilityCards({
  value,
  onChange,
  disabled,
  className,
  compact = false,
}: WishVisibilityCardsProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-1.5', className)} role="radiogroup" aria-label="可见模式">
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
              'rounded-lg border text-left transition-colors',
              compact ? 'px-1.5 py-1.5' : 'px-2 py-2.5',
              selected
                ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
                : 'border-border/70 hover:bg-muted/30',
              disabled && 'opacity-60',
            )}
          >
            <Icon
              className={cn(
                compact ? 'mb-0.5 h-3.5 w-3.5' : 'mb-1.5 h-4 w-4',
                selected ? 'text-primary' : 'text-muted-foreground',
              )}
            />
            <p className={cn('font-medium text-foreground', compact ? 'text-[10px]' : 'text-[11px]')}>
              {WISH_VISIBILITY_LABELS[option]}
            </p>
            {!compact ? (
              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{hint}</p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
