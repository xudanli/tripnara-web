import { cn } from '@/lib/utils';

/** 行程列表页 UI token — 对齐视觉设计师（primary 黑 + gate 四态 + 中性灰阶，禁止紫色） */
export const tripListUi = {
  page: 'space-y-6 p-4 sm:p-6',
  cardGrid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
  card: 'rounded-lg border border-border bg-card shadow-none overflow-hidden h-full flex flex-col',
  cardHover: 'transition-colors hover:border-foreground/20',
  cardBody: 'p-3.5 flex flex-col flex-1 gap-2.5',
  attentionBanner: 'rounded-xl border border-border bg-card shadow-none',
  imageArea: 'relative h-40 w-full bg-muted shrink-0',
  imagePlaceholder: 'bg-muted/40',
  statusBadge: 'absolute top-2 right-2 text-[10px] font-medium border shadow-sm backdrop-blur-sm px-1.5 py-0',
  metricGrid: 'grid grid-cols-3 gap-1.5',
  metricCell: 'rounded-md border border-border/60 bg-muted/15 px-1.5 py-2 text-center min-w-0',
  metricLabel: 'text-[10px] text-muted-foreground leading-tight truncate',
  metricValue: 'text-xs font-semibold text-foreground tabular-nums mt-0.5',
  metricEmpty: 'text-[10px] text-muted-foreground/50 font-normal',
  progressTrack: 'h-1.5 rounded-full bg-muted overflow-hidden',
  progressFill: 'h-full rounded-full bg-primary',
  primaryBtn: 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm',
  createCard: 'rounded-lg border-2 border-dashed border-border bg-muted/15 hover:bg-muted/25 transition-colors',
  tagAllow: 'border-border bg-muted/15 text-success',
  tagConfirm: 'border-border bg-muted/15 text-warning',
  tagSuggest: 'border-border bg-muted/15 text-muted-foreground',
  tagReject: 'border-border bg-muted/15 text-error',
  tagVerified: 'border-border bg-muted/15 text-success',
  tagNeutral: 'border-border bg-muted/15 text-muted-foreground',
  metricReadout: 'font-mono-brand text-muted-foreground',
} as const;

export function TripListMetricCell({
  label,
  value,
  tag,
  className,
}: {
  label: string;
  value: React.ReactNode;
  tag?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(tripListUi.metricCell, className)}>
      <p className={tripListUi.metricLabel}>{label}</p>
      <div className={cn(tripListUi.metricValue, 'flex flex-col items-center gap-0.5')}>
        <span className="truncate max-w-full">{value}</span>
        {tag}
      </div>
    </div>
  );
}

export function TripListMetricEmpty({ label = '暂无' }: { label?: string }) {
  return <span className={tripListUi.metricEmpty}>{label}</span>;
}
