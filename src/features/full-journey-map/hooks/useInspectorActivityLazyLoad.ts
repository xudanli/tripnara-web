import { useEffect, useRef, useState } from 'react';
import { journeyMapApi, isJourneyMapNotFound } from '@/api/journey-map';
import type { JourneyMapInspectorActivityContextDto } from '@/api/journey-map';
import type { JourneyActivity } from '../types';
import {
  activityIdCandidates,
  resolveInspectorActivityApiId,
  resolveInspectorActivityContext,
} from '../lib/resolve-inspector-activity-context';
import type { JourneyMapInspectorBundle } from '../types-inspector';
import type { JourneyMember } from '../types';

export interface UseInspectorActivityLazyLoadOptions {
  tripId: string | null;
  usingDemo: boolean;
  enriching: boolean;
  inspectorReady: boolean;
  selectedActivity: JourneyActivity | null;
  inspector: JourneyMapInspectorBundle;
  members: JourneyMember[];
  onContextLoaded: (context: JourneyMapInspectorActivityContextDto) => void;
}

export interface UseInspectorActivityLazyLoadResult {
  /** 合并后的 activityContexts（含懒加载） */
  activityContexts: JourneyMapInspectorActivityContextDto[] | undefined;
  lazyLoading: boolean;
  lazyError: string | null;
}

export function useInspectorActivityLazyLoad(
  options: UseInspectorActivityLazyLoadOptions,
): UseInspectorActivityLazyLoadResult {
  const {
    tripId,
    usingDemo,
    enriching,
    inspectorReady,
    selectedActivity,
    inspector,
    members,
    onContextLoaded,
  } = options;

  const [lazyLoading, setLazyLoading] = useState(false);
  const [lazyError, setLazyError] = useState<string | null>(null);
  const inflightRef = useRef<string | null>(null);
  const loadedRef = useRef<Set<string>>(new Set());

  const baseContexts = inspector.activityContexts;

  useEffect(() => {
    if (
      !tripId ||
      usingDemo ||
      enriching ||
      !inspectorReady ||
      !selectedActivity ||
      !baseContexts
    ) {
      return;
    }

    const existing = resolveInspectorActivityContext(selectedActivity, baseContexts, members);
    if (existing) {
      setLazyError(null);
      return;
    }

    const apiId = resolveInspectorActivityApiId(selectedActivity);
    const fetchKey = `${tripId}:${apiId}`;
    if (loadedRef.current.has(fetchKey) || inflightRef.current === fetchKey) {
      return;
    }

    let cancelled = false;
    inflightRef.current = fetchKey;
    setLazyLoading(true);
    setLazyError(null);

    (async () => {
      const candidates = activityIdCandidates(selectedActivity);
      let lastError: unknown = null;

      for (const candidateId of candidates) {
        try {
          const result = await journeyMapApi.getInspectorActivity(tripId, candidateId, {
            fields: 'full',
          });
          if (cancelled) return;

          if (result.status === 'ok' && result.data.context) {
            loadedRef.current.add(`${tripId}:${candidateId}`);
            onContextLoaded(result.data.context);
            return;
          }
        } catch (err) {
          lastError = err;
          if (isJourneyMapNotFound(err)) continue;
          break;
        }
      }

      if (!cancelled) {
        const message =
          lastError instanceof Error ? lastError.message : '活动详情加载失败';
        setLazyError(message);
      }
    })()
      .catch(() => {
        if (!cancelled) setLazyError('活动详情加载失败');
      })
      .finally(() => {
        if (!cancelled) setLazyLoading(false);
        if (inflightRef.current === fetchKey) inflightRef.current = null;
      });

    return () => {
      cancelled = true;
    };
  }, [
    tripId,
    usingDemo,
    enriching,
    inspectorReady,
    selectedActivity,
    baseContexts,
    members,
    onContextLoaded,
  ]);

  return {
    activityContexts: baseContexts,
    lazyLoading,
    lazyError,
  };
}
