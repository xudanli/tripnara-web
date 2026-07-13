import { BedDouble, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ArrangeLodgingNightStatus } from '@/lib/arrange-itinerary-lodging-coverage.util';
import { getGateStatusClasses } from '@/lib/gate-status';

export interface ArrangeItineraryDayLodgingAnchorProps {
  night: ArrangeLodgingNightStatus | null;
  lodgingListedInTimeline?: boolean;
  onAddLodging?: () => void;
  onEditLodging?: (itemId: string) => void;
  onAskAssistant?: () => void;
  className?: string;
}

export function ArrangeItineraryDayLodgingAnchor({
  night,
  lodgingListedInTimeline = false,
  onAddLodging,
  onEditLodging,
  onAskAssistant,
  className,
}: ArrangeItineraryDayLodgingAnchorProps) {
  if (!night?.needsAccommodation) return null;

  const covered = night.hasAccommodation;

  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5',
        covered
          ? 'border-border/60 bg-muted/20'
          : cn('border-gate-warn-border/70', getGateStatusClasses('NEED_CONFIRM')),
        className,
      )}
    >
      <div className="flex items-start gap-2">
        {covered ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gate-allow-foreground" />
        ) : (
          <BedDouble className="mt-0.5 h-4 w-4 shrink-0 text-gate-warn-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-foreground">当晚住宿</p>
          {covered ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {lodgingListedInTimeline
                ? '已在时间轴列出'
                : (night.accommodationLabel ?? '已安排')}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              尚未安排。请添加酒店或民宿，以便衔接次日出发。
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {covered && night.accommodationItemId && onEditLodging ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => onEditLodging(night.accommodationItemId!)}
            >
              编辑
            </Button>
          ) : null}
          {!covered && onAddLodging ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={onAddLodging}
            >
              添加住宿
            </Button>
          ) : null}
          {!covered && onAskAssistant ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[10px] text-primary"
              onClick={onAskAssistant}
            >
              <Sparkles className="h-3 w-3" />
              Nara 推荐
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
