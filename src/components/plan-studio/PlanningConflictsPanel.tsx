import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import GateExecuteNotice from '@/components/readiness/GateExecuteNotice';
import PoiAccessIssueCard from '@/components/feasibility-report/PoiAccessIssueCard';
import FeasibilityBufferRepairActions from '@/components/feasibility-report/FeasibilityBufferRepairActions';
import {
  DepartTimeButton,
  FeasibilityDepartTimeEditor,
} from '@/components/feasibility-report/FeasibilityDepartTimeEditor';
import FeasibilityTeamFitActions from '@/components/feasibility-report/FeasibilityTeamFitActions';
import type { UsePlanningConflictsResult } from '@/hooks/usePlanningConflicts';
import { resolveFeasibilityIssueActionTarget } from '@/lib/feasibility-issue-action';
import { isBufferOrTravelRepairIssue } from '@/lib/feasibility-buffer-repair.util';
import { isInterDayTravelIssue } from '@/lib/feasibility-travel-timing';
import { isTeamFitRepairIssue } from '@/lib/feasibility-team-fit.util';
import { priorityBadgeClasses, priorityLabel } from '@/lib/feasibility-ui';
import {
  filterPlanningConflictsByCategory,
  filterPlanningConflictsByViewMode,
  PLANNING_CONFLICT_CATEGORY_LABELS,
  summarizePlanningConflictsForView,
  type PlanningConflictCategory,
  type PlanningConflictItem,
  type PlanningConflictsViewMode,
} from '@/lib/planning-conflicts.util';
import type { TripDetail } from '@/types/trip';
import type { FeasibilityIssueDto, TripFeasibilityReportDto } from '@/types/trip-feasibility-report';
import type { DecisionProblemSummary } from '@/types/decision-problem';
import {
  buildDecisionProblemByIdMap,
  conflictCardAccentFromEnforcement,
  resolveDecisionProblemForConflict,
} from '@/lib/planning-conflicts-decision.util';
import { PlanObjectSourceBadge } from '@/components/planning-workbench/PlanObjectSourceBadge';
import { isPlanObjectPlanningConflict } from '@/lib/plan-object-source.util';
import { cn } from '@/lib/utils';

export interface PlanningConflictsPanelProps {
  tripId: string;
  trip?: TripDetail | null;
  conflicts: UsePlanningConflictsResult;
  decisionProblems?: DecisionProblemSummary[];
  onOpenDecisionProblem?: (problemId: string) => void;
  className?: string;
  onNavigateToSchedule?: (detail: import('@/lib/plan-studio-schedule-navigation').PlanStudioScheduleNavigateDetail) => void;
}

function buildFeasibilityPagePath(tripId: string, issueId?: string) {
  const params = new URLSearchParams({ tripId });
  if (issueId) params.set('issueId', issueId);
  return `/dashboard/feasibility?${params.toString()}`;
}

