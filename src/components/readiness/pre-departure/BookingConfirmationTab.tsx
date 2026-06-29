import { useMemo } from 'react';
import { ExternalLink, Car, Building2, Ticket, Plane } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { TripDetail } from '@/types/trip';
import {
  collectPreDepartureBookings,
  summarizePreDepartureBookings,
  type PreDepartureBookingRow,
  type PreDepartureBookingStatus,
} from '@/lib/pre-departure-bookings.util';
import { cn } from '@/lib/utils';

interface BookingConfirmationTabProps {
  trip: TripDetail | null;
  onGoToSchedule?: (itemId?: string) => void;
  className?: string;
}

const STATUS_META: Record<
  PreDepartureBookingStatus,
  { label: string; className: string }
> = {
  confirmed: {
    label: '已确认',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  pending: {
    label: '待确认',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  required: {
    label: '需预订',
    className: 'border-red-200 bg-red-50 text-red-800',
  },
  not_needed: {
    label: '无需预订',
    className: 'border-border bg-muted/30 text-muted-foreground',
  },
};

function KindIcon({ kind }: { kind: PreDepartureBookingRow['kind'] }) {
  const className = 'h-4 w-4 shrink-0 text-muted-foreground';
  if (kind === 'car_rental') return <Car className={className} />;
  if (kind === 'transport') return <Plane className={className} />;
  if (kind === 'poi') return <Ticket className={className} />;
  return <Building2 className={className} />;
}

function BookingRow({
  row,
  onGoToSchedule,
}: {
  row: PreDepartureBookingRow;
  onGoToSchedule?: (itemId?: string) => void;
}) {
  const meta = STATUS_META[row.status];

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border/60 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <KindIcon kind={row.kind} />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{row.title}</p>
            {row.dayNumber ? (
              <span className="text-[10px] text-muted-foreground">Day {row.dayNumber}</span>
            ) : null}
            <Badge variant="outline" className={cn('text-[10px] font-normal', meta.className)}>
              {meta.label}
            </Badge>
          </div>
          {row.subtitle ? (
            <p className="text-xs text-muted-foreground">{row.subtitle}</p>
          ) : null}
          {row.confirmation ? (
            <p className="text-xs font-mono text-muted-foreground">确认号 {row.confirmation}</p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {row.bookingUrl ? (
          <Button variant="outline" size="sm" className="h-8" asChild>
            <a href={row.bookingUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              预订链接
            </a>
          </Button>
        ) : null}
        {onGoToSchedule && row.itemId ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => onGoToSchedule(row.itemId)}
          >
            在行程中编辑
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export default function BookingConfirmationTab({
  trip,
  onGoToSchedule,
  className,
}: BookingConfirmationTabProps) {
  const rows = useMemo(() => collectPreDepartureBookings(trip), [trip]);
  const summary = useMemo(() => summarizePreDepartureBookings(rows), [rows]);

  if (!trip) {
    return (
      <p className={cn('py-8 text-center text-sm text-muted-foreground', className)}>
        无法加载行程数据
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={cn('rounded-lg border border-dashed px-4 py-10 text-center', className)}>
        <p className="text-sm text-muted-foreground">暂无需要确认的预订项</p>
        <p className="mt-1 text-xs text-muted-foreground">
          在时间轴中为住宿、活动或租车标记预订状态后会显示在这里
        </p>
        {onGoToSchedule ? (
          <Button variant="outline" size="sm" className="mt-4" onClick={() => onGoToSchedule()}>
            打开行程时间轴
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-lg border border-border/60 bg-white px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium">预订确认进度</p>
          <span className="text-sm font-semibold tabular-nums">{summary.progressPct}%</span>
        </div>
        <Progress value={summary.progressPct} className="h-2" />
        <p className="mt-2 text-xs text-muted-foreground">
          已确认 {summary.confirmed} · 待处理 {summary.pending}
          {summary.total > 0 ? ` · 共 ${summary.total} 项` : ''}
        </p>
      </div>

      <ul className="space-y-2">
        {rows.map((row) => (
          <BookingRow key={row.id} row={row} onGoToSchedule={onGoToSchedule} />
        ))}
      </ul>
    </div>
  );
}
