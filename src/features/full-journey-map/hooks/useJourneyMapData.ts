import { useCallback, useEffect, useState } from 'react';
import type { CoverageMapResponse } from '@/api/readiness';
import { readinessApi } from '@/api/readiness';
import { decisionCheckerApi, DecisionCheckerApiError } from '@/api/decision-checker';
import {
  journeyMapApi,
  isJourneyMapNotFound,
  type JourneyMapDecisionItem,
  type JourneyMapInspectorActivityContextDto,
  type JourneyMapInspectorPayload,
  type JourneyMapResponse,
} from '@/api/journey-map';
import { tripsApi, itineraryItemsApi } from '@/api/trips';
import type { DecisionCheckerImpactDto, DecisionCheckerEvidenceDto } from '@/types/decision-checker';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';
import { ICELAND_DEMO } from '../data/iceland-demo-data';
import {
  buildJourneyMapModelFromApi,
  isJourneyMapModelRenderable,
  type JourneyMapBffProjection,
} from '../lib/build-journey-map-model';
import type { JourneyMapModel } from '../types';
import {
  EMPTY_INSPECTOR_BUNDLE,
  type JourneyMapEvidenceSource,
  type JourneyMapInspectorBundle,
} from '../types-inspector';
import { applyTripConstraintsVersion } from '../lib/journey-map-trip-meta.util';

export interface UseJourneyMapDataResult {
  model: JourneyMapModel;
  /** 首屏 shell 加载中 */
  loading: boolean;
  /** 后台补充 inspector / 完整 coverage 中 */
  enriching: boolean;
  error: string | null;
  usingDemo: boolean;
  trip: TripDetail | null;
  itineraryItems: ItineraryItemDetail[];
  inspector: JourneyMapInspectorBundle;
  reload: () => void;
  /** 二段 inspector 加载完成（含失败） */
  inspectorReady: boolean;
  upsertActivityContext: (context: JourneyMapInspectorActivityContextDto) => void;
  appendDecisionItem: (item: JourneyMapDecisionItem) => void;
  applyConstraintsVersion: (version: number) => void;
}

interface ApplyModelInput {
  trip: TripDetail;
  coverage: CoverageMapResponse | null;
  itineraryItems: ItineraryItemDetail[];
  feasibilityScore: number | null;
  travelerCount?: number;
  bff?: JourneyMapBffProjection;
}

function pickBffProjection(payload?: JourneyMapResponse | null): JourneyMapBffProjection | undefined {
  if (!payload) return undefined;

  const hasEnrichment =
    payload.members != null ||
    payload.memberGroups != null ||
    payload.diversions != null ||
    payload.stats != null ||
    payload.dataFeeds != null ||
    payload.daySummaries != null;

  if (!hasEnrichment) return undefined;

  return {
    members: payload.members,
    memberGroups: payload.memberGroups,
    diversions: payload.diversions,
    stats: payload.stats,
    dataFeeds: payload.dataFeeds,
    daySummaries: payload.daySummaries,
  };
}

const shellCache = new Map<string, JourneyMapResponse>();
const etagCache = new Map<string, string>();

function applyJourneyMapModel(input: ApplyModelInput): {
  model: JourneyMapModel;
  usingDemo: boolean;
  mapError: string | null;
} {
  const built = buildJourneyMapModelFromApi({
    trip: input.trip,
    coverage: input.coverage,
    itineraryItems: input.itineraryItems,
    feasibilityScore: input.feasibilityScore,
    travelerCount: input.travelerCount,
    bff: input.bff,
  });

  if (isJourneyMapModelRenderable(built)) {
    return { model: built, usingDemo: false, mapError: null };
  }

  return {
    model: {
      ...ICELAND_DEMO,
      id: input.trip.id,
      tripTitle:
        input.trip.name?.trim() ||
        `${input.trip.destination} · ${input.trip.TripDay?.length ?? ''}天行程`,
      feasibilityScore: input.feasibilityScore ?? ICELAND_DEMO.feasibilityScore,
    },
    usingDemo: true,
    mapError: '行程地图数据尚未就绪，当前展示示例地图',
  };
}

