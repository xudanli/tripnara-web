import { Lightbulb, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { optionKindLabel } from '@/dto/frontend-planning-decision-card.util';
import type { CopilotActionHint, CopilotSuggestion } from '@/types/arrange-itinerary';
import { workbenchAttractionExploreEmptySurface, workbenchAccentIconClass, workbenchCardFlat, workbenchScrollable } from '../workbench-ui';

export interface ArrangeItineraryCopilotSuggestionsPanelProps {
  suggestions: CopilotSuggestion[];
  loading?: boolean;
  actionPending?: boolean;
  onExecuteSuggestion?: (suggestion: CopilotSuggestion) => void;
  className?: string;
}

const KIND_LABELS: Record<string, string> = {
  pending_proposal: '待确认草案',
  unarranged_must_visit: '未编排必去',
  high_detour_candidate: '高绕路候选',
  schedule_gap: '日程空档',
  suggest_lodging_for_day: '待补住宿',
};

export function ArrangeItineraryCopilotSuggestionsPanel({
  suggestions,
  loading = false,
  actionPending = false,
  onExecuteSuggestion,
  className,
}: ArrangeItineraryCopilotSuggestionsPanelProps) {
  if (!loading && suggestions.length === 0) return null;

  return (
    <section className={cn(workbenchCardFlat, 'p-3', className)}>
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className={cn('h-3.5 w-3.5', workbenchAccentIconClass)} aria-hidden />
        <p className="text-xs font-semibold text-foreground">Copilot 建议</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner className="h-5 w-5" />
        </div>
      ) : suggestions.length === 0 ? (
        <p className={cn(workbenchAttractionExploreEmptySurface, 'px-2 py-3 text-center text-[10px] text-muted-foreground')}>
          暂无协同建议
        </p>
      ) : (
        <ul className={cn('space-y-2', workbenchScrollable)}>
          {suggestions.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-border/55 bg-card px-2.5 py-2"
            >
              <div className="flex items-start gap-2">
                <Lightbulb className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', workbenchAccentIconClass)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {KIND_LABELS[item.kind] ?? item.kind}
                  </p>
                  <p className="text-xs font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                    {item.message}
                  </p>
                  {item.option ? (
                    <div className="mt-2 rounded-md border border-border/50 bg-muted/10 px-2 py-1.5">
                      <p className="text-[10px] font-medium text-foreground">{item.option.title}</p>
                      <p className="text-[9px] text-muted-foreground">
                        {optionKindLabel(item.option.optionKind)}
                        {item.option.recommended ? ' · 推荐' : ''}
                      </p>
                      {item.option.outcomes[0] ? (
                        <p className="mt-0.5 text-[9px] text-foreground/90">· {item.option.outcomes[0]}</p>
                      ) : null}
                      {item.option.costs[0] ? (
                        <p className="text-[9px] text-gate-confirm-foreground">· {item.option.costs[0]}</p>
                      ) : null}
                    </div>
                  ) : null}
                  {item.actionHint && onExecuteSuggestion ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 text-[10px]"
                      disabled={actionPending}
                      onClick={() => onExecuteSuggestion(item)}
                    >
                      {item.actionHint.label ?? actionHintLabel(item.actionHint)}
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function actionHintLabel(hint: CopilotActionHint): string {
  switch (hint.type) {
    case 'place-proposal':
      return '生成插入草案';
    case 'fill_gaps':
      return '补全空档';
    case 'optimize_route':
      return '优化路线';
    case 'review_proposal':
      return '查看草案';
    case 'suggest_lodging':
      return '补齐当晚住宿';
    case 'apply_lodging_suggestion':
      return '采纳住宿建议';
    default:
      return '执行建议';
  }
}
