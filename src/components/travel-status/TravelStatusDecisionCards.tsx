import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DecisionQueueItem } from '@/api/travel-status.types';
import { travelStatusEmptyState } from './travel-status-ui';
import { DecisionCard } from '@/components/trip-world-state/DecisionCard';

interface TravelStatusDecisionCardsProps {
  items: DecisionQueueItem[];
  onAcceptRecommended: (problemId: string) => Promise<void>;
  onViewAlternatives?: (problemId: string) => void;
  onKeepOriginal?: (problemId: string, action: DecisionQueueItem['actions']['keepOriginal']) => void;
  onDefer?: (problemId: string, action: DecisionQueueItem['actions']['defer']) => void;
  acceptingProblemId?: string | null;
  submittingAction?: {
    problemId: string;
    kind: 'keepOriginal' | 'defer';
  } | null;
  suggestedConfirmCount?: number;
  onScrollToVerification?: () => void;
  /** 概览 Tab 空队列：单行提示，不占大卡片 */
  compactEmpty?: boolean;
  className?: string;
}

export default function TravelStatusDecisionCards({
  items,
  onAcceptRecommended,
  onViewAlternatives,
  onKeepOriginal,
  onDefer,
  acceptingProblemId,
  submittingAction,
  suggestedConfirmCount = 0,
  onScrollToVerification,
  compactEmpty = false,
  className,
}: TravelStatusDecisionCardsProps) {
  if (items.length === 0) {
    if (compactEmpty) {
      return (
        <div
          className={cn(
            'flex items-start gap-2 rounded-md border border-border/60 bg-muted/10 px-2.5 py-2',
            className,
          )}
        >
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            目前没有需要你拍板的事项。天气或路况变化时，系统会在这里给出可选方案与证据。
          </p>
        </div>
      );
    }

    return (
      <div className={cn(travelStatusEmptyState, className)}>
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-muted/15">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground/80" aria-hidden />
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">目前没有需要你拍板的事项</p>
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
          {suggestedConfirmCount > 0
            ? `另有 ${suggestedConfirmCount} 项建议确认，可在下方「建议确认」或 Plan Studio 中处理。`
            : '天气或路况变化时，系统会在这里给出可选方案与证据。'}
        </p>
        {suggestedConfirmCount > 0 && onScrollToVerification ? (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 h-8 text-xs"
            onClick={onScrollToVerification}
          >
            查看建议确认项
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2.5', className)} id="travel-decision-queue">
      {items.map((item) => (
        <DecisionCard
          key={item.problemId}
          item={item}
          onAcceptRecommended={onAcceptRecommended}
          onViewAlternatives={onViewAlternatives}
          onKeepOriginal={onKeepOriginal}
          onDefer={onDefer}
          acceptingProblemId={acceptingProblemId}
          submittingAction={submittingAction}
        />
      ))}
    </div>
  );
}