function buildInspectorBundle(input: {
  coverage: CoverageMapResponse | null;
  inspector?: JourneyMapInspectorPayload | null;
  checkerResult?: PromiseSettledResult<Awaited<ReturnType<typeof decisionCheckerApi.get>>>;
  scorePayload?: Awaited<ReturnType<typeof readinessApi.getScoreBreakdown>> | null;
}): JourneyMapInspectorBundle {
  const { coverage, inspector, checkerResult, scorePayload } = input;

  if (inspector) {
    const evidenceSource: JourneyMapEvidenceSource = inspector.evidence ? 'bff' : coverage ? 'coverage' : 'none';
    return {
      evidence: inspector.evidence,
      evidenceSource,
      evidenceLoading: false,
      evidenceUnavailable: !inspector.evidence && !coverage,
      evidenceError: null,
      impact: inspector.impact,
      scoreRisks: inspector.scoreRisks ?? [],
      scoreFindings: inspector.scoreFindings ?? [],
      coverage,
      activityContexts: inspector.activityContexts,
      decisionItems: inspector.decisionItems,
    };
  }

  let evidence: DecisionCheckerEvidenceDto | null = null;
  let evidenceSource: JourneyMapEvidenceSource = 'none';
  let evidenceUnavailable = true;
  let evidenceError: string | null = null;
  let impact: DecisionCheckerImpactDto | null = null;

  if (checkerResult?.status === 'fulfilled') {
    evidence = checkerResult.value.evidence;
    impact = checkerResult.value.impact;
    evidenceSource = 'bff';
    evidenceUnavailable = false;
  } else if (
    checkerResult?.status === 'rejected' &&
    checkerResult.reason instanceof DecisionCheckerApiError &&
    checkerResult.reason.code === 'NOT_FOUND'
  ) {
    evidenceUnavailable = true;
    evidenceError = null;
  } else if (checkerResult?.status === 'rejected') {
    evidenceError =
      checkerResult.reason instanceof Error
        ? checkerResult.reason.message
        : '决策检查器加载失败';
  }

  if (!evidence && coverage) {
    evidenceSource = 'coverage';
    evidenceUnavailable = false;
  }

  return {
    evidence,
    evidenceSource,
    evidenceLoading: false,
    evidenceUnavailable,
    evidenceError,
    impact,
    scoreRisks: scorePayload?.risks ?? [],
    scoreFindings: scorePayload?.findings ?? [],
    coverage,
  };
}

function applyShellPayload(payload: JourneyMapResponse): {
  trip: TripDetail;
  coverage: CoverageMapResponse | null;
  items: ItineraryItemDetail[];
  feasibilityScore: number | null;
  travelerCount?: number;
  bff?: JourneyMapBffProjection;
} {
  return {
    trip: payload.trip,
    coverage: payload.coverage ?? null,
    items: payload.itineraryItems ?? [],
    feasibilityScore:
      payload.feasibilityScore != null ? Math.round(payload.feasibilityScore) : null,
    travelerCount: payload.travelerCount,
    bff: pickBffProjection(payload),
  };
}

async function fetchJourneyMapShell(
  tripId: string,
  forceRefresh: boolean,
): Promise<JourneyMapResponse> {
  const ifNoneMatch = forceRefresh ? undefined : etagCache.get(tripId);
  const result = await journeyMapApi.get(tripId, { fields: 'minimal', ifNoneMatch });

  if (result.status === 'not_modified') {
    const cached = shellCache.get(tripId);
    if (cached) return cached;
    const retry = await journeyMapApi.get(tripId, { fields: 'minimal' });
    if (retry.status !== 'ok') {
      throw new Error('全程地图缓存失效，请刷新重试');
    }
    shellCache.set(tripId, retry.data);
    if (retry.etag) etagCache.set(tripId, retry.etag);
    return retry.data;
  }

  shellCache.set(tripId, result.data);
  if (result.etag) etagCache.set(tripId, result.etag);
  return result.data;
}

async function fetchItineraryItemsLegacy(
  trip: TripDetail,
  forceRefresh: boolean,
): Promise<ItineraryItemDetail[]> {
  try {
    return await itineraryItemsApi.getByTrip(trip.id);
  } catch (err) {
    if (!isJourneyMapNotFound(err)) throw err;
  }

  if (!trip.TripDay?.length) return [];

  const results = await Promise.allSettled(
    trip.TripDay.map((day) => itineraryItemsApi.getAll(day.id, forceRefresh)),
  );

  const items: ItineraryItemDetail[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      items.push(...result.value);
    }
  }
  return items;
}

