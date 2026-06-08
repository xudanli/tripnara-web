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
  const badge = result?.status_label_zh?.trim() || '草案待确认';

  return (
    <div
      className={cn(
        'rounded-lg border border-amber-300/80 bg-amber-50/90 p-3 space-y-3 dark:border-amber-800/50 dark:bg-amber-950/25',
        className
      )}
      data-itinerary-adjust-draft-preview
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full border border-amber-400/70 bg-amber-100/90 px-2 py-0.5 text-[10px] font-semibold text-amber-950 dark:bg-amber-900/50 dark:text-amber-100">
          {badge}
        </span>
        <span className="text-sm font-semibold text-amber-950 dark:text-amber-50">{title}</span>
      </div>

      {body?.kind === 'bullets' ? (
        <ul className="space-y-1 pl-3.5 text-xs leading-relaxed list-disc text-amber-950/90 dark:text-amber-100/90">
          {body.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : body?.kind === 'text' ? (
        <p className="text-xs leading-relaxed text-amber-950/85 dark:text-amber-100/85 whitespace-pre-wrap">
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
          <p className="text-[10px] font-medium uppercase tracking-wide text-amber-900/70 dark:text-amber-200/70">
            草案日程
          </p>
          {draftScheduleZh ? (
            <pre className="whitespace-pre-wrap rounded-md border border-amber-200/60 bg-background/80 px-2.5 py-2 font-sans text-xs leading-relaxed text-amber-950/90 dark:text-amber-100/90">
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
        <p className="text-[10px] text-amber-900/65 dark:text-amber-200/65">{result.apply_hint_zh}</p>
      ) : null}
    </div>
  );
}
