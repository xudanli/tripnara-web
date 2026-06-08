import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ITINERARY_SUMMARY_MAX } from '../lib/constants';
import {
  extractDayRouteCapsule,
  isLikelyTruncatedItinerary,
  parseItinerarySummary,
} from '../lib/parse-itinerary-summary';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ItineraryTimelineSectionProps {
  summary: string;
  className?: string;
}

/** 详情页行程 — 时间轴胶囊 + 折叠攻略正文 */
export function ItineraryTimelineSection({ summary, className }: ItineraryTimelineSectionProps) {
  const { intro, days } = parseItinerarySummary(summary);
  const truncated = isLikelyTruncatedItinerary(summary, ITINERARY_SUMMARY_MAX);

  return (
    <div className={cn('space-y-4', className)}>
      {truncated && (
        <p className="rounded-lg border border-[var(--gate-confirm-border)] bg-[var(--gate-confirm)] px-3 py-2 text-xs leading-relaxed text-[var(--gate-confirm-foreground)]">
          行程概述可能未完整保存，以下展示已有内容。
        </p>
      )}

      {intro && (
        <p className="text-sm leading-relaxed text-muted-foreground">{intro}</p>
      )}

      {days.length > 0 ? (
        <ol className="relative space-y-0 border-l border-border pl-4">
          {days.map((day, index) => {
            const { route, meta } = extractDayRouteCapsule(day.title);
            const defaultOpen = index === 0;

            return (
              <li key={day.day} className="relative pb-4 last:pb-0">
                <span
                  className="absolute -left-[calc(1rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-foreground/70"
                  aria-hidden
                />
                <Collapsible defaultOpen={defaultOpen}>
                  <div className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
                    <CollapsibleTrigger className="group flex w-full items-start justify-between gap-2 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Day {day.day}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-foreground">{route}</p>
                        {meta && (
                          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                            {meta}
                          </p>
                        )}
                      </div>
                      {day.body && (
                        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      )}
                    </CollapsibleTrigger>
                    {day.body && (
                      <CollapsibleContent>
                        <p className="mt-3 border-t border-border pt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                          {day.body}
                        </p>
                      </CollapsibleContent>
                    )}
                  </div>
                </Collapsible>
              </li>
            );
          })}
        </ol>
      ) : (
        !intro && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {summary}
          </p>
        )
      )}
    </div>
  );
}
