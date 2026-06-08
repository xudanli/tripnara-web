/**
 * 按 question.id / metadata.presentation 选择澄清子组件
 */

import type { ClarificationAnswer, ClarificationQuestion } from '@/types/clarification';
import type { StructuredTravelInput } from '@/api/agent';
import { resolveClarificationRenderer } from '@/lib/route-run-clarification';
import { GuardianDebateClarificationCard } from '@/components/agent/GuardianDebateClarificationCard';
import { AgentRouteRunClarificationGenericBlock } from '@/components/agent/AgentRouteRunClarificationGenericBlock';

export type ClarificationQuestionRouterProps = {
  question: ClarificationQuestion;
  onSubmitAnswers: (answers: ClarificationAnswer[]) => void;
  disabled?: boolean;
  debugUiDefaults?: boolean;
};

export function ClarificationQuestionRouter({
  question,
  onSubmitAnswers,
  disabled,
  debugUiDefaults,
}: ClarificationQuestionRouterProps) {
  const kind = resolveClarificationRenderer(question);

  if (kind === 'guardian_debate') {
    return (
      <GuardianDebateClarificationCard
        question={question}
        disabled={disabled}
        onSubmit={(answer) => onSubmitAnswers([answer])}
      />
    );
  }

  return (
    <AgentRouteRunClarificationGenericBlock
      question={question}
      disabled={disabled}
      debugUiDefaults={debugUiDefaults}
      onSubmitAnswers={onSubmitAnswers}
    />
  );
}
