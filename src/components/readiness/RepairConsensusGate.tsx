import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GuardianNegotiationConsensus } from '@/types/readiness-guardian-negotiation';
import { useTranslation } from 'react-i18next';

export interface RepairConsensusGateProps {
  consensus?: GuardianNegotiationConsensus;
  /** 用户已确认「仍要修复」 */
  forceConfirmed: boolean;
  onForceConfirm: () => void;
  className?: string;
}

export default function RepairConsensusGate({
  consensus,
  forceConfirmed,
  onForceConfirm,
  className,
}: RepairConsensusGateProps) {
  const { t } = useTranslation();

  if (consensus !== 'BLOCKED' || forceConfirmed) return null;

  return (
    <div
      className={cn(
        'rounded-lg border border-amber-300/80 bg-amber-50/80 px-3 py-3 dark:border-amber-800 dark:bg-amber-950/30',
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            {t('dashboard.readiness.repair.consensusBlockedTitle', {
              defaultValue: '三人格暂未达成共识',
            })}
          </p>
          <p className="text-xs text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
            {t('dashboard.readiness.repair.consensusBlockedBody', {
              defaultValue:
                '当前修复方向存在明显分歧，系统不会自动执行。请仔细阅读各方立场后，自行确认是否继续。',
            })}
          </p>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={onForceConfirm}>
            {t('dashboard.readiness.repair.forceProceed', {
              defaultValue: '我已了解，仍要查看修复选项',
            })}
          </Button>
        </div>
      </div>
    </div>
  );
}
