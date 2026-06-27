import { useState } from 'react';
import type { AgentRouteRunClarificationSubmitPayload } from '@/components/agent/AgentRouteRunClarificationCard';
import { RelaxationSuggestionBar } from '@/components/plan-studio/RelaxationSuggestionBar';
import { buildRelaxationClarificationSubmitPayload } from '@/lib/relaxation-clarification-submit.util';
import type { RelaxationSuggestionsBundle } from '@/types/relaxation-suggestions';
import { cn } from '@/lib/utils';

export interface AgentRelaxationSuggestionsCardProps {
  bundle: RelaxationSuggestionsBundle;
  onSubmit: (payload: AgentRouteRunClarificationSubmitPayload) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Agent 气泡内松弛澄清：消费 payload.relaxation_suggestions[]，勿渲染 clarificationQuestions 机器 label。
 */
export function AgentRelaxationSuggestionsCard({
  bundle,
  onSubmit,
  disabled = false,
  className,
}: AgentRelaxationSuggestionsCardProps) {
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>(() => {
    const recommended = bundle.suggestions.find((s) => s.recommended);
    if (bundle.context.selectionMode === 'single' && recommended) {
      return [recommended.actionId];
    }
    return [];
  });

  const handleSubmit = (actionIds: string[]) => {
    const payload = buildRelaxationClarificationSubmitPayload(bundle, actionIds);
    if (!payload) return;
    onSubmit(payload);
  };

  const toggleAction = (actionId: string) => {
    if (bundle.context.selectionMode === 'single') {
      setSelectedActionIds([actionId]);
      handleSubmit([actionId]);
      return;
    }
    setSelectedActionIds((prev) =>
      prev.includes(actionId) ? prev.filter((id) => id !== actionId) : [...prev, actionId],
    );
  };

  return (
    <div className={cn('mt-2', className)}>
      <RelaxationSuggestionBar
        visible
        context={bundle.context}
        suggestions={bundle.suggestions}
        selectionMode={bundle.context.selectionMode}
        selectedActionIds={selectedActionIds}
        onToggleAction={toggleAction}
        onSubmit={handleSubmit}
        submitting={disabled}
      />
    </div>
  );
}
