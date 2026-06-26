import { Eye, EyeOff, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WishVisibility } from '@/lib/wishlist-model';
import { WISH_VISIBILITY_HINTS, WISH_VISIBILITY_LABELS } from '@/lib/wishlist-model';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { wishSegmentList } from './wishlist-ui';

const OPTIONS: WishVisibility[] = ['private', 'anonymous', 'signed'];

const ICONS = {
  private: EyeOff,
  anonymous: Eye,
  signed: User,
} as const;

interface WishVisibilityToggleProps {
  value: WishVisibility;
  onChange: (value: WishVisibility) => void;
  compact?: boolean;
  className?: string;
}

export function WishVisibilityToggle({
  value,
  onChange,
  compact = false,
  className,
}: WishVisibilityToggleProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(wishSegmentList, compact ? 'text-[10px]' : 'text-xs', className)}
        role="radiogroup"
        aria-label="可见范围"
      >
        {OPTIONS.map((option) => {
          const Icon = ICONS[option];
          const selected = value === option;
          return (
            <Tooltip key={option}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(option)}
                  className={cn(
                    'flex items-center gap-1 rounded-sm px-2.5 py-1 font-medium transition-colors',
                    compact && 'px-2 py-0.5',
                    selected
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
                  {!compact ? WISH_VISIBILITY_LABELS[option] : null}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px] text-xs">
                {WISH_VISIBILITY_HINTS[option]}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
