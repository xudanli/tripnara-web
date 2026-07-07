import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatActivePacksSummary } from '@/lib/unified-decision-active-packs.util';
import type { UnifiedDecisionActivePacks } from '@/generated/unified-decision-contracts';

export interface DecisionCenterActivePacksStripProps {
  activePacks?: UnifiedDecisionActivePacks | null;
  className?: string;
  compact?: boolean;
}

/** activePacks Debug/Ops 展示 — 不用于路由逻辑 */
export function DecisionCenterActivePacksStrip({
  activePacks,
  className,
  compact = false,
}: DecisionCenterActivePacksStripProps) {
  const summary = formatActivePacksSummary(activePacks);
  if (!summary) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 text-muted-foreground',
        compact ? 'text-[10px]' : 'text-[10px]',
        className,
      )}
    >
      <span className="shrink-0 font-medium">Packs</span>
      {summary.split(' · ').map((packId) => (
        <Badge
          key={packId}
          variant="outline"
          className={cn(
            'font-normal',
            compact ? 'h-5 px-2 text-[10px]' : 'h-5 px-2 text-[9px]',
            packId.startsWith('destination.') ? 'border-border text-muted-foreground' : undefined,
          )}
        >
          {packId}
        </Badge>
      ))}
    </div>
  );
}
