import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  AlertCircle,
  AlertTriangle,
  BedDouble,
  Building2,
  CheckCircle2,
  ChevronRight,
  Edit2,
  FileText,
  Plane,
  ShoppingBag,
  Shield,
  Smile,
  Sparkles,
  Ticket,
  TrendingDown,
  UtensilsCrossed,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { tripsApi } from '@/api/trips';
import type { BudgetConstraint } from '@/api/planning-workbench';
import { CollaboratorAvatar } from '@/components/plan-studio/workbench/CollaboratorAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useSplitConsensus } from '@/hooks/useDecisionProfiling';
import { cn } from '@/lib/utils';
import {
  buildBudgetAlerts,
  buildCategoryRows,
  buildComparisonMetrics,
  buildDailyBudgetRows,
  buildOptimizationViews,
  buildStatusChips,
  buildTrendChartData,
  categoryStatusLabel,
  computeBookingStats,
  computeRiskBuffer,
  computeSavingsPercent,
  computeUsagePercent,
  formatPercent,
  resolveBudgetHealthLabel,
  resolveMemberCount,
  type BudgetCategoryKey,
  type BudgetCategoryStatus,
  type BudgetAlertItem,
  type BudgetOptimizationView,
} from '@/lib/trip-detail-budget.util';
import type {
  BudgetOptimizationSuggestion,
  BudgetStatisticsResponse,
  BudgetSummary,
  BudgetTrendsResponse,
  TripDetail,
} from '@/types/trip';
import { formatCurrency } from '@/utils/format';
import {
  trackTripDetailGateSummaryAction,
  trackTripDetailPlanStudioDeeplink,
} from '@/utils/trip-detail-analytics';
import TripDetailTabGateSummary, {
  mapBudgetHealthToneToGateStatus,
} from '../TripDetailTabGateSummary';
import { TripDetailSection, TripDetailTwoColumn, tripDetailUi } from '../trip-detail-ui';

const CATEGORY_ICONS: Record<BudgetCategoryKey, typeof Plane> = {
  transportation: Plane,
  accommodation: Building2,
  activities: Ticket,
  food: UtensilsCrossed,
  shopping: ShoppingBag,
  other: Shield,
};

const DONUT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
];

function categoryStatusClass(status: BudgetCategoryStatus) {
  if (status === 'healthy') return tripDetailUi.tagVerified;
  if (status === 'controllable') return tripDetailUi.tagConfirm;
  if (status === 'ample') return tripDetailUi.tagAllow;
  return 'border-border bg-muted/40 text-muted-foreground';
}

function chipToneClass(tone: 'reject' | 'confirm' | 'suggest' | 'allow') {
  if (tone === 'reject') return tripDetailUi.tagReject;
  if (tone === 'confirm') return tripDetailUi.tagConfirm;
  if (tone === 'allow') return tripDetailUi.tagAllow;
  return tripDetailUi.tagSuggest;
}

function MetricCard({
  label,
  value,
  sub,
  progress,
  action,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  progress?: number;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-3 shadow-none flex flex-col', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] leading-none text-muted-foreground">{label}</p>
        {action}
      </div>
      <p className="mt-1 text-lg font-bold leading-none text-foreground tabular-nums">{value}</p>
      {sub ? <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div> : null}
      {progress != null ? <Progress value={progress} className="mt-2 h-1" /> : null}
    </div>
  );
}

function BudgetTabSkeleton() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-8 rounded-lg" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  );
}

interface TripDetailBudgetTabProps {
  tripId: string;
  trip: TripDetail;
  onOpenPlanStudio?: () => void;
  onEditBudget?: () => void;
}

