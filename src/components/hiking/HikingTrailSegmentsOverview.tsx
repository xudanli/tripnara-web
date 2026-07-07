import type { HikingTrailSegment } from '@/types/hiking-trail-card';
import { cn } from '@/lib/utils';

type Props = {
  segments: HikingTrailSegment[];
  className?: string;
};

/** trip.hikingTrailSegments — 徒步 Trail 按日段总览 */
export function HikingTrailSegmentsOverview({ segments, className }: Props) {
  if (segments.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">按日 Trail 段</p>
        <span className="text-xs text-muted-foreground">共 {segments.length} 日徒步</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {segments.map((seg) => (
          <div
            key={seg.day}
            className={cn(
              'rounded-xl border px-3 py-3',
              seg.suitable === false && 'border-gate-reject-border/40 bg-gate-reject-foreground/5'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Day {seg.day}</span>
              {seg.suitable === false ? (
                <span className="text-[10px] font-medium text-gate-reject-foreground">超标</span>
              ) : null}
            </div>
            <p className="mt-1 text-sm font-semibold">{seg.theme}</p>
            {seg.trailName ? (
              <p className="text-xs text-muted-foreground">{seg.trailName}</p>
            ) : null}
            <p className="mt-1 text-[11px] text-muted-foreground">
              {seg.distanceKm} km · 爬升 ↑{seg.ascentM} m
            </p>
            {seg.noteZh ? (
              <p className="mt-1 text-[11px] text-gate-reject-foreground dark:text-gate-reject-foreground">{seg.noteZh}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
