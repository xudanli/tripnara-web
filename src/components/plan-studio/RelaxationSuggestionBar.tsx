import { useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare, Sparkles, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { relaxationSuggestionKindLabel } from '@/lib/relaxation-suggestions-parse.util';
import type {
  RelaxationSelectionMode,
  RelaxationSuggestionV1,
  RelaxationSuggestionsContextV1,
} from '@/types/relaxation-suggestions';
import {
  PlanningHeaderCopy,
  PlanningHeaderIcon,
  PlanningHeaderRow,
  PlanningHeaderSection,
} from './plan-studio-header-ui';
import { PLAN_STUDIO_RELAXATION_BAR_ID } from '@/lib/plan-studio-scroll.util';
import {
  trackRelaxationBarAccept,
  trackRelaxationBarDiscuss,
  trackRelaxationBarImpression,
} from '@/utils/plan-studio-relaxation-analytics';

export interface RelaxationSuggestionBarProps {
  visible: boolean;
  tripId?: string;
  context: RelaxationSuggestionsContextV1 | null;
  suggestions: RelaxationSuggestionV1[];
  selectionMode: RelaxationSelectionMode;
  selectedActionIds: string[];
  onToggleAction: (actionId: string) => void;
  onSubmit: (actionIds: string[]) => void;
  submitting?: boolean;
  onDiscussInAssistant?: () => void;
  className?: string;
}

function SuggestionOption({
  suggestion,
  selected,
  selectionMode,
  disabled,
  onClick,
}: {
  suggestion: RelaxationSuggestionV1;
  selected: boolean;
  selectionMode: RelaxationSelectionMode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
        selected
          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/25'
          : 'border-border/70 bg-background/60 hover:bg-muted/40',
        disabled && 'opacity-60 pointer-events-none',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">{suggestion.labelZh}</span>
            {suggestion.recommended ? (
              <Badge variant="secondary" className="h-5 gap-0.5 text-[10px]">
                <Star className="h-3 w-3 fill-current" />
                推荐
              </Badge>
            ) : null}
            {suggestion.kind !== 'relaxation' ? (
              <Badge variant="outline" className="h-5 text-[10px] font-normal">
                {relaxationSuggestionKindLabel(suggestion.kind)}
              </Badge>
            ) : null}
          </div>
          {suggestion.descriptionZh ? (
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {suggestion.descriptionZh}
            </p>
          ) : null}
          {suggestion.metadata?.violations_before != null &&
          suggestion.metadata?.violations_after != null ? (
            <p className="mt-1 text-[10px] text-muted-foreground">
              约束冲突 {suggestion.metadata.violations_before} →{' '}
              {suggestion.metadata.violations_after}
            </p>
          ) : null}
        </div>
        {selectionMode === 'multi' ? (
          <span
            className={cn(
              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]',
              selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
            )}
            aria-hidden
          >
            {selected ? '✓' : ''}
          </span>
        ) : null}
      </div>
    </button>
  );
}

/**
 * BFF 松弛建议条：消费 payload.relaxation_suggestions[]，提交 clarification_answers。
 */
export function RelaxationSuggestionBar({
  visible,
  tripId,
  context,
  suggestions,
  selectionMode,
  selectedActionIds,
  onToggleAction,
  onSubmit,
  submitting = false,
  onDiscussInAssistant,
  className,
}: RelaxationSuggestionBarProps) {
  const [expanded, setExpanded] = useState(true);
  const impressionRef = useRef(false);

  useEffect(() => {
    if (!visible || !tripId || suggestions.length === 0) return;
    if (impressionRef.current) return;
    impressionRef.current = true;
    trackRelaxationBarImpression({ tripId, suggestionCount: suggestions.length });
  }, [visible, tripId, suggestions.length]);

  if (!visible || !context || suggestions.length === 0) return null;

  const headline = context.headlineZh ?? '当前约束冲突，可选择以下调整';
  const subline = context.failureProbHintZh;

  const trackAccept = (actionIds: string[]) => {
    if (tripId) {
      const primary = suggestions.find((s) => actionIds.includes(s.actionId));
      trackRelaxationBarAccept({
        tripId,
        constraintId: context.conflictType,
        suggestionType: primary?.kind,
        actionIds,
      });
    }
    onSubmit(actionIds);
  };

  const handleOptionClick = (actionId: string) => {
    if (selectionMode === 'single') {
      trackAccept([actionId]);
      return;
    }
    onToggleAction(actionId);
  };

  const canSubmitMulti = selectionMode === 'multi' && selectedActionIds.length > 0 && !submitting;

  return (
    <PlanningHeaderSection
      id={PLAN_STUDIO_RELAXATION_BAR_ID}
      accent="blocked"
      className={cn('mt-2 scroll-mt-4', className)}
    >
      <PlanningHeaderRow className="px-4 py-3 gap-3 items-start">
        <PlanningHeaderIcon icon={Sparkles} accent="blocked" />
        <div className="min-w-0 flex-1 space-y-3">
          <PlanningHeaderCopy kicker="松弛建议" title={headline}>
            {subline ? (
              <p className="w-full text-xs font-normal text-muted-foreground leading-snug">{subline}</p>
            ) : null}
            {context.conflictType ? (
              <Badge variant="outline" className="h-5 text-[10px] font-normal">
                {context.conflictType}
              </Badge>
            ) : null}
          </PlanningHeaderCopy>

          {expanded ? (
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <SuggestionOption
                  key={suggestion.actionId}
                  suggestion={suggestion}
                  selected={selectedActionIds.includes(suggestion.actionId)}
                  selectionMode={selectionMode}
                  disabled={submitting}
                  onClick={() => handleOptionClick(suggestion.actionId)}
                />
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {selectionMode === 'multi' ? (
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                disabled={!canSubmitMulti}
                onClick={() => trackAccept(selectedActionIds)}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    提交中…
                  </>
                ) : (
                  `确认选择（${selectedActionIds.length}）`
                )}
              </Button>
            ) : submitting ? (
              <Button type="button" size="sm" className="h-8 text-xs" disabled>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                提交中…
              </Button>
            ) : null}
            {onDiscussInAssistant ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                disabled={submitting}
                onClick={() => {
                  if (tripId) trackRelaxationBarDiscuss({ tripId });
                  onDiscussInAssistant?.();
                }}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                在助手中讨论
              </Button>
            ) : null}
            {suggestions.length > 2 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? '收起选项' : '展开选项'}
              </Button>
            ) : null}
          </div>
        </div>
      </PlanningHeaderRow>
    </PlanningHeaderSection>
  );
}
