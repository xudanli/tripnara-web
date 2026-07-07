import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  primaryEnforcementBadgeClass,
  primaryEnforcementLabel,
  DETECTED_BY_LABELS,
} from '@/lib/decision-problem-display.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';

export interface DecisionProblemWorkbenchBannerProps {
  problem: DecisionProblemSummary;
  onOpenDecisionProblem?: (problemId: string) => void;
  className?: string;
}

/** 决策空间内 · 引导进入 decision-problems 完整流程 */
export function DecisionProblemWorkbenchBanner({
  problem,
  onOpenDecisionProblem,
  className,
}: DecisionProblemWorkbenchBannerProps) {
  return (
    <div
      className={cn(
        'mb-3 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 space-y-2',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-foreground">决策语义 · {problem.title}</span>
        <Badge
          variant="outline"
          className={cn('text-[10px]', primaryEnforcementBadgeClass(problem.primaryEnforcement))}
        >
          {primaryEnforcementLabel(problem.primaryEnforcement)}
        </Badge>
        {problem.detectedBy ? (
          <Badge variant="secondary" className="text-[10px] font-normal">
            {DETECTED_BY_LABELS[problem.detectedBy] ?? problem.detectedBy}
          </Badge>
        ) : null}
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        使用结构化 tradeoffs 对比方案，支持 Gate 规则引擎与可行性修复桥接执行。
      </p>
      {onOpenDecisionProblem ? (
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onOpenDecisionProblem(problem.id)}
        >
          对比方案并决策
        </Button>
      ) : null}
    </div>
  );
}
