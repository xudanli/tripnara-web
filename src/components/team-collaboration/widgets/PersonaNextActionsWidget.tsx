import { CheckCircle2, ChevronRight, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HighRiskAlert, SplitConsensusData } from '@/types/trip-decision-profiling';
import { CollabWidgetCard } from './CollabWidgetCard';

interface PersonaNextActionsWidgetProps {
  alerts: HighRiskAlert[];
  quizCompleted: boolean;
  splitConsensus: SplitConsensusData | null | undefined;
  teamCompletionRate: number;
  onStartQuiz?: () => void;
  onConfirmSplit?: () => void;
  onAlertClick?: (alert: HighRiskAlert) => void;
  onViewAll?: () => void;
}

interface ActionRow {
  id: string;
  label: string;
  done: boolean;
  progress?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export function PersonaNextActionsWidget({
  alerts,
  quizCompleted,
  splitConsensus,
  teamCompletionRate,
  onStartQuiz,
  onConfirmSplit,
  onAlertClick,
  onViewAll,
}: PersonaNextActionsWidgetProps) {
  const confirmations = splitConsensus?.confirmations ?? [];
  const confirmedCount = confirmations.filter((c) => c.confirmedAt).length;
  const totalConfirm = confirmations.length;
  const splitLocked = Boolean(splitConsensus?.lockedAt);

  const splitProgress =
    totalConfirm > 0 ? `${confirmedCount}/${totalConfirm} 人确认` : undefined;

  const actions: ActionRow[] = [
    {
      id: 'quiz',
      label: '完成决策风格调查',
      done: quizCompleted && teamCompletionRate >= 95,
      progress: quizCompleted ? `${Math.round(teamCompletionRate)}% 团队完成` : undefined,
      onAction: quizCompleted ? undefined : onStartQuiz,
      actionLabel: quizCompleted ? undefined : '去确认',
    },
    {
      id: 'split',
      label: splitLocked
        ? '分摊机制已锁定'
        : '确认分摊机制共识',
      done: splitLocked,
      progress: splitProgress,
      onAction: splitLocked ? undefined : onConfirmSplit,
      actionLabel: splitLocked ? undefined : '去确认',
    },
    {
      id: 'negotiate',
      label:
        alerts.length > 0
          ? `处理 ${alerts[0].domainLabel} 摩擦`
          : '处理高摩擦领域',
      done: alerts.length === 0,
      onAction: alerts[0] ? () => onAlertClick?.(alerts[0]) : undefined,
      actionLabel: alerts.length > 0 ? '去确认' : undefined,
    },
  ];

  return (
    <CollabWidgetCard
      title="下一步推荐行动"
      action={
        onViewAll ? (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-[10px] text-primary"
            onClick={onViewAll}
          >
            查看全部行动项
            <ChevronRight className="ml-0.5 h-3 w-3" />
          </Button>
        ) : undefined
      }
    >
      <ul className="space-y-2">
        {actions.map((action) => (
          <li
            key={action.id}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border/60 px-2.5 py-2"
          >
            {action.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-gate-allow-foreground" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p
                className={
                  action.done
                    ? 'text-xs text-muted-foreground line-through'
                    : 'text-xs text-foreground'
                }
              >
                {action.label}
              </p>
              {action.progress ? (
                <p className="text-[10px] text-muted-foreground">{action.progress}</p>
              ) : null}
            </div>
            {!action.done && action.onAction && action.actionLabel ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 px-2.5 text-[10px]"
                onClick={action.onAction}
              >
                {action.actionLabel}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </CollabWidgetCard>
  );
}
