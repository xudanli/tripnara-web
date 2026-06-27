import type { AgentRouteRunClarificationSubmitPayload } from '@/components/agent/AgentRouteRunClarificationCard';
import { buildRelaxationClarificationAnswers } from '@/lib/relaxation-suggestions-parse.util';
import type { RelaxationSuggestionsBundle } from '@/types/relaxation-suggestions';

export function buildRelaxationClarificationSubmitPayload(
  bundle: RelaxationSuggestionsBundle,
  actionIds: string[],
): AgentRouteRunClarificationSubmitPayload | null {
  const answer = buildRelaxationClarificationAnswers(bundle.context, actionIds);
  if (!answer) return null;

  const labels = actionIds
    .map((id) => bundle.suggestions.find((s) => s.actionId === id)?.labelZh)
    .filter((label): label is string => Boolean(label?.trim()));

  return {
    message: '',
    displayMessage: labels.length > 0 ? labels.join('、') : '已选择调整方案',
    clarification_answers: [answer],
  };
}
