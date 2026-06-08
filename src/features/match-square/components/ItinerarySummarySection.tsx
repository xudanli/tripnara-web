import { cn } from '@/lib/utils';
import { ITINERARY_SUMMARY_MAX } from '../lib/constants';
import {
  isLikelyTruncatedItinerary,
  parseItinerarySummary,
} from '../lib/parse-itinerary-summary';

interface ItinerarySummarySectionProps {
  summary: string;
  className?: string;
}

export function ItinerarySummarySection({ summary, className }: ItinerarySummarySectionProps) {
  const { intro, days } = parseItinerarySummary(summary);
  const truncated = isLikelyTruncatedItinerary(summary, ITINERARY_SUMMARY_MAX);

  return (
    <div className={cn('space-y-4', className)}>
      {truncated && (
        <p className="rounded-lg border border-[var(--gate-confirm-border)] bg-[var(--gate-confirm)] px-3 py-2 text-xs leading-relaxed text-[var(--gate-confirm-foreground)]">
          行程概述已达 {ITINERARY_SUMMARY_MAX} 字上限，以下内容可能不完整。发布新招募时可精简概述，或等待后续版本支持更长行程描述。
        </p>
      )}

      {intro && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{intro}</p>
      )}

      {days.length > 0 ? (
        <ol className="space-y-3">
          {days.map((day) => (
            <li
              key={day.day}
              className="rounded-lg border border-border bg-muted/20 px-4 py-3"
            >
              <p className="text-sm font-medium text-foreground">{day.title}</p>
              {day.body && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {day.body}
                </p>
              )}
            </li>
          ))}
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
