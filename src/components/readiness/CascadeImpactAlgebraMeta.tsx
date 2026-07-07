import { cn } from '@/lib/utils';
import type { CascadeImpactAlgebra } from '@/types/readiness-cascade';
import {
  formatCascadeImpactAlgebraLines,
  hasCascadeImpactAlgebra,
} from '@/lib/readiness-cascade.util';
import { useTranslation } from 'react-i18next';

export interface CascadeImpactAlgebraMetaProps {
  algebra?: CascadeImpactAlgebra;
  className?: string;
}

export default function CascadeImpactAlgebraMeta({
  algebra,
  className,
}: CascadeImpactAlgebraMetaProps) {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language.startsWith('zh');

  if (!algebra || !hasCascadeImpactAlgebra(algebra)) return null;

  const lines = formatCascadeImpactAlgebraLines(algebra, isZh).filter(
    (line) => !line.includes(isZh ? '级联置信度' : 'Cascade confidence')
  );
  const confidence =
    algebra.cascadeConfidence != null
      ? Math.min(1, Math.max(0, algebra.cascadeConfidence))
      : undefined;

  if (lines.length === 0 && confidence == null) return null;

  return (
    <div
      className={cn(
        'space-y-1.5 rounded-md border border-border/60 bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground/90 dark:border-border/40 dark:bg-muted/20 dark:text-muted-foreground/90',
        className
      )}
    >
      {lines.length > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      ) : null}
      {confidence != null ? (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[10px] font-medium">
            {t('dashboard.readiness.cascade.confidence', { defaultValue: '置信度' })}
          </span>
          <div
            className="h-1.5 min-w-[4rem] flex-1 overflow-hidden rounded-full bg-muted/70 dark:bg-muted/50"
            role="progressbar"
            aria-valuenow={Math.round(confidence * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-muted-foreground dark:bg-muted-foreground transition-all"
              style={{ width: `${Math.round(confidence * 100)}%` }}
            />
          </div>
          <span className="shrink-0 tabular-nums">{Math.round(confidence * 100)}%</span>
        </div>
      ) : null}
    </div>
  );
}
