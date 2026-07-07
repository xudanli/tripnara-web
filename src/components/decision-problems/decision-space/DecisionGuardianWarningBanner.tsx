import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatGuardianCausalWarning } from '@/lib/causal-trace-view.util';
import { primaryEnforcementLabel } from '@/lib/decision-problem-display.util';
import { workbenchQueueEnforcementBadgeClass } from '@/components/plan-studio/workbench/workbench-ui';
import { semanticWarnText } from '@/lib/semantic-ui-classes';
import type { PrimaryEnforcement } from '@/types/decision-problem';

export interface DecisionGuardianWarningBannerProps {
  headline?: string | null;
  /** @deprecated 不再展示天次/问题标题行 */
  contextLabel?: string | null;
  /** @deprecated 不在 banner 展示 */
  hint?: string | null;
  primaryEnforcement?: PrimaryEnforcement | string | null;
  className?: string;
}

/** Abu 安全提示 — Layer A 中性面 + warning icon + inline 角标 */
export function DecisionGuardianWarningBanner({
  headline,
  primaryEnforcement,
  className,
}: DecisionGuardianWarningBannerProps) {
  const message = formatGuardianCausalWarning(headline);
  if (!message) return null;

  const statusLabel = primaryEnforcementLabel(primaryEnforcement);

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-xl border border-border/60 bg-card px-3 py-2.5 shadow-none',
        className,
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/10">
        <Zap className={cn('h-3.5 w-3.5', semanticWarnText)} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] leading-snug text-foreground">
          {message}
          {statusLabel ? (
            <span
              className={cn(
                'ml-1.5 inline-flex align-middle rounded px-1 py-0 text-[10px] font-medium leading-none',
                workbenchQueueEnforcementBadgeClass(primaryEnforcement),
              )}
            >
              {statusLabel}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
