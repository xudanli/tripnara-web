import { cn } from '@/lib/utils';
import {
  looksLikeAnswerHtml,
  sanitizeRouteRunAnswerHtmlForDisplay,
} from '@/lib/route-run-answer-text-display';

export type AssistantAnswerHtmlProps = {
  html: string;
  className?: string;
};

/** route_and_run answer_html / clarification question_html 展示 */
export function AssistantAnswerHtml({ html, className }: AssistantAnswerHtmlProps) {
  const sanitized = sanitizeRouteRunAnswerHtmlForDisplay(html);
  if (!sanitized || !looksLikeAnswerHtml(sanitized)) return null;

  return (
    <div
      className={cn(
        'agent-markdown agent-answer-html min-w-0 break-words [overflow-wrap:anywhere] text-[13px] leading-relaxed sm:text-sm',
        'text-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
        '[&_p]:mb-2.5 [&_p:last-child]:mb-0 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5',
        '[&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5',
        '[&_li]:leading-relaxed [&_strong]:font-semibold [&_table]:w-full [&_th]:px-3 [&_th]:py-2',
        '[&_td]:px-3 [&_td]:py-2 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:p-3',
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
