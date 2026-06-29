import { ChevronRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SPLIT_MODE_LABELS } from '@/lib/decision-profiling-labels';
import type { SplitConsensusData } from '@/types/trip-decision-profiling';
import { CollabWidgetCard } from './CollabWidgetCard';

interface CollabSplitConsensusWidgetProps {
  data: SplitConsensusData | null | undefined;
  quizCompleted: boolean;
  onStartQuiz?: () => void;
  onViewDetail?: () => void;
}

export function CollabSplitConsensusWidget({
  data,
  quizCompleted,
  onStartQuiz,
  onViewDetail,
}: CollabSplitConsensusWidgetProps) {
  if (!quizCompleted) {
    return (
      <CollabWidgetCard title="分摊机制共识">
        <p className="text-xs text-muted-foreground">
          完成决策风格调查后，AI 将推荐分摊方案并收集全员确认。
        </p>
        {onStartQuiz ? (
          <Button type="button" size="sm" className="mt-3 h-8 text-xs" onClick={onStartQuiz}>
            开始调查
          </Button>
        ) : null}
      </CollabWidgetCard>
    );
  }

  const locked = Boolean(data?.lockedAt);
  const mode =
    data?.lockedMode ?? data?.selectedMode ?? data?.recommendedMode ?? 'split_aa';
  const modeLabel = SPLIT_MODE_LABELS[mode];
  const suggestions =
    data?.options
      ?.slice(0, 3)
      .map((opt) => opt.rationale || opt.description)
      .filter(Boolean) ?? [
      '按 AA 制处理日常餐饮与交通',
      '特殊支出单独记账后结算',
      '大额项目提前在群内投票确认',
    ];

  return (
    <CollabWidgetCard
      title="分摊机制共识"
      action={
        onViewDetail ? (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-[10px] text-primary"
            onClick={onViewDetail}
          >
            查看分摊共识详情
            <ChevronRight className="ml-0.5 h-3 w-3" />
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {locked ? (
          <Badge
            variant="outline"
            className="border-gate-allow-border bg-gate-allow/30 text-gate-allow-foreground"
          >
            已达成共识
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] font-normal">
            待全员确认
          </Badge>
        )}
        <p className="text-sm font-medium text-foreground">{modeLabel}</p>
        <ul className="space-y-2">
          {suggestions.map((tip, index) => (
            <li key={index} className="flex gap-2 text-xs text-muted-foreground">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </CollabWidgetCard>
  );
}
