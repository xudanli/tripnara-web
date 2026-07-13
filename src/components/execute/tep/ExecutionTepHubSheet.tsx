import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExecutionTep } from '@/hooks/useExecutionTep';
import { resolveInterventionWriteBranch } from '@/lib/mobile-execution.util';
import type { ExecutionInterventionDto } from '@/types/mobile-execution';
import { ExecutionAlertsPanel } from './ExecutionAlertsPanel';
import { ExecutionAdjustmentQueuePanel } from './ExecutionAdjustmentQueuePanel';

export type ExecutionTepHubTab = 'alerts' | 'queue';

export interface ExecutionTepHubSheetProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: ExecutionTepHubTab;
  highlightItemId?: string | null;
  enabled?: boolean;
  onOpenScheduleDecision?: (problemId: string) => void;
}

export function ExecutionTepHubSheet({
  tripId,
  open,
  onOpenChange,
  initialTab = 'alerts',
  highlightItemId = null,
  enabled = true,
  onOpenScheduleDecision,
}: ExecutionTepHubSheetProps) {
  const [tab, setTab] = useState<ExecutionTepHubTab>(initialTab);
  const [scrollTarget, setScrollTarget] = useState<string | null>(highlightItemId);

  const {
    alerts,
    queue,
    loading,
    refreshing,
    error,
    reload,
    acceptIntervention,
    deferIntervention,
    applyingId,
  } = useExecutionTep(tripId, { enabled: enabled && open });

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setScrollTarget(highlightItemId ?? null);
    }
  }, [open, initialTab, highlightItemId]);

  useEffect(() => {
    if (!open || !scrollTarget || tab !== 'queue') return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`execution-intervention-anchor-${scrollTarget}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setScrollTarget(null);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [open, scrollTarget, tab, queue?.items.length]);

  const navigateToAdjustments = (interventionId?: string) => {
    setTab('queue');
    if (interventionId) setScrollTarget(interventionId);
  };

  const handleAcceptIntervention = (item: ExecutionInterventionDto) => {
    const branch = resolveInterventionWriteBranch(item);
    if (branch === 'slip' && item.decisionProblemId && onOpenScheduleDecision) {
      onOpenScheduleDecision(item.decisionProblemId);
      return;
    }
    void acceptIntervention(item);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-xl overflow-hidden p-0">
        <SheetHeader className="border-b border-border/60 px-6 py-4">
          <SheetTitle>行中风险与调整</SheetTitle>
          <SheetDescription>
            活跃风险提醒（只读）与待调整项（确认修复）
          </SheetDescription>
        </SheetHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as ExecutionTepHubTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mx-6 mt-3 grid w-auto grid-cols-2">
            <TabsTrigger value="alerts" className="text-xs">
              活跃风险
              {alerts?.primaryRisk ? (
                <span className="ml-1.5 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] text-destructive">
                  1
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="queue" className="text-xs">
              待调整项
              {queue && queue.pendingCount > 0 ? (
                <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                  {queue.pendingCount}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="alerts" className="mt-0">
              <ExecutionAlertsPanel
                data={alerts}
                loading={loading}
                refreshing={refreshing}
                error={error}
                onReload={reload}
                onNavigateToAdjustments={navigateToAdjustments}
              />
            </TabsContent>
            <TabsContent value="queue" className="mt-0">
              <ExecutionAdjustmentQueuePanel
                tripId={tripId}
                data={queue}
                loading={loading}
                refreshing={refreshing}
                error={error}
                applyingId={applyingId}
                highlightItemId={scrollTarget ?? highlightItemId}
                onReload={reload}
                onAccept={handleAcceptIntervention}
                onDefer={deferIntervention}
              />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
