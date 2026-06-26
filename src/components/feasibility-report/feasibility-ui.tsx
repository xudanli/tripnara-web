import { format } from 'date-fns';
import { useMemo, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  FileSearch,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  Wrench,
  BedDouble,
  Play,
  CheckCircle2,
} from 'lucide-react';
import CoverageDisclosureFootnote from '@/components/readiness/CoverageDisclosureFootnote';
import { computeCanStartExecute } from '@/lib/feasibility-can-start-execute';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  feasibilityDimensionGridClass,
  feasibilityDimensionLabel,
} from '@/lib/feasibility-dimension-display';
import {
  feasibilityIssueCategoryLabel,
  feasibilityIssueKindHint,
  getFeasibilityIssueIcon,
  getFeasibilityIssueIconColorClasses,
  resolveFeasibilityIssueAction,
} from '@/lib/feasibility-issue-display';
import { resolveFeasibilityIssueActionTarget } from '@/lib/feasibility-issue-action';
import { issueMatchesCategory } from '@/lib/feasibility-issue-focus';
import {
  resolveFeasibilityIssueDayLabel,
  resolveFeasibilityIssueDayNumber,
} from '@/lib/feasibility-issue-day';
import { dedupeFeasibilityIssues } from '@/lib/feasibility-issue-dedupe';
import {
  canApplyRepairOption,
  buildFeasibilityEvidenceProofRows,
} from '@/lib/feasibility-proof-plan-b';
import type { FeasibilityTravelTimingViewModel } from '@/lib/feasibility-travel-timing';
import type { TripDetail } from '@/types/trip';
import {
  dayStatusAccentBorder,
  dayStatusGate,
  dimensionScoreAccent,
  dimensionScoreLabel,
  feasibilityVerdictGateClasses,
  feasibilityVerdictIcon,
  feasibilityVerdictLabel,
  feasibilityVerdictToGate,
  issueCountBadgeClasses,
  priorityAccentBorder,
  priorityBadgeClasses,
  priorityLabel,
  scoreBarClass,
  verdictAccentBorder,
} from '@/lib/feasibility-ui';
import { getGateStatusClasses, getGateStatusIcon, getGateStatusLabel } from '@/lib/gate-status';
import type {
  FeasibilityDayAccommodationDto,
  FeasibilityDayStatusDto,
  FeasibilityDimensionTileDto,
  FeasibilityIssueDto,
  FeasibilityIssuePriority,
  FeasibilityProofAtomDto,
  FeasibilityRepairOptionDto,
  FeasibilityVerdictStatus,
  FeasibilityProbabilisticAssessmentDto,
  FeasibilityReportValidateOptions,
  TripFeasibilityReportDto,
} from '@/types/trip-feasibility-report';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const FEASIBILITY_SHOW_OPS_AUDIT = import.meta.env.DEV;

export function FeasibilityIssueCategoryIcon({
  issue,
  className,
}: {
  issue: FeasibilityIssueDto;
  className?: string;
}) {
  const Icon = getFeasibilityIssueIcon(issue);
  const label = feasibilityIssueCategoryLabel(issue);
  return (
    <Icon
      className={cn(
        'h-3.5 w-3.5 shrink-0',
        getFeasibilityIssueIconColorClasses(issue),
        className,
      )}
      aria-hidden={label ? undefined : true}
      aria-label={label ?? undefined}
      title={label ?? undefined}
    />
  );
}

