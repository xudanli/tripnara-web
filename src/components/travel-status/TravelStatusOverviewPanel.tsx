import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import TravelStatusMetricStrip from '@/components/travel-status/TravelStatusMetricStrip';
import TravelStatusExecutabilityBanner from '@/components/travel-status/TravelStatusExecutabilityBanner';
import TravelStatusSection from '@/components/travel-status/TravelStatusSection';
import TravelStatusDecisionCards from '@/components/travel-status/TravelStatusDecisionCards';
import TravelStatusAiWorkTimeline from '@/components/travel-status/TravelStatusAiWorkTimeline';
import TravelStatusMonitoringSection from '@/components/travel-status/TravelStatusMonitoringSection';
import TravelStatusEffectivePlanCard from '@/components/travel-status/TravelStatusEffectivePlanCard';
import TravelStatusAutomationSummary from '@/components/travel-status/TravelStatusAutomationSummary';
import TravelStatusIntentInput from '@/components/travel-status/TravelStatusIntentInput';
import { TripCtreStructuredProgressSection, shouldShowTripCtrePanel } from '@/features/agent/ctre';
import { useTravelStatus, useTripIntent } from '@/hooks/useTravelStatus';
import { handleTripIntentResult } from '@/lib/travel-status-intent.util';
import { resolveSuggestedConfirmCount } from '@/lib/travel-status-display.util';
import {
  useTripTravelContext,
  resolveUnifiedOpenDecisionCount,
  resolveUnifiedMonitoringCount,
  resolveUnifiedDecisionQueueItems,
  acceptTripDecisionViaIntent,
} from '@/features/trip-context';
import { buildPlanStudioDecisionProblemPath } from '@/lib/plan-studio-decision-navigation.util';
import {
  buildTripAiActivityLogPath,
  buildTripContextSnapshotPath,
} from '@/lib/travel-status-navigation.util';
import {
  trackTravelStatusMetricClick,
} from '@/utils/trip-detail-analytics';
import { ConstraintEditDrawer } from '@/components/constraints';
import { TripConditionCards } from '@/components/trip-world-state';
import { buildTripConditionCards } from '@/lib/trip-overview-view.util';
import { travelStatusSnapshotShell } from './travel-status-ui';
import type { TripStatusBarSection } from '@/components/trip-world-state';
import type { DecisionQueueActionState } from '@/api/travel-status.types';
import type { TripDetail } from '@/types/trip';

interface TravelStatusOverviewPanelProps {
  tripId: string;
  trip?: TripDetail | null;
  onOpenTimeline?: () => void;
  /** 顶部摘要已由 TripWorldStateBar 承担（概览 Tab） */
  skipTopSummary?: boolean;
  /** @deprecated 决策/监控已合并进概览；保留兼容旧调用 */
  companionMode?: boolean;
  scrollToSection?: TripStatusBarSection | null;
  onScrollToSectionHandled?: () => void;
  onViewFeasibility?: () => void;
  className?: string;
  /** 行程详情概览 Tab — 紧凑密度 */
  compact?: boolean;
  /** 行程详情概览 Tab — 精简 IA（指标 + 待办 + 上下文） */
  overviewLayout?: boolean;
}

