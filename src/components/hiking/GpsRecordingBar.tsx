import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MapPin, Pause, Play, Upload } from 'lucide-react';
import type { GpsTrackSummary } from '@/types/hike-plan';

type GpsRecordingBarProps = {
  className?: string;
  recording: boolean;
  summary: GpsTrackSummary;
  lastError?: string | null;
  onStart: () => void;
  onStop: () => void;
  onSync?: () => void;
};

export function GpsRecordingBar({
  className,
  recording,
  summary,
  lastError,
  onStart,
  onStop,
  onSync,
}: GpsRecordingBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm', className)}>
      <Badge variant={recording ? 'default' : 'secondary'}>
        <MapPin className="h-3 w-3 mr-1" />
        {recording ? 'GPS 记录中' : 'GPS 已暂停'}
      </Badge>
      <span>
        {(summary.distanceKm ?? 0).toFixed(2)} km · {summary.pointCount ?? 0} 点 ·{' '}
        {summary.durationMin ?? 0} min
      </span>
      {recording ? (
        <Button size="sm" variant="outline" onClick={onStop}>
          <Pause className="h-3 w-3 mr-1" />
          暂停
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={onStart}>
          <Play className="h-3 w-3 mr-1" />
          记录
        </Button>
      )}
      {onSync ? (
        <Button size="sm" variant="ghost" onClick={onSync}>
          <Upload className="h-3 w-3 mr-1" />
          同步
        </Button>
      ) : null}
      {lastError ? (
        <span className="text-destructive text-xs w-full">{lastError}</span>
      ) : null}
    </div>
  );
}
