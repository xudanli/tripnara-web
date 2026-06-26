import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useGate1AuditTimeline } from '@/hooks/useGate1';
import type { Gate1AuditTimelineEntry } from '@/types/gate1';

interface Gate1AuditTimelinePanelProps {
  projectId: string;
}

export function Gate1AuditTimelinePanel({ projectId }: Gate1AuditTimelinePanelProps) {
  const { data, isLoading, isError, error } = useGate1AuditTimeline(projectId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : '加载时间线失败'}
      </p>
    );
  }

  if (!data) return null;

  const noTrip = data.tripId === null || data.skippedReason;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">审计时间线</CardTitle>
        <CardDescription>
          决策、冲突、Readiness 等关键事件（来自 travel_events 投影）
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.tripId ? (
          <p className="text-xs text-muted-foreground">关联 Trip：{data.tripId}</p>
        ) : null}

        {noTrip ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            <p>尚未关联 Trip，暂无审计时间线。</p>
            {data.skippedReason ? (
              <p className="mt-1 text-xs">原因：{data.skippedReason}</p>
            ) : null}
          </div>
        ) : data.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无事件记录。</p>
        ) : (
          <ol className="relative space-y-0 border-l border-border pl-4">
            {data.entries.map((entry) => (
              <TimelineEntry key={entry.eventId} entry={entry} />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function TimelineEntry({ entry }: { entry: Gate1AuditTimelineEntry }) {
  const time = new Date(entry.occurredAt).toLocaleString();
  const actorLabel = entry.actor
    ? `${entry.actor.type}${entry.actor.role ? ` · ${entry.actor.role}` : ''}`
    : null;

  return (
    <li className="relative pb-6 last:pb-0">
      <span
        className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary"
        aria-hidden
      />
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <time>{time}</time>
          {entry.canonicalEventType ? (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              {entry.canonicalEventType}
            </span>
          ) : null}
        </div>
        <p className="text-sm font-medium">{entry.summary}</p>
        <p className="text-xs text-muted-foreground">
          {entry.eventType}
          {actorLabel ? ` · ${actorLabel}` : ''}
          {entry.source ? ` · ${entry.source}` : ''}
        </p>
      </div>
    </li>
  );
}
