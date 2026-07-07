import Logo from '@/components/common/Logo';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { formatDetourMethodLabel } from '@/lib/attraction-explore-route-options.util';
import type { AttractionExploreCandidate, AttractionExploreMapPoint } from '@/types/attraction-explore';
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
  candidates: AttractionExploreCandidate[];
  mapPoints: AttractionExploreMapPoint[];
  mapLoading?: boolean;
  mapSyncEnabled?: boolean;
  aiPending?: boolean;
  aiAnswer?: string | null;
  placePending?: boolean;
  onViewMap?: () => void;
  onAiAction?: (action: ArrangeItineraryAiAction) => void;
  onPlaceCandidate?: (candidateId: string) => void;
  onPlaceMapPoint?: (point: AttractionExploreMapPoint) => void;
  mapPlacePending?: boolean;
  copilotEnabled?: boolean;
  className?: string;
}

export function ArrangeItineraryAssistantPanel({
  candidates,
  mapPoints,
  mapLoading = false,
  mapSyncEnabled = true,
  aiPending = false,
  aiAnswer,
  placePending = false,
  onViewMap,
  onAiAction,
  onPlaceCandidate,
  onPlaceMapPoint,
  mapPlacePending = false,
  copilotEnabled = true,
  className,
}: ArrangeItineraryAssistantPanelProps) {
  const previewPoints = mapSyncEnabled ? mapPoints.slice(0, 6) : [];

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
                    point.highlighted
                      ? 'border-primary/50 bg-card'
                      : 'border-border/55 bg-card',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className={cn('inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold', workbenchAccentIconClass)}>
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{point.name}</p>
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
            </ul>
          ) : (
            <div className={cn(workbenchAttractionExploreEmptySurface, 'px-3 py-6 text-center text-[11px] text-muted-foreground')}>
              {mapSyncEnabled ? '暂无地图点位' : '地图联动已关闭'}
            </div>
          )}
        </section>

        <section>
          <p className="mb-2 text-xs font-medium text-foreground">待编排景点</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {candidates.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">暂无候选</p>
            ) : (
              candidates.slice(0, 8).map((candidate) => (
                <div
                  key={candidate.id}
                  className="w-[120px] shrink-0 rounded-xl border border-border/55 bg-card p-2"
                >
                  {candidate.imageUrl ? (
                    <img
                      src={candidate.imageUrl}
                      alt=""
                      className="mb-1.5 h-14 w-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="mb-1.5 flex h-14 items-center justify-center rounded-md bg-muted/30 text-[10px] text-muted-foreground">
                      POI
                    </div>
                  )}
                  <p className="line-clamp-2 text-[10px] font-medium leading-snug text-foreground">
                    {candidate.name}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 w-full text-[10px]"
                    disabled={placePending}
                    onClick={() => onPlaceCandidate?.(candidate.id)}
                  >
                    拖入日程
                  </Button>
                </div>
              ))
            )}
          </div>
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
            {ARRANGE_ITINERARY_AI_ACTIONS.map((action) => (
              <Button
                key={action.id}
                type="button"
                variant="outline"
                size="sm"
                disabled={aiPending || !copilotEnabled}
                className={cn('h-8 text-[11px]', action.id === 'fill_gaps' && workbenchPrimaryAction)}
                onClick={() => onAiAction?.(action.id)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
