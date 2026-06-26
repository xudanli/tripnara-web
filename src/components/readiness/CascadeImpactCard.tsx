import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CascadeImpactAlgebra, CascadeUiHint } from '@/types/readiness-cascade';
import {
  cascadeHintRequiresUserAction,
  formatCascadeTriggerLabel,
  formatCascadeTriggerSourceLabel,
  getCascadeRecommendationLabel,
  getCascadeRiskLevelStyles,
  getImpactAlgebraFromHint,
} from '@/lib/readiness-cascade.util';
import CascadeImpactAlgebraMeta from '@/components/readiness/CascadeImpactAlgebraMeta';
import { useTranslation } from 'react-i18next';

export interface CascadeImpactCardProps {
  hint: CascadeUiHint;
  impactAlgebra?: CascadeImpactAlgebra;
  className?: string;
  onViewRepairOptions?: (hintId: string) => void;
  onDiscussWithAi?: (hint: CascadeUiHint) => void;
  /** compact 模式隐藏 CTA */
  showActions?: boolean;
}

export default function CascadeImpactCard({
  hint,
  impactAlgebra,
  className,
  onViewRepairOptions,
  onDiscussWithAi,
  showActions = true,
}: CascadeImpactCardProps) {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const styles = getCascadeRiskLevelStyles(hint.riskLevel);
  const requiresUser = cascadeHintRequiresUserAction(hint);
  const resolvedAlgebra = impactAlgebra ?? getImpactAlgebraFromHint(hint);
  const triggerLabel = hint.triggerFactType
    ? formatCascadeTriggerLabel(hint.triggerFactType, isZh)
    : undefined;
  const triggerSourceLabel = formatCascadeTriggerSourceLabel(hint.triggerSource, isZh);
  const entitySubtitle =
    hint.entityLabel || hint.entityKind
      ? [hint.entityKind, hint.entityLabel].filter(Boolean).join(' · ')
      : null;

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3 border-l-4',
        styles.border,
        className
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', styles.dot)} aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn('text-[10px] font-semibold', styles.badge)}>
              {hint.riskLevel}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {getCascadeRecommendationLabel(hint.recommendation, isZh)}
            </Badge>
          </div>

          {entitySubtitle ? (
            <p className="text-xs font-medium text-muted-foreground">{entitySubtitle}</p>
          ) : null}

          {triggerLabel || triggerSourceLabel ? (
            <p className="text-[11px] text-muted-foreground">
              {triggerLabel
                ? t('dashboard.readiness.cascade.cardTrigger', {
                    defaultValue: '触发：{{trigger}}',
                    trigger: triggerLabel,
                  })
                : null}
              {triggerLabel && triggerSourceLabel ? ' · ' : null}
              {triggerSourceLabel ?? null}
            </p>
          ) : null}

          <p className="text-sm text-foreground leading-snug">{hint.message}</p>

          <CascadeImpactAlgebraMeta algebra={resolvedAlgebra} />

          {hint.userConfirmationRequired && hint.userConfirmationRequired.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50/80 px-2.5 py-2 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex items-start gap-1.5 text-xs font-medium text-amber-900 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {t('dashboard.readiness.cascade.userConfirmationTitle', {
                    defaultValue: '需自行确认',
                  })}
                </span>
              </div>
              <ul className="mt-1.5 space-y-1 pl-5 text-xs text-amber-800 dark:text-amber-200/90 list-disc">
                {hint.userConfirmationRequired.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] text-amber-700/90 dark:text-amber-300/80">
                {t('dashboard.readiness.cascade.userConfirmationDisclaimer', {
                  defaultValue: '以上事项需您自行处理，TripNARA 不代订。',
                })}
              </p>
            </div>
          ) : null}

          {showActions && (onViewRepairOptions || onDiscussWithAi) ? (
            <div className="flex flex-wrap gap-2 pt-0.5">
              {onViewRepairOptions ? (
                <Button
                  type="button"
                  size="sm"
                  variant={requiresUser ? 'default' : 'outline'}
                  className="h-7 text-xs"
                  onClick={() => onViewRepairOptions(hint.id)}
                >
                  {t('dashboard.readiness.cascade.viewRepairOptions', {
                    defaultValue: '查看修复选项',
                  })}
                </Button>
              ) : null}
              {onDiscussWithAi ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onDiscussWithAi(hint)}
                >
                  {t('dashboard.readiness.cascade.discussWithAi', {
                    defaultValue: '与 AI 讨论',
                  })}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
