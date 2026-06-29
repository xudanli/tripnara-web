import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollabMetricRing } from './CollabMetricRing';
import { CollabWidgetCard } from './CollabWidgetCard';

interface TeamFrictionScoreWidgetProps {
  score: number;
  bandLabel?: string;
  summary?: string;
  updatedAt?: string;
  onViewDetail?: () => void;
}

export function TeamFrictionScoreWidget({
  score,
  bandLabel,
  summary,
  updatedAt,
  onViewDetail,
}: TeamFrictionScoreWidgetProps) {
  const strokeClass =
    score >= 75
      ? 'stroke-gate-reject-foreground'
      : score >= 50
        ? 'stroke-gate-confirm-foreground'
        : 'stroke-gate-allow-foreground';

  return (
    <CollabWidgetCard title="团队摩擦分">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <CollabMetricRing
          value={score}
          size={112}
          valueFormat="score"
          strokeClassName={strokeClass}
          className="shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-base font-semibold text-foreground">
            {bandLabel ?? '待测算'}
          </p>
          {summary ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{summary}</p>
          ) : null}
          {updatedAt ? (
            <p className="text-[10px] text-muted-foreground">更新于 {updatedAt}</p>
          ) : null}
          {onViewDetail ? (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs text-primary"
              onClick={onViewDetail}
            >
              查看详细解读
              <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
    </CollabWidgetCard>
  );
}
