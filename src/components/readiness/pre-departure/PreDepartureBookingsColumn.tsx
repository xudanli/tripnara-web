import { useMemo } from 'react';
import { Car, Building2, Ticket, Plane } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TripDetail } from '@/types/trip';
import {
  collectPreDepartureBookings,
  summarizePreDepartureBookings,
  type PreDepartureBookingRow,
  type PreDepartureBookingStatus,
} from '@/lib/pre-departure-bookings.util';
import { cn } from '@/lib/utils';
import {
  PreDepartureColumnShell,
  PreDepartureColumnMetric,
} from './pre-departure-column-ui';
import {
  workbenchPreDepartureBookingStatusBadgeClass,
  workbenchPreDepartureListItem,
  workbenchSecondaryMetric,
} from '@/components/plan-studio/workbench/workbench-ui';

const PREVIEW_LIMIT = 3;

const STATUS_META: Record<
  PreDepartureBookingStatus,
  { label: string; className: string }
> = {
  confirmed: {
    label: '已确认',
    className: workbenchPreDepartureBookingStatusBadgeClass('confirmed'),
  },
  pending: {
    label: '待确认',
    className: workbenchPreDepartureBookingStatusBadgeClass('pending'),
  },
  required: {
    label: '需预订',
    className: workbenchPreDepartureBookingStatusBadgeClass('required'),
  },
  not_needed: {
    label: '无需预订',
    className: workbenchPreDepartureBookingStatusBadgeClass('not_needed'),
  },
};

function kindLabel(kind: PreDepartureBookingRow['kind']): string {
  if (kind === 'car_rental') return '租车';
  if (kind === 'transport') return '交通';
  if (kind === 'poi') return '活动预约';
  return '住宿';
}

function KindIcon({ kind }: { kind: PreDepartureBookingRow['kind'] }) {
  const className = 'h-4 w-4 text-muted-foreground';
  if (kind === 'car_rental') return <Car className={className} />;
  if (kind === 'transport') return <Plane className={className} />;
  if (kind === 'poi') return <Ticket className={className} />;
  return <Building2 className={className} />;
}

function BookingCard({
  row,
  onGoToSchedule,
}: {
  row: PreDepartureBookingRow;
  onGoToSchedule?: (itemId?: string) => void;
}) {
  const meta = STATUS_META[row.status];
  const needsAction = row.status === 'pending' || row.status === 'required';

  return (
    <li className={workbenchPreDepartureListItem}>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
        <KindIcon kind={row.kind} />
        {kindLabel(row.kind)}
        {row.dayNumber ? <span>· Day {row.dayNumber}</span> : null}
      </div>
      <p className="text-sm font-medium leading-snug">{row.title}</p>
      {row.subtitle ? (
        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{row.subtitle}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Badge variant="outline" className={cn('text-[10px] font-normal', meta.className)}>
          {meta.label}
        </Badge>
        {row.confirmation ? (
          <span className={cn(workbenchSecondaryMetric, 'text-[10px] text-muted-foreground')}>
            #{row.confirmation}
          </span>
        ) : needsAction && onGoToSchedule ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => onGoToSchedule(row.itemId)}
          >
            去确认
          </Button>
        ) : null}
      </div>
    </li>
  );
}

interface PreDepartureBookingsColumnProps {
  trip: TripDetail | null;
  onViewAll?: () => void;
  onGoToSchedule?: (itemId?: string) => void;
}

export default function PreDepartureBookingsColumn({
  trip,
  onViewAll,
  onGoToSchedule,
}: PreDepartureBookingsColumnProps) {
  const rows = useMemo(() => collectPreDepartureBookings(trip), [trip]);
  const summary = useMemo(() => summarizePreDepartureBookings(rows), [rows]);
  const preview = rows.filter((r) => r.status !== 'not_needed').slice(0, PREVIEW_LIMIT);

  const headerExtra = (
    <PreDepartureColumnMetric label="预订完成度" value={`${summary.progressPct}%`} />
  );

  return (
    <PreDepartureColumnShell
      title="预订确认"
      headerExtra={headerExtra}
      footerLabel={rows.length > 0 ? `查看全部预订 (${rows.length})` : undefined}
      onViewAll={rows.length > 0 ? onViewAll : undefined}
    >
      {preview.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">暂无预订项</p>
      ) : (
        <ul className="space-y-2">
          {preview.map((row) => (
            <BookingCard key={row.id} row={row} onGoToSchedule={onGoToSchedule} />
          ))}
        </ul>
      )}
    </PreDepartureColumnShell>
  );
}
