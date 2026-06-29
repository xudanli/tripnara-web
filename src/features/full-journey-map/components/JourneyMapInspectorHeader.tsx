import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { JourneyInspectorActivityHeader } from '../types-inspector-view';
import { journeyMapIntensityBadge } from '../journey-map-ui';

export function JourneyMapInspectorHeader({
  header,
  className,
}: {
  header: JourneyInspectorActivityHeader;
  className?: string;
}) {
  return (
    <div className={cn('border-b border-border/50 px-4 pb-3 pt-2', className)}>
      <div className="flex flex-wrap items-start gap-2">
        <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug text-foreground">
          {header.title}
        </h3>
        {header.intensityLabel ? (
          <Badge className={journeyMapIntensityBadge}>{header.intensityLabel}</Badge>
        ) : null}
      </div>
      {header.titleEn ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{header.titleEn}</p>
      ) : null}
      <p className="mt-1 text-[11px] font-medium text-muted-foreground">{header.dayLabel}</p>
    </div>
  );
}
