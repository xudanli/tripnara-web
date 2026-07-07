import {
  DaySegmentRowCompact,
  ItineraryItemCard,
} from '@/components/agent/ItineraryItemCard';
import { ItineraryAdjustExperienceEvidencePanel } from '@/components/agent/ItineraryAdjustExperienceEvidencePanel';
import type { ItineraryAdjustDraftPreview } from '@/lib/itinerary-adjust-response';
import { normalizeItineraryItemCard } from '@/lib/agent-itinerary-item-display';
import {
  itineraryAdjustBodyContent,
  itineraryAdjustResultTitle,
  resolveItineraryAdjustScheduleDays,
} from '@/lib/itinerary-adjust-response';
import { cn } from '@/lib/utils';
import { PlanContentStateBadge } from '@/features/trip-context';

export function ItineraryAdjustScheduleDayPreview({
  preview,
  dayDate,
  className,
}: {
  preview: ItineraryAdjustDraftPreview;
  dayDate: string;
  className?: string;
}) {
  const result = preview.adjustResult;
  const scheduleDays = resolveItineraryAdjustScheduleDays({
    timelineDayBlocks: preview.timelineDayBlocks,
    targetDateIso: result?.target_date_iso ?? preview.scopeDateIso,
    includeAllSparseDays: preview.multiDayAppend === true,
  });
  const dayBlock =
    scheduleDays.find((d) => {
      const dDate = d.date?.includes('T') ? d.date.split('T')[0] : d.date;
      const normalized = dayDate.includes('T') ? dayDate.split('T')[0] : dayDate;
      return dDate === normalized;
    }) ?? scheduleDays[0];
  const items = dayBlock?.items ?? [];
  const body = result ? itineraryAdjustBodyContent(result) : null;
  const draftScheduleZh = result?.draft_schedule_zh?.trim();
  const title =
    (result ? itineraryAdjustResultTitle(result) : undefined) ??
    (preview.targetDayNumber != null ? `第 ${preview.targetDayNumber} 天` : '改排草案');

  return (
    <div
      className={cn(
        'rounded-lg border border-border/80 bg-card p-3 space-y-3',
        className
      )}
      data-itinerary-adjust-draft-preview
    >
      <div className="flex flex-wrap items-center gap-2">
        <PlanContentStateBadge state="draft" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>

      {body?.kind === 'bullets' ? (
        <ul className="space-y-1 pl-3.5 text-xs leading-relaxed list-disc text-foreground/90">
          {body.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : body?.kind === 'text' ? (
        <p className="text-xs leading-relaxed text-foreground/85 whitespace-pre-wrap">
          {body.text}
        </p>
      ) : null}

      {result?.experience_validation ? (
        <ItineraryAdjustExperienceEvidencePanel
          validation={result.experience_validation}
          tone="schedule"
        />
      ) : null}

      {draftScheduleZh || items.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            草案日程
          </p>
          {draftScheduleZh ? (
            <pre className="whitespace-pre-wrap rounded-md border border-border/60 bg-background/80 px-2.5 py-2 font-sans text-xs leading-relaxed text-foreground/90">
              {draftScheduleZh}
            </pre>
          ) : null}
          {items.length > 0 ? (
            <ul className="space-y-2">
              {items.map((item, ii) => {
                const model = normalizeItineraryItemCard(item);
                if (!model) return null;
                return (
                  <li key={ii} className="pointer-events-none opacity-95">
                    {model.displayKind === 'compact' ? (
                      <DaySegmentRowCompact model={model} />
                    ) : (
                      <ItineraryItemCard model={model} />
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {result?.apply_hint_zh ? (
        <p className="text-[10px] text-muted-foreground">{result.apply_hint_zh}</p>
      ) : null}
    </div>
  );
}
