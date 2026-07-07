import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import AiActivityLogDetailPanel from '@/components/ai-activity-log/AiActivityLogDetailPanel';
import AiActivityLogSummaryCards from '@/components/ai-activity-log/AiActivityLogSummaryCards';
import AiActivityLogTimeline from '@/components/ai-activity-log/AiActivityLogTimeline';
import {
  aiActivityLogHeaderCard,
  aiActivityLogPageShell,
} from '@/components/ai-activity-log/ai-activity-log-ui';
import { LogoLoading } from '@/components/common/LogoLoading';
import { useAiActivityLog } from '@/hooks/useAiActivityLog';
import { filterAiActivityLogItems, type AiActivityLogTab } from '@/lib/ai-activity-log-display.util';
import { buildTripTravelStatusPath } from '@/lib/travel-status-navigation.util';

export default function TripAiActivityLogPage() {
  const { id: tripId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AiActivityLogTab>('ALL');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  const log = useAiActivityLog({
    tripId,
    activityId: selectedActivityId,
    enabled: Boolean(tripId),
  });

  const filteredItems = useMemo(
    () => filterAiActivityLogItems(log.list?.items ?? [], activeTab),
    [log.list?.items, activeTab],
  );

  useEffect(() => {
    if (!log.list?.items.length) {
      setSelectedActivityId(null);
      return;
    }
    if (selectedActivityId && log.list.items.some((item) => item.activityId === selectedActivityId)) {
      return;
    }
    const firstVisible =
      filteredItems[0]?.activityId ?? log.list.items[0]?.activityId ?? null;
    setSelectedActivityId(firstVisible);
  }, [log.list?.items, filteredItems, selectedActivityId]);

  const handleNavigateHref = useCallback(
    (href: string) => {
      navigate(href);
    },
    [navigate],
  );

  const handleUndo = useCallback(
    async (logId: string) => {
      try {
        await log.undo(logId);
        toast.success('已撤销此操作');
      } catch (err) {
        toast.error((err as Error)?.message ?? '撤销失败');
      }
    },
    [log],
  );

  if (!tripId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        缺少行程 ID
      </div>
    );
  }

  if (log.isLoading) {
    return <LogoLoading />;
  }

  if (log.error && !log.list) {
    return (
      <div className={aiActivityLogPageShell}>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-4 h-8 text-muted-foreground"
          onClick={() => navigate(buildTripTravelStatusPath(tripId))}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          返回概览
        </Button>
        <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
          {log.isUnavailable
            ? 'AI 活动记录接口暂不可用，请稍后再试。'
            : (log.error as Error)?.message ?? '加载失败'}
        </div>
      </div>
    );
  }

  const summary = log.list?.summary ?? {
    todayActionCount: 0,
    autoCompletedCount: 0,
    waitingConfirmCount: 0,
  };

  return (
    <div className={aiActivityLogPageShell}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 mb-4 h-8 text-muted-foreground"
        onClick={() => navigate(buildTripTravelStatusPath(tripId))}
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        返回概览
      </Button>

      <header className={aiActivityLogHeaderCard}>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          AI 活动记录
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          透明记录 AI 在本次行程中的所有操作与决策，便于你与团队审计、回放与撤销。
        </p>
      </header>

      <div className="mt-4">
        <AiActivityLogSummaryCards summary={summary} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-start">
        <AiActivityLogTimeline
          items={filteredItems}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedActivityId={selectedActivityId}
          onSelect={setSelectedActivityId}
          onNavigateHref={handleNavigateHref}
        />
        <AiActivityLogDetailPanel
          detail={log.detail}
          isLoading={Boolean(selectedActivityId) && log.isDetailLoading}
          isUndoing={log.isUndoing}
          onNavigateHref={handleNavigateHref}
          onUndo={(logId) => void handleUndo(logId)}
        />
      </div>
    </div>
  );
}
