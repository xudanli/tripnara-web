import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { dedupeFeasibilityIssues } from '@/lib/feasibility-issue-dedupe';
import { firstFeasibilityIssueForCategory, issueMatchesCategory, syncFeasibilityReportSelection } from '@/lib/feasibility-issue-focus';
import { resolveFeasibilityIssueDayNumber } from '@/lib/feasibility-issue-day';
import { resolveFeasibilityIssueActionTarget } from '@/lib/feasibility-issue-action';
import {
  notifyFeasibilityReportReload,
  notifyLoopReadinessChanged,
  notifyDecisionValidationRefresh,
  openDecisionProfilingSurface,
} from '@/lib/plan-studio-loop-events';
import { feasibilityDimensionLabel } from '@/lib/feasibility-dimension-display';
import { useTripFeasibilityReport } from '@/hooks/useTripFeasibilityReport';
import {
  fetchConflictEnforcement,
  loadDecisionProblemOptions,
  mapDecisionOptionsToRepairOptions,
  resolveDecisionProblemId,
} from '@/lib/constraint-conflict-repair-flow';
import { tripsApi } from '@/api/trips';
import type { TripDetail } from '@/types/trip';
import {
  filterFeasibilityRepairOptionsForTrip,
  resolveRevalidateScope,
  shouldShowFeasibilityRepairWorkflow,
} from '@/lib/feasibility-repair-apply';
import { toast } from 'sonner';
import type {
  FeasibilityIssueDto,
  FeasibilityRepairOptionDto,
  FeasibilityReportValidateOptions,
  TripFeasibilityReportDto,
} from '@/types/trip-feasibility-report';
import {
  FeasibilityDayIssueNavigator,
  FeasibilityDayAccommodationPanel,
  FeasibilityDimensionStrip,
  FeasibilityEmptyState,
  FeasibilityEvidencePanel,
  FeasibilityIssueDetailHeader,
  FeasibilityReportOverview,
  FeasibilityStaleNotice,
  FeasibilityReportMetaCollapsible,
  FeasibilityPriorityIssueQueue,
  FeasibilityWorkbenchCard,
} from './feasibility-ui';
import { FeasibilityTravelTimingCard } from './FeasibilityTravelTimingCard';
import { FeasibilityTravelTimingDialog } from './FeasibilityTravelTimingDialog';
import { FeasibilityRepairWorkflow } from './FeasibilityRepairWorkflow';
import { DecisionProfilingHubDialog } from '@/components/decision-profiling';
import type { DecisionProfilingSurface } from '@/lib/decision-profiling-navigation';
import { EnhancedAddItineraryItemDialog } from '@/components/trips/EnhancedAddItineraryItemDialog';
import { useFeasibilityTravelTiming } from '@/hooks/useFeasibilityTravelTiming';
import {
  isUltraLongDriveIssue,
  resolveFeasibilityRepairIssueId,
} from '@/lib/feasibility-ultra-long-drive';
import {
  buildScheduleNavigateDetail,
  isInterDayTravelIssue,
} from '@/lib/feasibility-travel-timing';
import { enrichTravelTimingIssueProofs } from '@/lib/feasibility-travel-timing-proofs';
import { enrichBookingIssueProofs } from '@/lib/feasibility-booking-proofs';
import {
  buildFeasibilityEvidenceProofRows,
  collectPlanBOptionsFromEvidenceRows,
  getUnmatchedRepairOptions,
} from '@/lib/feasibility-proof-plan-b';

interface FeasibilityReportPanelProps {
  tripId: string;
  className?: string;
  /** Sheet 内嵌时省略页级标题 */
  embedded?: boolean;
  /** 深链打开时预选 issue */
  initialIssueId?: string | null;
  /** 跳转到时间轴（关闭 Sheet 后由父级处理） */
  onNavigateToSchedule?: (detail: import('@/lib/plan-studio-schedule-navigation').PlanStudioScheduleNavigateDetail) => void;
  /** DC-FE-010 — replay 查看原决策 */
  onViewDecision?: (decisionId: string) => void;
}

