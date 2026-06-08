/**
 * route_and_run NEED_MORE_INFO 澄清卡：按 presentation 路由子组件；弱化 answer_text。
 */

import { useState } from 'react';
import type { ClarificationAnswer, ClarificationQuestion } from '@/types/clarification';
import type { StructuredTravelInput } from '@/api/agent';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clarificationBannerTitle } from '@/lib/clarification-surface';
import {
  buildClarificationUserDisplayLabel,
  buildRouteRunMessageForClarificationSubmit,
} from '@/lib/route-run-clarification-submit';
import { buildStructuredTravelInputFromClarificationQuestions } from '@/utils/clarification';
import { ClarificationQuestionRouter } from '@/components/agent/ClarificationQuestionRouter';
import { clarificationQuestionsForRender } from '@/lib/route-run-render-policy';

const CLARIFICATION_PROSE = 'min-w-0 break-words [overflow-wrap:anywhere]';

export type AgentRouteRunClarificationSubmitPayload = {
  /** POST route_and_run.message：结构化澄清多为 ''，勿传整段 question */
  message: string;
  /** 聊天气泡展示（选项文案，非题干） */
  displayMessage: string;
  structured?: StructuredTravelInput;
  clarification_answers: ClarificationAnswer[];
};

export type AgentRouteRunClarificationCardProps = {
  questions: ClarificationQuestion[];
  onSubmit: (payload: AgentRouteRunClarificationSubmitPayload) => void;
  disabled?: boolean;
  guidanceHint?: string;
  debugUiDefaults?: boolean;
  className?: string;
};

export function AgentRouteRunClarificationCard({
  questions,
  onSubmit,
  disabled,
  guidanceHint,
  debugUiDefaults,
  className,
}: AgentRouteRunClarificationCardProps) {
  const [debugOpen, setDebugOpen] = useState(false);
  const renderQuestions = clarificationQuestionsForRender(questions);
  const banner = clarificationBannerTitle(renderQuestions, guidanceHint);

  const emitSubmit = (answers: ClarificationAnswer[]) => {
    onSubmit({
      message: buildRouteRunMessageForClarificationSubmit(questions, answers),
      displayMessage: buildClarificationUserDisplayLabel(questions, answers),
      structured: buildStructuredTravelInputFromClarificationQuestions(questions, answers),
      clarification_answers: answers,
    });
  };

  return (
    <div
      className={cn(
        'mt-2 rounded-lg border border-amber-200/90 bg-amber-50/25 dark:border-amber-900/50 dark:bg-amber-950/20',
        CLARIFICATION_PROSE,
        className
      )}
    >
      <div className="flex items-start gap-2 border-b border-amber-200/70 px-3 py-2.5 dark:border-amber-900/40">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
        <p className="text-sm font-medium text-amber-950 dark:text-amber-100">{banner}</p>
      </div>

      <div className="space-y-4 px-3 py-3">
        {renderQuestions.map((q) => (
          <ClarificationQuestionRouter
            key={q.id}
            question={q}
            disabled={disabled}
            debugUiDefaults={debugUiDefaults}
            onSubmitAnswers={emitSubmit}
          />
        ))}
      </div>

      {debugUiDefaults ? (
        <details
          className="border-t border-amber-200/60 px-3 py-2 dark:border-amber-900/40"
          open={debugOpen}
          onToggle={(e) => setDebugOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="flex cursor-pointer list-none items-center gap-1 text-[10px] text-muted-foreground select-none">
            <ChevronRight className={cn('h-3 w-3 transition-transform', debugOpen && 'rotate-90')} />
            澄清原始 question（调试）
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded border bg-muted/30 p-2 font-mono text-[10px] leading-snug break-all">
            {JSON.stringify(questions, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
