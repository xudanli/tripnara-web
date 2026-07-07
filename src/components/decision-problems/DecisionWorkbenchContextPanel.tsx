import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, MapPin, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { isSameDecisionNarrativeText } from '@/lib/decision-closure-card.util';
import { AffectedScopeDisplayList } from '@/components/decision-problems/AffectedScopeDisplayList';
import {
  DecisionSection,
  DecisionSectionStack,
} from '@/components/decision-problems/decision-center-ui';
import { ImpactScopeViewPanel } from '@/components/decision-problems/ImpactScopeViewPanel';
import { formatImpactScopeHeadline } from '@/lib/impact-scope-i18n.util';
import type { DecisionProblemDetail } from '@/types/decision-problem';
import type { ImpactScopeView } from '@/types/impact-scope';

export interface DecisionWorkbenchContextPanelProps {
  /** 工作台顶栏已展示时可省略标题行 */
  title?: string | null;
  /** 「发生了什么」正文 — 优先于 detail.description */
  narrative?: string | null;
  detail?: DecisionProblemDetail | null;
  impactScopeView?: ImpactScopeView | null;
  conflictTitle?: string | null;
  onScopeDayClick?: (dayIndex: number) => void;
  /** 工作台首屏优先方案卡：默认折叠「发生了什么」 */
  defaultCollapsed?: boolean;
  /** 已在上方展示当前问题时，跳过重复/更弱的叙事 */
  problemHeadline?: string | null;
  className?: string;
}

/**
 * 工作台 Legacy 决策空间 · 上下文（发生了什么 + 影响范围）
 * PM：方案卡之上必须保留，不可仅用单行 rail 或底栏折叠替代。
 */
export function DecisionWorkbenchContextPanel({
  title,
  narrative,
  detail,
  impactScopeView,
  conflictTitle,
  onScopeDayClick,
  defaultCollapsed = false,
  problemHeadline,
  className,
}: DecisionWorkbenchContextPanelProps) {
  const { t, i18n } = useTranslation();
  const [contextOpen, setContextOpen] = useState(!defaultCollapsed);

  const effectiveView = impactScopeView ?? detail?.impactScopeView ?? null;
  const affectedScopeDisplay = detail?.affectedScopeDisplay ?? [];
  const scopeFallback = detail?.affectedScopeSummary?.trim();

  const headline = effectiveView
    ? formatImpactScopeHeadline(effectiveView, t, i18n.language)
    : undefined;
  const suppressHeadline = Boolean(
    conflictTitle && headline && isSameDecisionNarrativeText(conflictTitle, headline),
  );

  const titleTrim = title?.trim() ?? '';
  const narrativeRaw =
    narrative?.trim() ||
    detail?.description?.trim() ||
    detail?.assertions?.find((a) => a.message?.trim() || a.conclusion?.trim())?.message?.trim();
  const whatHappenedText =
    narrativeRaw && !isSameDecisionNarrativeText(titleTrim, narrativeRaw)
      ? narrativeRaw
      : narrativeRaw || titleTrim;

  const showLegacyImpactScope =
    affectedScopeDisplay.length > 0 || (!effectiveView && Boolean(scopeFallback));
  const showOntologyImpactScope = Boolean(
    !affectedScopeDisplay.length &&
      effectiveView &&
      (effectiveView.arrangements?.length || !suppressHeadline),
  );

  const headlineTrim = problemHeadline?.trim() ?? '';
  const showWhatHappenedBlock = Boolean(
    whatHappenedText &&
      !isSameDecisionNarrativeText(headlineTrim, whatHappenedText) &&
      !(headlineTrim && whatHappenedText.length < headlineTrim.length * 0.6),
  );

  if (!showWhatHappenedBlock && !showLegacyImpactScope && !showOntologyImpactScope) {
    return null;
  }

  return (
    <DecisionSectionStack className={cn(className)}>
      {showWhatHappenedBlock && whatHappenedText ? (
        defaultCollapsed ? (
          <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
            <section className="rounded-xl border border-border/60 bg-card/50 px-3 py-2">
              <CollapsibleTrigger className="flex w-full items-start gap-2 text-left">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted/60">
                  <ShieldAlert className="h-3 w-3 text-muted-foreground" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-foreground">发生了什么</span>
                  {!contextOpen ? (
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                      {whatHappenedText}
                    </p>
                  ) : null}
                </span>
                <ChevronDown
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                    contextOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="mt-2 pl-7 text-[13px] font-medium leading-relaxed text-foreground">
                  {whatHappenedText}
                </p>
              </CollapsibleContent>
            </section>
          </Collapsible>
        ) : (
          <DecisionSection title="发生了什么" icon={ShieldAlert} compact>
            <p className="text-[13px] font-medium leading-relaxed text-foreground">{whatHappenedText}</p>
          </DecisionSection>
        )
      ) : null}

      {showOntologyImpactScope && effectiveView ? (
        <ImpactScopeViewPanel
          embedded
          compact
          view={effectiveView}
          suppressHeadline={suppressHeadline}
          onDayClick={onScopeDayClick}
        />
      ) : showLegacyImpactScope ? (
        <DecisionSection title={t('impact.scope.sectionTitle')} icon={MapPin} compact>
          <p className="mb-1.5 text-[11px] leading-snug text-muted-foreground">
            {t('impact.scope.sectionHint')}
          </p>
          {affectedScopeDisplay.length > 0 ? (
            <AffectedScopeDisplayList
              items={affectedScopeDisplay}
              compact
              conflictTitle={conflictTitle ?? (titleTrim || undefined)}
              onDayClick={onScopeDayClick}
            />
          ) : scopeFallback ? (
            <p className="text-xs text-foreground/90">{scopeFallback}</p>
          ) : null}
        </DecisionSection>
      ) : null}
    </DecisionSectionStack>
  );
}