export default function TripDetailBudgetTab({
  tripId,
  trip,
  onOpenPlanStudio,
  onEditBudget,
}: TripDetailBudgetTabProps) {
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [trends, setTrends] = useState<BudgetTrendsResponse | null>(null);
  const [statistics, setStatistics] = useState<BudgetStatisticsResponse | null>(null);
  const [optimizations, setOptimizations] = useState<BudgetOptimizationSuggestion[]>([]);
  const [constraint, setConstraint] = useState<BudgetConstraint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryView, setCategoryView] = useState<'amount' | 'percent'>('amount');

  const memberCount = resolveMemberCount(trip);
  const splitEnabled = memberCount >= 2;
  const { data: splitConsensus } = useSplitConsensus(tripId, { enabled: splitEnabled });

  const splitConsensusUpdatedLabel = useMemo(() => {
    if (!splitConsensus) return null;
    const timestamps = [
      splitConsensus.lockedAt,
      ...(splitConsensus.confirmations?.map((c) => c.confirmedAt) ?? []),
    ].filter((value): value is string => Boolean(value));
    if (timestamps.length === 0) return null;
    const latest = timestamps.sort()[timestamps.length - 1]!;
    try {
      return formatDistanceToNow(new Date(latest), { addSuffix: true, locale: zhCN });
    } catch {
      return null;
    }
  }, [splitConsensus]);

  const splitAllConfirmed = Boolean(splitConsensus?.allConfirmed || splitConsensus?.lockedAt);
  const splitMembers = splitConsensus?.confirmations ?? [];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [summary, trendData, stats, opts, constraintRes] = await Promise.all([
        tripsApi.getBudgetSummary(tripId),
        tripsApi.getBudgetTrends(tripId).catch(() => null),
        tripsApi.getBudgetStatistics(tripId).catch(() => null),
        tripsApi.getBudgetOptimization(tripId).catch(() => []),
        tripsApi.getBudgetConstraint(tripId).catch(() => null),
      ]);
      setBudget(summary);
      setTrends(trendData);
      setStatistics(stats);
      setOptimizations(Array.isArray(opts) ? opts : []);
      setConstraint(constraintRes?.budgetConstraint ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载预算失败');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const currency = budget?.currency || constraint?.currency || 'CNY';
  const fmt = useCallback((value: number) => formatCurrency(value, currency), [currency]);

  const derived = useMemo(() => {
    if (!budget) return null;
    const planned = budget.totalSpent ?? 0;
    const total = budget.totalBudget ?? 0;
    const remaining = budget.remaining ?? 0;
    const usagePercent = computeUsagePercent(planned, total);
    const perPerson = memberCount > 0 ? total / memberCount : total;
    const riskBuffer = computeRiskBuffer(total, constraint);
    const health = resolveBudgetHealthLabel(statistics, usagePercent);
    const categoryRows = buildCategoryRows(budget, constraint);
    const bookingStats = computeBookingStats(trip, budget);
    const dailyRows = buildDailyBudgetRows(trends);
    const statusChips = buildStatusChips(bookingStats, fmt);
    const alerts = buildBudgetAlerts(budget, categoryRows, dailyRows, bookingStats, fmt);
    const optimizationViews = buildOptimizationViews(optimizations, fmt);
    const comparison = buildComparisonMetrics(trip, budget, memberCount, bookingStats);
    const trendData = buildTrendChartData(trends);
    const donutData = categoryRows
      .filter((row) => row.planned > 0 || row.budgetLimit > 0)
      .map((row) => ({
        name: row.label,
        value: categoryView === 'percent' ? row.percentOfTotal : row.planned || row.budgetLimit,
        key: row.key,
      }));

    const totalChange = comparison[0]?.current - comparison[0]?.original;
    const savingsPercent = computeSavingsPercent(comparison[0]?.original ?? 0, comparison[0]?.current ?? 0);

    return {
      planned,
      total,
      remaining,
      usagePercent,
      perPerson,
      riskBuffer,
      health,
      categoryRows,
      bookingStats,
      statusChips,
      alerts,
      optimizationViews,
      dailyRows,
      comparison,
      trendData,
      donutData,
      totalChange,
      savingsPercent,
      forecastTotal: trends?.forecast?.projectedTotal ?? planned,
    };
  }, [budget, constraint, statistics, trip, memberCount, currency, fmt, optimizations, trends, categoryView]);

  if (loading) return <BudgetTabSkeleton />;

  if (error || !budget || !derived) {
    return (
      <div className={cn(tripDetailUi.card, 'p-4 text-center shadow-none')}>
        <p className="text-sm text-muted-foreground">{error || '预算信息不存在'}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void loadData()}>
          重试
        </Button>
      </div>
    );
  }

  const dailyTotals = derived.dailyRows.reduce(
    (acc, row) => ({
      budget: acc.budget + row.budget,
      planned: acc.planned + row.planned,
      remaining: acc.remaining + row.remaining,
    }),
    { budget: 0, planned: 0, remaining: 0 },
  );

  return (
    <TripDetailTwoColumn
      className="gap-3"
      mainClassName="space-y-2.5"
      sidebarClassName="space-y-2.5"
      main={
        <div className="space-y-2.5">
          <TripDetailTabGateSummary
            variant="budget"
            tripId={tripId}
            tab="budget"
            status={mapBudgetHealthToneToGateStatus(derived.health.tone)}
            headline={`预算${derived.health.label}`}
            description={
              derived.alerts.length > 0
                ? `${derived.health.description} · ${derived.alerts[0]?.title ?? ''}`
                : derived.health.description
            }
            actionLabel={onEditBudget ? '调整预算' : undefined}
            className="shadow-none"
            onAction={
              onEditBudget
                ? () => {
                    trackTripDetailGateSummaryAction({
                      tripId,
                      tab: 'budget',
                      action: 'edit_budget',
                    });
                    trackTripDetailPlanStudioDeeplink({ tripId, fromTab: 'budget' });
                    onEditBudget();
                  }
                : undefined
            }
          />

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
            <MetricCard
              label="总预算"
              value={fmt(derived.total)}
              progress={derived.usagePercent}
              action={
                onEditBudget ? (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEditBudget}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                ) : null
              }
            />
            <MetricCard label="人均预算" value={fmt(derived.perPerson)} sub={`${memberCount} 位成员`} />
            <MetricCard
              label="已规划预算"
              value={fmt(derived.planned)}
              progress={derived.usagePercent}
            />
            <MetricCard
              label="预算余量"
              value={fmt(derived.remaining)}
              progress={100 - derived.usagePercent}
            />
            <MetricCard
              label="风险缓冲"
              value={fmt(derived.riskBuffer)}
              sub={derived.total > 0 ? formatPercent((derived.riskBuffer / derived.total) * 100) : undefined}
            />
            <div className="rounded-xl border border-border bg-card p-3 shadow-none flex flex-col justify-between">
              <p className="text-[11px] leading-none text-muted-foreground">预算状态</p>
              <div className="mt-1 flex items-center gap-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                  <Smile className="w-3.5 h-3.5 text-foreground" />
                </div>
                <div>
                  <Badge variant="outline" className={cn('h-5 text-[10px]', bookingStatusClass(derived.health.tone))}>
                    {derived.health.label}
                  </Badge>
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{derived.health.description}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {derived.statusChips.map((chip) => (
              <div
                key={chip.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px]',
                  chipToneClass(chip.tone),
                )}
              >
                <span className="font-medium">{chip.label}</span>
                {chip.detail ? <span className="tabular-nums opacity-90">{chip.detail}</span> : null}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
            <TripDetailSection
              title="预算分类明细"
              className="shadow-none"
              headerClassName="px-3 py-2"
              bodyClassName="p-3"
              action={
                <div className="inline-flex rounded-md border border-border p-0.5 text-[10px]">
                  <button
                    type="button"
                    className={cn(
                      'rounded px-1.5 py-0.5',
                      categoryView === 'amount' ? 'bg-muted text-foreground' : 'text-muted-foreground',
                    )}
                    onClick={() => setCategoryView('amount')}
                  >
                    按金额
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'rounded px-1.5 py-0.5',
                      categoryView === 'percent' ? 'bg-muted text-foreground' : 'text-muted-foreground',
                    )}
                    onClick={() => setCategoryView('percent')}
                  >
                    按占比
                  </button>
                </div>
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_140px] gap-2.5">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-[10px] text-muted-foreground">
                        <th className="py-1 text-left font-medium">分类</th>
                        <th className="py-1 text-right font-medium">预算 (¥)</th>
                        <th className="py-1 text-right font-medium">占比</th>
                        <th className="py-1 text-right font-medium">已规划 (¥)</th>
                        <th className="py-1 text-right font-medium">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {derived.categoryRows.map((row) => {
                        const Icon = CATEGORY_ICONS[row.key];
                        const limit = row.budgetLimit > 0 ? row.budgetLimit : derived.total;
                        const pct = limit > 0 ? (row.planned / limit) * 100 : 0;
                        return (
                          <tr key={row.key} className="border-b border-border/40 last:border-0">
                            <td className="py-1.5">
                              <div className="flex items-center gap-1.5">
                                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs text-foreground">{row.label}</span>
                              </div>
                            </td>
                            <td className="py-1.5 text-right tabular-nums text-foreground">
                              {row.budgetLimit > 0 ? fmt(row.budgetLimit) : '—'}
                            </td>
                            <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                              {formatPercent(pct)}
                            </td>
                            <td className="py-1.5 text-right tabular-nums text-foreground">
                              {row.planned > 0 ? fmt(row.planned) : '—'}
                            </td>
                            <td className="py-1.5 text-right">
                              <Badge variant="outline" className={cn('h-5 text-[10px]', categoryStatusClass(row.status))}>
                                {categoryStatusLabel(row.status)}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex min-h-[120px] flex-col items-center justify-center">
                  {derived.donutData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={120}>
                        <PieChart>
                          <Pie
                            data={derived.donutData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={32}
                            outerRadius={50}
                            paddingAngle={1}
                          >
                            {derived.donutData.map((entry, index) => (
                              <Cell key={entry.key} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => fmt(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
                        {derived.donutData.map((entry, index) => (
                          <div key={entry.key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                            />
                            {entry.name}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">暂无分类数据</p>
                  )}
                </div>
              </div>
            </TripDetailSection>

            <TripDetailSection
              title="每日预算分配"
              className="shadow-none"
              headerClassName="px-3 py-2"
              bodyClassName="p-3"
              action={
                onOpenPlanStudio ? (
                  <Button variant="link" className={tripDetailUi.linkInline} onClick={onOpenPlanStudio}>
                    查看明细
                  </Button>
                ) : null
              }
            >
              {derived.dailyRows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-[10px] text-muted-foreground">
                        <th className="py-1 text-left font-medium">日期</th>
                        <th className="py-1 text-right font-medium">预算 (¥)</th>
                        <th className="py-1 text-right font-medium">已规划 (¥)</th>
                        <th className="py-1 text-right font-medium">余量 (¥)</th>
                        <th className="w-20 py-1 text-right font-medium">占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {derived.dailyRows.map((row) => (
                        <tr key={row.id} className="border-b border-border/40 last:border-0">
                          <td className="py-1.5 text-foreground">{row.label}</td>
                          <td className="py-1.5 text-right tabular-nums">{fmt(row.budget)}</td>
                          <td className="py-1.5 text-right tabular-nums">{fmt(row.planned)}</td>
                          <td className="py-1.5 text-right tabular-nums">{fmt(row.remaining)}</td>
                          <td className="py-1.5">
                            <div className="flex items-center justify-end gap-1.5">
                              <Progress value={row.usagePercent} className="h-1 w-14" />
                              <span className="w-7 text-[10px] tabular-nums text-muted-foreground">
                                {formatPercent(row.usagePercent)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="text-xs font-medium">
                        <td className="py-1.5 text-foreground">合计</td>
                        <td className="py-1.5 text-right tabular-nums">{fmt(dailyTotals.budget)}</td>
                        <td className="py-1.5 text-right tabular-nums">{fmt(dailyTotals.planned)}</td>
                        <td className="py-1.5 text-right tabular-nums">{fmt(dailyTotals.remaining)}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">暂无每日预算数据</p>
              )}
            </TripDetailSection>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
            <TripDetailSection
              title="预算对比：原方案 vs 当前方案"
              className="shadow-none"
              headerClassName="px-3 py-2"
              bodyClassName="p-3"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_100px] gap-2.5">
                <div className="space-y-2.5">
                  {derived.comparison.map((metric) => {
                    const max = Math.max(metric.original, metric.current, 1);
                    return (
                      <div key={metric.key}>
                        <div className="mb-1 flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">{metric.label}</span>
                          <span className="tabular-nums text-foreground">
                            {metric.format === 'currency'
                              ? fmt(metric.current)
                              : `${metric.current} 项`}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-muted-foreground/25"
                              style={{ width: `${(metric.original / max) * 100}%` }}
                            />
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${(metric.current / max) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-3 rounded bg-muted-foreground/25" />
                            原方案
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-3 rounded bg-primary" />
                            当前方案
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border border-border/60 bg-muted/15 p-2.5 text-center">
                  {derived.totalChange != null && derived.totalChange !== 0 ? (
                    <>
                      <p className="text-[10px] text-muted-foreground">变化</p>
                      <p
                        className={cn(
                          'mt-0.5 text-lg font-bold tabular-nums',
                          derived.totalChange < 0 ? 'text-gate-allow-foreground' : 'text-gate-confirm-foreground',
                        )}
                      >
                        {derived.totalChange > 0 ? '+' : ''}
                        {fmt(derived.totalChange)}
                      </p>
                      {derived.savingsPercent != null ? (
                        <p className="mt-0.5 text-[10px] tabular-nums text-gate-allow-foreground">
                          {derived.savingsPercent > 0 ? '+' : ''}
                          {formatPercent(derived.savingsPercent)}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <TrendingDown className="mb-1 h-4 w-4 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground">方案暂无显著变化</p>
                    </>
                  )}
                </div>
              </div>
            </TripDetailSection>

            <TripDetailSection
              title="预算趋势预测"
              className="shadow-none"
              headerClassName="px-3 py-2"
              bodyClassName="p-3"
              action={
                onOpenPlanStudio ? (
                  <Button variant="link" className={tripDetailUi.linkInline} onClick={onOpenPlanStudio}>
                    查看详情
                  </Button>
                ) : null
              }
            >
              {derived.trendData.length > 0 ? (
                <div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={derived.trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={40} />
                      <Tooltip formatter={(value: number) => fmt(value)} />
                      <Line
                        type="monotone"
                        dataKey="planned"
                        stroke="hsl(var(--foreground))"
                        strokeWidth={1.5}
                        dot={false}
                        name="累计已规划"
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={1.5}
                        strokeDasharray="5 5"
                        dot={false}
                        name="预测支出"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-2 rounded-md border border-border/60 bg-muted/15 px-2.5 py-1.5 text-[11px]">
                    <span className="text-muted-foreground">预测总支出：</span>
                    <span className="ml-1 font-semibold tabular-nums text-foreground">
                      {fmt(derived.forecastTotal)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-0.5 w-4 bg-foreground" />
                      累计已规划
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-0.5 w-4 border-t border-dashed border-muted-foreground" />
                      预测支出
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">暂无趋势数据</p>
              )}
            </TripDetailSection>
          </div>
        </div>
      }
      sidebar={
        <>
          <TripDetailSection
            title="预算提醒"
            className="shadow-none"
            headerClassName="px-3 py-2"
            bodyClassName="p-3"
          >
            {derived.alerts.length > 0 ? (
              <ul className="space-y-2">
                {derived.alerts.slice(0, 3).map((alert) => (
                  <BudgetAlertRow key={alert.id} alert={alert} onView={onOpenPlanStudio} />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">暂无预算提醒</p>
            )}
            {derived.alerts.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-8 w-full rounded-lg text-xs"
                onClick={onOpenPlanStudio}
              >
                查看全部提醒 ({derived.alerts.length})
                <ChevronRight className="ml-1 w-3.5 h-3.5" />
              </Button>
            ) : null}
          </TripDetailSection>

          <TripDetailSection
            title="可优化项"
            className="shadow-none"
            headerClassName="px-3 py-2"
            bodyClassName="p-3"
          >
            {derived.optimizationViews.length > 0 ? (
              <ul className="space-y-2">
                {derived.optimizationViews.slice(0, 3).map((item) => (
                  <BudgetOptimizationRow
                    key={item.id}
                    item={item}
                    onOptimize={onOpenPlanStudio}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">暂无可优化项</p>
            )}
            {derived.optimizationViews.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-8 w-full rounded-lg text-xs"
                onClick={onOpenPlanStudio}
              >
                查看全部优化建议 ({derived.optimizationViews.length})
                <ChevronRight className="ml-1 w-3.5 h-3.5" />
              </Button>
            ) : null}
          </TripDetailSection>

          <TripDetailSection
            title="团队分摊共识"
            className="shadow-none"
            headerClassName="px-3 py-2"
            bodyClassName="p-3"
          >
            {splitEnabled ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {splitAllConfirmed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-gate-allow-foreground" />
                        <span className="font-medium text-gate-allow-foreground">全员已确认</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-gate-confirm-foreground" />
                        <span className="font-medium text-gate-confirm-foreground">待全员确认</span>
                      </>
                    )}
                  </div>
                  {splitConsensusUpdatedLabel ? (
                    <span className="shrink-0 text-muted-foreground">
                      最后更新：{splitConsensusUpdatedLabel}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center justify-center gap-2 py-0">
                  {(splitMembers.length > 0
                    ? splitMembers
                    : Array.from({ length: Math.min(memberCount, 4) }).map((_, i) => ({
                        userId: `placeholder-${i}`,
                        displayName: String.fromCharCode(65 + i),
                        confirmedAt: null,
                      }))
                  ).slice(0, 4).map((member, index, arr) => {
                    const confirmed = Boolean(member.confirmedAt);
                    return (
                      <div key={member.userId} className="flex items-center gap-2">
                        <div className="text-center">
                          <CollaboratorAvatar displayName={member.displayName} size="sm" />
                          <p
                            className={cn(
                              'mt-1 text-[10px]',
                              confirmed ? 'text-gate-allow-foreground' : 'text-muted-foreground',
                            )}
                          >
                            {confirmed ? '已同意' : '待确认'}
                          </p>
                        </div>
                        {index < arr.length - 1 ? (
                          <span className="pb-3 text-base leading-none text-muted-foreground/40">+</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <Button
                  className={cn('h-8 w-full text-xs', tripDetailUi.primaryBtn)}
                  size="sm"
                  onClick={onOpenPlanStudio}
                >
                  查看分摊明细
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">单人行程无需分摊共识</p>
            )}
          </TripDetailSection>
        </>
      }
    />
  );
}

function bookingStatusClass(tone: 'verified' | 'confirm' | 'allow') {
  if (tone === 'verified') return tripDetailUi.tagVerified;
  if (tone === 'confirm') return tripDetailUi.tagConfirm;
  return tripDetailUi.tagAllow;
}

function BudgetAlertIcon({ icon }: { icon: BudgetAlertItem['icon'] }) {
  const config = {
    risk: {
      className: 'bg-gate-reject/15 text-gate-reject-foreground',
      Icon: AlertCircle,
    },
    warning: {
      className: 'bg-gate-confirm/15 text-gate-confirm-foreground',
      Icon: AlertTriangle,
    },
    pending: {
      className: 'bg-gate-suggest/15 text-gate-suggest-foreground',
      Icon: FileText,
    },
  }[icon];
  const { className, Icon } = config;
  return (
    <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', className)}>
      <Icon className="w-3.5 h-3.5" />
    </div>
  );
}

function BudgetAlertRow({
  alert,
  onView,
}: {
  alert: BudgetAlertItem;
  onView?: () => void;
}) {
  return (
    <li className="flex items-start gap-2">
      <BudgetAlertIcon icon={alert.icon} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">{alert.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">{alert.subtitle}</p>
      </div>
      <Button
        variant="link"
        className="h-auto shrink-0 p-0 text-[10px] text-gate-reject-foreground hover:text-gate-reject-foreground"
        onClick={onView}
      >
        查看
      </Button>
    </li>
  );
}

function BudgetOptimizationIcon({ icon }: { icon: BudgetOptimizationView['icon'] }) {
  const config = {
    accommodation: {
      className: 'bg-muted/15 text-muted-foreground',
      Icon: BedDouble,
    },
    activities: {
      className: 'bg-gate-allow/15 text-gate-allow-foreground',
      Icon: Ticket,
    },
    food: {
      className: 'bg-gate-confirm/15 text-gate-confirm-foreground',
      Icon: UtensilsCrossed,
    },
    generic: {
      className: 'bg-muted text-muted-foreground',
      Icon: Sparkles,
    },
  }[icon];
  const { className, Icon } = config;
  return (
    <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', className)}>
      <Icon className="w-3.5 h-3.5" />
    </div>
  );
}

function BudgetOptimizationRow({
  item,
  onOptimize,
}: {
  item: BudgetOptimizationView;
  onOptimize?: () => void;
}) {
  return (
    <li className="flex items-start gap-2">
      <BudgetOptimizationIcon icon={item.icon} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">{item.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">{item.subtitle}</p>
      </div>
      <Button size="sm" variant="outline" className="h-6 shrink-0 px-2 text-[10px]" onClick={onOptimize}>
        优化
      </Button>
    </li>
  );
}