export function useJourneyMapData(tripId: string | null): UseJourneyMapDataResult {
  const [model, setModel] = useState<JourneyMapModel>(ICELAND_DEMO);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItemDetail[]>([]);
  const [loading, setLoading] = useState(Boolean(tripId));
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(!tripId);
  const [inspector, setInspector] = useState<JourneyMapInspectorBundle>(EMPTY_INSPECTOR_BUNDLE);
  const [inspectorReady, setInspectorReady] = useState(!tripId);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  const upsertActivityContext = useCallback((context: JourneyMapInspectorActivityContextDto) => {
    setInspector((prev) => {
      const list = prev.activityContexts ?? [];
      const has = list.some((c) => c.activityId === context.activityId);
      return {
        ...prev,
        activityContexts: has
          ? list.map((c) => (c.activityId === context.activityId ? context : c))
          : [...list, context],
      };
    });
  }, []);

  const appendDecisionItem = useCallback((item: JourneyMapDecisionItem) => {
    setInspector((prev) => ({
      ...prev,
      decisionItems: [...(prev.decisionItems ?? []), item],
    }));
  }, []);

  const applyConstraintsVersion = useCallback((version: number) => {
    setTrip((prev) => applyTripConstraintsVersion(prev, version) ?? prev);
  }, []);

  useEffect(() => {
    if (!tripId) {
      setModel(ICELAND_DEMO);
      setTrip(null);
      setItineraryItems([]);
      setUsingDemo(true);
      setLoading(false);
      setEnriching(false);
      setError(null);
      setInspector({ ...EMPTY_INSPECTOR_BUNDLE, evidenceSource: 'demo' });
      setInspectorReady(true);
      return;
    }

    setInspectorReady(false);

    let cancelled = false;

    async function loadInspectorBff(
      id: string,
      shell: ReturnType<typeof applyShellPayload>,
    ) {
      setEnriching(true);
      setInspector((prev) => ({
        ...prev,
        evidenceLoading: true,
      }));

      try {
        const result = await journeyMapApi.get(id, {
          include: 'inspector',
          fields: 'full',
        });

        if (cancelled) return;

        if (result.status !== 'ok') return;

        const payload = result.data;
        const coverage = payload.coverage ?? shell.coverage;
        const { model: nextModel, usingDemo: nextUsingDemo, mapError } = applyJourneyMapModel({
          trip: shell.trip,
          coverage,
          itineraryItems: payload.itineraryItems?.length
            ? payload.itineraryItems
            : shell.items,
          feasibilityScore:
            payload.feasibilityScore != null
              ? Math.round(payload.feasibilityScore)
              : shell.feasibilityScore,
          travelerCount: payload.travelerCount ?? shell.travelerCount,
          bff: pickBffProjection(payload) ?? shell.bff,
        });

        if (payload.itineraryItems?.length) {
          setItineraryItems(payload.itineraryItems);
        }
        setModel(nextModel);
        setUsingDemo(nextUsingDemo);
        setError(mapError);
        setInspector(
          buildInspectorBundle({
            coverage,
            inspector: payload.inspector,
          }),
        );
      } catch (err) {
        if (cancelled) return;
        console.error('[useJourneyMapData] inspector BFF', err);
        setInspector((prev) => ({
          ...prev,
          evidenceLoading: false,
          evidenceError: err instanceof Error ? err.message : '证据数据加载失败',
        }));
      } finally {
        if (!cancelled) {
          setEnriching(false);
          setInspectorReady(true);
        }
      }
    }

    async function loadLegacyEnrichment(
      id: string,
      tripData: TripDetail,
      coverage: CoverageMapResponse | null,
      shell: ReturnType<typeof applyShellPayload>,
      forceRefresh: boolean,
    ) {
      setEnriching(true);
      setInspector((prev) => ({
        ...prev,
        coverage,
        evidenceLoading: true,
        evidenceSource: coverage ? 'coverage' : prev.evidenceSource,
        evidenceUnavailable: !coverage,
      }));

      try {
        const [itemsResult, scoreResult, collaboratorsResult, checkerResult] =
          await Promise.allSettled([
            fetchItineraryItemsLegacy(tripData, forceRefresh),
            readinessApi.getScoreBreakdown(id),
            tripsApi.getCollaborators(id),
            decisionCheckerApi.get(id),
          ]);

        if (cancelled) return;

        const items = itemsResult.status === 'fulfilled' ? itemsResult.value : shell.items;
        const scorePayload = scoreResult.status === 'fulfilled' ? scoreResult.value : null;
        const feasibilityScore =
          scorePayload != null
            ? Math.round(scorePayload.score?.overall ?? 0)
            : shell.feasibilityScore;
        const travelerCount =
          collaboratorsResult.status === 'fulfilled'
            ? Math.max(1, collaboratorsResult.value.length + 1)
            : shell.travelerCount;

        setItineraryItems(items);

        const { model: nextModel, usingDemo: nextUsingDemo, mapError } = applyJourneyMapModel({
          trip: tripData,
          coverage,
          itineraryItems: items,
          feasibilityScore,
          travelerCount,
        });

        setModel(nextModel);
        setUsingDemo(nextUsingDemo);
        setError(mapError);
        setInspector(
          buildInspectorBundle({
            coverage,
            checkerResult,
            scorePayload,
          }),
        );
      } catch (err) {
        if (cancelled) return;
        console.error('[useJourneyMapData] legacy enrichment', err);
        setInspector((prev) => ({
          ...prev,
          evidenceLoading: false,
          evidenceError: err instanceof Error ? err.message : '补充数据加载失败',
        }));
      } finally {
        if (!cancelled) {
          setEnriching(false);
          setInspectorReady(true);
        }
      }
    }

    async function loadLegacyShell(id: string): Promise<{
      tripData: TripDetail;
      coverage: CoverageMapResponse | null;
    }> {
      const [tripResult, coverageResult] = await Promise.allSettled([
        tripsApi.getById(id),
        readinessApi.getCoverageMapData(id),
      ]);

      if (tripResult.status === 'rejected') {
        throw tripResult.reason;
      }

      return {
        tripData: tripResult.value,
        coverage: coverageResult.status === 'fulfilled' ? coverageResult.value : null,
      };
    }

    async function load() {
      const id = tripId;
      if (!id) return;

      const forceRefresh = reloadToken > 0;

      setLoading(true);
      setEnriching(false);
      setError(null);
      setItineraryItems([]);
      setInspector({ ...EMPTY_INSPECTOR_BUNDLE, evidenceLoading: true });

      let shell: ReturnType<typeof applyShellPayload>;
      let useBff = true;

      try {
        const payload = await fetchJourneyMapShell(id, forceRefresh);
        if (cancelled) return;

        shell = applyShellPayload(payload);
        setTrip(shell.trip);
        setItineraryItems(shell.items);

        const applied = applyJourneyMapModel({
          trip: shell.trip,
          coverage: shell.coverage,
          itineraryItems: shell.items,
          feasibilityScore: shell.feasibilityScore,
          travelerCount: shell.travelerCount,
          bff: shell.bff,
        });

        setModel(applied.model);
        setUsingDemo(applied.usingDemo);
        setError(applied.mapError);
        setInspector({
          ...EMPTY_INSPECTOR_BUNDLE,
          coverage: shell.coverage,
          evidenceSource: shell.coverage ? 'coverage' : 'none',
          evidenceLoading: true,
          evidenceUnavailable: !shell.coverage,
        });
      } catch (err) {
        if (!isJourneyMapNotFound(err)) {
          if (cancelled) return;
          console.error('[useJourneyMapData]', err);
          setModel(ICELAND_DEMO);
          setTrip(null);
          setUsingDemo(true);
          setItineraryItems([]);
          setError(err instanceof Error ? err.message : '加载行程地图失败');
          setInspector({ ...EMPTY_INSPECTOR_BUNDLE, evidenceSource: 'demo' });
          setInspectorReady(true);
          return;
        }

        useBff = false;
        try {
          const { tripData, coverage } = await loadLegacyShell(id);
          if (cancelled) return;

          shell = {
            trip: tripData,
            coverage,
            items: [],
            feasibilityScore: null,
            travelerCount: undefined,
            bff: undefined,
          };

          setTrip(tripData);

          const applied = applyJourneyMapModel({
            trip: tripData,
            coverage,
            itineraryItems: [],
            feasibilityScore: null,
          });

          setModel(applied.model);
          setUsingDemo(applied.usingDemo);
          setError(applied.mapError);
          setInspector({
            ...EMPTY_INSPECTOR_BUNDLE,
            coverage,
            evidenceSource: coverage ? 'coverage' : 'none',
            evidenceLoading: true,
            evidenceUnavailable: !coverage,
          });
        } catch (legacyErr) {
          if (cancelled) return;
          console.error('[useJourneyMapData] legacy shell', legacyErr);
          setModel(ICELAND_DEMO);
          setTrip(null);
          setUsingDemo(true);
          setItineraryItems([]);
          setError(legacyErr instanceof Error ? legacyErr.message : '加载行程地图失败');
          setInspector({ ...EMPTY_INSPECTOR_BUNDLE, evidenceSource: 'demo' });
          setInspectorReady(true);
          return;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (cancelled) return;

      if (useBff) {
        void loadInspectorBff(id, shell!);
      } else {
        void loadLegacyEnrichment(id, shell!.trip, shell!.coverage, shell!, forceRefresh);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [tripId, reloadToken]);

  return {
    model,
    loading,
    enriching,
    error,
    usingDemo,
    trip,
    itineraryItems,
    inspector,
    reload,
    inspectorReady,
    upsertActivityContext,
    appendDecisionItem,
    applyConstraintsVersion,
  };
}