export default function TravelStatusOverviewPanel({
  tripId,
  trip,
  onOpenTimeline,
  skipTopSummary = false,
  companionMode = false,
  scrollToSection,
  onScrollToSectionHandled,
  onViewFeasibility,
  className,
  compact = false,
  overviewLayout = false,
}: TravelStatusOverviewPanelProps) {
  const navigate = useNavigate();
  const decisionQueueRef = useRef<HTMLDivElement>(null);
  const verificationRef = useRef<HTMLDivElement>(null);
  const monitoringRef = useRef<HTMLDivElement>(null);
  const [constraintDrawerOpen, setConstraintDrawerOpen] = useState(false);

  const {
    status,
    isLoading,
    isFetching,
    error,
    isUnavailable,
    refresh,
    acceptRecommended,
    isAccepting,
    acceptingProblemId,
    submitQueueAction,
    isSubmittingQueueAction,
    submittingQueueAction,
    scanMonitoring,
    isScanning,
  } = useTravelStatus({ tripId });

  const { preview, previewIntent, submitIntent, isSubmitting, clearPreview } = useTripIntent({
    tripId,
  });

  const scrollToDecisionQueue = useCallback(() => {
    decisionQueueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const scrollToVerification = useCallback(() => {
    verificationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const scrollToMonitoring = useCallback(() => {
    monitoringRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const {
    enabled: tripContextEnabled,
    ready: tripContextReady,
    openDecisionCount: contextOpenDecisionCount,
    monitoringCount: contextMonitoringCount,
    decisionsView,
    overviewView,
    submitTripIntent,
    refresh: refreshTripContext,
  } = useTripTravelContext();

  const pendingVerificationCount = status?.pendingVerification?.items?.length ?? 0;
  const hasInlineVerificationItems = pendingVerificationCount > 0;
  const suggestedConfirmCount = useMemo(
    () =>
      status
        ? resolveSuggestedConfirmCount({
            issueCount: status.executability.issueCount,
            pendingVerificationCount,
            executabilityHeadline: status.executability.headline,
          })
        : 0,
    [status, pendingVerificationCount],
  );

  const handleViewAlternatives = useCallback(
    (problemId: string) => {
      navigate(buildPlanStudioDecisionProblemPath(tripId, problemId, { fromTravel: true }));
    },
    [navigate, tripId],
  );

  const handleQueueSecondaryAction = useCallback(
    async (
      problemId: string,
      actionState: DecisionQueueActionState | undefined,
      actionKind: 'keepOriginal' | 'defer',
    ) => {
      if (!actionState) return;
      try {
        await submitQueueAction({ problemId, actionState, actionKind });
      } catch (err) {
        toast.error((err as Error)?.message ?? '操作失败');
      }
    },
    [submitQueueAction],
  );

  const handleRefreshAll = useCallback(async () => {
    const next = await refresh();
    if (tripContextEnabled) {
      await refreshTripContext();
    }
    return next;
  }, [refresh, refreshTripContext, tripContextEnabled]);

  const handleAcceptRecommended = useCallback(
    async (problemId: string) => {
      try {
        const prevVersion = status?.effectivePlan?.versionId;
        if (tripContextEnabled && tripContextReady) {
          await acceptTripDecisionViaIntent(submitTripIntent, decisionsView, problemId);
        } else {
          await acceptRecommended(problemId);
        }
        const next = await handleRefreshAll();
        const nextVersion = next?.effectivePlan?.versionId;
        if (nextVersion && nextVersion !== prevVersion) {
          toast.success('行程已更新', { description: '当前有效行程版本已变更' });
        } else {
          toast.success('已接受推荐方案');
        }
      } catch (err) {
        toast.error((err as Error)?.message ?? '接受方案失败');
      }
    },
    [
      acceptRecommended,
      handleRefreshAll,
      tripContextEnabled,
      tripContextReady,
      submitTripIntent,
      decisionsView,
      status?.effectivePlan?.versionId,
    ],
  );

  const handleIntentSubmit = useCallback(
    async (message: string) => {
      try {
        const result = await submitIntent({ message });
        clearPreview();
        handleTripIntentResult(result, {
          navigate,
          tripId,
          scrollToDecisionQueue,
        });
        await handleRefreshAll();
        return result;
      } catch (err) {
        toast.error((err as Error)?.message ?? '无法理解该请求');
        throw err;
      }
    },
    [submitIntent, clearPreview, navigate, tripId, scrollToDecisionQueue, handleRefreshAll],
  );

  const handleRefreshMonitoring = useCallback(async () => {
    try {
      await scanMonitoring(0);
      if (tripContextEnabled) {
        await refreshTripContext();
      }
      toast.success('监控已刷新');
    } catch (err) {
      toast.error((err as Error)?.message ?? '刷新监控失败');
    }
  }, [scanMonitoring, tripContextEnabled, refreshTripContext]);

  const handleMetricClick = useCallback(
    (
      metricKey: string,
      metricValue: number | string,
      target: string,
      action: () => void,
    ) => {
      trackTravelStatusMetricClick({ tripId, metricKey, metricValue, target });
      action();
    },
    [tripId],
  );

  const goToSuggestedConfirm = useCallback(() => {
    if (!hasInlineVerificationItems && suggestedConfirmCount > 0) {
      navigate(`/dashboard/plan-studio?tripId=${tripId}&tab=tasks`);
      return;
    }
    scrollToVerification();
  }, [
    hasInlineVerificationItems,
    suggestedConfirmCount,
    navigate,
    tripId,
    scrollToVerification,
  ]);

  useEffect(() => {
    if (!scrollToSection) return;
    if (scrollToSection === 'decisions') scrollToDecisionQueue();
    else if (scrollToSection === 'verify') goToSuggestedConfirm();
    else if (scrollToSection === 'monitor') scrollToMonitoring();
    onScrollToSectionHandled?.();
  }, [
    scrollToSection,
    scrollToDecisionQueue,
    goToSuggestedConfirm,
    scrollToMonitoring,
    onScrollToSectionHandled,
  ]);

  if (isLoading) {
    return (
      <div className="space-y-2.5">
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && isUnavailable) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">旅行状态暂不可用</CardTitle>
          <CardDescription>
            travel-status 接口尚未就绪。您仍可查看时间轴或进入 Plan Studio。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {onOpenTimeline ? (
            <Button variant="outline" size="sm" onClick={onOpenTimeline}>
              查看时间轴
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/dashboard/plan-studio?tripId=${tripId}`)}
          >
            进入 Plan Studio
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error || !status) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">加载失败</CardTitle>
          <CardDescription>{(error as Error)?.message ?? '无法获取旅行状态'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" onClick={() => void refresh()}>
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  const bffOpenDecisionCount = status.openDecisions.length;
  const decisionQueueItems = resolveUnifiedDecisionQueueItems({
    travelContextEnabled: tripContextEnabled,
    travelContextReady: tripContextReady,
    decisionsView,
    bffItems: status.openDecisions,
  });
  const openDecisionCount = resolveUnifiedOpenDecisionCount({
    travelContextEnabled: tripContextEnabled,
    travelContextReady: tripContextReady,
    contextOpenCount: contextOpenDecisionCount,
    bffOpenCount: bffOpenDecisionCount,
  });
  const aiWorkCount = status.aiCompletedWork?.items?.length ?? 0;
  const bffMonitoringCount = status.monitoring?.activeCount ?? 0;
  const monitoringAlerts = resolveUnifiedMonitoringCount({
    travelContextEnabled: tripContextEnabled,
    travelContextReady: tripContextReady,
    contextMonitoringCount: contextMonitoringCount,
    bffMonitoringCount,
  });

  const conditionCards = buildTripConditionCards(status, overviewView);

  const metricStripItems = [
    {
      key: 'decisions',
      label: '待你决定',
      value: openDecisionCount,
      tone: openDecisionCount > 0 ? ('warning' as const) : ('neutral' as const),
      onClick: () =>
        handleMetricClick('decisions', openDecisionCount, 'decision_queue', scrollToDecisionQueue),
    },
    {
      key: 'verify',
      label: hasInlineVerificationItems ? '建议确认' : '建议确认',
      value: suggestedConfirmCount,
      tone: suggestedConfirmCount > 0 ? ('warning' as const) : ('success' as const),
      onClick:
        suggestedConfirmCount > 0
          ? () =>
              handleMetricClick(
                'verify',
                suggestedConfirmCount,
                hasInlineVerificationItems ? 'verification_section' : 'plan_studio_tasks',
                hasInlineVerificationItems
                  ? scrollToVerification
                  : () => navigate(`/dashboard/plan-studio?tripId=${tripId}&tab=tasks`),
              )
          : undefined,
    },
    {
      key: 'monitor',
      label: '监控告警',
      value: monitoringAlerts,
      tone: monitoringAlerts > 0 ? ('danger' as const) : ('neutral' as const),
      onClick: () =>
        handleMetricClick('monitor', monitoringAlerts, 'monitoring_section', scrollToMonitoring),
    },
    {
      key: 'ai',
      label: 'AI 活动',
      value: aiWorkCount,
      tone: 'neutral' as const,
      onClick:
        aiWorkCount > 0
          ? () =>
              handleMetricClick('ai', aiWorkCount, 'ai_activity_log', () =>
                navigate(buildTripAiActivityLogPath(tripId)),
              )
          : undefined,
    },
  ];

  const showVerificationSection =
    hasInlineVerificationItems || (suggestedConfirmCount > 0 && !overviewLayout);

  const showFullTopSummary = !skipTopSummary;
  const showOverviewMetricStrip = overviewLayout && skipTopSummary;

  const hasDecisionQueueContent = openDecisionCount > 0;
  const overviewPrimaryTodos = hasDecisionQueueContent || showVerificationSection;
  const monitoringInMainColumn = overviewLayout && !overviewPrimaryTodos;
  const monitoringItemLayout = overviewLayout ? 'grid' : 'list';

  const monitoringSectionNode = !companionMode ? (
    <div ref={monitoringRef}>
      <TravelStatusSection compact={compact} title="监控与复核">
        <TravelStatusMonitoringSection
          items={status.monitoring?.items ?? []}
          activeCount={monitoringAlerts}
          onRefresh={() => void handleRefreshMonitoring()}
          isRefreshing={isScanning}
          compact={overviewLayout}
          itemLayout={monitoringItemLayout}
        />
      </TravelStatusSection>
    </div>
  ) : null;

  return (
    <div className={className}>
      <div className={compact ? 'space-y-2.5' : 'space-y-4'}>
        {showFullTopSummary ? (
          <div className={cn(travelStatusSnapshotShell, compact && 'shadow-none')}>
            <TravelStatusExecutabilityBanner
              embedded
              status={status.executability.status}
              headline={status.executability.headline}
              subheadline={status.executability.subheadline}
              suggestedConfirmCount={suggestedConfirmCount}
              onReviewSuggested={suggestedConfirmCount > 0 ? scrollToVerification : undefined}
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground"
                  disabled={isFetching}
                  onClick={() => void handleRefreshAll()}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
                  {isFetching ? '刷新中' : '刷新'}
                </Button>
              }
            />

            <TravelStatusMetricStrip variant="strip" items={metricStripItems} />
          </div>
        ) : null}

        {showOverviewMetricStrip ? (
          <div className={cn(travelStatusSnapshotShell, 'shadow-none overflow-hidden')}>
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">待办与监控</p>
              <div className="flex items-center gap-1">
                {onViewFeasibility ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-6 px-1.5 text-[10px] text-muted-foreground"
                    onClick={onViewFeasibility}
                  >
                    查看完整可行性
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-[10px] text-muted-foreground"
                  disabled={isFetching}
                  onClick={() => void handleRefreshAll()}
                >
                  <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
                  刷新
                </Button>
              </div>
            </div>
            <TravelStatusMetricStrip variant="strip" items={metricStripItems} />
          </div>
        ) : null}

        {overviewLayout && conditionCards.length > 0 ? (
          <TripConditionCards items={conditionCards} layout="dense" className="shadow-none" />
        ) : null}

        <div
          className={cn(
            'grid lg:items-start',
            overviewLayout
              ? 'lg:grid-cols-2'
              : 'lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]',
            compact ? 'gap-2.5 lg:gap-3' : 'gap-4 lg:gap-5',
          )}
        >
          <div className={compact ? 'space-y-2.5' : 'space-y-4'}>
            {!companionMode ? (
              <>
            <div ref={decisionQueueRef}>
              <TravelStatusSection
                compact={compact}
                id="travel-decisions"
                title="需要你决定"
                description={
                  openDecisionCount > 0
                    ? `${openDecisionCount} 项待处理 · 接受推荐后将更新有效行程`
                    : overviewLayout
                      ? undefined
                      : '暂无必须拍板的事项'
                }
              >
                <TravelStatusDecisionCards
                  items={decisionQueueItems}
                  compactEmpty={overviewLayout && !hasDecisionQueueContent}
                  suggestedConfirmCount={overviewLayout ? 0 : suggestedConfirmCount}
                  onScrollToVerification={overviewLayout ? undefined : scrollToVerification}
                  onAcceptRecommended={handleAcceptRecommended}
                  onViewAlternatives={handleViewAlternatives}
                  onKeepOriginal={(problemId, action) =>
                    void handleQueueSecondaryAction(problemId, action, 'keepOriginal')
                  }
                  onDefer={(problemId, action) =>
                    void handleQueueSecondaryAction(problemId, action, 'defer')
                  }
                  acceptingProblemId={isAccepting ? acceptingProblemId : null}
                  submittingAction={
                    isSubmittingQueueAction && submittingQueueAction
                      ? {
                          problemId: submittingQueueAction.problemId,
                          kind: submittingQueueAction.actionKind,
                        }
                      : null
                  }
                />
              </TravelStatusSection>
            </div>

            {showVerificationSection ? (
              <div ref={verificationRef}>
                <TravelStatusSection
                  compact={compact}
                  id="travel-verification"
                  title="建议确认"
                  description={
                    hasInlineVerificationItems
                      ? '非阻塞项 · 确认后提升行程把握度'
                      : `${suggestedConfirmCount} 项在规划工作台 · 非阻塞 · 确认后提升把握度`
                  }
                >
                  {(status.pendingVerification?.items ?? []).length > 0 ? (
                    <ul className="space-y-1.5">
                      {(status.pendingVerification?.items ?? []).map((item) => (
                        <li
                          key={item.id}
                          className="rounded-md border border-gate-confirm-border/35 bg-gate-confirm/5 px-2.5 py-2"
                        >
                          <p className="text-xs font-medium text-foreground">{item.label}</p>
                          {item.summary ? (
                            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                              {item.summary}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-md border border-gate-confirm-border/35 bg-gate-confirm/5 px-2.5 py-2">
                      <p className="text-xs font-medium text-foreground">
                        共 {suggestedConfirmCount} 项建议确认
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        这些项在规划工作台的行前任务中，不在本页逐条列出。确认后将提升行程可执行把握度。
                      </p>
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => navigate(`/dashboard/plan-studio?tripId=${tripId}&tab=tasks`)}
                    >
                      {hasInlineVerificationItems ? '前往 Plan Studio 处理' : `在 Plan Studio 查看 ${suggestedConfirmCount} 项`}
                    </Button>
                    {onOpenTimeline ? (
                      <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={onOpenTimeline}>
                        查看时间轴详情
                      </Button>
                    ) : null}
                  </div>
                </TravelStatusSection>
              </div>
            ) : null}

            {monitoringInMainColumn && suggestedConfirmCount > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gate-confirm-border/35 bg-gate-confirm/5 px-2.5 py-2">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">{suggestedConfirmCount} 项建议确认</span>
                  {' '}
                  · 在 Plan Studio 行前任务中处理，确认后提升把握度
                </p>
                <Button
                  size="sm"
                  className="h-7 shrink-0 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={goToSuggestedConfirm}
                >
                  去确认
                </Button>
              </div>
            ) : null}

            {monitoringInMainColumn ? monitoringSectionNode : null}

            {!overviewLayout ? (
            <TravelStatusSection compact={compact} title="问 AI" description="自然语言提问或发起修改">
              <TravelStatusIntentInput
                preview={preview}
                onPreview={previewIntent}
                onSubmit={handleIntentSubmit}
                isSubmitting={isSubmitting}
              />
            </TravelStatusSection>
            ) : null}
              </>
            ) : null}
          </div>

          <aside
            className={cn(
              compact ? 'space-y-2.5' : 'space-y-4',
              !overviewLayout && (compact ? 'lg:sticky lg:top-2' : 'lg:sticky lg:top-4'),
            )}
          >
            {!overviewLayout && conditionCards.length > 0 ? (
              <TripConditionCards items={conditionCards} className="shadow-none" />
            ) : null}

            {!overviewLayout && shouldShowTripCtrePanel(tripId) ? (
              <TravelStatusSection
                compact={compact}
                title="CTRE 行程结构化"
                description="最近一次旅行编译进度（POI · 路线 · 依赖）"
              >
                <TripCtreStructuredProgressSection
                  tripId={tripId}
                  compact
                  onOpenPlanStudio={() =>
                    navigate(`/dashboard/plan-studio?tripId=${encodeURIComponent(tripId)}`)
                  }
                />
              </TravelStatusSection>
            ) : null}

            <TravelStatusSection
              compact={compact}
              title="当前可执行行程"
              description={overviewLayout ? '有效版本 · 与约束偏好同步' : undefined}
              action={
                overviewLayout ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
                    onClick={() => setConstraintDrawerOpen(true)}
                  >
                    <SlidersHorizontal className="h-3 w-3" aria-hidden />
                    调整约束
                  </Button>
                ) : undefined
              }
            >
              <TravelStatusEffectivePlanCard
                plan={status.effectivePlan}
                onOpenPlanStudio={() => navigate(`/dashboard/plan-studio?tripId=${tripId}`)}
              />
            </TravelStatusSection>

            {!companionMode ? (
              <>
                {!monitoringInMainColumn ? monitoringSectionNode : null}

                {!overviewLayout ? (
                <TravelStatusSection
                  compact={compact}
                  title="AI 已完成的工作"
                  description="自动处理与您的确认记录"
                  action={
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-0 text-[11px] text-muted-foreground"
                      onClick={() => navigate(buildTripAiActivityLogPath(tripId))}
                    >
                      查看全部
                    </Button>
                  }
                >
                  <TravelStatusAiWorkTimeline items={status.aiCompletedWork?.items ?? []} />
                </TravelStatusSection>
                ) : null}
              </>
            ) : null}

            {!overviewLayout ? (
            <TravelStatusSection
              compact={compact}
              title="约束与偏好"
              description="规划与行中共用 · 快速调整规则"
              action={
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-[11px] text-muted-foreground"
                  onClick={() => setConstraintDrawerOpen(true)}
                >
                  调整约束
                </Button>
              }
            >
              <p className="text-xs leading-relaxed text-muted-foreground">
                预算、时间、硬约束与软偏好与 Plan Studio 同步；行中可直接编辑单条规则，无需进入完整三栏控制台。
              </p>
            </TravelStatusSection>
            ) : null}

            {!overviewLayout ? (
              <TravelStatusAutomationSummary automation={status.automation} tripId={tripId} />
            ) : null}
          </aside>
        </div>

        <ConstraintEditDrawer
          tripId={tripId}
          trip={trip}
          open={constraintDrawerOpen}
          onOpenChange={setConstraintDrawerOpen}
        />

        {status.contextSnapshot?.revision != null ? (
          <div className={cn('flex justify-center border-t border-border/40', compact ? 'pt-2.5' : 'pt-4')}>
            <Button
              variant="ghost"
              size="sm"
              className={cn('text-muted-foreground', compact ? 'h-7 text-[11px]' : 'h-8 text-xs')}
              onClick={() => navigate(buildTripContextSnapshotPath(tripId))}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              决策依据 · 上下文 v{status.contextSnapshot.revision}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
