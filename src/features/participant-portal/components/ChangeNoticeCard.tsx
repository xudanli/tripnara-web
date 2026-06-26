import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { ParticipantChangeNotice } from '@/types/participant-portal';
import { cn } from '@/lib/utils';
import { ChangeSeverityBadge } from './ChangeSeverityBadge';

interface ChangeNoticeCardProps {
  notice: ParticipantChangeNotice;
  detailHref?: string;
  onAck?: (helpRequested: boolean) => void;
  ackPending?: boolean;
  compact?: boolean;
}

function formatDeadline(deadline: string | null | undefined): string | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return deadline;
  return d.toLocaleString();
}

export function ChangeNoticeCard({
  notice,
  detailHref,
  onAck,
  ackPending = false,
  compact = false,
}: ChangeNoticeCardProps) {
  const displayTitle = notice.title?.trim() || notice.whatHappened;
  const needsAck = notice.requiresAck && !notice.acknowledged;
  const isHighAlert = notice.severity === 'HIGH' || notice.severity === 'EMERGENCY';

  return (
    <div
      className={cn(
        'rounded-lg border space-y-2',
        compact ? 'p-3' : 'p-4',
        isHighAlert && 'border-orange-300 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/30',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ChangeSeverityBadge severity={notice.severity} />
        {notice.acknowledged ? (
          <span className="text-xs text-muted-foreground">已确认</span>
        ) : needsAck ? (
          <span className="text-xs font-medium text-amber-600">待确认</span>
        ) : null}
      </div>

      {detailHref ? (
        <Link to={detailHref} className="block text-sm font-medium hover:text-primary">
          {displayTitle}
        </Link>
      ) : (
        <p className="text-sm font-medium">{displayTitle}</p>
      )}

      {!compact && notice.whatHappened && notice.title && notice.whatHappened !== notice.title ? (
        <p className="text-sm text-muted-foreground">{notice.whatHappened}</p>
      ) : null}

      {notice.impactSummary ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">对我：</span>
          {notice.impactSummary}
        </p>
      ) : null}

      {!compact && notice.actionRequired ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">我需要：</span>
          {notice.actionRequired}
        </p>
      ) : null}

      {!compact && notice.planB ? (
        <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
          <p className="font-medium">备选方案 · {notice.planB.label}</p>
          <p className="text-muted-foreground">{notice.planB.alternativeSummary}</p>
          {notice.planB.costSummary ? (
            <p className="text-xs text-muted-foreground">费用：{notice.planB.costSummary}</p>
          ) : null}
          {detailHref ? (
            <Link to={detailHref} className="text-xs text-primary hover:underline">
              查看方案详情
            </Link>
          ) : null}
        </div>
      ) : null}

      {formatDeadline(notice.deadline) ? (
        <p className="text-xs text-muted-foreground">
          最晚响应：{formatDeadline(notice.deadline)}
        </p>
      ) : null}

      {needsAck && onAck ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" disabled={ackPending} onClick={() => onAck(false)}>
            确认收到
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={ackPending}
            onClick={() => onAck(true)}
          >
            需要帮助
          </Button>
        </div>
      ) : null}

      {compact && detailHref ? (
        <Link to={detailHref} className="text-xs text-primary hover:underline">
          查看详情
        </Link>
      ) : null}
    </div>
  );
}
