import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { personaFooterLinkClass } from '@/components/team-collaboration/persona-ui';
import type { HighRiskAlert, SplitConsensusData } from '@/types/trip-decision-profiling';
import { cn } from '@/lib/utils';
import { CollabWidgetCard } from './CollabWidgetCard';

interface PersonaNextActionsWidgetProps {
  alerts: HighRiskAlert[];
  quizCompleted: boolean;
  splitConsensus: SplitConsensusData | null | undefined;
  teamCompletionRate: number;
  memberCount?: number;
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
  memberCount,
  onStartQuiz,
  onConfirmSplit,
  onAlertClick,
  onViewAll,
}: PersonaNextActionsWidgetProps) {
  const confirmations = splitConsensus?.confirmations ?? [];
  const confirmedCount = confirmations.filter((confirmation) => confirmation.confirmedAt).length;
  const totalConfirm = confirmations.length;
  const splitLocked = Boolean(splitConsensus?.lockedAt);

  const splitProgress =
    totalConfirm > 0
      ? `${confirmedCount}/${totalConfirm} 人确认`
      : memberCount
        ? `0/${memberCount} 人确认`
        : undefined;

  const quizDone = quizCompleted && teamCompletionRate >= 95;
  const quizProgress = quizDone
    ? memberCount
      ? `${memberCount}/${memberCount} 人确认`
      : `${Math.round(teamCompletionRate)}% 团队完成`
    : `${Math.round(teamCompletionRate)}% 团队完成`;

  const actions: ActionRow[] = [
    {
      id: 'quiz',
      label: '完成决策风格调查',
      done: quizDone,
      progress: quizProgress,
      onAction: quizDone ? undefined : onStartQuiz,
      actionLabel: quizDone ? undefined : '去确认',
    },
    {
      id: 'split',
      label: splitLocked ? '分摊机制已锁定' : '确认分摊机制共识',
      done: splitLocked,
      progress: splitProgress,
      onAction: splitLocked ? undefined : onConfirmSplit,
      actionLabel: splitLocked ? undefined : '去确认',
    },
    ...alerts.slice(0, 2).map((alert) => ({
      id: `alert-${alert.id}`,
      label: `处理 ${alert.domainLabel} 摩擦`,
      done: false,
      onAction: () => onAlertClick?.(alert),
      actionLabel: '去确认' as const,
    })),
  ];

  if (actions.length < 4) {
    actions.push({
      id: 'review',
      label: '回顾团队画像与摩擦预警',
      done: quizDone && splitLocked && alerts.length === 0,
      onAction: alerts[0] ? () => onAlertClick?.(alerts[0]) : onViewAll,
      actionLabel: quizDone && splitLocked && alerts.length === 0 ? undefined : '去确认',
    });
  }

  return (
    <CollabWidgetCard
      title="下一步推荐行动"
      className="h-full"
      footer={
        onViewAll ? (
          <Button
            type="button"
            variant="link"
            className={cn(personaFooterLinkClass, 'h-auto p-0')}
            onClick={onViewAll}
          >
            查看全部行动项
            <ChevronRight className="ml-0.5 h-3 w-3" />
          </Button>
        ) : undefined
      }
    >
      <ul className="divide-y divide-border/50">
        {actions.slice(0, 4).map((action) => (
          <li key={action.id} className="flex min-h-[52px] items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
            <Checkbox
              checked={action.done}
              disabled
              className="h-4 w-4 shrink-0 rounded-[4px] border-primary/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-xs leading-snug',
                  action.done ? 'text-muted-foreground' : 'font-medium text-foreground',
                )}
              >
                {action.label}
              </p>
              {action.progress ? (
                <p className="mt-0.5 text-[10px] text-muted-foreground">{action.progress}</p>
              ) : null}
            </div>
            {!action.done && action.onAction && action.actionLabel ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 border-border/80 px-2.5 text-[10px] font-normal"
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
