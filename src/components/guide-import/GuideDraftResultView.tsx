import { useMemo } from 'react';
import { toast } from 'sonner';
import type { GuideBundleSummary, GuideSource, PlanCandidate } from '@/types/guide-import';
import type { GuidePlanCandidateDetailView } from '@/types/guide-to-plan-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  detectGuidePlatform,
  getGuideDisplayTitle,
  PLATFORM_LABELS,
} from '@/lib/guide-source-display';
import {
  buildPlanVariantSlots,
  feasibilityScoreLabel,
  itineraryDraftToTableRows,
  presentPlanCandidate,
  routeStopsFromDraft,
} from '@/lib/guide-to-plan-mapper';
import { AlertTriangle, CheckCircle2, Info, List, Loader2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuideDraftDayOverview } from '@/components/guide-import/GuideDraftDayOverview';
import { GuideDraftRouteMapStrip } from '@/components/guide-import/GuideDraftRouteMapStrip';
import {
  GuideImportCard,
  GuideImportFooterActions,
  GuideImportScrollX,
  GuideImportSectionHeader,
  GuideImportSidebarPanel,
  guideImportPrimaryButtonClass,
  guideImportUi,
} from '@/components/guide-import/guide-import-ui';

const FALLBACK_DAYS = [
  {
    day: 1,
    theme: '抵达雷克雅未克',
    route: '雷克雅未克机场 → 取车 → 蓝湖（可选）→ 雷克雅未克',
    drive: '50 km · 1h',
    stay: '雷克雅未克',
    driveKm: '50 km',
    driveHours: '1h',
  },
  {
    day: 2,
    theme: '南岸瀑布',
    route: '雷市 → 塞里雅兰 → 斯科加 → 维克',
    drive: '180 km · 3.5h',
    stay: '维克',
    driveKm: '180 km',
    driveHours: '3.5h',
  },
  {
    day: 3,
    theme: '黑沙滩与冰河湖',
    route: '维克 → 黑沙滩 → 冰河湖 → 钻石沙滩',
    drive: '140 km · 2.5h',
    stay: '霍芬',
    driveKm: '140 km',
    driveHours: '2.5h',
  },
];

interface GuideDraftResultViewProps {
  candidate: PlanCandidate;
  planDetail: GuidePlanCandidateDetailView;
  planCandidates: GuidePlanCandidateDetailView[];
  onSelectPlanCandidate: (id: string) => void;
  loadingPlanDetail?: boolean;
  summary: GuideBundleSummary;
  sources: GuideSource[];
  tripContextLabel?: string;
  onViewComparison: () => void;
  onEnterPlanning: () => void;
  onDiscuss?: () => void;
  entering?: boolean;
  acceptDisabled?: boolean;
  expandingVariants?: boolean;
  className?: string;
}

