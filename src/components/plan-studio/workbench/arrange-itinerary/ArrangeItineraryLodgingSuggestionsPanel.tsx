import { BedDouble } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  ArrangeLodgingSuggestion,
  ArrangeLodgingSuggestionCandidate,
  ArrangeLodgingSuggestionsBundle,
} from '@/types/arrange-itinerary';
import {
  workbenchAttractionExploreContextCard,
  workbenchAttractionExploreEmptySurface,
  workbenchAttractionExploreSectionTitle,
  workbenchLinkClass,
  workbenchScrollable,
} from '../workbench-ui';

export interface ArrangeItineraryLodgingSuggestionsPanelProps {
  bundle: ArrangeLodgingSuggestionsBundle;
  onAdoptCandidate?: (
    dayIndexZeroBased: number,
    candidate: ArrangeLodgingSuggestionCandidate,
    night: ArrangeLodgingSuggestion,
  ) => void;
  onAskNaraForNight?: (dayIndexZeroBased: number) => void;
  onFillAllWithAssistant?: () => void;
  adoptPending?: boolean;
  className?: string;
}

export function ArrangeItineraryLodgingSuggestionsPanel({
  bundle,
  onAdoptCandidate,
  onAskNaraForNight,
  onFillAllWithAssistant,
  adoptPending = false,
  className,
}: ArrangeItineraryLodgingSuggestionsPanelProps) {
  const suggestedNights = bundle.suggestions.filter(
    (item) => item.status === 'suggested' && item.candidates.length > 0,
  );

  if (suggestedNights.length === 0) return null;

  const standardLabel = bundle.accommodationStandardLabel ?? '3 星或以上';

  return (
    <section className={cn(workbenchAttractionExploreContextCard, className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={workbenchAttractionExploreSectionTitle}>住宿建议</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            标准：{standardLabel}
            {bundle.source === 'bff' ? ' · BFF 推荐' : ''}
          </p>
        </div>
        <BedDouble className="h-4 w-4 shrink-0 text-gate-warn-foreground" aria-hidden />
      </div>

      <ul className={cn('mt-3 space-y-3', workbenchScrollable)}>
        {suggestedNights.map((night) => (
            <li key={night.dayIndex} className="rounded-lg border border-border/55 bg-card px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-foreground">
                  Day {night.dayNumber ?? night.dayIndex}
                  {night.dateLabel ? ` · ${night.dateLabel}` : ''}
                </p>
                {night.candidates.length === 0 && onAskNaraForNight ? (
                  <button
                    type="button"
                    className={cn(workbenchLinkClass, 'shrink-0 text-[10px]')}
                    onClick={() => onAskNaraForNight((night.dayNumber ?? night.dayIndex) - 1)}
                  >
                    问 Nara
                  </button>
                ) : null}
              </div>
              {night.recommendationReason ? (
                <p className="mt-0.5 text-[10px] text-muted-foreground">{night.recommendationReason}</p>
              ) : null}
              {night.candidates.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {night.candidates.slice(0, 3).map((candidate) => (
                    <li
                      key={candidate.id}
                      className={cn(
                        'rounded-md border px-2 py-1.5',
                        candidate.recommended
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border/50 bg-muted/10',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium text-foreground">
                            {candidate.name}
                            {candidate.recommended ? (
                              <span className="ml-1 text-[9px] font-normal text-primary">推荐</span>
                            ) : null}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {candidate.reason ? (
                              <span>{candidate.reason}</span>
                            ) : (
                              <>
                                {candidate.stars != null ? `${candidate.stars} 星` : null}
                                {candidate.stars != null && candidate.priceTierLabel ? ' · ' : null}
                                {candidate.priceTierLabel}
                              </>
                            )}
                            {candidate.driveMinutesEstimate != null ? (
                              <span className="text-foreground/80">
                                {' '}
                                · 车程约 {candidate.driveMinutesEstimate} 分
                              </span>
                            ) : candidate.nextDayDriveMinutesDelta != null ? (
                              <span
                                className={cn(
                                  candidate.nextDayDriveMinutesDelta <= 0
                                    ? 'text-gate-allow-foreground'
                                    : 'text-gate-warn-foreground',
                                )}
                              >
                                {' '}
                                · 次日车程
                                {candidate.nextDayDriveMinutesDelta <= 0 ? '减少' : '增加'}{' '}
                                {Math.abs(candidate.nextDayDriveMinutesDelta)} 分
                              </span>
                            ) : null}
                          </p>
                        </div>
                        {onAdoptCandidate ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 shrink-0 px-2 text-[10px]"
                            disabled={adoptPending}
                            onClick={() =>
                              onAdoptCandidate(
                                (night.dayNumber ?? night.dayIndex) - 1,
                                candidate,
                                night,
                              )
                            }
                          >
                            采纳
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={cn(workbenchAttractionExploreEmptySurface, 'mt-2 px-2 py-2 text-center text-[10px] text-muted-foreground')}>
                  暂无候选，可让 Nara 推荐
                </p>
              )}
            </li>
          ))}
      </ul>
    </section>
  );
}
