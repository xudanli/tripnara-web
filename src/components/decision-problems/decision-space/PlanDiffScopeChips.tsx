import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlanDiffImpactTagTone, PlanDiffScopeChip } from '@/lib/decision-space-plan-diff-view.util';

const CHIP_CLASS: Record<PlanDiffImpactTagTone, string> = {
  good: 'border-gate-allow-border/60 bg-gate-allow/10 text-gate-allow-foreground',
  caution: 'border-gate-confirm-border/60 bg-gate-confirm/10 text-gate-confirm-foreground',
  risk: 'border-gate-reject-border/60 bg-gate-reject/10 text-gate-reject-foreground',
  muted: 'border-border/60 bg-muted/10 text-muted-foreground',
  neutral: 'border-border/60 bg-muted/10 text-muted-foreground',
};

export function PlanDiffScopeChips({
  chips,
  compact = false,
}: {
  chips: PlanDiffScopeChip[];
  compact?: boolean;
}) {
  if (!chips.length) return null;

  return (
    <ul className={cn('flex flex-wrap', compact ? 'gap-1' : 'gap-1.5')}>
      {chips.map((chip) => (
        <li
          key={chip.id}
          className={cn(
            'rounded-full border',
            compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]',
            CHIP_CLASS[chip.tone],
          )}
        >
          {chip.label}
        </li>
      ))}
    </ul>
  );
}

export function PlanDiffUnchangedList({
  items,
  compact = false,
}: {
  items: string[];
  compact?: boolean;
}) {
  if (!items.length) return null;

  return (
    <ul className={compact ? 'space-y-0.5' : 'space-y-1.5'}>
      {items.map((item) => (
        <li
          key={item}
          className={cn(
            'flex items-start gap-1.5 text-foreground',
            compact ? 'text-[10px] leading-snug' : 'text-[11px]',
          )}
        >
          <Check
            className={cn(
              'shrink-0 text-gate-allow-foreground',
              compact ? 'mt-px h-3 w-3' : 'mt-0.5 h-3.5 w-3.5',
            )}
            aria-hidden
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
