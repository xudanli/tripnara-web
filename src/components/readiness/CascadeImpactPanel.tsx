import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  CascadeAffectedItem,
  CascadeCausalPreAnalysis,
  CascadeCausalPreAnalysisSummary,
  CascadeUiHint,
} from '@/types/readiness-cascade';
import {
  formatCascadeTriggerLabel,
  getCascadeAffectedFromPreAnalysis,
  resolveImpactAlgebraForHint,
  sortCascadeUiHints,
  summarizeCascadeImpact,
} from '@/lib/readiness-cascade.util';
import CascadeImpactCard from '@/components/readiness/CascadeImpactCard';
import CausalPreAnalysisDetail from '@/components/readiness/CausalPreAnalysisDetail';
import { useTranslation } from 'react-i18next';

export interface CascadeImpactPanelProps {
  hints: CascadeUiHint[];
  causalPreAnalysis?: CascadeCausalPreAnalysis | CascadeCausalPreAnalysisSummary | null;
  /** 显式传入 affected[]（如 Agent explain.dependency_impact） */
  affectedItems?: CascadeAffectedItem[];
  className?: string;
  /** 面板标题旁的模式标签，如「修复前预分析」 */
  modeLabel?: string;
  compact?: boolean;
  id?: string;
  onViewRepairOptions?: (hintId?: string) => void;
  onDiscussWithAi?: (hint: CascadeUiHint) => void;
  showCardActions?: boolean;
}

export default function CascadeImpactPanel({
  hints,
  causalPreAnalysis,
  affectedItems,
  className,
  modeLabel,
  compact = false,
  id = 'cascade-impact-panel',
  onViewRepairOptions,
  onDiscussWithAi,
  showCardActions = true,
}: CascadeImpactPanelProps) {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language.startsWith('zh');

  const sortedHints = sortCascadeUiHints(hints);
  const resolvedAffected =
    affectedItems && affectedItems.length > 0
      ? affectedItems
      : getCascadeAffectedFromPreAnalysis(causalPreAnalysis);

  if (sortedHints.length === 0 && resolvedAffected.length === 0) return null;

  const summary = summarizeCascadeImpact(sortedHints, causalPreAnalysis ?? undefined);
  const triggerLabel = formatCascadeTriggerLabel(summary.triggerFactType, isZh);

  return (
    <Card id={id} className={cn('border-border/80 bg-muted/30 dark:bg-muted/10', className)}>
      <CardHeader className={cn('pb-2', compact && 'py-3')}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className={cn('flex items-center gap-2 text-base', compact && 'text-sm')}>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            {t('dashboard.readiness.cascade.title', { defaultValue: '级联影响' })}
            {modeLabel ? (
              <span className="text-xs font-normal text-muted-foreground">· {modeLabel}</span>
            ) : null}
          </CardTitle>
          {sortedHints.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t('dashboard.readiness.cascade.triggerSummary', {
                defaultValue: '触发：{{trigger}} · {{count}} 项受影响',
                trigger: triggerLabel,
                count: summary.affectedCount,
              })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t('dashboard.readiness.cascade.dependencyOnly', {
                defaultValue: '依赖分析 · {{count}} 项受影响',
                count: resolvedAffected.length,
              })}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn('space-y-2', compact && 'pt-0')}>
        {causalPreAnalysis && 'impact' in causalPreAnalysis ? (
          <CausalPreAnalysisDetail preAnalysis={causalPreAnalysis} />
        ) : null}
        {sortedHints.map((hint, index) => (
          <CascadeImpactCard
            key={hint.id}
            hint={hint}
            impactAlgebra={resolveImpactAlgebraForHint(hint, index, resolvedAffected)}
            showActions={showCardActions}
            onViewRepairOptions={
              onViewRepairOptions ? () => onViewRepairOptions(hint.id) : undefined
            }
            onDiscussWithAi={onDiscussWithAi}
          />
        ))}
        {sortedHints.length === 0 && resolvedAffected.length > 0 ? (
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {resolvedAffected.slice(0, 6).map((item, index) => (
              <li key={item.entityRef?.id ?? `affected-${index}`}>
                {item.entityRef?.label ?? item.message}
                {item.impactAlgebra?.netImpactMinutes != null
                  ? ` · 约 ${Math.round(item.impactAlgebra.netImpactMinutes)} 分钟`
                  : ''}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