export function FeasibilityRevalidateActions({
  onRevalidate,
  revalidating,
  size = 'sm',
}: {
  onRevalidate: (options?: FeasibilityReportValidateOptions) => void;
  revalidating?: boolean;
  size?: 'sm' | 'default';
}) {
  return (
    <div className="inline-flex items-center rounded-md shadow-sm">
      <Button
        size={size}
        className="rounded-r-none"
        onClick={() => onRevalidate()}
        disabled={revalidating}
      >
        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', revalidating && 'animate-spin')} />
        重新验证
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size={size}
            variant="default"
            className="rounded-l-none border-l border-primary-foreground/20 px-2"
            disabled={revalidating}
            aria-label="更多验证选项"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() =>
              onRevalidate({ forceRefreshEvidence: true, runMonteCarlo: true })
            }
          >
            深度验证（刷新证据 + 蒙特卡洛）
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              onRevalidate({ runMonteCarlo: true, monteCarloSampleSize: 500 })
            }
          >
            蒙特卡洛重算（500 样本）
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** 报告摘要区：裁决 + 分数 + 问题统计 + 操作 */
export function FeasibilityReportOverview({
  report,
  onRevalidate,
  revalidating,
  onStartExecute,
  variant = 'full',
}: {
  report: TripFeasibilityReportDto;
  onRevalidate: (options?: FeasibilityReportValidateOptions) => void;
  revalidating?: boolean;
  onStartExecute?: () => void;
  /** sheet 内嵌用紧凑条，全页用完整卡片 */
  variant?: 'full' | 'compact';
}) {
  if (variant === 'compact') {
    return (
      <FeasibilityReportCompactBar
        report={report}
        onRevalidate={onRevalidate}
        revalidating={revalidating}
        onStartExecute={onStartExecute}
      />
    );
  }

  const issueTotal =
    report.summary.mustHandle + report.summary.suggestAdjust + report.summary.pendingConfirm;
  const canStart = computeCanStartExecute(report);

  return (
    <div className="rounded-lg border border-border bg-muted/25 overflow-hidden">
      <FeasibilityVerdictStrip
        status={report.verdict.status}
        headline={report.verdict.headline}
        subheadline={report.verdict.subheadline}
        verifiedAt={report.verifiedAt}
        className="border-0 border-b border-border/80 rounded-none bg-transparent shadow-none"
      />
      {report.probabilisticAssessment ? (
        <div className="border-b border-border/80 px-4 py-2">
          <FeasibilityProbabilisticAssessmentPanel
            assessment={report.probabilisticAssessment}
            showAudit={FEASIBILITY_SHOW_OPS_AUDIT}
          />
        </div>
      ) : null}
      <div className="px-4 py-3 space-y-3">
        <FeasibilityScoreBlock
          score={report.overallScore}
          compact
          footnote="基于行程可执行性（readiness）核；团队适配与行程完整度见下方六维，不计入此分。"
        />
        <FeasibilityExtendedDimensionSummaries report={report} />
        {canStart ? (
          <div className="flex items-center gap-2 rounded-md border border-gate-pass-border bg-gate-pass/15 px-3 py-2 text-xs text-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-gate-pass" />
            <span>当前方案可出发执行</span>
          </div>
        ) : report.isStale ? (
          <p className="text-xs text-muted-foreground">行程已变更，请重新验证后再出发</p>
        ) : report.summary.mustHandle > 0 ? (
          <p className="text-xs text-muted-foreground">
            仍有 {report.summary.mustHandle} 项必须处理，处理后可出发
          </p>
        ) : report.verdict.status !== 'EXECUTABLE' ? (
          <p className="text-xs text-muted-foreground">需调整至可执行状态后再出发</p>
        ) : null}
        {report.phaseHint ? (
          <p className="text-xs text-muted-foreground leading-relaxed">{report.phaseHint}</p>
        ) : null}
        {issueTotal > 0 && (
          <FeasibilitySummaryChips
            mustHandle={report.summary.mustHandle}
            suggestAdjust={report.summary.suggestAdjust}
            pendingConfirm={report.summary.pendingConfirm}
          />
        )}
        <div className="flex flex-wrap gap-2">
          <FeasibilityRevalidateActions onRevalidate={onRevalidate} revalidating={revalidating} />
          {canStart && onStartExecute ? (
            <Button size="sm" variant="default" onClick={onStartExecute}>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              开始执行
            </Button>
          ) : null}
        </div>
        {report.coverageDisclosure ? (
          <CoverageDisclosureFootnote disclosure={report.coverageDisclosure} />
        ) : null}
      </div>
    </div>
  );
}