export default function PlanningConflictsPanel({
  tripId,
  trip,
  conflicts,
  decisionProblems,
  onOpenDecisionProblem,
  className,
  onNavigateToSchedule,
}: PlanningConflictsPanelProps) {
  const navigate = useNavigate();
  const {
    bundle,
    items,
    summary,
    inbox,
    gateExecute,
    isStale,
    verdictHeadline,
    loading,
    error,
    reload,
    revalidateAndReload,
  } = conflicts;

  const handleBufferRepairApplied = async () => {
    window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
    await revalidateAndReload({});
    await reload();
  };

  const [viewMode, setViewMode] = useState<PlanningConflictsViewMode>('pending');
  const [categoryFilter, setCategoryFilter] = useState<PlanningConflictCategory | 'all'>('all');
  const [revalidating, setRevalidating] = useState(false);
  const [departTimeIssue, setDepartTimeIssue] = useState<FeasibilityIssueDto | null>(null);

  const viewItems = useMemo(
    () => filterPlanningConflictsByViewMode(items, viewMode),
    [items, viewMode],
  );

  const viewSummary = useMemo(
    () => summarizePlanningConflictsForView(items, viewMode),
    [items, viewMode],
  );

  const filtered = useMemo(
    () => filterPlanningConflictsByCategory(viewItems, categoryFilter),
    [viewItems, categoryFilter],
  );

  const categoryChips = useMemo(() => {
    const entries = Object.entries(viewSummary.byCategory).filter(([, n]) => (n ?? 0) > 0);
    return entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)) as [PlanningConflictCategory, number][];
  }, [viewSummary.byCategory]);

  const decisionProblemById = useMemo(
    () => buildDecisionProblemByIdMap(decisionProblems ?? []),
    [decisionProblems],
  );

  const reportForGate = useMemo((): TripFeasibilityReportDto | null => {
    if (bundle) {
      return {
        tripId: bundle.tripId,
        gateExecute: bundle.gateExecute,
        verdict: bundle.verdict
          ? { status: bundle.verdict.status, headline: bundle.verdict.headline }
          : undefined,
        isStale: bundle.isStale,
        issues: [],
        dimensions: [],
        dayTimeline: [],
      } as unknown as TripFeasibilityReportDto;
    }
    if (!gateExecute.blocked) return null;
    return {
      tripId,
      gateExecute,
      issues: [],
      dimensions: [],
      dayTimeline: [],
    } as unknown as TripFeasibilityReportDto;
  }, [bundle, gateExecute, tripId]);

  const handleRevalidate = async () => {
    setRevalidating(true);
    try {
      await revalidateAndReload({});
      toast.success('已重新验证');
    } catch {
      toast.error('重新验证失败');
    } finally {
      setRevalidating(false);
    }
  };

  const openItem = (item: PlanningConflictItem) => {
    const matchedProblem = resolveDecisionProblemForConflict(item, decisionProblems ?? []);
    if (matchedProblem && onOpenDecisionProblem) {
      onOpenDecisionProblem(matchedProblem.id);
      return;
    }

    if (item.issue) {
      const target = resolveFeasibilityIssueActionTarget(item.issue, tripId, { preferPlanStudio: true });
      if (target.surface === 'schedule_edit' && onNavigateToSchedule) {
        const day = item.issue.affectedDays?.[0];
        onNavigateToSchedule({
          dayNumber: day,
          dayIndex: day != null ? day - 1 : undefined,
          highlightItemIds: item.issue.uiHints?.deepLink?.highlightItemIds,
          issueId: item.issue.id,
        });
        return;
      }
      if (target.href) {
        navigate(target.href);
        return;
      }
      navigate(buildFeasibilityPagePath(tripId, item.issue.id));
      return;
    }
    if (item.studioConflict && onNavigateToSchedule) {
      const dayRaw = item.studioConflict.affectedDays?.[0];
      const dayNum = dayRaw ? Number(dayRaw) : undefined;
      onNavigateToSchedule({
        dayNumber: dayNum,
        dayIndex: dayNum != null && Number.isFinite(dayNum) ? dayNum - 1 : undefined,
        highlightItemIds: item.studioConflict.affectedItemIds ?? [],
      });
    }
  };

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const showViewToggle = inbox.totalCount > inbox.inboxCount;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">规划待办</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {viewMode === 'pending' ? (
              <>
                必处理与时间轴独有项 · {inbox.inboxCount} 项待办
                {inbox.optimizableCount > 0 ? ` · 另有 ${inbox.optimizableCount} 项可优化` : ''}
              </>
            ) : (
              <>全部冲突 · 共 {summary.total} 项（含可优化项）</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={revalidating} onClick={() => void handleRevalidate()}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', revalidating && 'animate-spin')} />
            重新验证
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(buildFeasibilityPagePath(tripId))}>
            完整可执行证明
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border bg-muted/50 dark:bg-muted/20 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">必处理</p>
          <p className="text-lg font-semibold text-error dark:text-error">{inbox.mustCount}</p>
        </div>
        <div className="rounded-lg border bg-slate-50/80 dark:bg-slate-900/40 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">时间轴独有</p>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">{inbox.scheduleOnlyCount}</p>
        </div>
        <div className="rounded-lg border px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">可优化</p>
          <p className="text-lg font-semibold">{inbox.optimizableCount}</p>
        </div>
      </div>

      {error ? (
        <Card className="border-border bg-muted/40">
          <CardContent className="py-3 text-sm text-foreground">{error}</CardContent>
        </Card>
      ) : null}

      {gateExecute.blocked ? (
        <GateExecuteNotice trip={trip} report={reportForGate} tripId={tripId} compact />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={viewMode === 'pending' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            setViewMode('pending');
            setCategoryFilter('all');
          }}
        >
          待处理 {inbox.inboxCount}
        </Button>
        <Button
          variant={viewMode === 'all' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setViewMode('all')}
        >
          查看全部 {summary.total} 项
        </Button>
      </div>

      {viewMode === 'all' && categoryChips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={categoryFilter === 'all' ? 'secondary' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setCategoryFilter('all')}
          >
            全部分类
          </Button>
          {categoryChips.map(([key, count]) => (
            <Button
              key={key}
              variant={categoryFilter === key ? 'secondary' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setCategoryFilter(key)}
            >
              {PLANNING_CONFLICT_CATEGORY_LABELS[key]} {count}
            </Button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-3">
            {viewMode === 'pending' && inbox.totalCount > 0 ? (
              <>
                <p>必处理项已清空。</p>
                <p>
                  还有 {inbox.optimizableCount} 项可优化，详情见可执行证明。
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {showViewToggle ? (
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setViewMode('all')}>
                      查看全部 {summary.total} 项
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => navigate(buildFeasibilityPagePath(tripId))}
                  >
                    打开可执行证明
                  </Button>
                </div>
              </>
            ) : summary.total === 0 ? (
              <p>当前没有检测到规划冲突。建议点击「重新验证」刷新。</p>
            ) : (
              <p>该分类下暂无冲突。</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const issue = item.issue;
            const isAccess =
              issue &&
              (issue.category === 'access_capacity' ||
                issue.issueKind?.startsWith('poi_access') ||
                issue.visitorAccess);

            if (isAccess && issue) {
              return (
                <div key={item.id} className={cn('rounded-lg overflow-hidden', conflictCardAccentFromEnforcement(item, decisionProblemById))}>
                  <PoiAccessIssueCard
                    issue={issue}
                    tripId={tripId}
                    trip={trip}
                    onEvidenceSaved={() => {
                      void reload();
                    }}
                  />
                </div>
              );
            }

            return (
              <Card key={item.id} className={cn('overflow-hidden', conflictCardAccentFromEnforcement(item, decisionProblemById))}>
                <CardHeader className="py-3 px-4 space-y-0">
                  <div className="flex flex-wrap items-start gap-2">
                    <AlertTriangle
                      className={cn(
                        'h-4 w-4 shrink-0 mt-0.5',
                        item.priority === 'must_handle' ? 'text-error' : 'text-warning',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-medium leading-snug">{item.title}</CardTitle>
                      {item.message ? (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.message}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      <Badge variant="outline" className={cn('text-[10px] h-5', priorityBadgeClasses(item.priority))}>
                        {priorityLabel(item.priority)}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {item.categoryLabel}
                      </Badge>
                      {item.source === 'schedule' ? (
                        <Badge variant="outline" className="text-[10px] h-5 border-slate-300">
                          时间轴
                        </Badge>
                      ) : null}
                      {isPlanObjectPlanningConflict(item) ? (
                        <PlanObjectSourceBadge compact />
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2 px-4 pb-3 space-y-2">
                  {issue && isBufferOrTravelRepairIssue(issue) ? (
                    <FeasibilityBufferRepairActions
                      tripId={tripId}
                      issue={issue}
                      trip={trip}
                      compact
                      onApplied={() => void handleBufferRepairApplied()}
                    />
                  ) : null}
                  {issue && isInterDayTravelIssue(issue) ? (
                    <DepartTimeButton
                      compact
                      variant="secondary"
                      onClick={() => setDepartTimeIssue(issue)}
                    />
                  ) : null}
                  {issue && isTeamFitRepairIssue(issue) ? (
                    <FeasibilityTeamFitActions
                      tripId={tripId}
                      issue={issue}
                      compact
                      preferPlanStudio
                    />
                  ) : null}
                  <div className="flex flex-wrap justify-end gap-2">
                  {item.source === 'feasibility' && item.issue ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => navigate(buildFeasibilityPagePath(tripId, item.issue!.id))}
                    >
                      查看证明
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  ) : null}
                  <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => openItem(item)}>
                    去处理
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {viewMode === 'pending' && showViewToggle ? (
        <p className="text-[11px] text-muted-foreground text-center">
          可执行证明中还有 {inbox.optimizableCount} 项建议优化 ·{' '}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground"
            onClick={() => setViewMode('all')}
          >
            查看全部 {summary.total} 项
          </button>
        </p>
      ) : null}

      {verdictHeadline ? (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <ShieldAlert className="h-3 w-3" />
          报告结论：{verdictHeadline}
          {isStale ? ' · 报告可能已过期，请重新验证' : ''}
        </p>
      ) : null}

      <FeasibilityDepartTimeEditor
        tripId={tripId}
        issue={departTimeIssue}
        open={departTimeIssue != null}
        onOpenChange={(open) => {
          if (!open) setDepartTimeIssue(null);
        }}
        onSaved={() => void handleBufferRepairApplied()}
      />
    </div>
  );
}
