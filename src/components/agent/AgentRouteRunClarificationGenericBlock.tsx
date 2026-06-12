/**
 * 通用澄清题块（single_choice 芯片 / ClarificationQuestionCard）
 */

import { useState } from 'react';
import type { ClarificationAnswer, ClarificationQuestion } from '@/types/clarification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  pickClarificationQuestionHtml,
  surfaceClarificationQuestion,
} from '@/lib/clarification-surface';
import { resolveClarificationChoices } from '@/lib/clarification-options';
import { ClarificationQuestionCard } from '@/components/trips/ClarificationQuestionCard';
import { AssistantAnswerHtml } from '@/components/agent/AssistantAnswerHtml';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { looksLikeMarkdown } from '@/lib/markdown-detect';
import { looksLikeAnswerHtml } from '@/lib/route-run-answer-text-display';

const CLARIFICATION_PROSE = 'min-w-0 break-words [overflow-wrap:anywhere]';

export type AgentRouteRunClarificationGenericBlockProps = {
  question: ClarificationQuestion;
  onSubmitAnswers: (answers: ClarificationAnswer[]) => void;
  disabled?: boolean;
  debugUiDefaults?: boolean;
};

export function AgentRouteRunClarificationGenericBlock({
  question,
  onSubmitAnswers,
  disabled,
  debugUiDefaults,
}: AgentRouteRunClarificationGenericBlockProps) {
  const [answers, setAnswers] = useState<ClarificationAnswer[]>([]);
  const cardHtml = pickClarificationQuestionHtml(question);
  const surfaced = cardHtml ? null : surfaceClarificationQuestion(question.question);
  const choices = resolveClarificationChoices(question);
  const useChoiceChips =
    question.type === 'single_choice' && choices.length > 0 && choices.length <= 8;

  const pickSingleChoice = (value: string) => {
    onSubmitAnswers([{ questionId: question.id, value }]);
  };

  const upsertAnswer = (questionId: string, value: ClarificationAnswer['value']) => {
    const idx = answers.findIndex((a) => a.questionId === questionId);
    if (idx === -1) {
      setAnswers((prev) => [...prev, { questionId, value }]);
      return;
    }
    const next = answers.slice();
    next[idx] = { questionId, value };
    setAnswers(next);
  };

  return (
    <div className="space-y-2">
      {cardHtml ? (
        looksLikeAnswerHtml(cardHtml) ? (
          <AssistantAnswerHtml html={cardHtml} className="text-sm" />
        ) : looksLikeMarkdown(cardHtml) ? (
          <div className={cn('agent-markdown text-sm text-foreground/90', CLARIFICATION_PROSE)}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{cardHtml}</ReactMarkdown>
          </div>
        ) : (
          <p className={cn('text-sm text-foreground/90 leading-relaxed', CLARIFICATION_PROSE)}>
            {cardHtml}
          </p>
        )
      ) : (
        <>
          {surfaced?.badge ? (
            <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
              {surfaced.badge}
            </Badge>
          ) : null}
          {surfaced?.title ? (
            <p className="text-sm font-semibold text-foreground leading-snug">{surfaced.title}</p>
          ) : null}
          {surfaced?.body ? (
            <p className={cn('text-sm text-foreground/90 leading-relaxed', CLARIFICATION_PROSE)}>
              {surfaced.body}
            </p>
          ) : null}
        </>
      )}
      {question.hint?.trim() ? (
        <p className={cn('text-xs text-muted-foreground leading-relaxed', CLARIFICATION_PROSE)}>
          {question.hint.trim()}
        </p>
      ) : null}

      {useChoiceChips ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {choices.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="h-8 max-w-full text-xs whitespace-normal text-left leading-snug"
              onClick={() => pickSingleChoice(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      ) : (
        <>
          <ClarificationQuestionCard
            question={{
              ...question,
              question: surfaced?.title || surfaced?.body || question.question,
            }}
            value={answers.find((a) => a.questionId === question.id)?.value ?? null}
            onChange={(v) => upsertAnswer(question.id, v)}
            disabled={disabled}
            className="border-border/60 shadow-none"
          />
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              size="sm"
              disabled={disabled || answers.length === 0}
              onClick={() => onSubmitAnswers(answers)}
            >
              提交
            </Button>
          </div>
        </>
      )}

      {debugUiDefaults ? (
        <pre className="max-h-32 overflow-auto rounded border bg-muted/30 p-2 font-mono text-[10px]">
          {JSON.stringify(question, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
