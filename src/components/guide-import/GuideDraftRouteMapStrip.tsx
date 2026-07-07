import { cn } from '@/lib/utils';
import { TripRouteSummaryStrip } from '@/components/trip/TripRouteSummaryStrip';
import { guideImportUi } from '@/components/guide-import/guide-import-ui';

interface GuideDraftRouteMapStripProps {
  stops: string[];
  onViewMap?: () => void;
  className?: string;
}

export function GuideDraftRouteMapStrip({
  stops,
  onViewMap,
  className,
}: GuideDraftRouteMapStripProps) {
  return (
    <div className={cn(guideImportUi.card, 'overflow-hidden', className)}>
      <TripRouteSummaryStrip stops={stops} onViewMap={onViewMap} maxStops={8} />
    </div>
  );
}
