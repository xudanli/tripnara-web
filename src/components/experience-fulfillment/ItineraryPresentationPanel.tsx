import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ITINERARY_ITEM_BADGE_LABELS,
  loadLevelClasses,
  loadLevelLabel,
} from '@/lib/experience-fulfillment-display.util';
import type {
  ItineraryPresentationBundle,
  PresentedItineraryDay,
  PresentedItineraryItem,
} from '@/types/experience-fulfillment';
import { Car, Footprints, MapPin } from 'lucide-react';
import { CertaintyBadge } from './CertaintyBadge';

function PresentedItemCard({ item }: { item: PresentedItineraryItem }) {
  const { inspiration, credible } = item;
  const credibleLines = [
    credible.driveHint,
    credible.walkHint,
    credible.vehicleHint,
    credible.weatherHint,
    credible.openingHours,
    credible.visitDuration,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-3 py-2.5 space-y-1.5 bg-gradient-to-br from-slate-50 to-white border-b">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{inspiration.placeName}</p>
            {inspiration.poeticLine && (
              <p className="text-sm text-muted-foreground italic mt-0.5">{inspiration.poeticLine}</p>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {item.slot} · {item.startTime}–{item.endTime}
          </span>
        </div>
        {inspiration.experienceTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {inspiration.experienceTags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] h-5">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {credibleLines.map((line, i) => (
          <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
            <MapPin className="h-3 w-3 shrink-0 mt-0.5 opacity-60" aria-hidden />
            {line}
          </p>
        ))}
        <div className="flex flex-wrap gap-1 pt-0.5">
          {item.badges.map((badge) => (
            <Badge key={badge} variant="secondary" className="text-[10px] h-5">
              {ITINERARY_ITEM_BADGE_LABELS[badge] ?? badge}
            </Badge>
          ))}
          {item.certaintyLabel && (
            <Badge variant="outline" className="text-[10px] h-5">
              {item.certaintyLabel}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function DayCard({ day }: { day: PresentedItineraryDay }) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-sm">
            第 {day.day} 天 · {day.theme}
          </CardTitle>
          <CertaintyBadge level={day.certaintyLevel} label={day.certaintyLabel} />
        </div>
        <CardDescription className="text-xs space-y-1">
          <span className="block">{day.certaintySummary}</span>
          {day.coreExperience && (
            <span className="block font-medium text-foreground/80">{day.coreExperience}</span>
          )}
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline" className={cn('text-[10px]', loadLevelClasses(day.driveLoad))}>
            <Car className="h-3 w-3 mr-1" aria-hidden />
            驾驶 {loadLevelLabel(day.driveLoad)}
          </Badge>
          <Badge variant="outline" className={cn('text-[10px]', loadLevelClasses(day.walkLoad))}>
            <Footprints className="h-3 w-3 mr-1" aria-hidden />
            步行 {loadLevelLabel(day.walkLoad)}
          </Badge>
          {day.budgetHint && (
            <Badge variant="outline" className="text-[10px]">
              {day.budgetHint}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {day.items.map((item, i) => (
          <PresentedItemCard key={`${item.placeId}-${item.slot}-${i}`} item={item} />
        ))}
      </CardContent>
    </Card>
  );
}

interface ItineraryPresentationPanelProps {
  presentation: ItineraryPresentationBundle;
  className?: string;
}

export function ItineraryPresentationPanel({
  presentation,
  className,
}: ItineraryPresentationPanelProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <CertaintyBadge
          level={presentation.overallCertaintyLevel}
          label={presentation.overallCertaintyLabel}
        />
        <p className="text-sm text-muted-foreground">{presentation.overallSummary}</p>
      </div>
      {presentation.days.map((day) => (
        <DayCard key={day.day} day={day} />
      ))}
    </div>
  );
}
