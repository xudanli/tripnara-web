import { CheckCircle2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import type { ExecutePlanningWorkbenchResponse } from '@/api/planning-workbench';
import type { PlanGatePreTripTasks, PlanGateSubmitEligibility } from '@/types/plan-gate';
import { resolvePlanGatePreTripTasksTotal } from '@/hooks/usePlanGatePreTripTasks';
import { PlanGatePreTripTasksPanel } from '../PlanGatePreTripTasksPanel';
import { PlanGateDraftSummary } from '../PlanGateDraftSummary';
import { PlanGateAgentDraftMutationPanel } from '../PlanGateAgentDraftMutationPanel';
import { planGateCard, planGateSectionTitle } from '../plan-gate-ui';
import type { AgentPlanDraftMutation } from '@/types/agent-plan-draft-mutation';

export interface PlanGateSubmitStepProps {
  result: ExecutePlanningWorkbenchResponse;
  tripId: string;
  submitEligibility?: PlanGateSubmitEligibility;
  preTripTasks?: PlanGatePreTripTasks | null;
  currency?: string;
  dayCount: number;
  onViewPreTripTasks?: () => void;
  partialCommitEnabled?: boolean;
  onPartialCommitEnabledChange?: (enabled: boolean) => void;
  partialCommitDays?: number[];
  onPartialCommitDaysChange?: (days: number[]) => void;
  partialCommitDayOptions?: number[];
  writeChainBlocksCommit?: boolean;
  agentPlanDraftMutation?: AgentPlanDraftMutation | null;
}

export function PlanGateSubmitStep({
  result,
  tripId,
  submitEligibility,
  preTripTasks,
  currency,
  dayCount,
  onViewPreTripTasks,
  partialCommitEnabled = false,
  onPartialCommitEnabledChange,
  partialCommitDays = [],
  onPartialCommitDaysChange,
  partialCommitDayOptions = [],
  writeChainBlocksCommit = false,
  agentPlanDraftMutation = null,
}: PlanGateSubmitStepProps) {
  const version =
    result.uiOutput.planGate?.verification.draftLabel ??
    `A${result.planState?.plan_version ?? '—'}`;

  const readyItems =
    submitEligibility?.mode === 'ready' || submitEligibility?.canSubmitToTimeline
      ? [
          '所有硬约束满足',
          '关键风险已确认',
          '团队参与安排完整',
          '预算仍在上限内',
          '路线与住宿衔接成立',
        ]
      : submitEligibility?.blockers?.length
        ? submitEligibility.blockers
        : [
            '所有硬约束满足',
            '关键风险已确认',
            '团队参与安排完整',
            '预算仍在上限内',
            '路线与住宿衔接成立',
          ];

  const preTripTotal = resolvePlanGatePreTripTasksTotal(preTripTasks);
  const effectiveDayCount = partialCommitEnabled ? partialCommitDays.length : dayCount;

  const toggleDay = (day: number, checked: boolean) => {
    if (!onPartialCommitDaysChange) return;
    if (checked) {
      onPartialCommitDaysChange([...new Set([...partialCommitDays, day])].sort((a, b) => a - b));
    } else {
      onPartialCommitDaysChange(partialCommitDays.filter((d) => d !== day));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {writeChainBlocksCommit && agentPlanDraftMutation ? (
        <PlanGateAgentDraftMutationPanel tripId={tripId} mutation={agentPlanDraftMutation} />
      ) : null}

      <div className={planGateCard}>
        <h3 className={planGateSectionTitle}>
          {writeChainBlocksCommit
            ? '拟议变更已就绪（需决策 apply）'
            : submitEligibility?.canSubmitToTimeline
              ? '方案已准备好提交'
              : '提交前检查'}
        </h3>
        <ul className="mt-3 space-y-1.5">
          {readyItems.map((item) => (
            <li key={item} className="flex items-center gap-2 text-xs text-foreground">
              <CheckCircle2
                className={
                  submitEligibility?.mode === 'blocked'
                    ? 'h-3.5 w-3.5 text-gate-reject-foreground'
                    : 'h-3.5 w-3.5 text-gate-allow-foreground'
                }
              />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5 text-[11px] text-muted-foreground">
          <p className="font-medium text-foreground">
            {writeChainBlocksCommit ? '正式落盘将：' : '提交后将：'}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {writeChainBlocksCommit ? (
              <>
                <li>· 不在此步 commitPlan 直写时间轴</li>
                <li>· 在决策空间选择 action → 提交结论 → POST …/apply</li>
                <li>· 上方展示 metadata.agentPlanDraftMutation 拟议变更</li>
              </>
            ) : (
              <>
                <li>· 创建正式版本 {version}</li>
                <li>
                  · 更新 {effectiveDayCount > 0 ? `${effectiveDayCount} 天` : dayCount} 时间轴
                  {partialCommitEnabled ? '（部分提交）' : ''}
                </li>
                <li>· 写入带 [PlanGate] 标记的行程项</li>
                <li>· 同步预算与成员视图</li>
                <li>· 重新计算可执行性</li>
              </>
            )}
            {preTripTotal > 0 && !writeChainBlocksCommit ? (
              <li>· 将创建 {preTripTotal} 项行前准备任务</li>
            ) : null}
          </ul>
        </div>
        {submitEligibility?.canSubmitWithAcceptedRisk && !submitEligibility.canSubmitToTimeline ? (
          <p className="mt-3 text-[11px] text-gate-confirm-foreground">
            可在接受已标注风险后提交（需完成全部确认项）。
          </p>
        ) : null}
      </div>

      {partialCommitDayOptions.length > 0 && !writeChainBlocksCommit ? (
        <div className={planGateCard}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className={planGateSectionTitle}>部分提交</h4>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                仅物化选定天数到时间轴；再次提交会先移除上次 [PlanGate] 写入项
              </p>
            </div>
            <Switch
              checked={partialCommitEnabled}
              onCheckedChange={(checked) => onPartialCommitEnabledChange?.(checked)}
            />
          </div>
          {partialCommitEnabled ? (
            <div className="mt-3 flex flex-wrap gap-3">
              {partialCommitDayOptions.map((day) => {
                const checked = partialCommitDays.includes(day);
                return (
                  <label
                    key={day}
                    className="flex cursor-pointer items-center gap-2 text-[11px] text-foreground"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => toggleDay(day, value === true)}
                    />
                    第 {day} 天
                  </label>
                );
              })}
            </div>
          ) : null}
          {partialCommitEnabled && partialCommitDays.length === 0 ? (
            <p className="mt-2 text-[11px] text-gate-reject-foreground">请至少选择一天</p>
          ) : null}
        </div>
      ) : null}

      {preTripTasks && preTripTasks.total > 0 ? (
        <PlanGatePreTripTasksPanel
          preTripTasks={preTripTasks}
          compact
          title="提交后将创建的行前任务"
          onViewAll={onViewPreTripTasks}
        />
      ) : null}

      <PlanGateDraftSummary result={result} tripId={tripId} currency={currency} />
    </div>
  );
}
