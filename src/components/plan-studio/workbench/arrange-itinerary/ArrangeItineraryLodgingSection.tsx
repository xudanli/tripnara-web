import { BedDouble, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ArrangeLodgingCoverageSummary } from '@/lib/arrange-itinerary-lodging-coverage.util';
import {
  workbenchAttractionExploreContextCard,
  workbenchAttractionExploreSectionTitle,
  workbenchLinkClass,
} from '../workbench-ui';

export interface ArrangeItineraryLodgingSectionProps {
  summary: ArrangeLodgingCoverageSummary;
  onAddLodging: (dayIndex: number) => void;
  onEditLodging?: (itemId: string) => void;
  onFillAllWithAssistant?: () => void;
  /** 顶部编排进度已展示汇总时，隐藏重复的 X/Y 晚文案 */
  compact?: boolean;
  className?: string;
}

export function ArrangeItineraryLodgingSection({
  summary,
  onAddLodging,
  onEditLodging,
  onFillAllWithAssistant,
  compact = false,
  className,
}: ArrangeItineraryLodgingSectionProps) {
  const { totalNights, coveredNights, missingNights, nights } = summary;

  if (totalNights === 0) {
    return (
      <section className={cn(workbenchAttractionExploreContextCard, className)}>
        <p className={workbenchAttractionExploreSectionTitle}>每晚住宿</p>
        <p className="mt-1 text-[11px] text-muted-foreground">单日行程无需安排过夜住宿</p>
      </section>
    );
  }

  const missingNightsList = nights.filter((night) => !night.hasAccommodation);

  return (
    <section className={cn(workbenchAttractionExploreContextCard, className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={workbenchAttractionExploreSectionTitle}>每晚住宿</p>
          {!compact ? (
            <p className="mt-1 text-[11px] text-foreground">
              已订 {coveredNights} / {totalNights} 晚
            </p>
          ) : null}
        </div>
        {summary.isComplete ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-gate-allow-foreground" aria-hidden />
        ) : (
          <BedDouble className="h-4 w-4 shrink-0 text-gate-warn-foreground" aria-hidden />
        )}
      </div>

      <div className="mt-2 flex gap-1">
        {nights.map((night) => (
          <span
            key={night.dayIndex}
            className={cn(
              'h-2 flex-1 rounded-full',
              night.hasAccommodation ? 'bg-gate-allow' : 'bg-gate-warn/35',
            )}
            title={
              night.hasAccommodation
                ? `Day ${night.dayNumber} · ${night.accommodationLabel ?? '已安排'}`
                : `Day ${night.dayNumber} · 待补住宿`
            }
          />
        ))}
      </div>

      {missingNights > 0 ? (
        <div className="mt-3 space-y-2">
          {!compact ? (
            <p className="text-[10px] font-medium text-gate-warn-foreground">
              待补 {missingNights} 晚
            </p>
          ) : null}
          <ul className="space-y-1.5">
            {missingNightsList.map((night) => (
              <li
                key={night.dayIndex}
                className="flex items-center justify-between gap-2 rounded-lg border border-gate-warn-border/60 bg-gate-warn/10 px-2 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-foreground">
                    Day {night.dayNumber} · {night.dateLabel}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{night.weekdayLabel}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 shrink-0 px-2 text-[10px]"
                  onClick={() => onAddLodging(night.dayIndex)}
                >
                  添加住宿
                </Button>
              </li>
            ))}
          </ul>
          {onFillAllWithAssistant && !compact ? (
            <button
              type="button"
              className={cn(workbenchLinkClass, 'text-[10px]')}
              onClick={onFillAllWithAssistant}
            >
              让 Nara 一键补齐 →
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="mt-3 space-y-1">
          {nights.map((night) => (
            <li
              key={night.dayIndex}
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <span className="min-w-0 truncate text-muted-foreground">
                Day {night.dayNumber} · {night.accommodationLabel ?? '已安排'}
              </span>
              {night.accommodationItemId && onEditLodging ? (
                <button
                  type="button"
                  className={cn(workbenchLinkClass, 'shrink-0 text-[10px]')}
                  onClick={() => onEditLodging(night.accommodationItemId!)}
                >
                  编辑
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
