import { ArrowDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  DecisionCheckerImpactDto,
  DecisionCheckerLabeledValueDto,
  DecisionCheckerLabeledTone,
} from '@/types/decision-checker';
import {
  DecisionCheckerAiBox,
  DecisionCheckerBadge,
  DecisionCheckerEmpty,
  DecisionCheckerSection,
  formatDecisionCheckerText,
  impactLevelLabel,
} from './decision-checker-ui';
import { workbenchDecisionCheckerSurfaceToneClass } from '../workbench-ui';

function summaryToneClass(tone?: DecisionCheckerLabeledTone): string {
  return workbenchDecisionCheckerSurfaceToneClass(
    tone === 'good' ? 'good' : tone === 'bad' ? 'bad' : tone === 'warning' ? 'warning' : undefined,
  );
}

function ImpactSummaryCard({
  label,
  item,
  displayTimezone,
}: {
  label: string;
  item: DecisionCheckerLabeledValueDto;
  displayTimezone?: string;
}) {
  return (
    <div className={cn('rounded-lg border px-2.5 py-2', summaryToneClass(item.tone))}>
      <p className="text-[10px] text-muted-foreground">{item.label ?? label}</p>
      <p className="mt-0.5 text-sm font-semibold">
        {formatDecisionCheckerText(item.value, displayTimezone)}
      </p>
      {item.detail ? (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {formatDecisionCheckerText(item.detail, displayTimezone)}
        </p>
      ) : null}
    </div>
  );
}

export interface DecisionCheckerImpactTabProps {
  model: DecisionCheckerImpactDto;
  loading?: boolean;
  unavailable?: boolean;
  error?: string | null;
  onViewRepair?: () => void;
  displayTimezone?: string;
}

function impactTone(level: 'high' | 'medium' | 'low'): 'danger' | 'warning' | 'neutral' {
  if (level === 'high') return 'danger';
  if (level === 'medium') return 'warning';
  return 'neutral';
}

function cascadeStatusLabel(status: 'affected' | 'at_risk' | 'ok'): string {
  if (status === 'ok') return '正常';
  if (status === 'at_risk') return '有风险';
  return '受影响';
}

function cascadeStatusTone(status: 'affected' | 'at_risk' | 'ok'): 'warning' | 'neutral' {
  if (status === 'ok') return 'neutral';
  return 'warning';
}

export function DecisionCheckerImpactTab({
  model,
  loading,
  unavailable,
  error,
  onViewRepair,
  displayTimezone,
}: DecisionCheckerImpactTabProps) {
  const { summary, constraints: constraintRows, cascade, aiInterpretation } = model;
  const constraints = constraintRows ?? [];
  const cascadeNodes = cascade ?? [];
  const summaryEntries = [
    summary.affectedDays ? { key: 'days', label: '受影响天数', item: summary.affectedDays } : null,
    summary.affectedMembers
      ? { key: 'members', label: '受影响成员', item: summary.affectedMembers }
      : null,
    summary.budgetImpact ? { key: 'budget', label: '预算影响', item: summary.budgetImpact } : null,
    summary.experienceCompletion
      ? { key: 'experience', label: '体验完成度', item: summary.experienceCompletion }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; item: DecisionCheckerLabeledValueDto }>;

  const hasContent = summaryEntries.length > 0 || constraints.length > 0 || cascadeNodes.length > 0;

  if (loading) {
    return <DecisionCheckerEmpty>正在分析影响范围…</DecisionCheckerEmpty>;
  }

  if (error) {
    return <DecisionCheckerEmpty>{error}</DecisionCheckerEmpty>;
  }

  if (unavailable) {
    return <DecisionCheckerEmpty>决策检查器接口尚未就绪，暂无影响分析。</DecisionCheckerEmpty>;
  }

  if (!hasContent) {
    return (
      <DecisionCheckerEmpty>
        选择修复方案后，将在此展示受影响天数、成员、预算与体验完成度，以及级联影响链。
      </DecisionCheckerEmpty>
    );
  }

  const sortedCascade = [...cascadeNodes].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-3">
      {summaryEntries.length > 0 ? (
        <DecisionCheckerSection title="影响概览">
          <div className="grid grid-cols-2 gap-2">
            {summaryEntries.map((entry) => (
              <ImpactSummaryCard
                key={entry.key}
                label={entry.label}
                item={entry.item}
                displayTimezone={displayTimezone}
              />
            ))}
          </div>
        </DecisionCheckerSection>
      ) : null}

      {constraints.length > 0 ? (
        <DecisionCheckerSection title="主要受影响的约束 / 偏好">
          <div className="overflow-hidden rounded-lg border border-border/60">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 font-medium">类型</th>
                  <th className="px-2 py-1.5 font-medium">约束 / 偏好</th>
                  <th className="px-2 py-1.5 font-medium">当前状态</th>
                  <th className="px-2 py-1.5 font-medium">影响</th>
                </tr>
              </thead>
              <tbody>
                {constraints.map((row) => (
                  <tr key={row.constraintId ?? `${row.type}-${row.name}`} className="border-t border-border/50">
                    <td className="px-2 py-2 text-muted-foreground">
                      {row.type === 'hard' ? '硬约束' : '软偏好'}
                    </td>
                    <td className="px-2 py-2 font-medium text-foreground">{row.name}</td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {formatDecisionCheckerText(row.status, displayTimezone)}
                    </td>
                    <td className="px-2 py-2">
                      <DecisionCheckerBadge tone={impactTone(row.impact)}>
                        {impactLevelLabel(row.impact)}
                      </DecisionCheckerBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DecisionCheckerSection>
      ) : null}

      {sortedCascade.length > 0 ? (
        <DecisionCheckerSection title="影响级联 · 下游受影响项">
          <div className="space-y-0">
            {sortedCascade.map((item, index) => (
              <div key={item.id}>
                <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">{item.title}</p>
                      <DecisionCheckerBadge tone={cascadeStatusTone(item.status)}>
                        {cascadeStatusLabel(item.status)}
                      </DecisionCheckerBadge>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {formatDecisionCheckerText(item.description, displayTimezone)}
                    </p>
                  </div>
                </div>
                {index < sortedCascade.length - 1 ? (
                  <div className="flex justify-center py-1 text-muted-foreground/60">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </DecisionCheckerSection>
      ) : null}

      {aiInterpretation?.text ? (
        <DecisionCheckerAiBox>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                AI 解读
              </p>
              <p className="mt-1 text-muted-foreground">
                {formatDecisionCheckerText(aiInterpretation.text, displayTimezone)}
              </p>
            </div>
            {onViewRepair ? (
              <Button variant="outline" size="sm" className="h-7 shrink-0 text-[11px]" onClick={onViewRepair}>
                查看修复建议
              </Button>
            ) : null}
          </div>
        </DecisionCheckerAiBox>
      ) : null}
    </div>
  );
}
