import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PendingActionChip } from '@/lib/pending-action.util';
import { useTranslation } from 'react-i18next';

export interface PendingActionChipsProps {
  actions: PendingActionChip[];
  className?: string;
  /** 点击确认（ADVICE_ONLY：仅记录意图，不触发预订） */
  onConfirmAction?: (action: PendingActionChip) => void;
}

function riskBadgeClass(risk?: string): string {
  const r = (risk ?? '').toUpperCase();
  if (r === 'HIGH' || r === 'CRITICAL') return 'border-red-300 bg-red-50 text-red-900';
  if (r === 'MEDIUM') return 'border-amber-300 bg-amber-50 text-amber-950';
  return 'border-border bg-muted/60';
}

export default function PendingActionChips({
  actions,
  className,
  onConfirmAction,
}: PendingActionChipsProps) {
  const { t } = useTranslation();

  if (actions.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-lg border border-amber-200/70 bg-amber-50/40 px-3 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/20',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-900 dark:text-amber-100 mb-2">
        <AlertTriangle className="h-3.5 w-3.5" />
        {t('agent.pendingActions.title', { defaultValue: '待您确认的调整' })}
      </div>
      <p className="text-[11px] text-amber-800/90 dark:text-amber-200/80 mb-2">
        {t('agent.pendingActions.disclaimer', {
          defaultValue: '以下为建议性动作，需您自行确认；TripNARA 不代订、不自动改签。',
        })}
      </p>
      <ul className="space-y-2">
        {actions.map((action) => (
          <li
            key={action.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-2"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm leading-snug">{action.label}</p>
              {action.userConfirmationRequired && action.userConfirmationRequired.length > 0 ? (
                <ul className="text-[11px] text-muted-foreground list-disc pl-4">
                  {action.userConfirmationRequired.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {action.riskLevel ? (
                <Badge variant="outline" className={cn('text-[10px]', riskBadgeClass(action.riskLevel))}>
                  {action.riskLevel}
                </Badge>
              ) : null}
              {onConfirmAction ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onConfirmAction(action)}
                >
                  {t('agent.pendingActions.confirm', { defaultValue: '确认' })}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
