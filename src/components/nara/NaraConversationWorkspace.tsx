import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AgentChat from '@/components/agent/AgentChat';
import NaraContextPanel from '@/components/nara/NaraContextPanel';
import NaraConversationHeader from '@/components/nara/NaraConversationHeader';
import NaraQuickSuggestions, {
  buildDefaultNaraSuggestions,
} from '@/components/nara/NaraQuickSuggestions';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { AssistantSidebarProvider } from '@/contexts/AssistantSidebarContext';
import { useAgentRouteQueryOptions } from '@/lib/agent-route-query';
import { syncTripDataAfterAgentMutation } from '@/lib/agent-trip-sync';
import { sanitizeRouteRunTripId } from '@/lib/route-run-trip-id';
import { tripsApi } from '@/api/trips';
import type { TripListItem } from '@/types/trip';
import { useWorkbenchPlanningConflicts } from '@/pages/plan-studio/hooks/useWorkbenchData';
import { TripTravelContextProvider } from '@/features/trip-context';

export default function NaraConversationWorkspace() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const agentRouteOpts = useAgentRouteQueryOptions();

  const tripIdFromUrl = searchParams.get('tripId');
  const [resolvedTripId, setResolvedTripId] = useState<string | null>(tripIdFromUrl);
  const [planningTrips, setPlanningTrips] = useState<TripListItem[]>([]);
  const [tripTitle, setTripTitle] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(!tripIdFromUrl);
  const [contextSheetOpen, setContextSheetOpen] = useState(false);

  const sendMessageRef = useRef<((message: string) => void | Promise<void>) | null>(null);

  const effectiveTripId = resolvedTripId ?? tripIdFromUrl;
  const { data: conflictsBundle } = useWorkbenchPlanningConflicts(effectiveTripId, {
    includeDecisionChecker: false,
  });

  const drivingConflictDay = useMemo(() => {
    const item = conflictsBundle?.conflicts?.find(
      (entry) =>
        entry.category === 'transport' ||
        entry.title?.includes('驾驶') ||
        entry.title?.includes('交通'),
    );
    return item?.affectedDays?.[0] ?? null;
  }, [conflictsBundle?.conflicts]);

  const quickSuggestions = useMemo(
    () =>
      buildDefaultNaraSuggestions({
        drivingConflictDay,
        destinationLabel: tripTitle?.split(' ')[0] ?? null,
      }),
    [drivingConflictDay, tripTitle],
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        setBootstrapping(true);
        const trips = await tripsApi.getAll();
        const list = Array.isArray(trips) ? trips : [];
        const planning = list.filter((trip) => trip.status === 'PLANNING');
        if (cancelled) return;
        setPlanningTrips(planning);

        const initialId = tripIdFromUrl ?? planning[0]?.id ?? null;
        setResolvedTripId(initialId);

        if (initialId && initialId !== tripIdFromUrl) {
          const next = new URLSearchParams(searchParams);
          next.set('tripId', initialId);
          setSearchParams(next, { replace: true });
        }

        if (initialId) {
          const detail = await tripsApi.getById(initialId).catch(() => null);
          if (!cancelled && detail) {
            setTripTitle(
              (detail as typeof detail & { name?: string }).name ||
                detail.destination ||
                '当前行程',
            );
          }
        }
      } catch (error) {
        console.error('[NaraConversationWorkspace] bootstrap failed', error);
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [tripIdFromUrl, searchParams, setSearchParams]);

  useEffect(() => {
    if (!effectiveTripId) return;
    let cancelled = false;

    void tripsApi
      .getById(effectiveTripId)
      .then((detail) => {
        if (cancelled) return;
        setTripTitle(
          (detail as typeof detail & { name?: string }).name ||
            detail.destination ||
            '当前行程',
        );
      })
      .catch(() => {
        if (!cancelled) setTripTitle(null);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveTripId]);

  const handleTripChange = useCallback(
    (nextTripId: string) => {
      setResolvedTripId(nextTripId);
      const next = new URLSearchParams(searchParams);
      next.set('tripId', nextTripId);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleSystem2Response = useCallback(async () => {
    const tid = sanitizeRouteRunTripId(effectiveTripId);
    try {
      await syncTripDataAfterAgentMutation(queryClient, tid ?? undefined, 'plan-studio-agent');
    } catch (error) {
      console.error('[NaraConversationWorkspace] sync after System2 failed', error);
      toast.error('行程数据刷新失败，请稍后手动刷新页面');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
    }
  }, [queryClient, effectiveTripId]);

  const handleQuickSuggestion = useCallback((prompt: string) => {
    if (sendMessageRef.current) {
      void sendMessageRef.current(prompt);
    }
  }, []);

  const handleAssistantMessageFromUrl = useCallback(() => {
    const message = searchParams.get('assistantMessage')?.trim();
    if (!message || !sendMessageRef.current) return;
    void sendMessageRef.current(message);
    const next = new URLSearchParams(searchParams);
    next.delete('assistantMessage');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get('assistant') === 'open' && effectiveTripId) {
      handleAssistantMessageFromUrl();
    }
  }, [effectiveTripId, handleAssistantMessageFromUrl, searchParams]);

  if (bootstrapping) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const workspace = (
    <AssistantSidebarProvider
      value={{
        expanded: true,
        width: 0,
        onRequestExpand: () => {},
      }}
    >
      <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-background">
        <section className="flex min-w-0 flex-1 flex-col">
          <NaraConversationHeader
            tripTitle={tripTitle}
            tripId={effectiveTripId}
            planningTrips={planningTrips}
            onTripChange={handleTripChange}
            onOpenContext={() => setContextSheetOpen(true)}
            showContextToggle
          />

          <NaraQuickSuggestions
            suggestions={quickSuggestions}
            onSelect={handleQuickSuggestion}
            disabled={!effectiveTripId}
          />

          <div className="min-h-0 flex-1">
            <AgentChat
              activeTripId={effectiveTripId}
              entryPoint="planning_workbench"
              attachActiveTripSummaryContext={Boolean(
                effectiveTripId && !agentRouteOpts.routeContextType?.trim(),
              )}
              pageMode={agentRouteOpts.pageMode}
              routeContextType={agentRouteOpts.routeContextType}
              enableLiveTools={agentRouteOpts.enableLiveTools}
              intentFlags={agentRouteOpts.intentFlags}
              onSystem2Response={handleSystem2Response}
              className="h-full"
              onSendMessageReady={(send) => {
                sendMessageRef.current = send;
                handleAssistantMessageFromUrl();
              }}
            />
          </div>
        </section>

        <div className="hidden w-[min(360px,32vw)] shrink-0 xl:flex">
          <NaraContextPanel tripId={effectiveTripId} />
        </div>

        <Sheet open={contextSheetOpen} onOpenChange={setContextSheetOpen}>
          <SheetContent side="right" className="w-full max-w-md p-0">
            <NaraContextPanel tripId={effectiveTripId} />
          </SheetContent>
        </Sheet>
      </div>
    </AssistantSidebarProvider>
  );

  if (effectiveTripId) {
    return (
      <TripTravelContextProvider tripId={effectiveTripId}>{workspace}</TripTravelContextProvider>
    );
  }

  return workspace;
}