/** Sheet / 抽屉：单行摘要，把垂直空间留给问题列表 */
export function FeasibilityReportCompactBar({
  report,
  onRevalidate,
  revalidating,
  onStartExecute,
}: {
  report: TripFeasibilityReportDto;
  onRevalidate: (options?: FeasibilityReportValidateOptions) => void;
  revalidating?: boolean;
  onStartExecute?: () => void;
}) {
  const Icon = feasibilityVerdictIcon(report.verdict.status);
  const gate = feasibilityVerdictToGate(report.verdict.status);
  const canStart = computeCanStartExecute(report);
  const issueTotal =
    report.summary.mustHandle + report.summary.suggestAdjust + report.summary.pendingConfirm;

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/20 overflow-hidden border-l-[3px]',
        verdictAccentBorder(report.verdict.status),
      )}
      role="status"
    >
      {report.isStale && (
        <div className="flex items-center gap-2 border-b border-gate-confirm-border/60 bg-gate-confirm/25 px-3 py-1.5 text-[11px] text-gate-confirm-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          <span className="leading-snug">
            行程已变更，报告已过期 — 建议先重新验证
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border',
            feasibilityVerdictGateClasses(report.verdict.status),
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span
            className={cn(
              'text-xl font-semibold tabular-nums leading-none',
              dimensionScoreLabel(report.overallScore),
            )}
          >
            {report.overallScore}
          </span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-foreground truncate">
            {report.verdict.headline}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn('text-[10px] shrink-0', feasibilityVerdictGateClasses(report.verdict.status))}
        >
          {getGateStatusLabel(gate)}
        </Badge>
        {issueTotal > 0 && (
          <FeasibilitySummaryChips
            className="shrink-0"
            mustHandle={report.summary.mustHandle}
            suggestAdjust={report.summary.suggestAdjust}
            pendingConfirm={report.summary.pendingConfirm}
          />
        )}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <Button
            size="sm"
            variant={report.isStale ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => onRevalidate()}
            disabled={revalidating}
          >
            <RefreshCw className={cn('h-3 w-3 mr-1', revalidating && 'animate-spin')} />
            重新验证
          </Button>
          {canStart && onStartExecute ? (
            <Button size="sm" className="h-7 text-xs" onClick={onStartExecute}>
              <Play className="h-3 w-3 mr-1" />
              执行
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** 优先处理问题快捷入口（must_handle 优先） */
export function FeasibilityPriorityIssueQueue({
  issues,
  dayTimeline,
  selectedIssueId,
  onSelect,
  maxItems = 3,
}: {
  issues: FeasibilityIssueDto[];
  dayTimeline: FeasibilityDayStatusDto[];
  selectedIssueId: string | null;
  onSelect: (issueId: string, dayNumber: number) => void;
  maxItems?: number;
}) {
  const topIssues = useMemo(() => {
    const must = issues.filter((i) => i.priority === 'must_handle');
    const pool = must.length > 0 ? must : issues;
    return pool.slice(0, maxItems);
  }, [issues, maxItems]);

  const dayForIssue = (issue: FeasibilityIssueDto) =>
    resolveFeasibilityIssueDayNumber(issue, dayTimeline) ?? 1;

  if (topIssues.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-0.5">
        {issues.some((i) => i.priority === 'must_handle') ? '优先处理' : '建议先看'}
      </p>
      <div className="space-y-1">
        {topIssues.map((issue) => {
          const dayNumber = dayForIssue(issue);
          const dayLabel = resolveFeasibilityIssueDayLabel(issue, dayTimeline);
          const isSelected = selectedIssueId === issue.id;
          return (
            <button
              key={issue.id}
              type="button"
              onClick={() => onSelect(issue.id, dayNumber)}
              className={cn(
                'w-full flex items-start gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-colors',
                isSelected
                  ? cn('bg-background border-border border-l-[3px]', priorityAccentBorder(issue.priority))
                  : 'border-transparent bg-muted/30 hover:bg-muted/50',
              )}
            >
              <FeasibilityIssueCategoryIcon issue={issue} className="mt-0.5" />
              {dayLabel ? (
                <span className="text-[10px] font-mono-brand text-muted-foreground shrink-0 mt-0.5 tabular-nums">
                  {dayLabel}
                </span>
              ) : null}
              <FeasibilityPriorityBadge priority={issue.priority} />
              <span className="line-clamp-2 text-foreground leading-snug min-w-0">
                {issue.title || issue.message}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 维度 + phaseHint + 数据边界 — 默认折叠，不挡问题列表 */
export function FeasibilityReportMetaCollapsible({
  report,
}: {
  report: TripFeasibilityReportDto;
}) {
  const hasDimensions = report.dimensions.length > 0;
  const hasMeta = Boolean(report.phaseHint || report.coverageDisclosure);
  if (!hasDimensions && !hasMeta) return null;

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-full justify-between text-xs text-muted-foreground hover:text-foreground px-2"
        >
          <span>维度评估与数据说明</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-3">
        {hasDimensions && <FeasibilityDimensionStrip dimensions={report.dimensions} />}
        <FeasibilityExtendedDimensionSummaries report={report} />
        {report.phaseHint ? (
          <p className="text-[11px] text-muted-foreground leading-relaxed px-1">{report.phaseHint}</p>
        ) : null}
        {report.coverageDisclosure ? (
          <CoverageDisclosureFootnote disclosure={report.coverageDisclosure} />
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function FeasibilityDimensionStrip({
  dimensions,
}: {
  dimensions: FeasibilityDimensionTileDto[];
}) {
  if (dimensions.length === 0) return null;

  return (
    <div className={cn('grid gap-2', feasibilityDimensionGridClass(dimensions.length))}>
      {dimensions.map((dim) => (
        <div
          key={dim.key}
          className={cn(
            'rounded-md border border-border bg-muted/20 px-2.5 py-2 border-l-[3px]',
            dimensionScoreAccent(dim.score),
          )}
        >
          <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
            <span className="font-medium truncate">
              {dim.label || feasibilityDimensionLabel(String(dim.key))}
            </span>
            {dim.issueCount > 0 && (
              <span className="tabular-nums shrink-0">{dim.issueCount} 项</span>
            )}
          </div>
          <p
            className={cn(
              'text-lg font-semibold tabular-nums mt-0.5 leading-none',
              dimensionScoreLabel(dim.score),
            )}
          >
            {dim.score}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 leading-snug truncate">
            {dim.statusLabel}
          </p>
        </div>
      ))}
    </div>
  );
}

/** @deprecated 使用 FeasibilityReportOverview */
export function FeasibilityReportContextBar({
  report,
  onRevalidate,
  revalidating,
}: {
  report: import('@/types/trip-feasibility-report').TripFeasibilityReportDto;
  onRevalidate: (options?: FeasibilityReportValidateOptions) => void;
  revalidating?: boolean;
}) {
  const Icon = feasibilityVerdictIcon(report.verdict.status);
  const issueTotal =
    report.summary.mustHandle + report.summary.suggestAdjust + report.summary.pendingConfirm;
  const needsVerify = report.verdict.status === 'UNKNOWN' || !report.verifiedAt;

  if (needsVerify) {
    return (
      <div
        className="rounded-lg border border-border bg-muted/25 px-3 py-3 flex flex-wrap items-center justify-between gap-3"
      >
        <p className="text-sm text-muted-foreground leading-relaxed">{report.verdict.headline}</p>
        <Button size="sm" onClick={() => onRevalidate()} disabled={revalidating}>
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', revalidating && 'animate-spin')} />
          重新验证
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/25 px-3 py-2.5 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border',
              feasibilityVerdictGateClasses(report.verdict.status),
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </div>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {report.overallScore}
          </span>
          <span className="text-xs text-muted-foreground">
            {issueTotal > 0 ? `· ${issueTotal} 项待处理` : '· 暂无需处理问题'}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs shrink-0"
          onClick={() => onRevalidate()}
          disabled={revalidating}
        >
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1', revalidating && 'animate-spin')} />
          重新验证
        </Button>
      </div>
      {issueTotal > 0 && (
        <FeasibilitySummaryChips
          mustHandle={report.summary.mustHandle}
          suggestAdjust={report.summary.suggestAdjust}
          pendingConfirm={report.summary.pendingConfirm}
        />
      )}
    </div>
  );
}

export function FeasibilityDimensionsCollapsible({
  dimensions,
}: {
  dimensions: FeasibilityDimensionTileDto[];
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1">
        <ChevronRight className="h-3.5 w-3.5 transition-transform [[data-state=open]>&]:rotate-90" />
        维度得分（次要参考）
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {dimensions.map((dim) => (
            <FeasibilityDimensionTile key={dim.key} dim={dim} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** 概率评估辅助层：不覆盖 canStartExecute / verdict / must_handle */
export function FeasibilityProbabilisticAssessmentPanel({
  assessment,
  showAudit = false,
  className,
}: {
  assessment: FeasibilityProbabilisticAssessmentDto;
  showAudit?: boolean;
  className?: string;
}) {
  const methodLabel =
    assessment.method === 'MONTE_CARLO'
      ? '蒙特卡洛'
      : assessment.method === 'HEURISTIC'
        ? '启发式'
        : '不可用';

  const hasBody =
    assessment.narrative ||
    assessment.feasibilityProbability != null ||
    (assessment.keyRiskFactors?.length ?? 0) > 0 ||
    assessment.pomdp?.independenceTier === 'INDIRECT_PROXY';

  if (!hasBody && !showAudit) return null;

  return (
    <Collapsible defaultOpen={false} className={className}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-md py-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            概率评估（{methodLabel}，辅助说明）
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-2 text-xs">
        {assessment.feasibilityProbability != null && (
          <p>
            可执行概率{' '}
            <span className="font-medium tabular-nums">
              {Math.round(assessment.feasibilityProbability * 100)}%
            </span>
            {assessment.expectedUtility != null ? (
              <>
                {' '}
                · E[U]={' '}
                <span className="font-medium tabular-nums">
                  {assessment.expectedUtility.toFixed(2)}
                </span>
              </>
            ) : null}
          </p>
        )}
        {assessment.narrative && (
          <p className="leading-relaxed text-muted-foreground">{assessment.narrative}</p>
        )}
        {assessment.pomdp?.independenceTier === 'INDIRECT_PROXY' && (
          <p className="text-amber-700/90">间接代理观测，非实时气象</p>
        )}
        {assessment.keyRiskFactors && assessment.keyRiskFactors.length > 0 && (
          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
            {assessment.keyRiskFactors.map((factor) => (
              <li key={factor}>{factor}</li>
            ))}
          </ul>
        )}
        {showAudit && assessment.audit?.session_consistency_score != null && (
          <p className="font-mono text-[10px] text-muted-foreground">
            session_consistency_score={assessment.audit.session_consistency_score}
            {assessment.pomdp?.worldSource ? ` · worldSource=${assessment.pomdp.worldSource}` : ''}
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function FeasibilityVerdictStrip({
  status,
  headline,
  subheadline,
  verifiedAt,
  className,
}: {
  status: FeasibilityVerdictStatus;
  headline: string;
  subheadline?: string;
  verifiedAt?: string;
  className?: string;
}) {
  const Icon = feasibilityVerdictIcon(status);
  const gate = feasibilityVerdictToGate(status);

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/30 overflow-hidden border-l-[3px]',
        verdictAccentBorder(status),
        className,
      )}
      role="status"
      aria-label={`可执行性：${feasibilityVerdictLabel(status)}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border',
              feasibilityVerdictGateClasses(status),
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-semibold leading-snug text-foreground">{headline}</p>
            {subheadline && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{subheadline}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-medium border',
              feasibilityVerdictGateClasses(status),
            )}
          >
            {getGateStatusLabel(gate)}
          </Badge>
          {verifiedAt && (
            <span className="text-[10px] font-mono-brand text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(verifiedAt), 'M月d日 HH:mm')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function FeasibilityScoreBlock({
  score,
  compact,
  className,
  footnote,
}: {
  score: number;
  compact?: boolean;
  className?: string;
  /** 说明 overallScore 不含扩展维度 */
  footnote?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className={cn('flex items-end gap-4')}>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            综合可执行性
          </p>
          <p
            className={cn(
              'font-semibold tabular-nums tracking-tight text-foreground',
              compact ? 'text-2xl' : 'text-3xl',
            )}
          >
            {score}
            <span className="text-sm font-normal text-muted-foreground ml-1">/ 100</span>
          </p>
        </div>
        <div className="flex-1 min-w-[100px] max-w-xs pb-1">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', scoreBarClass(score))}
              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
            />
          </div>
        </div>
      </div>
      {footnote ? (
        <p className="text-[11px] text-muted-foreground leading-relaxed">{footnote}</p>
      ) : null}
    </div>
  );
}

/** 六维扩展摘要（API 可选；与 overallScore 分离） */
export function FeasibilityExtendedDimensionSummaries({
  report,
  className,
}: {
  report: TripFeasibilityReportDto;
  className?: string;
}) {
  const { teamFitSummary, itineraryCompletenessSummary } = report;
  if (!teamFitSummary && !itineraryCompletenessSummary) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {teamFitSummary ? (
        <div className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">团队适配 </span>
          <span className="tabular-nums font-semibold text-foreground">{teamFitSummary.score}</span>
          <span>
            {' '}
            · 画像 {teamFitSummary.profilingCompletedCount}/{teamFitSummary.memberCount} 人完成
          </span>
        </div>
      ) : null}
      {itineraryCompletenessSummary ? (
        <div className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">行程结构 </span>
          <span className="tabular-nums font-semibold text-foreground">
            {itineraryCompletenessSummary.score}
          </span>
          <span> · {itineraryCompletenessSummary.signalCount} 项结构信号</span>
        </div>
      ) : null}
    </div>
  );
}

export function FeasibilitySummaryChips({
  mustHandle,
  suggestAdjust,
  pendingConfirm,
  className,
}: {
  mustHandle: number;
  suggestAdjust: number;
  pendingConfirm: number;
  className?: string;
}) {
  if (mustHandle === 0 && suggestAdjust === 0 && pendingConfirm === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {mustHandle > 0 && (
        <span className="inline-flex items-center gap-1 rounded-md border border-gate-reject-border bg-gate-reject px-2 py-0.5 text-[11px] font-medium text-gate-reject-foreground">
          {mustHandle} 必须处理
        </span>
      )}
      {suggestAdjust > 0 && (
        <span className="inline-flex items-center gap-1 rounded-md border border-gate-suggest-border bg-gate-suggest px-2 py-0.5 text-[11px] font-medium text-gate-suggest-foreground">
          {suggestAdjust} 建议调整
        </span>
      )}
      {pendingConfirm > 0 && (
        <span className="inline-flex items-center gap-1 rounded-md border border-gate-confirm-border bg-gate-confirm px-2 py-0.5 text-[11px] font-medium text-gate-confirm-foreground">
          {pendingConfirm} 需确认
        </span>
      )}
    </div>
  );
}

export function FeasibilityDimensionTile({ dim }: { dim: FeasibilityDimensionTileDto }) {
  return (
    <div
      className={cn(
        'group rounded-lg border border-border bg-muted/20 px-4 py-3 border-l-[3px]',
        'transition-colors hover:bg-muted/35',
        dimensionScoreAccent(dim.score),
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] text-muted-foreground font-medium leading-tight">{dim.label}</p>
        {dim.issueCount > 0 && (
          <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
            {dim.issueCount} 项
          </span>
        )}
      </div>
      <p
        className={cn(
          'text-2xl font-semibold tabular-nums mt-1.5',
          dimensionScoreLabel(dim.score),
        )}
      >
        {dim.score}
      </p>
      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{dim.statusLabel}</p>
    </div>
  );
}

export function FeasibilityPriorityBadge({ priority }: { priority: FeasibilityIssuePriority }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium border',
        priorityBadgeClasses(priority),
      )}
    >
      {priorityLabel(priority)}
    </span>
  );
}

export function FeasibilityDayAccommodationBadge({
  accommodation,
  className,
}: {
  accommodation?: FeasibilityDayAccommodationDto;
  className?: string;
}) {
  if (!accommodation) return null;

  if (!accommodation.needsNightStay) {
    return (
      <span
        className={cn(
          'shrink-0 text-[10px] text-muted-foreground tabular-nums',
          className,
        )}
      >
        末天
      </span>
    );
  }

  if (accommodation.hasAccommodation) {
    return (
      <span
        className={cn(
          'shrink-0 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium',
          'border border-gate-allow-border bg-gate-allow/15 text-muted-foreground max-w-[9rem]',
          className,
        )}
      >
        <BedDouble className="h-3 w-3 shrink-0" aria-hidden />
        <span className="truncate">{accommodation.label ?? '已安排'}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'shrink-0 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium',
        'border border-gate-suggest-border bg-gate-suggest/20 text-gate-suggest-foreground',
        className,
      )}
    >
      <BedDouble className="h-3 w-3 shrink-0" aria-hidden />
      缺住宿
    </span>
  );
}

export function FeasibilityDayAccommodationPanel({
  accommodation,
  dayNumber,
  onAddAccommodation,
}: {
  accommodation?: FeasibilityDayAccommodationDto;
  dayNumber: number;
  /** 打开「添加行程项」弹窗（住宿） */
  onAddAccommodation?: () => void;
}) {
  if (!accommodation) return null;

  const tone = !accommodation.needsNightStay
    ? 'neutral'
    : accommodation.hasAccommodation
      ? 'ok'
      : 'warn';

  return (
    <div
      className={cn(
        'rounded-lg border px-3.5 py-3 space-y-2',
        tone === 'warn'
          ? 'border-gate-suggest-border bg-gate-suggest/15'
          : 'border-border bg-muted/20',
      )}
    >
      <div className="flex items-center gap-2">
        <BedDouble className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-xs font-medium text-foreground">当晚住宿</p>
        <span className="text-[10px] font-mono-brand text-muted-foreground">第 {dayNumber} 天</span>
      </div>
      <p
        className={cn(
          'text-xs leading-relaxed',
          tone === 'warn'
            ? 'text-gate-suggest-foreground'
            : 'text-muted-foreground',
        )}
      >
        {accommodation.message ??
          (accommodation.hasAccommodation
            ? accommodation.label
              ? `已安排：${accommodation.label}`
              : '已安排住宿'
            : '尚未安排住宿')}
      </p>
      {tone === 'warn' && onAddAccommodation ? (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAddAccommodation}>
          在时间轴添加住宿
        </Button>
      ) : null}
    </div>
  );
}

export function FeasibilityDayRow({
  dayNumber,
  status,
  summary,
  issueCount = 0,
  accommodation,
  selected,
  expanded,
  onClick,
}: {
  dayNumber: number;
  status: 'ok' | 'warning' | 'blocked';
  summary?: string;
  issueCount?: number;
  accommodation?: FeasibilityDayAccommodationDto;
  selected?: boolean;
  expanded?: boolean;
  onClick?: () => void;
}) {
  const Icon = getGateStatusIcon(dayStatusGate(status));
  const hasIssues = issueCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left transition-all',
        'hover:bg-muted/50',
        selected && 'bg-muted/40',
      )}
    >
      {hasIssues ? (
        expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        )
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border',
          hasIssues
            ? getGateStatusClasses(dayStatusGate(status))
            : 'border-border bg-muted/40 text-muted-foreground',
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="text-sm font-medium shrink-0 tabular-nums">第 {dayNumber} 天</span>
      <FeasibilityDayAccommodationBadge accommodation={accommodation} className="shrink-0" />
      {summary && !expanded && (
        <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{summary}</span>
      )}
      {hasIssues && (
        <span
          className={cn(
            'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
            issueCountBadgeClasses(status, selected),
          )}
        >
          {issueCount}
        </span>
      )}
    </button>
  );
}

export function FeasibilityDayIssueNavigator({
  dayTimeline,
  issues,
  selectedDayNumber,
  selectedIssueId,
  categoryFilter,
  onDaySelect,
  onIssueSelect,
}: {
  dayTimeline: FeasibilityDayStatusDto[];
  issues: FeasibilityIssueDto[];
  selectedDayNumber: number | null;
  selectedIssueId: string | null;
  categoryFilter?: string | null;
  onDaySelect: (dayNumber: number) => void;
  onIssueSelect: (issueId: string, dayNumber: number) => void;
}) {
  const issueById = useMemo(() => new Map(issues.map((i) => [i.id, i])), [issues]);

  const issuesForDay = (dayNumber: number, issueIds: string[]) => {
    const fromTimeline = issueIds
      .map((id) => issueById.get(id))
      .filter((issue): issue is FeasibilityIssueDto => issue != null);

    const fromResolved = issues.filter(
      (issue) => resolveFeasibilityIssueDayNumber(issue, dayTimeline) === dayNumber,
    );

    const merged = [...fromTimeline, ...fromResolved];
    const deduped = dedupeFeasibilityIssues(merged).issues;
    if (!categoryFilter) return deduped;
    return deduped.filter((issue) => issueMatchesCategory(issue, categoryFilter));
  };

  const visibleDayTimeline = useMemo(() => {
    if (!categoryFilter) return dayTimeline;
    return dayTimeline.filter((day) => issuesForDay(day.dayNumber, day.issueIds).length > 0);
  }, [categoryFilter, dayTimeline, issues, issueById]);

  if (visibleDayTimeline.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center rounded-lg border border-dashed border-border px-3 leading-relaxed">
        {categoryFilter
          ? '该维度下暂无待处理问题。若刚刷新过证据，可点「清除」查看全部天数。'
          : '暂无日程数据'}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {visibleDayTimeline.map((day) => {
        const dayIssues = issuesForDay(day.dayNumber, day.issueIds);
        const isDaySelected = selectedDayNumber === day.dayNumber;
        const isExpanded = isDaySelected && dayIssues.length > 0;

        return (
          <div
            key={day.dayNumber}
            className={cn(
              'rounded-lg border transition-all',
              isDaySelected
                ? cn('border-border bg-muted/35 border-l-[3px]', dayStatusAccentBorder(day.status))
                : 'border-transparent',
            )}
          >
            <FeasibilityDayRow
              dayNumber={day.dayNumber}
              status={day.status}
              summary={day.summary}
              issueCount={dayIssues.length}
              accommodation={day.accommodation}
              selected={isDaySelected}
              expanded={isExpanded}
              onClick={() => onDaySelect(day.dayNumber)}
            />

            {isExpanded && (
              <div className="mx-2 mb-2 ml-6 border-l border-border/80 pl-3 space-y-0.5">
                {dayIssues.map((issue) => {
                  const isIssueSelected = selectedIssueId === issue.id;
                  return (
                    <button
                      key={issue.id}
                      type="button"
                      className={cn(
                        'w-full text-left rounded-md py-2 pr-2 text-xs transition-all',
                        'hover:bg-muted/50',
                        isIssueSelected &&
                          cn(
                            'bg-background/90 border border-border/80 border-l-[2px] pl-2.5',
                            priorityAccentBorder(issue.priority),
                          ),
                        !isIssueSelected && 'pl-2',
                      )}
                      onClick={() => onIssueSelect(issue.id, day.dayNumber)}
                    >
                      <div className="flex items-start gap-2">
                        <FeasibilityIssueCategoryIcon issue={issue} className="mt-0.5" />
                        <FeasibilityPriorityBadge priority={issue.priority} />
                        <span
                          className={cn(
                            'leading-relaxed line-clamp-2',
                            isIssueSelected ? 'text-foreground font-medium' : 'text-muted-foreground',
                          )}
                        >
                          {issue.message}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {isDaySelected && dayIssues.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 pl-12 pr-3 pb-2">
                这一天暂无可处理问题
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FeasibilityIssueDetailHeader({
  issue,
  dayNumber,
  dayTimeline,
  confirmHint,
  tripId,
  onAction,
}: {
  issue: FeasibilityIssueDto;
  dayNumber?: number | null;
  dayTimeline?: FeasibilityDayStatusDto[];
  confirmHint?: string | null;
  tripId?: string;
  onAction?: () => void;
}) {
  const categoryLabel = feasibilityIssueCategoryLabel(issue);
  const kindHint = feasibilityIssueKindHint(issue);
  const actionTarget = tripId ? resolveFeasibilityIssueActionTarget(issue, tripId) : null;
  const linkAction = tripId ? resolveFeasibilityIssueAction(issue, tripId) : null;
  const issueDay = resolveFeasibilityIssueDayNumber(issue, dayTimeline) ?? dayNumber;
  const dayMismatch =
    dayNumber != null && issueDay != null && dayNumber !== issueDay
      ? issueDay
      : null;
  const useButton =
    actionTarget &&
    (actionTarget.surface === 'feasibility_repair' ||
      actionTarget.surface === 'road_class_repair' ||
      actionTarget.surface === 'refresh_evidence' ||
      actionTarget.surface === 'friction_radar' ||
      actionTarget.surface === 'split_consensus' ||
      actionTarget.surface === 'decision_profiling_quiz' ||
      actionTarget.surface === 'team_style_wall');

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/20 overflow-hidden border-l-[3px]',
        priorityAccentBorder(issue.priority),
      )}
    >
      <div className="px-4 py-3.5 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <FeasibilityIssueCategoryIcon issue={issue} />
          <FeasibilityPriorityBadge priority={issue.priority} />
          {categoryLabel ? (
            <Badge variant="outline" className="text-[10px] h-5 font-normal">
              {categoryLabel}
            </Badge>
          ) : null}
          {issueDay != null && (
            <span className="text-[10px] font-mono-brand text-muted-foreground tabular-nums">
              第 {issueDay} 天
            </span>
          )}
          {dayMismatch != null ? (
            <span className="text-[10px] text-muted-foreground">
              （列表选中第 {dayNumber} 天，本条归属第 {dayMismatch} 天）
            </span>
          ) : null}
        </div>
        <p className="text-sm font-semibold leading-relaxed text-foreground">{issue.message}</p>
        {kindHint ? (
          <p className="text-xs text-muted-foreground leading-relaxed">{kindHint}</p>
        ) : null}
        {issue.category === 'team_fit' || issue.issueKind === 'profiling_incomplete' ? (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            完成画像或分摊共识后，请回到此页点击「重新验证」，团队适配维度才会更新。
          </p>
        ) : null}
        {issue.actionRequired && (
          <p className="text-xs text-muted-foreground leading-relaxed pl-3 border-l border-border">
            {issue.actionRequired}
          </p>
        )}
        {confirmHint && (
          <p
            className={cn(
              'text-xs leading-relaxed rounded-md border px-3 py-2',
              'bg-gate-confirm/50 text-gate-confirm-foreground border-gate-confirm-border',
            )}
          >
            {confirmHint}
          </p>
        )}
        {actionTarget ? (
          useButton ? (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onAction}>
              {actionTarget.label}
            </Button>
          ) : linkAction?.href ? (
            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
              <Link to={linkAction.href}>{actionTarget.label}</Link>
            </Button>
          ) : null
        ) : null}
      </div>
    </div>
  );
}

export function FeasibilityRepairOptionCard({
  option,
  index,
  onApply,
  applying,
  selected,
  manualOnly,
}: {
  option: FeasibilityRepairOptionDto;
  index: number;
  onApply?: () => void;
  applying?: boolean;
  selected?: boolean;
  /** Plan B 快捷项：需手动在时间轴操作，无引擎预览 */
  manualOnly?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/20 px-3.5 py-3 text-sm',
        selected && 'border-primary/60 bg-primary/5',
        manualOnly && 'border-dashed',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-[10px] font-mono-brand text-muted-foreground"
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-medium text-foreground leading-snug">{option.label}</p>
            {manualOnly ? (
              <Badge variant="outline" className="text-[10px] h-5 font-normal shrink-0">
                手动
              </Badge>
            ) : null}
          </div>
          {option.description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{option.description}</p>
          )}
          {option.impactSummary && (
            <p className="text-[11px] text-muted-foreground mt-2 font-mono-brand">
              影响 · {option.impactSummary}
            </p>
          )}
          {onApply && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-7 text-xs"
              disabled={applying}
              onClick={onApply}
            >
              {applying ? '应用中…' : '应用此方案'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FeasibilityStaleNotice({
  verifiedForTripVersion,
  currentTripVersion,
}: {
  verifiedForTripVersion?: string;
  currentTripVersion?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3.5 py-2.5 text-xs flex items-start gap-2.5',
        'bg-gate-confirm/40 text-gate-confirm-foreground border-gate-confirm-border',
      )}
    >
      <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <p className="leading-relaxed">
        报告已过期 · 验证对象{' '}
        <span className="font-mono-brand">{verifiedForTripVersion ?? '—'}</span> · 当前行程{' '}
        <span className="font-mono-brand">{currentTripVersion ?? '—'}</span>，请重新验证后再决策。
      </p>
    </div>
  );
}

export function FeasibilityEvidencePanel({
  proofs,
  dayNumber,
  accommodation,
  trip,
  issue,
  repairOptions,
  travelView,
  open,
  onOpenChange,
  onSelectRepairOption,
  onOpenTravelQuickEdit,
}: {
  proofs?: FeasibilityProofAtomDto[];
  dayNumber?: number;
  accommodation?: FeasibilityDayAccommodationDto;
  trip?: TripDetail | null;
  issue?: FeasibilityIssueDto;
  repairOptions?: FeasibilityRepairOptionDto[];
  travelView?: FeasibilityTravelTimingViewModel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectRepairOption?: (option: FeasibilityRepairOptionDto) => void;
  onOpenTravelQuickEdit?: () => void;
}) {
  const proofRows = useMemo(
    () =>
      buildFeasibilityEvidenceProofRows({
        proofs,
        dayNumber,
        accommodation,
        trip,
        issue,
        repairOptions,
        travelView,
      }),
    [accommodation, dayNumber, proofs, trip, repairOptions, issue, travelView],
  );

  const itemCount = proofRows.length;

  return (
    <div className="border-t border-border pt-4">
      <Button
        variant="ghost"
        size="sm"
        type="button"
        className="h-8 text-xs text-muted-foreground hover:text-foreground -ml-2 gap-1.5"
        onClick={() => onOpenChange(!open)}
      >
        <FileSearch className="h-3.5 w-3.5" />
        可执行证明
        <span className="text-[10px] font-mono-brand text-muted-foreground">
          {itemCount > 0 ? itemCount : '—'}
        </span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </Button>
      {open && (
        <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          {itemCount === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              暂无结构化证据，请重新验证后查看。
            </p>
          ) : (
            proofRows.slice(0, 12).map(({ proof, planBOptions }, i) => (
              <div
                key={`${proof.evidenceType ?? 'proof'}-${i}`}
                className={cn(
                  'rounded-md border border-border bg-background px-3 py-2.5 text-xs space-y-1.5',
                  proof.evidenceType === 'accommodation-coverage' &&
                    accommodation?.needsNightStay &&
                    !accommodation?.hasAccommodation &&
                    'border-gate-suggest-border bg-gate-suggest/10',
                  proof.ruleId?.startsWith('schedule.travel_time') &&
                    (proof.conclusion?.includes('不足') ||
                      proof.conclusion?.includes('无法按时')) &&
                    'border-gate-suggest-border bg-gate-suggest/10',
                  proof.ruleId?.startsWith('booking.advance_reservation') &&
                    (proof.conclusion?.includes('尚未') ||
                      proof.conclusion?.includes('待预订') ||
                      proof.conclusion?.includes('无法入场')) &&
                    'border-gate-suggest-border bg-gate-suggest/10',
                )}
              >
                {proof.entity && (
                  <p className="font-medium text-foreground">
                    <span className="text-muted-foreground">实体 · </span>
                    {proof.entity}
                  </p>
                )}
                {proof.constraint && (
                  <p className="text-muted-foreground leading-relaxed">{proof.constraint}</p>
                )}
                {proof.currentFact && (
                  <p className="text-foreground leading-relaxed">{proof.currentFact}</p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono-brand text-muted-foreground pt-1 border-t border-border/50">
                  {proof.evidenceSource && <span>来源 {proof.evidenceSource}</span>}
                  {proof.observedAt && (
                    <span>{format(new Date(proof.observedAt), 'yyyy-MM-dd HH:mm')}</span>
                  )}
                  {proof.ruleId && <span>规则 {proof.ruleId}</span>}
                </div>
                {proof.conclusion && proof.conclusion !== proof.currentFact && (
                  <p className="text-foreground/90 pt-1">{proof.conclusion}</p>
                )}

                {planBOptions.length > 0 && (
                  <div className="pt-2 mt-1 space-y-1.5 border-t border-border/60">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Plan B
                    </p>
                    {planBOptions.map((option, planIdx) => {
                      const canApply = canApplyRepairOption(option);
                      const isTravelSchedule =
                        option.id.startsWith('planb-travel-') && onOpenTravelQuickEdit;
                      const isBookingNavigate =
                        option.id.startsWith('planb-booking-edit-') && onOpenTravelQuickEdit;
                      return (
                        <div
                          key={option.id}
                          className="rounded border border-border/80 bg-muted/30 px-2.5 py-2 space-y-1"
                        >
                          <p className="text-xs font-medium text-foreground leading-snug">
                            <span className="text-muted-foreground font-mono-brand mr-1.5">
                              {planIdx + 1}.
                            </span>
                            {option.label}
                          </p>
                          {option.description && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {option.description}
                            </p>
                          )}
                          {option.impactSummary && (
                            <p className="text-[10px] font-mono-brand text-muted-foreground">
                              影响 · {option.impactSummary}
                            </p>
                          )}
                          {canApply && onSelectRepairOption && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-1 h-7 text-[11px]"
                              onClick={() => onSelectRepairOption(option)}
                            >
                              预览此方案
                            </Button>
                          )}
                          {!canApply && (isTravelSchedule || isBookingNavigate) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="mt-1 h-7 text-[11px] text-muted-foreground"
                              onClick={onOpenTravelQuickEdit}
                            >
                              快速改时间
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function FeasibilitySectionHeader({
  title,
  description,
  icon: Icon = ShieldCheck,
}: {
  title: string;
  description?: string;
  icon?: typeof ShieldCheck;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-muted/40">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        </span>
        <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed pl-8">{description}</p>
      )}
    </div>
  );
}

export function FeasibilityWorkbenchCard({
  title,
  description,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  description?: string;
  icon?: typeof ShieldCheck;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('rounded-lg border border-border bg-muted/25 min-w-0', className)}>
      <div className="border-b border-border bg-muted/40 px-4 py-3 space-y-0.5">
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-muted/30">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          )}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed pl-8">{description}</p>
        )}
      </div>
      <div className="p-3 min-w-0">{children}</div>
    </div>
  );
}

export function FeasibilityEmptyState({
  title,
  description,
  icon: Icon = Wrench,
}: {
  title: string;
  description?: string;
  icon?: typeof Wrench;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg border border-dashed border-border bg-muted/10">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/30 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </span>
      <p className="text-sm text-muted-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">{description}</p>
      )}
    </div>
  );
}
