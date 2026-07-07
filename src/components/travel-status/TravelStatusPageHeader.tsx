import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ArrowLeft,
  CalendarDays,
  MessageSquare,
  PenLine,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { TripDetail } from '@/types/trip';
import {
  travelStatusHeaderShell,
  travelStatusPageSubtitle,
  travelStatusPageTitle,
} from './travel-status-ui';

interface TravelStatusPageHeaderProps {
  trip?: TripDetail | null;
  tripTitle: string;
  isRefreshing?: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onOpenPlanStudio: () => void;
  onOpenNara: () => void;
  className?: string;
}

function formatTripDates(trip?: TripDetail | null): string | null {
  if (!trip?.startDate) return null;
  try {
    const start = format(new Date(trip.startDate), 'yyyy-MM-dd', { locale: zhCN });
    if (!trip.endDate) return start;
    const end = format(new Date(trip.endDate), 'MM-dd', { locale: zhCN });
    return `${start} — ${end}`;
  } catch {
    return null;
  }
}

export default function TravelStatusPageHeader({
  trip,
  tripTitle,
  isRefreshing,
  onBack,
  onRefresh,
  onOpenPlanStudio,
  onOpenNara,
  className,
}: TravelStatusPageHeaderProps) {
  const dates = formatTripDates(trip);

  return (
    <header className={cn(travelStatusHeaderShell, className)}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 h-8 w-8 shrink-0"
            onClick={onBack}
            aria-label="返回"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              我的旅行
            </p>
            <h1 className={travelStatusPageTitle}>{tripTitle}</h1>
            <div className={cn(travelStatusPageSubtitle, 'flex flex-wrap items-center gap-x-2 gap-y-0.5')}>
              {dates ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {dates}
                </span>
              ) : (
                <span>AI 持续维护的状态</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onOpenPlanStudio}>
            <PenLine className="mr-1.5 h-3.5 w-3.5" />
            编辑行程
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onOpenNara}>
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            问 Nara
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Spinner className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            刷新
          </Button>
        </div>
      </div>
    </header>
  );
}
