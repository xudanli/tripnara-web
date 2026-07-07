import { useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DecisionExecutionStatusPanel } from '@/components/decision-problems/DecisionExecutionStatusPanel';
import { DecisionNeedsRepairBanner } from '@/components/decision-problems/DecisionNeedsRepairBanner';
import { useFeasibilityRepairWorkflow } from '@/hooks/useFeasibilityRepairWorkflow';
import { filterFeasibilityRepairOptionsForTrip } from '@/lib/feasibility-repair-apply';
import CascadeImpactPanel from '@/components/readiness/CascadeImpactPanel';
import type { FeasibilityIssueDto, FeasibilityRepairOptionDto } from '@/types/trip-feasibility-report';
import type { TripDetail } from '@/types/trip';
import { FeasibilityRepairOptionCard } from './feasibility-ui';
import { FeasibilityRepairPreviewPanel } from './FeasibilityRepairPreviewPanel';
import { FeasibilityRepairDeferredChoose } from './FeasibilityRepairDeferredChoose';
import { isSyntheticPlanBRepairOption } from '@/lib/feasibility-proof-plan-b';
import { resolveDecisionProblemId } from '@/lib/decision-problem-enforcement.util';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface FeasibilityRepairWorkflowProps {
  tripId: string;
  issue: FeasibilityIssueDto;
  repairIssueId?: string;
  options: FeasibilityRepairOptionDto[];
  trip?: TripDetail | null;
  /** 打开时是否自动拉取 repair-options */
  autoLoadOptions?: boolean;
  /** 证据区 Plan B 快捷选中 */
  pendingSelectOptionId?: string | null;
  onPendingSelectConsumed?: () => void;
  onApplied?: () => void | Promise<void>;
  onLoadOptions?: () => void | Promise<void>;
  onOptionsLoaded?: (options: FeasibilityRepairOptionDto[]) => void;
  optionsLoading?: boolean;
  onNavigateToSchedule?: () => void;
  onViewDecision?: (decisionId: string) => void;
  onRefreshEvidence?: () => void;
  className?: string;
}

