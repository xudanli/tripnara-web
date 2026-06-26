import { GitBranch, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SPLIT_UI_COPY, splitSessionStatusLabel } from '@/lib/in-trip-split';
import type { SplitPartySessionSummary } from '@/types/in-trip-split';

interface InTripSplitPanelProps {
  sessions: SplitPartySessionSummary[];
  activeSession: SplitPartySessionSummary | null;
  proposedSessions: SplitPartySessionSummary[];
  loading?: boolean;
  proposing?: boolean;
  executingId?: string | null;
  onPropose: () => Promise<unknown>;
  onSelectSession: (sessionId: string) => void;
  onExecute: (sessionId: string) => void;
  className?: string;
}

export function InTripSplitPanel({
  sessions,
  activeSession,
  proposedSessions,
  loading,
  proposing,
  executingId,
  onPropose,
  onSelectSession,
  onExecute,
  className,
}: InTripSplitPanelProps) {
  if (loading) {
    return (
      <Card className={cn('col-span-12', className)}>
        <CardContent className="py-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const handlePropose = async () => {
    try {
      const detail = await onPropose();
      if (detail && typeof detail === 'object' && 'id' in detail) {
        onSelectSession((detail as { id: string }).id);
        toast.success('已生成分组探索方案');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '生成方案失败');
    }
  };

  return (
    <Card className={cn('col-span-12', className)}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-violet-600" aria-hidden />
          {SPLIT_UI_COPY.proposeTitle}
        </CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          disabled={proposing || !!activeSession}
          onClick={handlePropose}
        >
          {proposing ? '生成中…' : '生成方案'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="text-xs text-muted-foreground">{SPLIT_UI_COPY.proposeDescription}</p>

        {activeSession && (
          <button
            type="button"
            onClick={() => onSelectSession(activeSession.id)}
            className="w-full rounded-lg border border-violet-200 bg-violet-50/50 p-3 text-left hover:bg-violet-50 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">探索进行中</span>
              <Badge variant="outline" className="text-[10px]">
                {splitSessionStatusLabel(activeSession.status)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeSession.groupCount} 组 · {activeSession.sharedNodeCount} 个汇合点
            </p>
          </button>
        )}

        {proposedSessions.map((s) => (
          <div
            key={s.id}
            className="rounded-lg border p-3 flex items-center justify-between gap-2"
          >
            <button
              type="button"
              className="text-left flex-1 min-w-0"
              onClick={() => onSelectSession(s.id)}
            >
              <p className="text-sm font-medium truncate">
                {s.groupCount} 组并行路线
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" aria-hidden />
                {s.sharedNodeCount} 个共享节点
              </p>
            </button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs shrink-0"
              disabled={executingId === s.id}
              onClick={() => onExecute(s.id)}
            >
              {executingId === s.id ? '启动中…' : SPLIT_UI_COPY.executeCta}
            </Button>
          </div>
        ))}

        {sessions.length === 0 && !proposing && (
          <p className="text-sm text-muted-foreground text-center py-2">
            暂无分组方案，点击「生成方案」开始
          </p>
        )}
      </CardContent>
    </Card>
  );
}
