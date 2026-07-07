import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { isSameDecisionNarrativeText } from '@/lib/decision-closure-card.util';
import { formatImpactScopeHeadline } from '@/lib/impact-scope-i18n.util';
import { AffectedScopeDisplayList } from '@/components/decision-problems/AffectedScopeDisplayList';
import { ImpactScopeViewPanel } from '@/components/decision-problems/ImpactScopeViewPanel';
import type { DecisionProblemDetail } from '@/types/decision-problem';
import type { ImpactScopeView } from '@/types/impact-scope';

const DEFAULT_MAX_VISIBLE = 2;

export interface DecisionCompactImpactScopeProps {
  detail?: DecisionProblemDetail | null;
  impactScopeView?: ImpactScopeView | null;
  conflictTitle?: string | null;
  maxVisible?: number;
  className?: string;
}

/** 工作台底栏 · 仅安排 chips，默认折叠 */
export function DecisionCompactImpactScope({
  detail,
  impactScopeView,
  conflictTitle,
  maxVisible = DEFAULT_MAX_VISIBLE,
  className,
}: DecisionCompactImpactScopeProps) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const effectiveView = impactScopeView ?? detail?.impactScopeView ?? null;
  const affectedScopeDisplay = detail?.affectedScopeDisplay ?? [];
  const scopeFallback = detail?.affectedScopeSummary?.trim();

  const headline = effectiveView
    ? formatImpactScopeHeadline(effectiveView, t, i18n.language)
    : undefined;
  const suppressHeadline = Boolean(
    conflictTitle &&
      headline &&
      isSameDecisionNarrativeText(conflictTitle, headline),
  );

  const arrangementCount = effectiveView?.arrangements?.length ?? affectedScopeDisplay.length;
  const hasScope =
    Boolean(effectiveView && (effectiveView.arrangements?.length || !suppressHeadline)) ||
    affectedScopeDisplay.length > 0 ||
    Boolean(scopeFallback);

  if (!hasScope) return null;

  const showToggle = arrangementCount > maxVisible;

  return (
    <div className={cn('rounded-lg border border-border/50 bg-muted/8 px-2.5 py-2', className)}>
      {showToggle ? (
        <button
          type="button"
          className="mb-1.5 flex w-full items-center justify-between text-left text-[10px] font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((open) => !open)}
        >
          <span>
            {expanded
              ? '收起影响范围'
              : `共 ${arrangementCount} 项受影响`}
          </span>
        </button>
      ) : (
        <p className="mb-1 text-[10px] font-medium text-muted-foreground">
          {t('impact.scope.sectionTitle')}
        </p>
      )}

      {expanded || !showToggle ? (
        effectiveView ? (
          <ImpactScopeViewPanel
            view={effectiveView}
            embedded
            compact
            suppressHeadline={suppressHeadline}
            hideSectionHint
            hideSectionTitle
          />
        ) : affectedScopeDisplay.length > 0 ? (
          <AffectedScopeDisplayList
            items={affectedScopeDisplay}
            compact
            conflictTitle={conflictTitle ?? undefined}
            maxVisible={expanded ? undefined : maxVisible}
          />
        ) : scopeFallback ? (
          <p className="text-[11px] leading-snug text-muted-foreground">{scopeFallback}</p>
        ) : null
      ) : null}
    </div>
  );
}
