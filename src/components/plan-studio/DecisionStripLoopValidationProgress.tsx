import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { DecisionStripLoopValidationView } from '@/lib/decision-strip-loop-validation';
import { Loader2, ShieldCheck } from 'lucide-react';

const VERIFY_LABEL = '可执行性验证';

interface DecisionStripLoopValidationProgressProps {
  validation: DecisionStripLoopValidationView;
  compact?: boolean;
  className?: string;
}

function verifyStepMarker(
  status: DecisionStripLoopValidationView['verifyStepStatus'],
  tone?: DecisionStripLoopValidationView['verifyTone'],
) {
  switch (status) {
    case 'done':
      return tone === 'caution' ? '△ ' : '✓ ';
    case 'failed':
      return '✗ ';
    case 'active':
      return '⊙ ';
    default:
      return '○ ';
  }
}

export function DecisionStripLoopValidationProgress({
  validation,
  compact = false,
  className,
}: DecisionStripLoopValidationProgressProps) {
  const { t } = useTranslation();
  const isActive = validation.verifyStepStatus === 'active';
  const pct = validation.progressPct ?? (validation.verifyStepStatus === 'done' ? 100 : 0);

  if (compact) {
    return (
      <div
        className={cn('rounded-lg border border-border/60 bg-muted/30 p-2 space-y-1.5', className)}
        role="status"
        aria-live="polite"
        aria-busy={isActive}
      >
        {validation.progressPct != null ? (
          <Progress value={pct} className="h-1 bg-muted/70 [&>div]:bg-sky-500/60" />
        ) : null}
        {validation.issueCount > 0 ? (
          <p className="text-[10px] text-muted-foreground">
            {validation.issueCount} 项待处理
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border/60 bg-muted/30',
        compact ? 'p-2' : 'p-3',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy={isActive}
    >
      <div className="flex items-start gap-2">
        {isActive ? (
          <Loader2
            className={cn(
              'shrink-0 text-primary animate-spin',
              compact ? 'h-3.5 w-3.5 mt-0.5' : 'h-4 w-4 mt-0.5',
            )}
          />
        ) : (
          <ShieldCheck
            className={cn(
              'shrink-0',
              validation.verifyStepStatus === 'done'
                ? validation.verifyTone === 'caution'
                  ? 'text-amber-600'
                  : 'text-green-600'
                : validation.verifyStepStatus === 'failed'
                  ? 'text-red-600'
                  : 'text-muted-foreground',
              compact ? 'h-3.5 w-3.5 mt-0.5' : 'h-4 w-4 mt-0.5',
            )}
          />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <p className={cn('text-foreground/90', compact ? 'text-xs' : 'text-sm')}>
            {validation.headline}
            {pct > 0 && validation.verifyStepStatus !== 'done' ? (
              <span className="text-muted-foreground"> · {pct}%</span>
            ) : null}
          </p>
          {validation.subline ? (
            <p className="text-[11px] text-muted-foreground leading-relaxed">{validation.subline}</p>
          ) : null}
          {validation.progressPct != null && validation.verifyStepStatus !== 'done' ? (
            <Progress value={pct} className={cn('h-1.5', compact && 'h-1')} />
          ) : null}
          {!compact ? (
            <ul className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
              <li
                className={cn(
                  validation.verifyStepStatus === 'done' &&
                    (validation.verifyTone === 'caution'
                      ? 'text-amber-800'
                      : 'text-foreground/70'),
                  validation.verifyStepStatus === 'active' && 'font-medium text-primary',
                  validation.verifyStepStatus === 'failed' && 'font-medium text-red-700',
                )}
              >
                {verifyStepMarker(validation.verifyStepStatus, validation.verifyTone)}
                {t('planStudio.decisionStrip.verifyStep', { defaultValue: VERIFY_LABEL })}
                {validation.issueCount > 0 && validation.verifyStepStatus !== 'done'
                  ? ` · ${validation.issueCount} 项待处理`
                  : null}
              </li>
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