export function GuideDraftResultView({
  candidate,
  planDetail,
  planCandidates,
  onSelectPlanCandidate,
  loadingPlanDetail,
  summary,
  sources,
  tripContextLabel,
  onViewComparison,
  onEnterPlanning,
  onDiscuss,
  entering,
  acceptDisabled,
  expandingVariants = false,
  className,
}: GuideDraftResultViewProps) {
  const dayCount = summary.suggestedDays ?? planDetail.itineraryDraft?.days?.length ?? 6;
  const dest = summary.destinationHint ?? tripContextLabel?.split('·')[0]?.trim() ?? '目的地';

  const variantSlots = useMemo(
    () => buildPlanVariantSlots(planCandidates),
    [planCandidates],
  );

  const activePresentation = useMemo(
    () => presentPlanCandidate(planDetail),
    [planDetail],
  );

  const tableRows = useMemo(() => {
    const fromDraft = itineraryDraftToTableRows(planDetail.itineraryDraft);
    return fromDraft.length > 0 ? fromDraft : FALLBACK_DAYS;
  }, [planDetail.itineraryDraft]);

  const routeStops = useMemo(() => {
    const stops = routeStopsFromDraft(planDetail.itineraryDraft);
    return stops.length > 0 ? stops : ['雷克雅未克', '塞里雅兰', '维克', '黑沙滩', '冰河湖', '霍芬'];
  }, [planDetail.itineraryDraft]);

  const pendingItems =
    planDetail.pendingConfirmations?.map((p) => p.label) ??
    candidate.pendingConfirmations ??
    [];

  const feasibility = planDetail.feasibilityScore ?? candidate.feasibilityScore;

  const warningText =
    planDetail.warnings?.[0] ??
    '尚未完整验证，请在进入正式规划前确认约束与可执行性';

  return (
    <div className={cn(guideImportUi.stackCompact, 'min-w-0', className)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className={guideImportUi.pageTitleCompact}>
              {dest}
              {typeof dayCount === 'number' ? ` · ${dayCount}天行程草案` : ' · 行程草案'}
            </h2>
            <Badge className="bg-muted/15 text-muted-foreground hover:bg-muted/15 border border-border">
              攻略生成草案
            </Badge>
          </div>
          {tripContextLabel && (
            <p className={cn(guideImportUi.sectionDesc, 'mt-1')}>{tripContextLabel}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onViewComparison}>
            <List className="w-3.5 h-3.5 mr-1" />
            查看逐项
          </Button>
          {onDiscuss && (
            <Button type="button" variant="outline" size="sm" onClick={onDiscuss}>
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              与 Nara 讨论
            </Button>
          )}
        </div>
      </div>

      <Alert className="border-amber-200 bg-amber-50/50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-900/80 text-sm">{warningText}</AlertDescription>
      </Alert>

      <GuideImportScrollX contentClassName="w-full min-w-[720px] xl:min-w-0">
        <div className={cn(guideImportUi.gridMainSidebarWide, 'items-start')}>
          <div className={cn(guideImportUi.stackCompact, loadingPlanDetail && 'opacity-60 pointer-events-none')}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {variantSlots.map((slot) => {
                if (slot.status === 'ready') {
                  const v = slot.candidate;
                  const active = v.id === planDetail.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => onSelectPlanCandidate(v.id)}
                      className={cn(
                        'rounded-xl border p-4 text-left transition-all relative min-h-[120px] flex flex-col',
                        active
                          ? 'border-foreground/50 bg-muted/20 ring-1 ring-foreground/15'
                          : 'border-border bg-card hover:border-foreground/20',
                      )}
                    >
                      {active && !loadingPlanDetail && (
                        <CheckCircle2 className="w-4 h-4 absolute top-3 right-3 text-foreground" />
                      )}
                      {active && loadingPlanDetail && (
                        <Loader2 className="w-4 h-4 animate-spin absolute top-3 right-3 text-muted-foreground" />
                      )}
                      <p className={guideImportUi.sectionTitle}>{v.displayLabel}</p>
                      <p className={cn(guideImportUi.sectionDesc, 'mt-1 flex-1')}>
                        {v.displayDescription}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {v.displayTags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted/40 text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                        {v.recommended && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/15 text-gate-allow-foreground font-medium">
                            推荐
                          </span>
                        )}
                      </div>
                    </button>
                  );
                }

                return (
                  <div
                    key={slot.variant}
                    className={cn(
                      'rounded-xl border border-dashed p-4 text-left relative min-h-[120px] flex flex-col',
                      expandingVariants ? 'border-border bg-muted/10' : 'border-border/70 bg-muted/5 opacity-80',
                    )}
                  >
                    {expandingVariants && (
                      <Loader2 className="w-4 h-4 animate-spin absolute top-3 right-3 text-muted-foreground" />
                    )}
                    <p className={guideImportUi.sectionTitle}>{slot.label}</p>
                    <p className={cn(guideImportUi.sectionDesc, 'mt-1 flex-1')}>{slot.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {slot.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted/40 text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className={cn(guideImportUi.footnote, 'mt-2')}>
                      {expandingVariants ? '正在生成此版本…' : '暂未生成'}
                    </p>
                  </div>
                );
              })}
            </div>

            <GuideDraftRouteMapStrip
              stops={routeStops}
              onViewMap={() => toast.info('进入正式规划后可在工作台查看完整地图')}
            />

            <GuideDraftDayOverview
              title={`${dayCount} 天行程概览（${activePresentation.displayLabel}）`}
              rows={tableRows}
            />
          </div>

          <GuideImportSidebarPanel compact className="space-y-3">
            <GuideImportCard compact padding>
              <GuideImportSectionHeader title="攻略来源" compact />
              {sources.slice(0, 3).map((s) => (
                <p key={s.id} className="text-xs truncate">
                  {PLATFORM_LABELS[detectGuidePlatform(s)]} · {getGuideDisplayTitle(s)}
                </p>
              ))}
            </GuideImportCard>

            <GuideImportCard compact className={cn(guideImportUi.highlightSurface, 'text-center')} padding>
              <p className={guideImportUi.label}>可执行性状态</p>
              <p className="text-3xl font-bold text-muted-foreground tabular-nums mt-2">
                {feasibility != null ? `${Math.round(feasibility)}%` : '—'}
              </p>
              <p className={cn(guideImportUi.sectionDesc, 'mt-1')}>
                {feasibilityScoreLabel(feasibility)}
              </p>
            </GuideImportCard>

            <GuideImportCard compact padding>
              <GuideImportSectionHeader title="与原攻略相比改动" compact />
              <ul className="space-y-1.5">
                {candidate.adjustments.slice(0, 4).map((a) => (
                  <li key={a.id} className={cn(guideImportUi.sectionDesc, 'flex gap-1.5')}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />
                    {a.adjustedPlan}
                  </li>
                ))}
                {candidate.adjustments.length === 0 && (
                  <li className={guideImportUi.sectionDesc}>暂无显著调整项</li>
                )}
              </ul>
            </GuideImportCard>

            {pendingItems.length > 0 && (
              <div className={guideImportUi.tipBox}>
                <h4 className="text-xs font-semibold text-amber-900">待确认</h4>
                <ul className="text-[11px] text-amber-900/80 space-y-1 list-disc pl-4 mt-2">
                  {pendingItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">{candidate.disclaimer}</AlertDescription>
            </Alert>
          </GuideImportSidebarPanel>
        </div>
      </GuideImportScrollX>

      <GuideImportFooterActions
        compact
        primary={
          <Button
            type="button"
            className={guideImportPrimaryButtonClass('min-w-[200px]')}
            disabled={entering || acceptDisabled}
            onClick={onEnterPlanning}
          >
            {entering ? '创建中…' : acceptDisabled ? '草案未就绪' : '进入正式规划'}
          </Button>
        }
      />
    </div>
  );
}