function issueConfirmHint(issue: FeasibilityIssueDto): string | null {
  if (issue.priority !== 'pending_confirm') return null;
  const text = `${issue.message} ${issue.actionRequired ?? ''}`;
  if (/超长距离|分段|中途住宿/.test(text)) {
    return '需要把过长路段拆成两天或增加中途住宿；确认当前安排后再重新检查。';
  }
  if (text.includes('跨天') || text.includes('出发时间')) {
    return '需要确认这一天是否接受跨天行程，并补上合理出发时间；确认或调整后再重新检查。';
  }
  if (text.includes('证据')) {
    return '需要补齐或刷新证据后再判断，不是让你确认系统结论。';
  }
  return '需要你确认当前安排是否符合真实出行预期；确认后可重新检查。';
}

function firstIssueForDay(
  dayTimeline: TripFeasibilityReportDto['dayTimeline'],
  dayNumber: number,
  issues: FeasibilityIssueDto[],
  categoryFilter?: string | null,
): string | null {
  const day = dayTimeline.find((d) => d.dayNumber === dayNumber);
  if (!day || day.issueIds.length === 0) return null;
  const dayIssues = day.issueIds
    .map((id) => issues.find((i) => i.id === id))
    .filter((i): i is FeasibilityIssueDto => i != null);
  const deduped = dedupeFeasibilityIssues(dayIssues).issues;
  if (categoryFilter) {
    const filtered = deduped.filter((issue) => issueMatchesCategory(issue, categoryFilter));
    return filtered[0]?.id ?? null;
  }
  return deduped[0]?.id ?? null;
}

function firstActionableIssueForReport(data: TripFeasibilityReportDto): {
  dayNumber: number;
  issueId: string;
} | null {
  const issueById = new Map(data.issues.map((i) => [i.id, i]));
  for (const day of data.dayTimeline) {
    const dayIssues = day.issueIds
      .map((id) => issueById.get(id))
      .filter((i): i is FeasibilityIssueDto => i != null);
    const deduped = dedupeFeasibilityIssues(dayIssues).issues;
    const must = deduped.find((i) => i.priority === 'must_handle');
    if (must) return { dayNumber: day.dayNumber, issueId: must.id };
  }
  for (const day of data.dayTimeline) {
    if (day.issueIds.length === 0) continue;
    const issueId = firstIssueForDay(data.dayTimeline, day.dayNumber, data.issues);
    if (issueId) return { dayNumber: day.dayNumber, issueId };
  }
  return null;
}

