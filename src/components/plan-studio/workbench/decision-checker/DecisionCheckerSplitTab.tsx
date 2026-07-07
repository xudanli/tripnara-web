import type { ReactNode } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { DecisionCheckerSplitPlanDto } from '@/types/decision-checker';
import { runDecisionCheckerAction, type DecisionCheckerActionContext } from '@/lib/decision-checker-action.util';
import { SplitGroupCard } from '../split-plan-group-display';
import {
  DecisionCheckerAiBox,
  DecisionCheckerBadge,
  DecisionCheckerEmpty,
  DecisionCheckerMetricGrid,
  DecisionCheckerSection,
} from './decision-checker-ui';
import {
  workbenchPrimaryAction,
} from '../workbench-ui';

export interface DecisionCheckerSplitTabProps {
  model?: DecisionCheckerSplitPlanDto;
  /** 有待应用 daySplits 时可应用；false 表示已写入单线日程 */
  splitPreviewPending?: boolean;
  loading?: boolean;
  unavailable?: boolean;
  error?: string | null;
  actionContext?: DecisionCheckerActionContext;
}

function LogisticsRow({ label, value }: { label: string; value: ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-[11px] leading-relaxed">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 text-foreground">{value}</span>
    </div>
  );
}

/** 右栏 · 分流 Tab（`splitPlan.groups[]` SSOT，图3 摘要卡） */
export function DecisionCheckerSplitTab({
  model,
  splitPreviewPending = false,
  loading,
  unavailable,
  error,
  actionContext,
}: DecisionCheckerSplitTabProps) {
  if (loading) {
    return <DecisionCheckerEmpty>正在生成分流方案…</DecisionCheckerEmpty>;
  }

  if (error) {
    return <DecisionCheckerEmpty>{error}</DecisionCheckerEmpty>;
  }

  if (unavailable) {
    return <DecisionCheckerEmpty>分流方案接口尚未就绪。</DecisionCheckerEmpty>;
  }

  if (!model) {
    return (
      <DecisionCheckerEmpty>
        暂无分流方案。需先有日程项（ItineraryItem），并在 team_fit 团队冲突触发后，BFF 才会返回 splitPlan 与
        daySplits。
      </DecisionCheckerEmpty>
    );
  }

  const { recommendation, metrics, groups, logistics, risks, aiSuggestion, actions } = model;
  const visibleActions = splitPreviewPending
    ? actions
    : actions.filter((action) => action.type !== 'apply_split_plan');
  const badgeTone =
    recommendation?.badgeTone === 'success'
      ? 'success'
      : recommendation?.badgeTone === 'warning'
        ? 'warning'
        : 'neutral';

  return (
    <div className="space-y-3">
      {!splitPreviewPending ? (
        <p className="rounded-lg border border-border/60 bg-muted/10 px-2.5 py-2 text-[11px] leading-relaxed text-success">
          分流已写入单线日程；各活动 note 含分流标记，行中执行层可据此分组引导。
        </p>
      ) : null}

      <section>
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-foreground">
              {recommendation?.title || '推荐分流方案'}
            </h3>
            {recommendation?.summary ? (
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {recommendation.summary}
              </p>
            ) : null}
          </div>
          {recommendation?.badge ? (
            <DecisionCheckerBadge tone={badgeTone}>{recommendation.badge}</DecisionCheckerBadge>
          ) : null}
        </div>
        <DecisionCheckerMetricGrid metrics={metrics} />
      </section>

      {groups.length > 0 ? (
        <DecisionCheckerSection title="分流详情">
          <div className="space-y-2">
            {groups.map((group) => (
              <SplitGroupCard
                key={group.id}
                label={group.label}
                theme={group.activityTitle}
                highlights={group.highlights}
                avatarUrls={group.avatarUrls}
                members={group.members}
                memberCount={group.memberCount}
                variant={group.variant ?? 'blue'}
                letter={group.letter}
                riskLevel={group.riskLevel}
                costPerPerson={group.costPerPerson}
              />
            ))}
          </div>
        </DecisionCheckerSection>
      ) : null}

      {logistics?.meetupPoint ||
      logistics?.meetupTime ||
      logistics?.transport ||
      logistics?.emergencyContact ||
      logistics?.guideBooking ||
      logistics?.notes?.length ? (
        <DecisionCheckerSection title="复合与运营安排">
          <div className="space-y-1.5">
            <LogisticsRow label="汇合点" value={logistics.meetupPoint} />
            <LogisticsRow label="汇合时间" value={logistics.meetupTime} />
            <LogisticsRow label="交通" value={logistics.transport} />
            <LogisticsRow label="紧急联系" value={logistics.emergencyContact} />
            <LogisticsRow label="向导预订" value={logistics.guideBooking} />
            {logistics.notes?.map((note) => (
              <p key={note} className="text-[11px] text-muted-foreground">
                {note}
              </p>
            ))}
          </div>
        </DecisionCheckerSection>
      ) : null}

      {risks && risks.length > 0 ? (
        <DecisionCheckerSection title="风险与注意事项">
          <div className="space-y-2">
            {risks.map((risk) => (
              <div
                key={risk.title}
                className="flex gap-2 rounded-lg border border-border/60 bg-muted/10 px-2.5 py-2"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                <div>
                  <p className="text-xs font-medium text-foreground">{risk.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {risk.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DecisionCheckerSection>
      ) : null}

      {aiSuggestion?.text ? (
        <DecisionCheckerAiBox>
          <p className="flex items-center gap-1.5 font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            Nara 建议
          </p>
          <p className="mt-1">{aiSuggestion.text}</p>
        </DecisionCheckerAiBox>
      ) : null}

      {visibleActions.length > 0 ? (
        <div className="space-y-2 pt-1">
          {visibleActions.map((action, index) => {
            const isPrimary = action.type === 'apply_split_plan' || index === 0;
            return (
              <Button
                key={`${action.type}-${action.label ?? index}`}
                variant={isPrimary ? 'default' : index === 1 ? 'secondary' : 'outline'}
                className={cn(
                  'h-9 w-full rounded-lg text-xs',
                  isPrimary && workbenchPrimaryAction,
                )}
                onClick={() => runDecisionCheckerAction(action, actionContext ?? {})}
              >
                {action.label ??
                  (action.type === 'apply_split_plan'
                    ? '应用分流方案'
                    : action.type === 'view_split_alternatives'
                      ? '查看备选'
                      : '与 Nara 讨论')}
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