export function FeasibilityRepairWorkflow({
  tripId,
  issue,
  repairIssueId,
  options: optionsProp,
  trip,
  autoLoadOptions,
  pendingSelectOptionId,
  onPendingSelectConsumed,
  onApplied,
  onLoadOptions,
  onOptionsLoaded,
  optionsLoading: optionsLoadingProp,
  onNavigateToSchedule,
  onViewDecision,
  onRefreshEvidence,
  className,
}: FeasibilityRepairWorkflowProps) {
  const { user } = useAuth();
  const workflow = useFeasibilityRepairWorkflow({
    tripId,
    issueId: issue.id,
    decisionProblemId: resolveDecisionProblemId(issue),
    repairIssueId: repairIssueId ?? issue.id,
    initialOptions: optionsProp,
    onApplied,
    onOptionsLoaded,
    filterLoadedOptions: (options) =>
      filterFeasibilityRepairOptionsForTrip(options, trip, issue),
  });

  useEffect(() => {
    if (!pendingSelectOptionId) return;
    void workflow.selectOption(pendingSelectOptionId).finally(() => {
      onPendingSelectConsumed?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to external select requests
  }, [pendingSelectOptionId]);

  useEffect(() => {
    void workflow.loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh authoritative options per issue
  }, [issue.id]);

  const displayOptions = workflow.options.length > 0 ? workflow.options : optionsProp;
  const loading = optionsLoadingProp || workflow.optionsLoading;

  const handleLoad = async () => {
    if (onLoadOptions) {
      await onLoadOptions();
    }
    await workflow.loadOptions();
  };

  const handleConfirm = async () => {
    try {
      await workflow.confirmApply();
      if (workflow.optionsSource !== 'decision-problems') {
        toast.success('已应用修复');
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '应用修复失败';
      toast.error(message.length > 120 ? `${message.slice(0, 120)}…` : message);
    }
  };

  if (!displayOptions.length && !loading) {
    return (
      <div className={cn('space-y-2', className)}>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1">
          建议方案
        </p>
        <p className="text-xs text-muted-foreground px-1 leading-relaxed">
          暂无系统自动生成的调整方案。可使用上方交通卡片、时间轴手动调整，或展开下方证据区查看 Plan B。
        </p>
        <Button size="sm" variant="outline" onClick={() => void handleLoad()}>
          重新加载方案
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {autoLoadOptions && displayOptions.length === 0 && !loading ? (
        <Button size="sm" variant="outline" disabled={loading} onClick={() => void handleLoad()}>
          加载修复方案
        </Button>
      ) : null}

      <div className="grid gap-3 grid-cols-1 min-w-0">
        <div className="space-y-2 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1">
            建议方案
          </p>
          {workflow.issueMessage ? (
            <p className="text-xs text-muted-foreground px-1 leading-relaxed">{workflow.issueMessage}</p>
          ) : null}
          {workflow.cascadeHints.length > 0 && !workflow.preview ? (
            <CascadeImpactPanel
              hints={workflow.cascadeHints}
              causalPreAnalysis={workflow.cascadePreAnalysis}
              compact
              showCardActions={false}
              modeLabel="拆段影响"
            />
          ) : null}
          {loading && displayOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1">加载中…</p>
          ) : (
            displayOptions.map((opt, idx) => (
              <div
                key={opt.id}
                className={cn(
                  workflow.selectedOptionId === opt.id && 'ring-2 ring-primary/40 rounded-lg',
                )}
                onClick={() => void workflow.selectOption(opt.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void workflow.selectOption(opt.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <FeasibilityRepairOptionCard
                  option={opt}
                  index={idx}
                  selected={workflow.selectedOptionId === opt.id}
                  manualOnly={isSyntheticPlanBRepairOption(opt)}
                />
              </div>
            ))
          )}
          {workflow.previewError ? (
            <p className="text-xs text-destructive px-1">{workflow.previewError}</p>
          ) : null}
        </div>

        <div className="space-y-2 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1">
            变更预览
          </p>
          <FeasibilityRepairPreviewPanel
            preview={workflow.preview}
            loading={workflow.isPreviewLoading}
            issue={issue}
            guidanceOption={workflow.guidanceOption}
            onOpenSchedule={onNavigateToSchedule}
            guardianNegotiation={workflow.guardianNegotiation}
            guardianMock={workflow.guardianMock}
            deferred={
              workflow.phase === 'preview_deferred' || workflow.phase === 'apply_deferred'
            }
            forceConfirmed={workflow.forceDecisionRepair}
            onForceConfirm={() => workflow.setForceDecisionRepair(true)}
          />
          {(workflow.phase === 'preview_deferred' ||
            workflow.phase === 'apply_deferred') &&
          workflow.deferredChoosePoints.length > 0 ? (
            <FeasibilityRepairDeferredChoose
              tripId={tripId}
              userId={user?.id}
              issueId={repairIssueId ?? issue.id}
              optionId={workflow.selectedOptionId}
              choosePoints={workflow.deferredChoosePoints}
              presentation={workflow.deferredPresentation}
              message={
                workflow.phase === 'apply_deferred'
                  ? workflow.preview?.message
                  : workflow.preview?.message
              }
              onPresentationChange={workflow.setDeferredPresentation}
              onRetryApply={() => {
                workflow.setForceDecisionRepair(true);
                void handleConfirm();
              }}
            />
          ) : null}
          {workflow.decisionPreview?.acknowledgementRequired?.length ? (
            <div className="space-y-2 rounded-lg border p-3 mx-1">
              <p className="text-xs font-medium">请确认以下事项</p>
              {workflow.decisionPreview.acknowledgementRequired.map((item: string) => (
                <div key={item} className="flex items-start gap-2">
                  <Checkbox
                    id={`feasibility-ack-${item}`}
                    checked={workflow.decisionAcknowledgement.includes(item)}
                    onCheckedChange={(checked) =>
                      workflow.toggleDecisionAcknowledgement(item, checked === true)
                    }
                  />
                  <Label htmlFor={`feasibility-ack-${item}`} className="text-xs font-normal leading-snug">
                    {item}
                  </Label>
                </div>
              ))}
            </div>
          ) : null}
          {workflow.isApplyReady && workflow.resolutionId ? (
            <div className="mx-1 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
              <p className="text-xs font-medium text-foreground">结论已提交</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                确认后将写入 Plan Gate / 时间轴。
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/80">
                resolutionId · <span className="font-mono">{workflow.resolutionId}</span>
              </p>
            </div>
          ) : null}
          {workflow.selectedOptionId && workflow.preview ? (
            <div className="space-y-2 pt-1">
              {workflow.cascadeHints.length > 0 ? (
                <CascadeImpactPanel
                  hints={workflow.cascadeHints}
                  causalPreAnalysis={workflow.cascadePreAnalysis}
                  compact
                  showCardActions={false}
                  modeLabel="修复可能影响"
                />
              ) : null}
              <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={workflow.confirmDisabled || workflow.isApplying}
                onClick={() => void handleConfirm()}
              >
                {workflow.isApplying ? '应用中…' : workflow.confirmLabel}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={workflow.reset}
              >
                重选方案
              </Button>
              </div>
              {workflow.applyError ? (
                <p className="text-xs text-destructive leading-relaxed px-0.5">
                  {workflow.applyError.length > 240
                    ? `${workflow.applyError.slice(0, 240)}…`
                    : workflow.applyError}
                </p>
              ) : null}
              {workflow.phase === 'done' &&
              workflow.optionsSource === 'decision-problems' &&
              workflow.executionClassification ? (
                <>
                  <DecisionNeedsRepairBanner
                    variant={workflow.executionClassification.variant}
                    failureMessage={
                      workflow.executionStatus?.postApplyCoherence?.failureMessage
                    }
                    needsRepair={workflow.executionClassification.needsRepair}
                    onContinueRepair={workflow.reset}
                  />
                  <DecisionExecutionStatusPanel
                    status={workflow.executionStatus}
                    variant={workflow.executionClassification.variant}
                    effectiveDecisionId={
                      workflow.executionClassification.effectiveDecisionId ??
                      workflow.lastDecisionResult?.effectiveDecisionId ??
                      workflow.lastDecisionResult?.decision.id
                    }
                    onViewDecision={onViewDecision}
                    onRefreshEvidence={onRefreshEvidence}
                    onContinueRepair={workflow.reset}
                    onReselectOption={workflow.reset}
                    onRetry={() => void handleConfirm()}
                  />
                  {workflow.executionClassification.variant === 'error_rolled_back' &&
                  workflow.lastDecisionResult?.decision.tripVersionBefore ? (
                    <p className="text-[11px] text-muted-foreground px-0.5">
                      行程版本已回滚至 {workflow.lastDecisionResult.decision.tripVersionBefore}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
