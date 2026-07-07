import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DecisionResolutionStepBar } from '@/components/decision-problems/DecisionResolutionStepBar';
import type { WorkbenchModeBarViewModel } from '@/lib/workbench-mode-context.util';
import { workbenchModeBarBack, workbenchModeBarShell } from './workbench-ui';

export interface WorkbenchModeIndicatorBarProps {
  model: WorkbenchModeBarViewModel;
  onBack: () => void;
  className?: string;
}

export function WorkbenchModeIndicatorBar({
  model,
  onBack,
  className,
}: WorkbenchModeIndicatorBarProps) {
  return (
    <nav
      className={cn(workbenchModeBarShell, className)}
      aria-label="工作台子模式"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={workbenchModeBarBack}
          onClick={onBack}
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {model.backLabel}
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{model.modeLabel}</span>
            <span className="mx-1.5 text-border" aria-hidden>
              ·
            </span>
            <span className="text-foreground/90">{model.focusTitle}</span>
            {model.mode === 'constraint_edit' && model.hasUnsavedConstraintDraft ? (
              <Badge
                variant="outline"
                className="ml-2 h-4 border-border px-1.5 text-[9px] font-medium text-foreground"
              >
                未保存
              </Badge>
            ) : null}
          </p>
        </div>

        {model.mode === 'decision_space' && model.decisionResolutionPhase ? (
          <DecisionResolutionStepBar
            phase={model.decisionResolutionPhase}
            className="hidden w-[min(240px,34vw)] shrink-0 sm:flex"
          />
        ) : null}
      </div>
    </nav>
  );
}
