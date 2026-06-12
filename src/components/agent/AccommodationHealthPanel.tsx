/**
 * ui_display.accommodation_health — N 晚进度条（人话标签，不展示 raw km）
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  AccommodationHealthNight,
  AccommodationHealthPayload,
  AccommodationNightStatus,
} from '@/types/accommodation-health';
import { AlertTriangle, BedDouble, CircleDashed } from 'lucide-react';

export interface AccommodationHealthPanelProps {
  health: AccommodationHealthPayload;
  disabled?: boolean;
  className?: string;
  onMissingNightAction?: (night: AccommodationHealthNight) => void;
}

const STATUS_STYLES: Record<
  AccommodationNightStatus,
  { segment: string; dot: string; label: string }
> = {
  booked: {
    segment: 'bg-emerald-500 border-emerald-600/40',
    dot: 'bg-emerald-500',
    label: '已订',
  },
  missing: {
    segment: 'bg-transparent border-dashed border-muted-foreground/45',
    dot: 'bg-muted-foreground/35',
    label: '未订',
  },
  warning: {
    segment: 'bg-amber-400/90 border-amber-500/50',
    dot: 'bg-amber-500',
    label: '需留意',
  },
  critical: {
    segment: 'bg-red-500 border-red-600/50',
    dot: 'bg-red-600',
    label: '异常',
  },
};

function nightTitle(night: AccommodationHealthNight): string {
  return night.label_zh?.trim() || night.date_label_zh?.trim() || `第 ${night.night_index} 晚`;
}

function NightSegment({
  night,
  disabled,
  onMissingAction,
}: {
  night: AccommodationHealthNight;
  disabled?: boolean;
  onMissingAction?: (night: AccommodationHealthNight) => void;
}) {
  const styles = STATUS_STYLES[night.status] ?? STATUS_STYLES.missing;
  const title = nightTitle(night);

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <div
        className={cn(
          'h-2.5 w-full rounded-full border',
          styles.segment
        )}
        title={title}
        aria-label={`${title}：${styles.label}`}
      />
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-[10px] font-medium text-foreground tabular-nums">{title}</span>
        {night.status === 'warning' && night.driving_time_label_zh ? (
          <span className="text-[10px] text-amber-800 dark:text-amber-200 leading-tight">
            {night.driving_time_label_zh}
          </span>
        ) : null}
        {night.status === 'critical' && night.warning_badge_zh ? (
          <Badge variant="destructive" className="text-[9px] h-4 px-1.5">
            {night.warning_badge_zh}
          </Badge>
        ) : null}
        {night.status === 'missing' ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            disabled={disabled}
            className="h-auto p-0 text-[10px] text-primary"
            onClick={() => onMissingAction?.(night)}
          >
            {night.cta_label_zh?.trim() || '点我一键帮填'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function AccommodationHealthPanel({
  health,
  disabled,
  className,
  onMissingNightAction,
}: AccommodationHealthPanelProps) {
  const nights = health.nights ?? [];
  if (!nights.length) return null;

  const criticalCount = nights.filter((n) => n.status === 'critical').length;
  const missingCount = nights.filter((n) => n.status === 'missing').length;

  return (
    <Card className={cn('border-border/80 bg-card/60', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BedDouble className="h-4 w-4 text-primary" aria-hidden />
          住宿健康度
          {criticalCount > 0 ? (
            <Badge variant="destructive" className="text-[10px] h-5">
              {criticalCount} 晚异常
            </Badge>
          ) : missingCount > 0 ? (
            <Badge variant="outline" className="text-[10px] h-5 gap-1">
              <CircleDashed className="h-3 w-3" aria-hidden />
              {missingCount} 晚未订
            </Badge>
          ) : null}
        </CardTitle>
        {health.summary_zh?.trim() ? (
          <CardDescription className="text-xs mt-1 leading-relaxed">
            {health.summary_zh.trim()}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex gap-1.5 items-start">
          {nights.map((night) => (
            <NightSegment
              key={`${night.night_index}-${night.date_label_zh ?? night.label_zh ?? ''}`}
              night={night}
              disabled={disabled}
              onMissingAction={onMissingNightAction}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            已订
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full border border-dashed border-muted-foreground/50" aria-hidden />
            未订
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
            需留意
          </span>
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-red-600" aria-hidden />
            异常
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
