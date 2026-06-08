/**
 * Decision Replay 会话列表（原 /dashboard/agent 调试模式）
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  agentApi,
  type DecisionReplaySessionItem,
  type DecisionReplaySessionsResponse,
} from '@/api/agent';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sanitizeRouteRunTripId } from '@/lib/route-run-trip-id';

function sessionsFromResponse(data: DecisionReplaySessionsResponse | undefined): DecisionReplaySessionItem[] {
  if (!data) return [];
  if (Array.isArray(data.sessions)) return data.sessions;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function formatSessionRowFallback(session: DecisionReplaySessionItem): string {
  const id = session.session_id ?? session.id ?? session.run_id ?? '—';
  const ts =
    session.created_at ??
    session.started_at ??
    session.updated_at ??
    session.timestamp ??
    '';
  const trip = session.trip_id ?? session.trip_run_id ?? '';
  return [String(id), ts ? String(ts) : '', trip ? `trip: ${trip}` : ''].filter(Boolean).join(' · ');
}

function sessionPrimaryLine(session: DecisionReplaySessionItem): string {
  const raw = session.list_summary;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return formatSessionRowFallback(session);
}

function ReplaySessionCard({ session }: { session: DecisionReplaySessionItem }) {
  const primary = sessionPrimaryLine(session);
  const queryPreviewLine =
    session.user_query_preview !== undefined && session.user_query_preview !== null
      ? session.user_query_preview.trim() || '（无查询摘要）'
      : null;

  return (
    <li className="rounded-md border bg-card px-2.5 py-2 text-muted-foreground hover:bg-muted/50 space-y-1.5">
      <div className="text-sm font-medium text-foreground leading-snug">{primary}</div>
      <dl className="space-y-0.5 text-[11px] border-t border-border/60 pt-1.5 mt-1">
        {session.trip_display_name !== undefined && session.trip_display_name !== null ? (
          <div className="flex gap-1.5">
            <dt className="shrink-0 text-muted-foreground">行程名</dt>
            <dd className="min-w-0 break-words text-foreground/90">
              {session.trip_display_name.trim() || '—'}
            </dd>
          </div>
        ) : null}
        {queryPreviewLine !== null ? (
          <div className="flex gap-1.5">
            <dt className="shrink-0 text-muted-foreground">查询预览</dt>
            <dd className="min-w-0 break-words italic text-foreground/85">{queryPreviewLine}</dd>
          </div>
        ) : null}
        {session.status_label_zh !== undefined && session.status_label_zh !== null ? (
          <div className="flex gap-1.5 items-center flex-wrap">
            <dt className="shrink-0 text-muted-foreground">状态</dt>
            <dd>
              <Badge variant="secondary" className="text-[10px] font-normal h-5 px-1.5">
                {session.status_label_zh.trim() || '—'}
              </Badge>
            </dd>
          </div>
        ) : null}
      </dl>
    </li>
  );
}

interface AgentDebugReplaySheetProps {
  tripIdRaw?: string | null;
  triggerClassName?: string;
}

export function AgentDebugReplaySheet({ tripIdRaw, triggerClassName }: AgentDebugReplaySheetProps) {
  const [open, setOpen] = useState(false);
  const tripIdForApi = useMemo(() => sanitizeRouteRunTripId(tripIdRaw), [tripIdRaw]);

  const {
    data: replaySessionsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['decision-replay', 'sessions', tripIdForApi ?? tripIdRaw ?? 'all'],
    queryFn: () =>
      agentApi.getDecisionReplaySessions(tripIdForApi ? { trip_id: tripIdForApi } : undefined),
    enabled: open,
    staleTime: 30_000,
  });

  const sessionRows = useMemo(() => sessionsFromResponse(replaySessionsData), [replaySessionsData]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={triggerClassName ?? 'h-7 text-[10px] px-2'}
        >
          Replay 会话
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100vw-2rem,380px)] sm:max-w-[380px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Decision Replay 会话</SheetTitle>
          <SheetDescription>
            {tripIdForApi
              ? `当前筛选行程：${tripIdForApi}`
              : tripIdRaw
                ? 'URL 中 tripId 非服务端 UUID，无法按行程筛选。'
                : '显示全部会话；可在 URL 加上 tripId=UUID 缩小范围。'}
          </SheetDescription>
        </SheetHeader>
        <div className="flex gap-2 mt-2">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()}>
            刷新列表
          </Button>
        </div>
        <ScrollArea className="flex-1 mt-3 pr-2 -mr-2">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">加载中…</p>
          ) : error ? (
            <p className="text-xs text-destructive whitespace-pre-wrap">
              {(error as Error)?.message ?? String(error)}
            </p>
          ) : sessionRows.length === 0 ? (
            <p className="text-xs text-muted-foreground">暂无会话记录。</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {sessionRows.map((s, idx) => {
                const key = String(s.session_id ?? s.id ?? s.run_id ?? idx);
                return <ReplaySessionCard key={key} session={s} />;
              })}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
