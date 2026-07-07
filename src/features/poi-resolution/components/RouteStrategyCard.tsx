import { Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExploreRouteMap } from '@/features/exploration/components/ExploreRouteMap';
import {
  exploreUi,
  semanticGoodText,
  semanticWarnText,
} from '@/features/exploration/explore-ui';
import type { CompareRouteCard } from '@/features/exploration/types';
import type { PoiChipViewModel } from '@/features/poi-resolution/types';
import { PoiChipList } from './PoiChip';

interface RouteStrategyCardProps {
  route: CompareRouteCard;
  poiChips?: PoiChipViewModel[];
  highlight?: boolean;
  primaryLabel?: string;
  onViewDetail?: () => void;
  onSelect?: () => void;
  onPoiConfirmClick?: (chip: PoiChipViewModel) => void;
  onPoiEvidenceClick?: (chip: PoiChipViewModel) => void;
  sourceBadge?: { label: string; tone: 'default' | 'info' | 'niche' } | null;
}

function sourceBadgeClass(tone: 'default' | 'info' | 'niche'): string {
  if (tone === 'niche') return exploreUi.badgeNiche;
  if (tone === 'info') {
    return 'text-[10px] px-2 py-0.5 rounded-full font-medium border border-border bg-muted text-foreground';
  }
  return exploreUi.badgeNiche;
}

export function RouteStrategyCard({
  route,
  poiChips = [],
  highlight = false,
  primaryLabel = '选择',
  onViewDetail,
  onSelect,
  onPoiConfirmClick,
  onPoiEvidenceClick,
  sourceBadge,
}: RouteStrategyCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card overflow-hidden space-y-0',
        highlight && exploreUi.cardSelected,
      )}
    >
      {route.previewMap ? (
        <ExploreRouteMap
          routeId={route.id}
          map={route.previewMap}
          useMockFallback={false}
          showLegend={false}
          showDayMarkers={false}
          className="h-28 rounded-none border-0 border-b border-border"
        />
      ) : null}
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold">{route.title}</h3>
          {sourceBadge ? (
            <span className={cn(sourceBadgeClass(sourceBadge.tone), 'shrink-0')}>
              {sourceBadge.label}
            </span>
          ) : null}
        </div>
        {route.previewSummary || route.narrative ? (
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
            {route.previewSummary ?? route.narrative}
          </p>
        ) : null}
        <div>
          <p className={cn('text-[10px] font-medium mb-1', semanticGoodText)}>你会得到</p>
          <ul className="space-y-1">
            {route.gains.slice(0, 2).map((g) => (
              <li key={g} className="flex gap-1.5 text-[11px]">
                <Check className={cn('w-3.5 h-3.5 flex-shrink-0', semanticGoodText)} />
                {g}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className={cn('text-[10px] font-medium mb-1', semanticWarnText)}>需要接受</p>
          <ul className="space-y-1">
            {route.sacrifices.slice(0, 2).map((s) => (
              <li key={s} className="flex gap-1.5 text-[11px]">
                <AlertTriangle className={cn('w-3.5 h-3.5 flex-shrink-0', semanticWarnText)} />
                {s}
              </li>
            ))}
          </ul>
        </div>
        {poiChips.length > 0 ? (
          <div>
            <p className="text-[10px] font-medium mb-1.5 text-muted-foreground">途经地点</p>
            <PoiChipList
              chips={poiChips}
              onConfirmClick={onPoiConfirmClick}
              onEvidenceClick={onPoiEvidenceClick}
            />
          </div>
        ) : null}
        <div className="flex gap-2 pt-1.5">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={onViewDetail}
          >
            查看详情
          </Button>
          <Button
            size="sm"
            variant={highlight ? 'default' : 'secondary'}
            className="flex-1 text-xs"
            onClick={onSelect}
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
