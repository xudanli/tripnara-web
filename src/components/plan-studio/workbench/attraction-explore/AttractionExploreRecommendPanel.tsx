import { Map, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type {
  AttractionExploreItem,
  AttractionExploreMapPoint,
  AttractionExploreSection,
  AttractionExploreViewTab,
} from '@/types/attraction-explore';
import { AttractionExploreCard } from './AttractionExploreCard';
import { formatDetourMethodLabel } from '@/lib/attraction-explore-route-options.util';
import {
  workbenchAttractionExploreEmptySurface,
  workbenchAttractionExploreMapPreview,
  workbenchAttractionExploreViewTabIdle,
  workbenchAttractionExploreViewTabSelected,
  workbenchAccentIconClass,
  workbenchPanelTitle,
  workbenchScrollable,
} from '../workbench-ui';

const VIEW_TABS: Array<{ id: AttractionExploreViewTab; label: string }> = [
  { id: 'recommended', label: '推荐' },
  { id: 'map', label: '地图' },
  { id: 'along_route', label: '顺路发现' },
];

export interface AttractionExploreRecommendPanelProps {
  sections: AttractionExploreSection[];
  loading?: boolean;
  viewTab: AttractionExploreViewTab;
  onViewTabChange: (tab: AttractionExploreViewTab) => void;
  isInCandidates: (item: AttractionExploreItem) => boolean;
  addPending?: boolean;
  removePending?: boolean;
  onAddToCandidates: (item: AttractionExploreItem) => void;
  onViewDetails?: (item: AttractionExploreItem) => void;
  onRemoveFromCandidates?: (item: AttractionExploreItem) => void;
  onViewMap?: () => void;
  onViewMapPoint?: (point: AttractionExploreMapPoint) => void;
  onPlaceMapPoint?: (point: AttractionExploreMapPoint) => void;
  mapPlacePending?: boolean;
  mapPoints?: AttractionExploreMapPoint[];
  mapLoading?: boolean;
  className?: string;
}

export function AttractionExploreRecommendPanel({
  sections,
  loading = false,
  viewTab,
  onViewTabChange,
  isInCandidates,
  addPending,
  removePending,
  onAddToCandidates,
  onViewDetails,
  onRemoveFromCandidates,
  onViewMap,
  onPlaceMapPoint,
  mapPlacePending = false,
  mapPoints = [],
  mapLoading = false,
  className,
}: AttractionExploreRecommendPanelProps) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="shrink-0 border-b border-border/50 px-3 py-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <h2 className={workbenchPanelTitle}>为你推荐的景点</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-border/60 bg-background p-0.5">
              {VIEW_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onViewTabChange(tab.id)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] transition-colors',
                    viewTab === tab.id
                      ? workbenchAttractionExploreViewTabSelected
                      : workbenchAttractionExploreViewTabIdle,
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onViewMap}
              className={cn(workbenchAttractionExploreMapPreview, 'hidden sm:flex')}
            >
              <Map className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              <span className="text-[10px] text-muted-foreground">查看地图</span>
            </button>
          </div>
        </div>
      </div>

      <div className={cn('min-h-0 flex-1 overflow-y-auto p-3', workbenchScrollable)}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-7 w-7" />
          </div>
        ) : viewTab === 'map' ? (
          mapLoading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-7 w-7" />
            </div>
          ) : mapPoints.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">
                共 {mapPoints.length} 个点位（候选 / 推荐 / 路线）
              </p>
              <ul className="space-y-1.5">
                {mapPoints.map((point) => (
                  <li
                    key={point.id}
                    className={cn(
                      'rounded-lg border bg-card px-3 py-2 text-[11px]',
                      point.highlighted ? 'border-primary/50' : 'border-border/55',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-medium text-foreground">{point.name}</span>
                        <p className="mt-0.5 text-muted-foreground">
                          {point.kind ?? 'poi'} · {point.lat.toFixed(3)}, {point.lng.toFixed(3)}
                        </p>
                        {point.insertHint ? (
                          <p className={cn('mt-1 text-[10px]', workbenchAccentIconClass)}>
                            建议第 {point.insertHint.suggestedDayIndex} 天
                            {point.insertHint.startTime ? ` · ${point.insertHint.startTime}` : ''}
                            {point.insertHint.detourMinutes != null
                              ? ` · 绕路约 ${point.insertHint.detourMinutes} 分钟`
                              : ''}
                            {point.insertHint.detourMethod
                              ? ` · ${formatDetourMethodLabel(point.insertHint.detourMethod)}`
                              : ''}
                          </p>
                        ) : null}
                      </div>
                      {onPlaceMapPoint && point.kind === 'candidate' && point.placeId != null ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 shrink-0 text-[10px]"
                          disabled={mapPlacePending}
                          onClick={() => onPlaceMapPoint(point)}
                        >
                          插入草案
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
              {onViewMap ? (
                <Button type="button" variant="outline" size="sm" className="mt-3 h-8 text-xs" onClick={onViewMap}>
                  打开全程地图
                </Button>
              ) : null}
            </div>
          ) : (
          <div className={cn(workbenchAttractionExploreEmptySurface, 'flex flex-col items-center justify-center px-4 py-16 text-center')}>
            <Map className="mb-2 h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">地图视图</p>
            <p className="mt-1 text-xs text-muted-foreground">
              暂无地图点位，添加候选或调整筛选后重试
            </p>
            {onViewMap ? (
              <Button type="button" variant="outline" size="sm" className="mt-3 h-8 text-xs" onClick={onViewMap}>
                打开全程地图
              </Button>
            ) : null}
          </div>
          )
        ) : sections.length === 0 ? (
          <div className={cn(workbenchAttractionExploreEmptySurface, 'px-4 py-12 text-center text-xs text-muted-foreground')}>
            暂无推荐，试试调整筛选或搜索关键词
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => (
              <section
                key={section.id}
                className={cn(
                  section.groupKind === 'experience_gap' &&
                    'rounded-xl border border-border/70 bg-card p-3',
                )}
              >
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                  {section.subtitle ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{section.subtitle}</p>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {section.items.map((item) => (
                    <AttractionExploreCard
                      key={item.id}
                      item={item}
                      inCandidates={isInCandidates(item)}
                      addPending={addPending}
                      removePending={removePending}
                      onAddToCandidates={onAddToCandidates}
                      onRemoveFromCandidates={onRemoveFromCandidates}
                      onViewDetails={onViewDetails}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
