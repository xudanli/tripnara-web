import type { GuideBundleSummary, SourceConfidenceLevel } from '@/types/guide-import';
import type { PendingConfirmation, UnderstandingPlaceView } from '@/types/guide-to-plan-api';
import { pendingConfirmationReason } from '@/lib/guide-to-plan-mapper';
import { SOURCE_CONFIDENCE_LABELS } from '@/types/guide-import';
import { AlertTriangle, BedDouble, Camera, Loader2, MapPin, RefreshCw, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  guideImportUi,
  GuideImportCard,
  GuideImportNumberedSection,
} from '@/components/guide-import/guide-import-ui';
import { GuidePlaceCandidateCard } from '@/components/guide-import/GuidePlaceCandidateCard';
import { Alert, AlertDescription } from '@/components/ui/alert';

function confidenceBadgeClass(level: SourceConfidenceLevel): string {
  if (level === 'L1') return 'bg-muted text-muted-foreground';
  if (level === 'L2') return 'bg-muted/15 text-muted-foreground';
  if (level === 'L3') return 'bg-gate-allow text-gate-allow-foreground';
  return 'bg-muted text-muted-foreground';
}

interface GuideUnderstandingSummaryProps {
  summary: GuideBundleSummary;
  guideCount: number;
  places?: UnderstandingPlaceView[];
  suggestedTripDays?: number | null;
  pendingConfirmations?: PendingConfirmation[];
  requiresTravelContext?: boolean;
  parseRequired?: boolean;
  parsedGuideCount?: number;
  onStartParse?: () => void;
  parseDisabled?: boolean;
  /** 右侧已有出行条件表单时，隐藏重复的待补充提示 */
  suppressTravelContextAlert?: boolean;
  compact?: boolean;
  /** API 模式下启用 POI 搜索 / 绑定 / 批量 rematch */
  interactivePlaces?: boolean;
  countryCode?: string | null;
  unmatchedPlaceCount?: number;
  onBindPlace?: (candidateId: string, placeId: number) => Promise<void>;
  onRejectPlace?: (candidateId: string) => Promise<void>;
  onRematchPlaces?: () => Promise<void>;
  placeActionPendingId?: string | null;
  rematchingPlaces?: boolean;
  className?: string;
  /** 为 false 时不渲染顶部导语（由双栏 header 承担，便于与右侧卡片顶对齐） */
  showIntro?: boolean;
}

