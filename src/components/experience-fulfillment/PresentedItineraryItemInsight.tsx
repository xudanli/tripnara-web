import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ITINERARY_ITEM_BADGE_LABELS } from '@/lib/experience-fulfillment-display.util';
import type { PresentedItineraryItem } from '@/types/experience-fulfillment';
import { MapPin, Sparkles } from 'lucide-react';

interface PresentedItineraryItemInsightProps {
  presentation: PresentedItineraryItem;
  className?: string;
  /** 嵌入行程行内时使用紧凑布局 */
  compact?: boolean;
}

export function PresentedItineraryItemInsight({
  presentation,
  className,
  compact = true,
}: PresentedItineraryItemInsightProps) {
  const { inspiration, credible } = presentation;
  const credibleLines = [
    credible.driveHint,
    credible.walkHint,
    credible.vehicleHint,
    credible.weatherHint,
    credible.openingHours,
    credible.visitDuration,
  ].filter(Boolean) as string[];

  const hasInspiration =
    Boolean(inspiration.poeticLine?.trim()) || inspiration.experienceTags.length > 0;
  const hasCredible = credibleLines.length > 0;
  const hasBadges = presentation.badges.length > 0 || Boolean(presentation.certaintyLabel);

  if (!hasInspiration && !hasCredible && !hasBadges) return null;

  return (
    <div
      className={cn(
        'rounded-md border overflow-hidden',
        compact ? 'mt-2 text-xs' : 'mt-3 text-sm',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {hasInspiration && (
        <div className="px-2.5 py-2 bg-gradient-to-br from-slate-50/90 to-muted/15/40 border-b border-slate-100">
          <div className="flex items-start gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0 space-y-1">
              {inspiration.poeticLine?.trim() && (
                <p className="text-muted-foreground italic leading-snug">{inspiration.poeticLine}</p>
              )}
              {inspiration.experienceTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {inspiration.experienceTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] h-5 font-normal">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(hasCredible || hasBadges) && (
        <div className="px-2.5 py-2 bg-white/80 space-y-1.5">
          {credibleLines.map((line, i) => (
            <p key={i} className="text-muted-foreground flex items-start gap-1.5 leading-snug">
              <MapPin className="h-3 w-3 shrink-0 mt-0.5 opacity-50" aria-hidden />
              <span>{line}</span>
            </p>
          ))}
          <div className="flex flex-wrap gap-1 pt-0.5">
            {presentation.badges.map((badge) => (
              <Badge key={badge} variant="secondary" className="text-[10px] h-5 font-normal">
                {ITINERARY_ITEM_BADGE_LABELS[badge] ?? badge}
              </Badge>
            ))}
            {presentation.certaintyLabel && (
              <Badge variant="outline" className="text-[10px] h-5 font-normal">
                {presentation.certaintyLabel}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
