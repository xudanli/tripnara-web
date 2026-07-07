import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { personaFooterLinkClass } from '@/components/team-collaboration/persona-ui';
import { CollabMetricRing } from './CollabMetricRing';
import { CollabWidgetCard } from './CollabWidgetCard';

interface TeamFrictionScoreWidgetProps {
  score: number;
  bandLabel?: string;
  summary?: string;
  updatedAt?: string;
  memberCount?: number;
  onViewDetail?: () => void;
}

export function TeamFrictionScoreWidget({
  score,
  bandLabel,
  summary,
  updatedAt,
  memberCount,
  onViewDetail,
}: TeamFrictionScoreWidgetProps) {
  const metadataParts = [
    '基于 Travel Style + Money DNA',
    updatedAt ? `更新于 ${updatedAt}` : null,
    memberCount ? `${memberCount} 位成员` : null,
  ].filter(Boolean);

  return (
    <CollabWidgetCard
      title="团队摩擦分"
      className="h-full"
      footer={
        onViewDetail ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="link"
              className={personaFooterLinkClass}
              onClick={onViewDetail}
            >
              查看详细解读
              <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <CollabMetricRing
          value={score}
          size={120}
          valueFormat="score"
          strokeClassName="stroke-primary"
          strokeWidth={10}
          className="shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-lg font-semibold tracking-tight text-foreground">
            {bandLabel ?? '待测算'}
          </p>
          {summary ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{summary}</p>
          ) : null}
          {metadataParts.length > 0 ? (
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              {metadataParts.join(' · ')}
            </p>
          ) : null}
        </div>
      </div>
    </CollabWidgetCard>
  );
}
