import Logo from '@/components/common/Logo';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { formatDetourMethodLabel } from '@/lib/attraction-explore-route-options.util';
import { formatLodgingLegLabel } from '@/lib/arrange-itinerary-lodging-suggestions.util';
import type {
  AttractionExploreMapLodgingLeg,
  AttractionExploreMapPoint,
} from '@/types/attraction-explore';
import {
  workbenchAccentIconClass,
  workbenchAttractionExploreAiBox,
  workbenchAttractionExploreEmptySurface,
  workbenchAttractionExploreMapPreview,
  workbenchPanelTitle,
  workbenchPrimaryAction,
  workbenchScrollable,
} from '../workbench-ui';
import { ARRANGE_ITINERARY_AI_ACTIONS, type ArrangeItineraryAiAction } from './types';

export interface ArrangeItineraryAssistantPanelProps {
  mapPoints: AttractionExploreMapPoint[];
  mapLodgingLegs?: AttractionExploreMapLodgingLeg[];
  mapLoading?: boolean;
  mapSyncEnabled?: boolean;
  aiPending?: boolean;
  aiAnswer?: string | null;
  placePending?: boolean;
  onViewMap?: () => void;
  onAiAction?: (action: ArrangeItineraryAiAction) => void;
  onPlaceMapPoint?: (point: AttractionExploreMapPoint) => void;
  mapPlacePending?: boolean;
  copilotEnabled?: boolean;
  lodgingIncomplete?: boolean;
  className?: string;
}

export function ArrangeItineraryAssistantPanel({
  mapPoints,
  mapLodgingLegs = [],
  mapLoading = false,
  mapSyncEnabled = true,
  aiPending = false,
  aiAnswer,
  placePending = false,
  onViewMap,
  onAiAction,
  onPlaceMapPoint,
  mapPlacePending = false,
  copilotEnabled = true,
  lodgingIncomplete = false,
  className,
}: ArrangeItineraryAssistantPanelProps) {
  const previewPoints = mapSyncEnabled ? mapPoints.slice(0, 6) : [];
  const previewLegs = mapSyncEnabled ? mapLodgingLegs.slice(0, 3) : [];

  function mapPointBadge(point: AttractionExploreMapPoint): string | null {
    if (point.kind === 'lodging') return '已订住宿';
    if (point.kind === 'lodging_suggestion') return '住宿候选';
    return null;
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="shrink-0 border-b border-border/50 px-3 py-1.5">
        <h2 className={workbenchPanelTitle}>路线与助手</h2>
      </div>

      <div className={cn('min-h-0 flex-1 space-y-4 overflow-y-auto p-3', workbenchScrollable)}>
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-foreground">路线地图</p>
            {onViewMap ? (
              <button type="button" className={workbenchAttractionExploreMapPreview} onClick={onViewMap}>
                打开全程地图
              </button>
            ) : null}
          </div>
          {mapLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : previewPoints.length > 0 ? (
            <ul className="space-y-1.5">
              {previewPoints.map((point, index) => (
                <li
                  key={point.id}
                  className={cn(
                    'rounded-lg border px-2.5 py-2 text-[11px]',
                    point.kind === 'lodging'
                      ? 'border-gate-allow-border/60 bg-gate-allow/10'
                      : point.kind === 'lodging_suggestion'
                        ? 'border-gate-warn-border/50 bg-gate-warn/10'
                        : point.highlighted
                          ? 'border-primary/50 bg-card'
                          : 'border-border/55 bg-card',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className={cn('inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold', workbenchAccentIconClass)}>
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-medium text-foreground">{point.name}</p>
                        {mapPointBadge(point) ? (
                          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                            {mapPointBadge(point)}
                          </span>
                        ) : null}
                      </div>
                      {point.dayIndex != null && point.kind?.startsWith('lodging') ? (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          第 {point.dayIndex} 晚
                          {point.lodgingRole === 'overnight' ? ' · 过夜' : ' · 建议'}
                        </p>
                      ) : null}
                      {point.insertHint ? (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          第 {point.insertHint.suggestedDayIndex} 天
                          {point.insertHint.detourMinutes != null
                            ? ` · 绕路约 ${point.insertHint.detourMinutes} 分钟`
                            : ''}
                          {point.insertHint.detourMethod
                            ? ` · ${formatDetourMethodLabel(point.insertHint.detourMethod)}`
                            : ''}
                        </p>
                      ) : null}
                      {onPlaceMapPoint && point.kind === 'candidate' && point.placeId != null ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-1.5 h-6 px-2 text-[10px]"
                          disabled={mapPlacePending || placePending}
                          onClick={() => onPlaceMapPoint(point)}
                        >
                          地图插入
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
              {mapPoints.length > previewPoints.length ? (
                <p className="text-[10px] text-muted-foreground">
                  还有 {mapPoints.length - previewPoints.length} 个点位
                </p>
              ) : null}
              {previewLegs.length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-border/40 pt-2">
                  {previewLegs.map((leg) => (
                    <li key={`leg-${leg.dayIndex}-${leg.fromPointId ?? ''}`} className="text-[10px] text-muted-foreground">
                      {formatLodgingLegLabel(leg)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </ul>
          ) : (
            <div className={cn(workbenchAttractionExploreEmptySurface, 'px-3 py-6 text-center text-[11px] text-muted-foreground')}>
              {mapSyncEnabled ? '暂无地图点位' : '地图联动已关闭'}
            </div>
          )}
        </section>

        <section className={workbenchAttractionExploreAiBox}>
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background">
              <Logo variant="icon" size={16} color="currentColor" className="text-foreground" />
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground">帮我继续规划</p>
              <p className="text-[10px] text-muted-foreground">
                {copilotEnabled
                  ? '基于当前日程与候选给出调整（生成草案后确认）'
                  : '手动模式：仅展示冲突与局部建议'}
              </p>
            </div>
          </div>

          {aiAnswer ? (
            <p className="mb-3 rounded-lg border border-border/50 bg-background/80 px-2.5 py-2 text-[11px] leading-relaxed text-foreground">
              {aiAnswer}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {ARRANGE_ITINERARY_AI_ACTIONS.map((action) => {
              const emphasizeLodging =
                lodgingIncomplete && action.emphasizeWhenLodgingIncomplete;
              return (
              <Button
                key={action.id}
                type="button"
                variant={emphasizeLodging ? 'default' : 'outline'}
                size="sm"
                disabled={aiPending || !copilotEnabled}
                className={cn(
                  'h-8 text-[11px]',
                  action.id === 'fill_gaps' && !emphasizeLodging && workbenchPrimaryAction,
                  emphasizeLodging && 'col-span-2',
                )}
                onClick={() => onAiAction?.(action.id)}
              >
                {action.label}
              </Button>
            );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