export function GuideUnderstandingSummary({
  summary,
  guideCount,
  places = [],
  suggestedTripDays,
  pendingConfirmations = [],
  requiresTravelContext,
  parseRequired,
  parsedGuideCount = 0,
  onStartParse,
  parseDisabled,
  suppressTravelContextAlert = false,
  compact = false,
  interactivePlaces = false,
  countryCode,
  unmatchedPlaceCount = 0,
  onBindPlace,
  onRejectPlace,
  onRematchPlaces,
  placeActionPendingId,
  rematchingPlaces = false,
  className,
  showIntro = true,
}: GuideUnderstandingSummaryProps) {
  const poiPlaces = places.filter((p) =>
    ['poi', 'restaurant', 'hotel', 'activity'].includes(p.candidateType),
  );
  const statCards = [
    { icon: MapPin, label: '地点', value: summary.stats.placeCount },
    { icon: Utensils, label: '餐厅', value: summary.stats.restaurantCount },
    { icon: BedDouble, label: '住宿区域', value: summary.stats.accommodationCount },
    { icon: Camera, label: '旅行经验', value: summary.stats.tipCount },
    { icon: AlertTriangle, label: '待验证风险', value: summary.stats.riskCount },
  ];

  return (
    <div className={cn(compact ? guideImportUi.stackCompact : guideImportUi.stack, 'min-w-0', className)}>
      {showIntro && (
        <GuideUnderstandingIntro
          guideCount={guideCount}
          suggestedTripDays={suggestedTripDays}
          suggestedDays={summary.suggestedDays}
        />
      )}

      {parseRequired && (
        <Alert className="border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive/90 text-xs leading-relaxed space-y-2">
            <p>
              攻略尚未完成解析（已成功 {parsedGuideCount} / {guideCount} 篇）。请先解析后再生成草案。
            </p>
            {onStartParse && (
              <Button type="button" size="sm" variant="outline" disabled={parseDisabled} onClick={onStartParse}>
                开始解析
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {requiresTravelContext && pendingConfirmations.length > 0 && !suppressTravelContextAlert && (
        <Alert className="border-amber-200 bg-amber-50/50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900/80 text-xs space-y-1">
            <p>生成草案前请补充：</p>
            <ul className="list-disc pl-4">
              {pendingConfirmations.map((p) => (
                <li key={p.field}>
                  {p.label}
                  {p.required ? '（必填）' : '（建议）'}
                  {pendingConfirmationReason(p) ? ` — ${pendingConfirmationReason(p)}` : ''}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className={cn('grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-1.5 min-w-0', !compact && 'sm:gap-2')}>
        {statCards.map(({ icon: Icon, label, value }) => (
          <GuideImportCard
            key={label}
            className={cn(
              'flex items-center gap-2 min-w-0',
              compact ? 'py-2 px-2.5' : 'py-2.5 px-3',
            )}
            padding={false}
          >
            <Icon
              className={cn(
                'flex-shrink-0 text-muted-foreground',
                compact ? 'w-3.5 h-3.5' : 'w-4 h-4',
              )}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  'font-semibold tabular-nums leading-none',
                  compact ? 'text-sm' : 'text-base',
                )}
              >
                {value}
              </p>
              <p className={cn(guideImportUi.footnote, 'mt-0.5 truncate leading-tight')}>{label}</p>
            </div>
          </GuideImportCard>
        ))}
      </div>

      <GuideImportNumberedSection index={1} title="旅行主线" compact={compact}>
        <p className={cn('font-medium leading-relaxed', compact ? 'text-xs' : 'text-sm')}>
          {summary.themeSummary}
        </p>
        {summary.destinationHint && (
          <p className={cn(guideImportUi.sectionDesc, compact ? 'mt-1' : 'mt-2')}>
            推测目的地：{summary.destinationHint}
            {summary.suggestedDays ? ` · 约 ${summary.suggestedDays} 天` : ''}
          </p>
        )}
      </GuideImportNumberedSection>

      {poiPlaces.length > 0 ? (
        <GuideImportNumberedSection index={2} title="攻略中的地点" compact={compact}>
          {interactivePlaces && onRematchPlaces && (unmatchedPlaceCount ?? 0) > 0 && (
            <div className={cn('flex items-center justify-between gap-2 -mt-0.5', compact ? 'mb-2' : 'mb-3')}>
              <p className={guideImportUi.sectionDesc}>
                {unmatchedPlaceCount} 个地点待匹配
                {countryCode ? ` · 国家 ${countryCode.toUpperCase()}` : ' · 请先填写国家代码'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn('text-xs flex-shrink-0', compact ? 'h-7' : 'h-8')}
                disabled={rematchingPlaces || !countryCode}
                onClick={() => void onRematchPlaces()}
              >
                {rematchingPlaces ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                )}
                重新匹配
              </Button>
            </div>
          )}
          <div className={cn('flex overflow-x-auto pb-0.5 -mx-0.5 px-0.5', compact ? 'gap-2' : 'gap-3')}>
            {poiPlaces.slice(0, 12).map((p) => (
              <GuidePlaceCandidateCard
                key={p.id}
                place={p}
                countryCode={countryCode}
                interactive={interactivePlaces}
                actionPending={placeActionPendingId === p.id}
                onBindPlace={onBindPlace}
                onRejectPlace={onRejectPlace}
                compact={compact}
              />
            ))}
          </div>
        </GuideImportNumberedSection>
      ) : summary.places.length > 0 ? (
        <GuideImportNumberedSection index={2} title="攻略中的地点" compact={compact}>
          <div className={cn('flex overflow-x-auto pb-0.5 -mx-0.5 px-0.5', compact ? 'gap-2' : 'gap-3')}>
            {summary.places.slice(0, 12).map((p) => (
              <div
                key={p.id}
                className={cn(
                  'flex-shrink-0 rounded-lg border border-border overflow-hidden bg-card',
                  compact ? 'w-[8.75rem]' : 'w-36',
                )}
              >
                <div className={cn(compact ? 'p-1.5' : 'p-2', 'flex flex-col gap-1')}>
                  <span
                    className={cn(
                      'self-start text-[10px] px-1 py-0.5 rounded font-medium leading-none',
                      confidenceBadgeClass(p.confidence),
                    )}
                  >
                    {p.confidence}
                  </span>
                  <p className={cn('font-medium truncate', compact ? 'text-[11px]' : 'text-xs')}>{p.name}</p>
                </div>
              </div>
            ))}
          </div>
        </GuideImportNumberedSection>
      ) : null}

      {summary.riskHints.length > 0 && (
        <GuideImportNumberedSection index={3} title="发现的潜在问题" tone="warning" compact={compact}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {summary.riskHints.map((r) => (
              <div
                key={r.id}
                className={cn(guideImportUi.cardInset, 'flex gap-2 text-xs', compact ? 'p-2' : 'p-3')}
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">{r.title}</p>
                  <p className={guideImportUi.sectionDesc}>{r.description}</p>
                </div>
              </div>
            ))}
          </div>
        </GuideImportNumberedSection>
      )}

      <GuideImportCard padding compact={compact}>
        <p className={guideImportUi.label}>信息来源可信度分级</p>
        <div className={cn('flex flex-wrap gap-1.5', compact ? 'mt-1.5' : 'mt-2')}>
          {(['L1', 'L2', 'L3', 'L4', 'L5'] as SourceConfidenceLevel[]).map((level) => (
            <span
              key={level}
              className={cn(
                'text-[10px] px-2 py-1 rounded-full border border-border',
                level === 'L1' && 'border-border bg-muted/15 font-medium',
                level === 'L3' && 'border-gate-allow-border bg-gate-allow',
              )}
            >
              <strong>{level}</strong> {SOURCE_CONFIDENCE_LABELS[level]}
            </span>
          ))}
        </div>
        <p className={cn(guideImportUi.footnote, 'mt-2')}>
          填写国家代码后可批量「重新匹配」；待匹配地点可「搜索 POI」手动绑定（绑定后升为 L3），或标记「无需匹配」。
        </p>
      </GuideImportCard>
    </div>
  );
}

interface GuideUnderstandingIntroProps {
  guideCount: number;
  suggestedTripDays?: number | null;
  suggestedDays?: number | null;
}

export function GuideUnderstandingIntro({
  guideCount,
  suggestedTripDays,
  suggestedDays,
}: GuideUnderstandingIntroProps) {
  const days = suggestedTripDays ?? suggestedDays;
  return (
    <p className={guideImportUi.sectionDesc}>
      从 {guideCount} 篇攻略中合并整理，已区分灵感、主张与待验证约束
      {days != null && <> · 推测约 {days} 天行程</>}
    </p>
  );
}
