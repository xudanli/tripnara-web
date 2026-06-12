/**
 * route_and_run：ui_display.booking_priority_list — 抢票倒计时、官方链接、日历提醒
 */

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { openCalendarReminder, stripHtml } from '@/lib/booking-priority-calendar';
import {
  formatCountdownLabel,
  remainingSecondsFromGeneratedAt,
} from '@/lib/booking-priority-list-ui';
import { sanitizeRouteRunTripId } from '@/lib/route-run-trip-id';
import type { BookingPriorityItem, BookingPriorityListPayload } from '@/types/booking-priority-list';
import {
  AlertTriangle,
  CalendarPlus,
  ChevronRight,
  ExternalLink,
  Plane,
  Sparkles,
  Ticket,
} from 'lucide-react';

export interface BookingPriorityListPanelProps {
  list: BookingPriorityListPayload;
  tripId?: string | null;
  disabled?: boolean;
  className?: string;
}

const URGENCY_STYLES: Record<string, { badge: string; row: string }> = {
  CRITICAL: {
    badge: 'border-red-500/40 bg-red-50 text-red-950 dark:bg-red-950/35 dark:text-red-100',
    row: 'border-red-500/35 bg-red-50/50 dark:bg-red-950/20',
  },
  HIGH: {
    badge: 'border-orange-500/40 bg-orange-50 text-orange-950 dark:bg-orange-950/30 dark:text-orange-100',
    row: 'border-orange-500/35 bg-orange-50/40 dark:bg-orange-950/15',
  },
  MEDIUM: {
    badge: 'border-border/60 bg-muted/40 text-foreground',
    row: 'border-border/70 bg-muted/15',
  },
};

const URGENCY_LABELS: Record<string, string> = {
  CRITICAL: '紧急',
  HIGH: '高优先级',
  MEDIUM: '待预约',
};

const CATEGORY_ICONS: Record<string, typeof Ticket> = {
  ATTRACTION_TICKET: Ticket,
  TRANSPORT_FLIGHT: Plane,
  SPECIAL_EXPERIENCE: Sparkles,
};

function iconForCategory(category: BookingPriorityItem['category']) {
  return CATEGORY_ICONS[String(category)] ?? Ticket;
}

function useCountdownTick(generatedAt: string, countdownSeconds: number): number {
  const [remaining, setRemaining] = useState(() =>
    remainingSecondsFromGeneratedAt(generatedAt, countdownSeconds)
  );

  useEffect(() => {
    setRemaining(remainingSecondsFromGeneratedAt(generatedAt, countdownSeconds));
    const id = window.setInterval(() => {
      setRemaining(remainingSecondsFromGeneratedAt(generatedAt, countdownSeconds));
    }, 1000);
    return () => window.clearInterval(id);
  }, [generatedAt, countdownSeconds]);

  return remaining;
}

function PriorityItemRow({
  item,
  generatedAt,
  tripId,
  disabled,
}: {
  item: BookingPriorityItem;
  generatedAt: string;
  tripId?: string | null;
  disabled?: boolean;
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const remaining = useCountdownTick(generatedAt, item.timing.countdown_seconds);
  const urgency = String(item.urgency_level);
  const styles = URGENCY_STYLES[urgency] ?? URGENCY_STYLES.MEDIUM;
  const Icon = iconForCategory(item.category);
  const guideText = stripHtml(item.action_payload.booking_guide_html);
  const sanitizedTripId = tripId ? sanitizeRouteRunTripId(tripId) : null;

  const handleBook = () => {
    const url = item.action_payload.official_booking_url?.trim();
    if (!url) {
      toast.error('官方预约链接缺失');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCalendar = async () => {
    setCalendarBusy(true);
    try {
      const mode = await openCalendarReminder(item, {
        tripId: sanitizedTripId,
        onSyncSuccess: () => toast.success('已提交日历提醒'),
        onSyncError: (msg) => toast.error(msg),
      });
      if (mode === 'ics') {
        toast.success('已下载日历文件（.ics）');
      }
    } finally {
      setCalendarBusy(false);
    }
  };

  return (
    <div className={cn('rounded-lg border px-3 py-2.5', styles.row)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span className="text-sm font-medium text-foreground">{item.title}</span>
            <Badge variant="outline" className={cn('text-[10px] h-5', styles.badge)}>
              {URGENCY_LABELS[urgency] ?? urgency}
            </Badge>
            {item.associated_day_number > 0 ? (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                第 {item.associated_day_number} 天
              </span>
            ) : null}
          </div>
          <p
            className={cn(
              'mt-1 text-xs tabular-nums',
              remaining <= 0 ? 'font-medium text-red-700 dark:text-red-300' : 'text-muted-foreground'
            )}
          >
            {remaining <= 0 ? (
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                需立即处理
              </span>
            ) : (
              <>距开放/截止：{formatCountdownLabel(remaining)}</>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            className="h-8 text-xs"
            onClick={handleBook}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" aria-hidden />
            去预约
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || calendarBusy}
            className="h-8 text-xs"
            onClick={() => void handleCalendar()}
          >
            <CalendarPlus className="h-3.5 w-3.5 mr-1" aria-hidden />
            加日历
          </Button>
        </div>
      </div>
      {guideText ? (
        <Collapsible open={guideOpen} onOpenChange={setGuideOpen} className="mt-2">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground [&[data-state=open]_svg:last-child]:rotate-90"
            >
              预约指南
              <ChevronRight className="ml-1 h-3 w-3 transition-transform" aria-hidden />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
              {guideText}
            </p>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}

export function BookingPriorityListPanel({
  list,
  tripId,
  disabled,
  className,
}: BookingPriorityListPanelProps) {
  const criticalCount = useMemo(
    () => list.items.filter((i) => i.urgency_level === 'CRITICAL').length,
    [list.items]
  );

  if (!list.items.length) return null;

  return (
    <Card className={cn('border-red-500/20 bg-card/60', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle
            className={cn('h-4 w-4', criticalCount > 0 ? 'text-red-600' : 'text-amber-600')}
            aria-hidden
          />
          预订优先级
          {criticalCount > 0 ? (
            <Badge variant="destructive" className="text-[10px] h-5">
              {criticalCount} 项紧急
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription className="text-xs">
          抢票倒计时与官方预约入口；正文摘要见上方 narration，此处为结构化契约。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.items.map((item) => (
          <PriorityItemRow
            key={item.id}
            item={item}
            generatedAt={list.generated_at}
            tripId={tripId ?? list.trip_id}
            disabled={disabled}
          />
        ))}
      </CardContent>
    </Card>
  );
}