export function FeasibilityReportPanel({
  tripId,
  className,
  embedded,
  initialIssueId,
  onNavigateToSchedule,
  onViewDecision,
}: FeasibilityReportPanelProps) {
  const navigate = useNavigate();
  const { data, loading, error, revalidateFull, revalidateScope, reload } =
    useTripFeasibilityReport(tripId);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [repairLoading, setRepairLoading] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const [proofsOpen, setProofsOpen] = useState(false);
  const [repairOptionsByIssue, setRepairOptionsByIssue] = useState<
    Record<string, FeasibilityRepairOptionDto[]>
  >({});
  const [travelTimingDialogOpen, setTravelTimingDialogOpen] = useState(false);
  const [tripDetail, setTripDetail] = useState<TripDetail | null>(null);
  const [pendingRepairOptionId, setPendingRepairOptionId] = useState<string | null>(null);
  const [addAccommodationDay, setAddAccommodationDay] = useState<TripDetail['TripDay'][0] | null>(
    null,
  );
  const [addAccommodationOpen, setAddAccommodationOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [profilingOpen, setProfilingOpen] = useState(false);
  const [profilingSurface, setProfilingSurface] = useState<DecisionProfilingSurface | null>(null);

  useEffect(() => {
    let cancelled = false;
    tripsApi
      .getById(tripId)
      .then((trip) => {
        if (!cancelled) setTripDetail(trip);
      })
      .catch(() => {
        if (!cancelled) setTripDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  useEffect(() => {
    const onReload = (event: Event) => {
      const id = (event as CustomEvent<{ tripId?: string }>).detail?.tripId;
      if (id !== tripId) return;
      void reload();
    };
    window.addEventListener('plan-studio:feasibility-report-reload', onReload);
    return () => window.removeEventListener('plan-studio:feasibility-report-reload', onReload);
  }, [tripId, reload]);

  useEffect(() => {
    const onFocus = (event: Event) => {
      const detail = (event as CustomEvent<{ tripId?: string; category?: string; issueId?: string }>)
        .detail;
      if (detail?.tripId !== tripId) return;
      if (detail.category) setCategoryFilter(detail.category);
      if (!data) return;
      if (detail.issueId) {
        const issue = data.issues.find((item) => item.id === detail.issueId);
        const dayNumber =
          issue?.affectedDays?.[0] ??
          data.dayTimeline.find((day) => day.issueIds.includes(detail.issueId!))?.dayNumber;
        if (dayNumber != null) {
          setSelectedDayNumber(dayNumber);
          setSelectedIssueId(detail.issueId);
        }
        return;
      }
      if (detail.category) {
        const match = firstFeasibilityIssueForCategory(data, detail.category);
        if (match) {
          setSelectedDayNumber(match.dayNumber);
          setSelectedIssueId(match.issueId);
        }
      }
    };
    window.addEventListener('plan-studio:feasibility-issue-focus', onFocus);
    return () => window.removeEventListener('plan-studio:feasibility-issue-focus', onFocus);
  }, [tripId, data]);

  useEffect(() => {
    if (!data || !initialIssueId) return;
    const issue = data.issues.find((i) => i.id === initialIssueId);
    if (!issue) return;
    const dayNumber =
      resolveFeasibilityIssueDayNumber(issue, data.dayTimeline) ??
      issue.affectedDays?.[0] ??
      data.dayTimeline.find((d) => d.issueIds.includes(issue.id))?.dayNumber;
    if (dayNumber != null) setSelectedDayNumber(dayNumber);
    setSelectedIssueId(issue.id);
  }, [data, initialIssueId]);

  useEffect(() => {
    if (!data) return;
    if (initialIssueId) return;
    if (selectedDayNumber !== null) return;
    const actionable = embedded ? firstActionableIssueForReport(data) : null;
    if (actionable) {
      setSelectedDayNumber(actionable.dayNumber);
      setSelectedIssueId(actionable.issueId);
      return;
    }
    const firstDayWithIssues = data.dayTimeline.find((d) => d.issueIds.length > 0);
    if (firstDayWithIssues) {
      setSelectedDayNumber(firstDayWithIssues.dayNumber);
      setSelectedIssueId(
        firstIssueForDay(data.dayTimeline, firstDayWithIssues.dayNumber, data.issues),
      );
    } else if (data.dayTimeline[0]) {
      setSelectedDayNumber(data.dayTimeline[0].dayNumber);
    }
  }, [data, selectedDayNumber, initialIssueId, embedded]);

  const selectedIssueBase = useMemo(() => {
    if (!data) return undefined;
    return (
      data.issues.find((i) => i.id === selectedIssueId) ??
      (selectedDayNumber != null
        ? data.issues.find((i) => i.affectedDays?.includes(selectedDayNumber))
        : undefined) ??
      data.issues[0]
    );
  }, [data, selectedIssueId, selectedDayNumber]);

  const travelTimingIssue =
    selectedIssueBase && isInterDayTravelIssue(selectedIssueBase) ? selectedIssueBase : undefined;

  const {
    viewModel: travelTimingHookView,
    trip: travelTimingTrip,
    dayItems: travelTimingDayItems,
    nextDayItems: travelTimingNextDayItems,
  } = useFeasibilityTravelTiming(tripId, travelTimingIssue, selectedDayNumber);

  const selectedIssue = useMemo(() => {
    if (!selectedIssueBase) return undefined;
    const tripForRepairs = travelTimingTrip ?? tripDetail;
    const ultraLong = isUltraLongDriveIssue(selectedIssueBase, travelTimingHookView);
    const rawRepairOptions =
      repairOptionsByIssue[selectedIssueBase.id] ??
      (ultraLong ? undefined : selectedIssueBase.repairOptions);
    const repairOptions = rawRepairOptions
      ? filterFeasibilityRepairOptionsForTrip(
          rawRepairOptions,
          tripForRepairs,
          selectedIssueBase,
        )
      : undefined;
    return repairOptions ? { ...selectedIssueBase, repairOptions } : selectedIssueBase;
  }, [
    selectedIssueBase,
    repairOptionsByIssue,
    travelTimingTrip,
    tripDetail,
    travelTimingHookView,
  ]);

  const travelTimingView = travelTimingHookView;

  const selectedDayAccommodation = useMemo(() => {
    if (!data || selectedDayNumber == null) return undefined;
    return data.dayTimeline.find((d) => d.dayNumber === selectedDayNumber)?.accommodation;
  }, [data, selectedDayNumber]);

  const selectedIssueDisplayProofs = useMemo(() => {
    if (!selectedIssue) return undefined;
    const tripForProofs = travelTimingTrip ?? tripDetail;
    const dayForProofs = selectedDayNumber ?? undefined;
    let enriched = enrichTravelTimingIssueProofs(selectedIssue, travelTimingView);
    enriched = enrichBookingIssueProofs(enriched, tripForProofs, dayForProofs);
    return enriched.proofs;
  }, [selectedIssue, travelTimingView, travelTimingTrip, tripDetail, selectedDayNumber]);

  const evidenceProofRows = useMemo(() => {
    if (!selectedIssue && !selectedDayNumber) return [];
    return buildFeasibilityEvidenceProofRows({
      proofs: selectedIssueDisplayProofs,
      dayNumber: selectedDayNumber ?? undefined,
      accommodation: selectedDayAccommodation,
      trip: travelTimingTrip ?? tripDetail,
      issue: selectedIssue,
      repairOptions: selectedIssue?.repairOptions,
      travelView: travelTimingView,
    });
  }, [
    selectedIssue,
    selectedIssueDisplayProofs,
    selectedDayNumber,
    selectedDayAccommodation,
    travelTimingTrip,
    tripDetail,
    travelTimingView,
  ]);

  const unmatchedRepairOptions = useMemo(() => {
    if (!selectedIssue?.repairOptions?.length) return [];
    return getUnmatchedRepairOptions(selectedIssue.repairOptions, evidenceProofRows);
  }, [selectedIssue?.repairOptions, evidenceProofRows]);

  const fallbackRepairOptions = useMemo(() => {
    if (!selectedIssue?.repairOptions?.length) return [];
    if (evidenceProofRows.some((row) => row.planBOptions.length > 0)) return [];
    return selectedIssue.repairOptions;
  }, [selectedIssue?.repairOptions, evidenceProofRows]);

  const showTravelTimingCard = Boolean(travelTimingIssue && travelTimingView);

  const repairOptionsForWorkflow = useMemo(() => {
    if (!selectedIssue) return [];
    const apiLoaded = repairOptionsByIssue[selectedIssue.id];
    if (apiLoaded?.length) return apiLoaded;

    const planBFromEvidence = collectPlanBOptionsFromEvidenceRows(evidenceProofRows);
    const mergeUnique = (base: FeasibilityRepairOptionDto[]) => {
      const merged = [...base, ...planBFromEvidence];
      return merged.filter(
        (option, index, arr) => arr.findIndex((o) => o.id === option.id) === index,
      );
    };
    const issueOptions = selectedIssue.repairOptions ?? [];
    if (isUltraLongDriveIssue(selectedIssue, travelTimingView)) {
      return mergeUnique(issueOptions);
    }
    if (unmatchedRepairOptions.length > 0) return mergeUnique(unmatchedRepairOptions);
    if (fallbackRepairOptions.length > 0) return mergeUnique(fallbackRepairOptions);
    return mergeUnique(issueOptions);
  }, [
    selectedIssue,
    travelTimingView,
    unmatchedRepairOptions,
    fallbackRepairOptions,
    evidenceProofRows,
  ]);

  const prefersRepairWorkflow = Boolean(
    selectedIssue && isUltraLongDriveIssue(selectedIssue, travelTimingView),
  );

  const showRepairWorkflow = Boolean(
    selectedIssue &&
      shouldShowFeasibilityRepairWorkflow({
        issue: selectedIssue,
        repairOptionCount: repairOptionsForWorkflow.length,
        repairLoading,
        prefersRepairWorkflow,
      }),
  );

  const handleRepairApplied = async () => {
    window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
    if (selectedIssue) {
      await revalidateScope(resolveRevalidateScope(selectedIssue));
      setRepairOptionsByIssue((prev) => {
        const next = { ...prev };
        delete next[selectedIssue.id];
        return next;
      });
    }
  };

  const handleAddAccommodationForDay = (dayNumber: number) => {
    const day = tripDetail?.TripDay?.[dayNumber - 1];
    if (!day) {
      toast.error('行程数据加载中，请稍后再试');
      onNavigateToSchedule?.({ dayNumber, dayIndex: dayNumber - 1 });
      return;
    }
    setAddAccommodationDay(day);
    setAddAccommodationOpen(true);
  };

  const handleAddAccommodationSuccess = async () => {
    setAddAccommodationOpen(false);
    setAddAccommodationDay(null);
    window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
    await reload();
  };

  const handleLoadRepairs = async (issue: FeasibilityIssueDto) => {
    try {
      setRepairLoading(true);
      const decisionProblemId = resolveDecisionProblemId(issue);
      const { isHard } = await fetchConflictEnforcement(decisionProblemId, tripId);
      setSelectedIssueId(issue.id);
      if (!isHard) {
        return;
      }
      const repairIssueId = resolveFeasibilityRepairIssueId(issue, data?.issues ?? []);
      const loaded = await loadDecisionProblemOptions({
        tripId,
        problemId: decisionProblemId,
        fallbackIssueId: repairIssueId,
      });
      const resOptions =
        loaded.source === 'decision-problems'
          ? mapDecisionOptionsToRepairOptions(loaded.options)
          : loaded.options;
      const tripForRepairs = travelTimingTrip ?? tripDetail;
      const filtered = filterFeasibilityRepairOptionsForTrip(resOptions, tripForRepairs, issue);
      setRepairOptionsByIssue((prev) => ({ ...prev, [issue.id]: filtered }));
      setSelectedIssueId(issue.id);
      if (
        filtered.length === 0 &&
        isUltraLongDriveIssue(issue, travelTimingView) &&
        resOptions.length > 0
      ) {
        toast.message('暂无可用拆段方案', {
          description: `${repairIssueId} 仅返回非结构性选项，请确认后端 road_class repair-options 已部署`,
        });
      }
    } catch {
      toast.error('加载修复方案失败');
      setRepairOptionsByIssue((prev) => ({ ...prev, [issue.id]: [] }));
    } finally {
      setRepairLoading(false);
    }
  };

  const handleDaySelect = (dayNumber: number) => {
    setSelectedDayNumber(dayNumber);
    setProofsOpen(false);
    if (!data) return;
    setSelectedIssueId(firstIssueForDay(data.dayTimeline, dayNumber, data.issues, categoryFilter));
  };

  const handleIssueSelect = (issueId: string, dayNumber: number) => {
    const issue = data?.issues.find((item) => item.id === issueId);
    const resolvedDay =
      (issue && data ? resolveFeasibilityIssueDayNumber(issue, data.dayTimeline) : undefined) ??
      dayNumber;
    setSelectedDayNumber(resolvedDay);
    setSelectedIssueId(issueId);
    setProofsOpen(false);
  };

  const handleIssueAction = (issue: FeasibilityIssueDto) => {
    const target = resolveFeasibilityIssueActionTarget(issue, tripId);
    if (target.categoryFilter && target.surface !== 'refresh_evidence') {
      setCategoryFilter(target.categoryFilter);
    }
    setSelectedIssueId(issue.id);

    switch (target.surface) {
      case 'decision_profiling_quiz':
      case 'decision_profiling_reuse':
      case 'friction_radar':
      case 'split_consensus':
      case 'team_style_wall': {
        const surface = target.profilingSurface ?? 'hub';
        if (embedded) {
          openDecisionProfilingSurface(tripId, surface, target.profilingStep);
        } else {
          setProfilingSurface(surface);
          setProfilingOpen(true);
        }
        break;
      }
      case 'schedule_edit':
        if (target.href) {
          if (onNavigateToSchedule) {
            const day = issue.affectedDays?.[0];
            onNavigateToSchedule({
              dayNumber: day,
              dayIndex: day != null ? day - 1 : undefined,
            });
          } else {
            navigate(target.href);
          }
        }
        break;
      case 'refresh_evidence':
        void handleRevalidate({ forceRefreshEvidence: true });
        break;
      case 'road_class_repair':
      case 'feasibility_repair':
        void handleLoadRepairs(issue);
        break;
      case 'decision_space':
      case 'collaboration_center':
        if (target.href) navigate(target.href);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (!travelTimingIssue) return;
    if (travelTimingIssue.id in repairOptionsByIssue) return;
    if (selectedIssue?.priority === 'pending_confirm' && showTravelTimingCard) return;
    const ultraLong = isUltraLongDriveIssue(travelTimingIssue, travelTimingView);
    if (travelTimingIssue.repairOptions?.length && !ultraLong) return;
    void handleLoadRepairs(travelTimingIssue);
  }, [travelTimingIssue?.id, travelTimingView]);

  useEffect(() => {
    if (!selectedIssue || repairLoading) return;
    if (selectedIssue.id in repairOptionsByIssue) return;
    if (selectedIssue.repairOptions?.length) return;
    if (repairOptionsForWorkflow.length > 0) return;
    if (
      !shouldShowFeasibilityRepairWorkflow({
        issue: selectedIssue,
        repairOptionCount: 0,
      })
    ) {
      return;
    }
    void handleLoadRepairs(selectedIssue);
  }, [selectedIssue?.id, repairLoading, repairOptionsForWorkflow.length]);

  const applyReportSelection = (report: TripFeasibilityReportDto) => {
    const synced = syncFeasibilityReportSelection(report, {
      categoryFilter,
      selectedIssueId,
      selectedDayNumber,
    });
    if (synced.clearedCategoryFilter) {
      toast.message('该维度已无待办', { description: '已取消筛选，展示全部问题' });
    }
    setCategoryFilter(synced.categoryFilter);
    setSelectedIssueId(synced.selectedIssueId);
    setSelectedDayNumber(synced.selectedDayNumber);
  };

  const handleRevalidate = async (options?: FeasibilityReportValidateOptions) => {
    try {
      setRevalidating(true);
      const report = await revalidateFull(options);
      if (report) {
        applyReportSelection(report);
        toast.success('已重新验证', {
          description: `可执行性 ${report.overallScore} · 必处理 ${report.summary.mustHandle} 项`,
        });
        notifyFeasibilityReportReload(tripId);
        notifyLoopReadinessChanged(tripId);
        notifyDecisionValidationRefresh(tripId);
      } else {
        toast.error('重新验证未成功', {
          description: '请检查网络或稍后重试；若后端未部署 validate 接口会静默回退本地报告。',
        });
      }
    } catch {
      toast.error('重新验证失败');
    } finally {
      setRevalidating(false);
    }
  };

  if (loading && !data) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="link" size="sm" className="mt-2" onClick={() => reload()}>
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const issueTotal =
    data.summary.mustHandle + data.summary.suggestAdjust + data.summary.pendingConfirm;

  return (
    <div className={cn(embedded ? 'space-y-3' : 'space-y-4', className)}>
      {!embedded && (
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">行程可执行性报告</h1>
          <p className="text-sm text-muted-foreground">
            {data.tripTitle}
            {data.dateRangeLabel ? ` · ${data.dateRangeLabel}` : ''}
          </p>
        </div>
      )}

      {!embedded && data.isStale && (
        <FeasibilityStaleNotice
          verifiedForTripVersion={data.verifiedForTripVersion}
          currentTripVersion={data.currentTripVersion}
        />
      )}

      <FeasibilityReportOverview
        report={data}
        variant={embedded ? 'compact' : 'full'}
        onRevalidate={(options) => void handleRevalidate(options)}
        revalidating={revalidating}
        onStartExecute={() => navigate(`/dashboard/execute?tripId=${tripId}`)}
      />

      {embedded && issueTotal > 0 && (
        <FeasibilityPriorityIssueQueue
          issues={data.issues}
          dayTimeline={data.dayTimeline}
          selectedIssueId={selectedIssueId}
          onSelect={handleIssueSelect}
        />
      )}

      {!embedded && (
        <section className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">维度评估</p>
          <FeasibilityDimensionStrip dimensions={data.dimensions} />
        </section>
      )}

      {/* 主内容：问题在哪里 */}
      <div className={cn('grid gap-3', embedded ? 'lg:grid-cols-5 min-w-0' : 'lg:grid-cols-5 gap-4')}>
        <FeasibilityWorkbenchCard
          title="哪里有问题"
          description={
            issueTotal > 0
              ? `共 ${issueTotal} 项 · 按天展开查看`
              : '各天状态一览'
          }
          className="lg:col-span-2"
        >
          {categoryFilter ? (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-border/80 bg-muted/25 px-2.5 py-1.5 text-xs">
              <span className="text-muted-foreground">
                筛选：
                <span className="text-foreground font-medium">
                  {feasibilityDimensionLabel(categoryFilter)}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setCategoryFilter(null)}
              >
                清除
              </Button>
            </div>
          ) : null}
          <FeasibilityDayIssueNavigator
            dayTimeline={data.dayTimeline}
            issues={data.issues}
            selectedDayNumber={selectedDayNumber}
            selectedIssueId={selectedIssueId}
            categoryFilter={categoryFilter}
            onDaySelect={handleDaySelect}
            onIssueSelect={handleIssueSelect}
          />
        </FeasibilityWorkbenchCard>

        <FeasibilityWorkbenchCard
          title="怎么处理"
          description={
            selectedIssue
              ? `第 ${
                  resolveFeasibilityIssueDayNumber(selectedIssue, data.dayTimeline) ??
                  selectedDayNumber ??
                  '—'
                } 天`
              : selectedDayNumber != null
                ? `第 ${selectedDayNumber} 天`
                : '选择左侧问题'
          }
          icon={Wrench}
          className="lg:col-span-3"
        >
          {selectedDayNumber != null ? (
            <div className="space-y-4 px-1">
              {selectedDayAccommodation?.needsNightStay && !selectedDayAccommodation.hasAccommodation && (
                <FeasibilityDayAccommodationPanel
                  accommodation={selectedDayAccommodation}
                  dayNumber={selectedDayNumber}
                  onAddAccommodation={() => handleAddAccommodationForDay(selectedDayNumber)}
                />
              )}

              {selectedIssue ? (
            <div className="space-y-4">
              <FeasibilityIssueDetailHeader
                issue={selectedIssue}
                dayNumber={selectedDayNumber}
                dayTimeline={data.dayTimeline}
                confirmHint={issueConfirmHint(selectedIssue)}
                tripId={tripId}
                onAction={() => handleIssueAction(selectedIssue)}
              />

              {showTravelTimingCard && selectedIssue && travelTimingView && (
                <FeasibilityTravelTimingCard
                  issue={selectedIssue}
                  view={travelTimingView}
                  onNavigateToSchedule={() => {
                    const detail = buildScheduleNavigateDetail(
                      selectedIssue,
                      travelTimingView,
                      travelTimingTrip,
                    );
                    onNavigateToSchedule?.(detail);
                  }}
                  onOpenQuickEdit={() => setTravelTimingDialogOpen(true)}
                  onLoadRepairs={() => void handleLoadRepairs(selectedIssue)}
                  repairLoading={repairLoading}
                />
              )}

              {travelTimingView && (
                <FeasibilityTravelTimingDialog
                  open={travelTimingDialogOpen}
                  onOpenChange={setTravelTimingDialogOpen}
                  tripId={tripId}
                  view={travelTimingView}
                  trip={travelTimingTrip}
                  dayItems={[...travelTimingDayItems, ...travelTimingNextDayItems]}
                  onSaved={() => void revalidateScope({ issueId: selectedIssue?.id })}
                />
              )}

              {showRepairWorkflow && (
                <FeasibilityRepairWorkflow
                  tripId={tripId}
                  issue={selectedIssue}
                  repairIssueId={resolveFeasibilityRepairIssueId(selectedIssue, data.issues)}
                  trip={travelTimingTrip ?? tripDetail}
                  options={repairOptionsForWorkflow}
                  optionsLoading={repairLoading}
                  pendingSelectOptionId={pendingRepairOptionId}
                  onPendingSelectConsumed={() => setPendingRepairOptionId(null)}
                  onLoadOptions={() => handleLoadRepairs(selectedIssue)}
                  onOptionsLoaded={(options) =>
                    setRepairOptionsByIssue((prev) => ({ ...prev, [selectedIssue.id]: options }))
                  }
                  onApplied={handleRepairApplied}
                  onNavigateToSchedule={() => {
                    if (!selectedIssue || !travelTimingView) return;
                    onNavigateToSchedule?.(
                      buildScheduleNavigateDetail(
                        selectedIssue,
                        travelTimingView,
                        travelTimingTrip,
                      ),
                    );
                  }}
                  onViewDecision={onViewDecision}
                  onRefreshEvidence={() =>
                    void revalidateScope({ issueId: selectedIssue.id })
                  }
                />
              )}

              {selectedIssue.priority === 'pending_confirm' &&
                !selectedIssue.repairOptions?.length && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void revalidateScope({ issueId: selectedIssue.id })}
                  >
                    重新检查证据
                  </Button>
                )}

              {selectedIssue.repairOptions?.length ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={async () => {
                      const report = await revalidateScope(resolveRevalidateScope(selectedIssue));
                      if (report) {
                        applyReportSelection(report);
                        toast.success('已重新检查本条');
                      } else {
                        toast.error('重新检查失败，请稍后重试');
                      }
                    }}
                  >
                    重新检查本条
                  </Button>
                </div>
              ) : null}

              <FeasibilityEvidencePanel
                proofs={selectedIssueDisplayProofs}
                dayNumber={selectedDayNumber}
                accommodation={selectedDayAccommodation}
                trip={travelTimingTrip ?? tripDetail}
                issue={selectedIssue}
                repairOptions={selectedIssue.repairOptions}
                travelView={travelTimingView}
                open={proofsOpen}
                onOpenChange={setProofsOpen}
                onSelectRepairOption={(option) => setPendingRepairOptionId(option.id)}
                onOpenTravelQuickEdit={() => {
                  if (travelTimingView) {
                    setTravelTimingDialogOpen(true);
                    return;
                  }
                  if (selectedDayNumber != null) {
                    onNavigateToSchedule?.({
                      dayNumber: selectedDayNumber,
                      dayIndex: selectedDayNumber - 1,
                      focus: 'travel-timing',
                    });
                  }
                }}
              />
            </div>
              ) : (
                <div className="space-y-4">
                  <FeasibilityEmptyState
                    title={`第 ${selectedDayNumber} 天暂无可处理问题`}
                    description="可切换其他天查看，或检查当晚住宿是否已安排"
                  />
                  {selectedDayAccommodation && (
                    <FeasibilityEvidencePanel
                      dayNumber={selectedDayNumber}
                      accommodation={selectedDayAccommodation}
                      trip={tripDetail}
                      open={proofsOpen}
                      onOpenChange={setProofsOpen}
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <FeasibilityEmptyState
              title="当前方案未发现需要处理的问题"
              description="可重新验证以更新报告"
            />
          )}
        </FeasibilityWorkbenchCard>
      </div>

      {embedded ? <FeasibilityReportMetaCollapsible report={data} /> : null}

      {addAccommodationDay ? (
        <EnhancedAddItineraryItemDialog
          tripDay={addAccommodationDay}
          tripId={tripId}
          tripDays={tripDetail?.TripDay ?? []}
          countryCode={tripDetail?.destination}
          open={addAccommodationOpen}
          onOpenChange={(open) => {
            setAddAccommodationOpen(open);
            if (!open) setAddAccommodationDay(null);
          }}
          onSuccess={() => void handleAddAccommodationSuccess()}
          initialCategory="HOTEL"
        />
      ) : null}

      {!embedded ? (
        <DecisionProfilingHubDialog
          tripId={tripId}
          open={profilingOpen}
          onOpenChange={setProfilingOpen}
          showTrigger={false}
          initialSurface={profilingSurface}
          forceOpenQuiz={profilingSurface === 'quiz'}
          forceReuseProfile={profilingSurface === 'reuse'}
        />
      ) : null}
    </div>
  );
}
