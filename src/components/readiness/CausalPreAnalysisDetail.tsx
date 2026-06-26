import { useState } from 'react';
import { ChevronDown, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CascadeAffectedItem, CascadeCausalPreAnalysis } from '@/types/readiness-cascade';
import {
  formatCascadeImpactAlgebraLines,
  getCascadeRecommendationLabel,
  getCascadeRiskLevelStyles,
  hasCascadeImpactAlgebra,
} from '@/lib/readiness-cascade.util';
import { useTranslation } from 'react-i18next';

export interface CausalPreAnalysisDetailProps {
  preAnalysis: CascadeCausalPreAnalysis;
  className?: string;
  defaultExpanded?: boolean;
}

export default function CausalPreAnalysisDetail({
  preAnalysis,
  className,
  defaultExpanded = false,
}: CausalPreAnalysisDetailProps) {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const [expanded, setExpanded] = useState(defaultExpanded);
  const affected = preAnalysis.impact?.affected ?? [];

  if (affected.length === 0) return null;

  return (
    <div className={cn('rounded-md border border-violet-200/50 bg-background/60', className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-xs"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-1.5 font-medium text-violet-900 dark:text-violet-100">
          <GitBranch className="h-3.5 w-3.5" />
          {t('dashboard.readiness.cascade.impactChain', {
            defaultValue: '影响链详情',
          })}
          <span className="font-normal text-muted-foreground">({affected.length})</span>
        </span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', expanded && 'rotate-180')}
        />
      </button>
      {expanded ? (
        <ul className="space-y-2 border-t border-violet-200/40 px-2.5 py-2">
          {affected.map((item, index) => (
            <AffectedChainItem key={`${item.entityRef.id}-${index}`} item={item} isZh={isZh} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function AffectedChainItem({ item, isZh }: { item: CascadeAffectedItem; isZh: boolean }) {
  const styles = getCascadeRiskLevelStyles(item.riskLevel);
  const algebraLines =
    item.impactAlgebra && hasCascadeImpactAlgebra(item.impactAlgebra)
      ? formatCascadeImpactAlgebraLines(item.impactAlgebra, isZh)
      : [];

  return (
    <li className="rounded border bg-card px-2 py-1.5 text-[11px] space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn('rounded px-1 py-0.5 text-[10px] font-semibold border', styles.badge)}>
          {item.riskLevel}
        </span>
        <span className="text-muted-foreground">
          {getCascadeRecommendationLabel(item.recommendation, isZh)}
        </span>
        {item.entityRef.label ? (
          <span className="font-medium text-foreground">{item.entityRef.label}</span>
        ) : null}
      </div>
      <p className="text-foreground leading-snug">{item.message}</p>
      {algebraLines.length > 0 ? (
        <p className="text-muted-foreground">{algebraLines.join(' · ')}</p>
      ) : null}
    </li>
  );
}
