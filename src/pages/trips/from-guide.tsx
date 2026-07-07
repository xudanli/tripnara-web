/**
 * 从攻略开始规划 — Guide-to-Plan Pipeline
 * 对接 /api/guide-to-plan；后端不可用时降级旧 mock 流程
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Sparkles, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  extractApiErrorMessage,
  guideToPlanApi,
  isAcceptReviewResponse,
  isGuideToPlanUnavailable,
  mergePlanCandidates,
  subscribeParseProgress,
  waitForParseComplete,
} from '@/api/guide-to-plan';
import { guidesApi } from '@/api/guides';
import { tripsApi } from '@/api/trips';
import { buildNlPromptFromGuide } from '@/lib/guide-import-mock';
import {
  isParsingPreviewMode,
  PARSING_PREVIEW_SOURCES,
  PARSING_PREVIEW_SUMMARY,
  PARSING_PREVIEW_TAGS,
} from '@/lib/guide-parsing-preview';
import { estimateExtractionFromSources, getGuideDisplayTitle } from '@/lib/guide-source-display';
import { resolveGuideSessionCountryCode } from '@/lib/guide-session-country';
import {
  checkSessionCanGenerate,
  extractUnderstandingMeta,
  isTripResumeRoute,
  legacyCandidateToDetail,
  parseStepToProgressPercent,
  parseStepToPipelineIndex,
  planCandidateViewToUi,
  resolveSessionFlowStep,
  sessionCanImport,
  sessionCanParse,
  sessionBlocksParse,
  sessionCanAcceptDraft,
  sourcesFromSession,
  tripContextFromApi,
  tripContextPartialToApi,
  tripContextToApi,
  understandingToBundleSummary,
  validateGuideTextContent,
  type GuideToPlanFlowStep,
  type UnderstandingUiMeta,
} from '@/lib/guide-to-plan-mapper';
import type {
  GuideBundleSummary,
  GuideSource,
  GuideTripContext,
  ImportedGuide,
  PlanCandidate,
} from '@/types/guide-import';
import type {
  AcceptPlanMode,
  GeneratePlanResponse,
  GuideParseProgressView,
  GuidePlanCandidateDetailView,
  GuideToPlanSessionStatus,
  ImportPreviewView,
  PlanReviewItem,
  UnderstandingPlaceView,
} from '@/types/guide-to-plan-api';
import type { GuideImportPayload } from '@/components/guide-import/GuideImportInputPanel';
import { GuideImportInputPanel } from '@/components/guide-import/GuideImportInputPanel';
import {
  GuideSourceList,
  GuideExtractionPreview,
  GuideImportSidebar,
} from '@/components/guide-import/GuideSourceList';
import { GuideParsingProgress } from '@/components/guide-import/GuideParsingProgress';
import {
  GuideUnderstandingIntro,
  GuideUnderstandingSummary,
} from '@/components/guide-import/GuideUnderstandingSummary';
import { GuideTripContextForm } from '@/components/guide-import/GuideTripContextForm';
import { GuideDraftResultView } from '@/components/guide-import/GuideDraftResultView';
import { GuideComparisonView } from '@/components/guide-import/GuideComparisonView';
import { GuideReviewItemsView } from '@/components/guide-import/GuideReviewItemsView';
import { LogoLoading } from '@/components/common/LogoLoading';
import {
  GuideImportFooterActions,
  GuideImportSectionHeader,
  GuideImportTwoColumn,
  guideImportPrimaryButtonClass,
  guideImportUi,
} from '@/components/guide-import/guide-import-ui';
import { TripCreationFlowShell } from '@/components/guide-import/TripCreationFlowShell';
import { GUIDE_FLOW_STEPS } from '@/components/guide-import/GuideFlowStepper';

type FlowStep = GuideToPlanFlowStep;

const STEP_HEADER: Record<FlowStep, { title: string; subtitle?: string; showInBar: boolean }> = {
  import: {
    title: '从攻略开始规划',
    subtitle: '支持链接、截图、文字或文件导入，多篇攻略会自动合并理解',
    showInBar: true,
  },
  parsing: {
    title: '正在理解你的攻略',
    subtitle: '提取地点、经验、风险与可执行条件',
    showInBar: true,
  },
  summary: {
    title: '我已经整理出这些灵感',
    subtitle: '确认理解结果，并补充出行关键条件',
    showInBar: true,
  },
  draft: {
    title: '行程草案',
    subtitle: '尚未完成全部约束验证，进入规划工作台后可继续审议',
    showInBar: true,
  },
  compare: {
    title: '原攻略与 TripNARA 调整对比',
    showInBar: true,
  },
  review: {
    title: '逐项确认调整',
    subtitle: '勾选要纳入正式行程的调整项',
    showInBar: true,
  },
};

function newLocalSourceId(): string {
  return `guide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function payloadToLocalSource(payload: GuideImportPayload): GuideSource {
  const addedAt = new Date().toISOString();
  switch (payload.kind) {
    case 'link':
      return { id: newLocalSourceId(), type: 'link', url: payload.url, addedAt };
    case 'text':
      return { id: newLocalSourceId(), type: 'text', rawText: payload.content, addedAt };
    case 'screenshot':
      return {
        id: newLocalSourceId(),
        type: 'screenshot',
        title: payload.title,
        imagePreviewUrl: URL.createObjectURL(payload.file),
        addedAt,
      };
    case 'file':
      return {
        id: newLocalSourceId(),
        type: 'file',
        title: payload.title ?? payload.file.name,
        addedAt,
      };
  }
}

export default function FromGuidePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionCountryCode, setSessionCountryCode] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<GuideToPlanSessionStatus | null>(null);
  const [sessionResumeRoute, setSessionResumeRoute] = useState<string | null>(null);
  const [useLegacyFlow, setUseLegacyFlow] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const [step, setStep] = useState<FlowStep>('import');
  const [sources, setSources] = useState<GuideSource[]>([]);
  const [parsedGuides, setParsedGuides] = useState<ImportedGuide[]>([]);
  const [summary, setSummary] = useState<GuideBundleSummary | null>(null);
  const [tripContext, setTripContext] = useState<GuideTripContext>({});
  const [candidate, setCandidate] = useState<PlanCandidate | null>(null);
  const [planDetail, setPlanDetail] = useState<GuidePlanCandidateDetailView | null>(null);
  const [planCandidates, setPlanCandidates] = useState<GuidePlanCandidateDetailView[]>([]);
  const [loadingPlanDetail, setLoadingPlanDetail] = useState(false);
  const [understandingMeta, setUnderstandingMeta] = useState<UnderstandingUiMeta>({
    pendingConfirmations: [],
    requiresTravelContext: false,
    parseRequired: false,
    parsedGuideCount: 0,
    inspirationCandidateCount: 0,
  });
  const [parseProgress, setParseProgress] = useState(0);
  const [parseStepIndex, setParseStepIndex] = useState<number | undefined>();
  const [parseStepLabel, setParseStepLabel] = useState<string | undefined>();
  const [parseEtaSec, setParseEtaSec] = useState<number | undefined>();
  const [parseError, setParseError] = useState<string | null>(null);
  const [recognizedTags, setRecognizedTags] = useState<string[]>([]);
  const [understandingPlaces, setUnderstandingPlaces] = useState<UnderstandingPlaceView[]>([]);
  const [importPreview, setImportPreview] = useState<ImportPreviewView | null>(null);
  const [generating, setGenerating] = useState(false);
  const [expandingVariants, setExpandingVariants] = useState(false);
  const variantExpandAttemptedRef = useRef(false);
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [reviewItems, setReviewItems] = useState<PlanReviewItem[]>([]);
  const [loadingReviewItems, setLoadingReviewItems] = useState(false);
  const [placeActionPendingId, setPlaceActionPendingId] = useState<string | null>(null);
  const [rematchingPlaces, setRematchingPlaces] = useState(false);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const parseAbortRef = useRef<AbortController | null>(null);
  const travelContextPatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const travelContextFocus =
    sessionResumeRoute === 'travel_context' || sessionResumeRoute === 'travel-context';

  const applyUnderstanding = useCallback((view: Awaited<ReturnType<typeof guideToPlanApi.getUnderstanding>>) => {
    setUnderstandingMeta(extractUnderstandingMeta(view));
    setUnderstandingPlaces(view.places ?? []);
    setSummary(understandingToBundleSummary(view));
    setTripContext((prev) => ({
      ...prev,
      destination: prev.destination ?? undefined,
    }));
  }, []);

  const refreshUnderstanding = useCallback(
    async (sid: string) => {
      const understanding = await guideToPlanApi.getUnderstanding(sid);
      applyUnderstanding(understanding);
    },
    [applyUnderstanding],
  );

  const resolveCountryCodeForSession = useCallback(
    () =>
      resolveGuideSessionCountryCode({
        tripContext,
        sessionCountryCode,
        destinationHint: summary?.destinationHint,
        sourceTexts: sources.map((s) => getGuideDisplayTitle(s)),
      }),
    [tripContext, sessionCountryCode, summary?.destinationHint, sources],
  );

  const ensureCountryCodeOnSession = useCallback(
    async (sid: string) => {
      const code = resolveCountryCodeForSession();
      if (!code) return;
      await guideToPlanApi.patchTravelContext(sid, { countryCode: code });
      setSessionCountryCode(code);
      setTripContext((prev) => ({ ...prev, countryCode: prev.countryCode ?? code }));
    },
    [resolveCountryCodeForSession],
  );

  const handleBindPlace = useCallback(
    async (candidateId: string, placeId: number) => {
      if (!sessionId || useLegacyFlow) return;
      setPlaceActionPendingId(candidateId);
      try {
        await guideToPlanApi.patchPlaceCandidate(sessionId, candidateId, { placeId });
        await refreshUnderstanding(sessionId);
        toast.success('已绑定 POI');
      } catch (err) {
        toast.error(extractApiErrorMessage(err));
        throw err;
      } finally {
        setPlaceActionPendingId(null);
      }
    },
    [sessionId, useLegacyFlow, refreshUnderstanding],
  );

  const handleRejectPlace = useCallback(
    async (candidateId: string) => {
      if (!sessionId || useLegacyFlow) return;
      setPlaceActionPendingId(candidateId);
      try {
        await guideToPlanApi.patchPlaceCandidate(sessionId, candidateId, { matchStatus: 'rejected' });
        await refreshUnderstanding(sessionId);
        toast.success('已标记为无需匹配');
      } catch (err) {
        toast.error(extractApiErrorMessage(err));
      } finally {
        setPlaceActionPendingId(null);
      }
    },
    [sessionId, useLegacyFlow, refreshUnderstanding],
  );

  const handleRematchPlaces = useCallback(async () => {
    if (!sessionId || useLegacyFlow) return;
    setRematchingPlaces(true);
    try {
      const code = resolveCountryCodeForSession();
      const result = await guideToPlanApi.rematchPlaces(
        sessionId,
        code ? { countryCode: code } : {},
      );
      await refreshUnderstanding(sessionId);
      toast.success(
        `重新匹配完成：${result.matched}/${result.attempted} 成功，仍有 ${result.stillUnmatched} 个待处理`,
      );
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setRematchingPlaces(false);
    }
  }, [sessionId, useLegacyFlow, resolveCountryCodeForSession, refreshUnderstanding]);

  const loadPlanDetail = useCallback(
    async (candidateId: string) => {
      if (!sessionId || useLegacyFlow) return;
      setLoadingPlanDetail(true);
      try {
        const detail = await guideToPlanApi.getPlanCandidate(sessionId, candidateId);
        setPlanDetail(detail);
        setCandidate(planCandidateViewToUi(detail, sources.map((s) => s.id)));
      } catch (err) {
        toast.error(extractApiErrorMessage(err));
      } finally {
        setLoadingPlanDetail(false);
      }
    },
    [sessionId, useLegacyFlow, sources],
  );

  const syncPlanCandidates = useCallback(
    async (generated?: GeneratePlanResponse) => {
      if (!sessionId || useLegacyFlow) return;
      const remote = await guideToPlanApi.getPlanCandidates(sessionId);
      const merged = mergePlanCandidates(
        remote,
        generated?.candidates,
        generated?.candidate ? [generated.candidate] : undefined,
      );
      setPlanCandidates(merged);
      const preferred = generated?.candidate;
      const pick =
        merged.find((c) => c.id === preferred?.id) ??
        merged.find((c) => c.recommended) ??
        merged[0];
      if (pick) {
        const detail =
          pick.id === preferred?.id && preferred?.comparisonDiff
            ? preferred
            : await guideToPlanApi.getPlanCandidate(sessionId, pick.id);
        setPlanDetail(detail);
        setCandidate(planCandidateViewToUi(detail, sources.map((s) => s.id)));
      }
      return merged;
    },
    [sessionId, useLegacyFlow, sources],
  );

  const expandMissingPlanVariants = useCallback(async () => {
    if (!sessionId || useLegacyFlow) return;
    setExpandingVariants(true);
    try {
      const expanded = await guideToPlanApi.expandMissingPlanVariants(sessionId, planCandidates);
      if (expanded.length > 0) {
        setPlanCandidates(expanded);
      }
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setExpandingVariants(false);
    }
  }, [sessionId, useLegacyFlow, planCandidates]);
  const estimate = estimateExtractionFromSources(sources);
  const header = useMemo(() => {
    if (step === 'summary' && travelContextFocus) {
      return {
        title: '完善出行条件',
        subtitle: '请补充影响草案生成的关键信息',
        showInBar: true,
      };
    }
    return STEP_HEADER[step];
  }, [step, travelContextFocus]);

  useEffect(() => {
    if (step !== 'draft') {
      variantExpandAttemptedRef.current = false;
      return;
    }
    if (useLegacyFlow || !sessionId || planCandidates.length >= 3) return;
    if (variantExpandAttemptedRef.current) return;
    variantExpandAttemptedRef.current = true;
    void expandMissingPlanVariants();
  }, [step, useLegacyFlow, sessionId, planCandidates.length, expandMissingPlanVariants]);

  const isPipelineBusy =
    step === 'parsing' ||
    generating ||
    sessionStatus === 'parsing' ||
    sessionStatus === 'generating';

  const importBlocked =
    !useLegacyFlow &&
    (sessionStatus != null ? !sessionCanImport(sessionStatus) : isPipelineBusy);

  const parseBlocked =
    !useLegacyFlow
      ? !sessionCanParse(sessionStatus ?? 'collecting', sources.length) ||
        step === 'parsing' ||
        generating
      : sources.length === 0 || step === 'parsing';

  const canAcceptDraft = useLegacyFlow || sessionCanAcceptDraft(sessionStatus ?? '');

  const generateGuard = useMemo(() => {
    if (useLegacyFlow) return { allowed: true as const };
    return checkSessionCanGenerate({
      status: sessionStatus ?? '',
      parseRequired: understandingMeta.parseRequired,
      parsedGuideCount: understandingMeta.parsedGuideCount,
      inspirationCandidateCount: understandingMeta.inspirationCandidateCount,
      pendingConfirmations: understandingMeta.pendingConfirmations,
      tripContext,
    });
  }, [
    useLegacyFlow,
    sessionStatus,
    understandingMeta.parseRequired,
    understandingMeta.parsedGuideCount,
    understandingMeta.inspirationCandidateCount,
    understandingMeta.pendingConfirmations,
    tripContext,
  ]);

  const canGenerateDraft = useLegacyFlow || generateGuard.allowed;

  const syncSessionMeta = useCallback(
    (session: {
      status: GuideToPlanSessionStatus;
      resumeRoute?: string | null;
      countryCode?: string | null;
      travelContext?: { countryCode?: string | null } | null;
    }) => {
      setSessionStatus(session.status);
      setSessionResumeRoute(session.resumeRoute ?? null);
      const code =
        session.travelContext?.countryCode?.trim().toUpperCase() ||
        session.countryCode?.trim().toUpperCase() ||
        null;
      if (code) {
        setSessionCountryCode(code);
        setTripContext((prev) => ({ ...prev, countryCode: prev.countryCode ?? code }));
      }
    },
    [],
  );

  const stopProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const applyParseProgress = useCallback((p: GuideParseProgressView) => {
    setParseProgress(parseStepToProgressPercent(p.currentStep, p.progress));
    setParseStepIndex(parseStepToPipelineIndex(p.currentStep));
    setParseStepLabel(p.currentStepLabel);
    setParseEtaSec(p.estimatedSecondsRemaining);
    setRecognizedTags(p.recognizedTags ?? []);
    if (p.counts) {
      setSummary((prev) => {
        const base = prev ?? understandingToBundleSummary({
          sessionId: sessionId ?? '',
          status: 'parsing',
          summary: {
            guideCount: sources.length,
            placeCount: 0,
            restaurantCount: 0,
            hotelAreaCount: 0,
            tipCount: 0,
            riskCount: 0,
            unmatchedPlaceCount: 0,
            potentialIssues: [],
          },
          places: [],
        });
        return {
          ...base,
          stats: {
            placeCount: p.counts.places,
            restaurantCount: p.counts.restaurants,
            accommodationCount: p.counts.hotels,
            tipCount: p.counts.tips,
            riskCount: p.counts.risks,
          },
        };
      });
    }
  }, [sessionId, sources.length]);

  const loadPlanCandidatesForSession = useCallback(async (id: string, guideIds: string[]) => {
    const candidates = await guideToPlanApi.getPlanCandidates(id);
    if (candidates.length === 0) return;
    setPlanCandidates(candidates);
    const pick = candidates.find((c) => c.recommended) ?? candidates[0];
    const detail = await guideToPlanApi.getPlanCandidate(id, pick.id);
    setPlanDetail(detail);
    setCandidate(planCandidateViewToUi(detail, guideIds));
  }, []);

  const handleParseFailure = useCallback(async (sid: string, error?: string | null) => {
    const msg = error?.trim() || '攻略解析失败';
    setParseError(msg);
    toast.error(msg);
    try {
      const session = await guideToPlanApi.getSession(sid);
      syncSessionMeta(session);
      setSources(sourcesFromSession(session.importedGuides));
      if (session.parseProgress?.error) {
        setParseError(session.parseProgress.error);
      }
      const nextStep = resolveSessionFlowStep(session) ?? 'import';
      setStep(nextStep);
    } catch {
      setStep('import');
    }
  }, [syncSessionMeta]);

  const finishParseSuccess = useCallback(async (sid: string) => {
    const understanding = await guideToPlanApi.getUnderstanding(sid);
    applyUnderstanding(understanding);
    setParseProgress(100);
    setParseError(null);
    try {
      const session = await guideToPlanApi.getSession(sid);
      syncSessionMeta(session);
    } catch {
      // 会话元数据刷新失败不阻塞进入摘要
    }
    setStep('summary');
  }, [applyUnderstanding, syncSessionMeta]);

  const waitForParseJob = useCallback(
    async (sid: string, signal: AbortSignal): Promise<GuideParseProgressView> => {
      let lastProgress: GuideParseProgressView | null = null;
      const trackProgress = (p: GuideParseProgressView) => {
        lastProgress = p;
        applyParseProgress(p);
      };

      try {
        await subscribeParseProgress(sid, trackProgress, { signal });
      } catch {
        if (!signal.aborted) {
          lastProgress = await waitForParseComplete(sid, trackProgress, { signal });
        }
      }

      if (!lastProgress) {
        throw new Error('解析无响应');
      }
      return lastProgress;
    },
    [applyParseProgress],
  );

  const resumeActiveParse = useCallback(
    async (sid: string) => {
      parseAbortRef.current?.abort();
      const abort = new AbortController();
      parseAbortRef.current = abort;

      try {
        const status = await guideToPlanApi.getParseStatus(sid);
        applyParseProgress(status);

        if (status.status === 'failed') {
          await handleParseFailure(sid, status.error);
          return;
        }
        if (status.status === 'completed') {
          await finishParseSuccess(sid);
          return;
        }

        const finalProgress = await waitForParseJob(sid, abort.signal);
        if (abort.signal.aborted) return;

        if (finalProgress.status === 'failed') {
          await handleParseFailure(sid, finalProgress.error);
          return;
        }

        await finishParseSuccess(sid);
      } catch (err) {
        if (!abort.signal.aborted) {
          toast.error(extractApiErrorMessage(err));
          setStep('import');
        }
      }
    },
    [applyParseProgress, finishParseSuccess, handleParseFailure, waitForParseJob],
  );

  const applySessionResume = useCallback(
    async (session: Awaited<ReturnType<typeof guideToPlanApi.getSession>>, isCancelled?: () => boolean) => {
      if (isCancelled?.()) return;

      syncSessionMeta(session);

      if (
        (session.status === 'accepted' && session.tripId) ||
        isTripResumeRoute(session.resumeRoute)
      ) {
        if (session.tripId) {
          navigate(`/dashboard/plan-studio?tripId=${session.tripId}&source=guide_import`);
        }
        return;
      }

      if (session.status === 'abandoned') {
        toast.info('该导入会话已放弃，可重新添加攻略');
        setStep('import');
        return;
      }

      if (session.parseProgress?.status === 'failed' && session.parseProgress.error) {
        setParseError(session.parseProgress.error);
      }

      const restored = resolveSessionFlowStep(session);
      if (restored) setStep(restored);

      const guideIds = session.importedGuides.map((g) => g.id);

      if (
        restored === 'summary' ||
        restored === 'draft' ||
        restored === 'compare' ||
        restored === 'review'
      ) {
        try {
          const understanding = await guideToPlanApi.getUnderstanding(session.id);
          if (!isCancelled?.()) applyUnderstanding(understanding);
        } catch {
          // 理解结果尚未就绪
        }
      }

      if (restored === 'draft' || restored === 'compare' || restored === 'review') {
        try {
          if (!isCancelled?.()) await loadPlanCandidatesForSession(session.id, guideIds);
        } catch {
          // 草案尚未就绪
        }
      }

      if (restored === 'parsing' && !isCancelled?.()) {
        void resumeActiveParse(session.id);
      }
    },
    [applyUnderstanding, loadPlanCandidatesForSession, navigate, resumeActiveParse, syncSessionMeta],
  );

  const handleTripContextPatch = useCallback(
    (partial: Partial<GuideTripContext>) => {
      if (!sessionId || useLegacyFlow) return;
      const apiPartial = tripContextPartialToApi(partial);
      if (Object.keys(apiPartial).length === 0) return;

      if (travelContextPatchTimerRef.current) {
        clearTimeout(travelContextPatchTimerRef.current);
      }
      travelContextPatchTimerRef.current = setTimeout(() => {
        void (async () => {
          try {
            await guideToPlanApi.patchTravelContext(sessionId, apiPartial);
            if ('countryCode' in apiPartial && apiPartial.countryCode) {
              setSessionCountryCode(String(apiPartial.countryCode).toUpperCase());
            }
            await refreshUnderstanding(sessionId);
          } catch (err) {
            toast.error(extractApiErrorMessage(err));
          }
        })();
      }, 400);
    },
    [sessionId, useLegacyFlow, refreshUnderstanding],
  );

  const refreshSession = useCallback(
    async (id: string) => {
      const session = await guideToPlanApi.getSession(id);
      syncSessionMeta(session);
      setSources(sourcesFromSession(session.importedGuides));
      if (session.travelContext) {
        setTripContext(tripContextFromApi(session.travelContext));
      }
      await applySessionResume(session);
      return session;
    },
    [applySessionResume, syncSessionMeta],
  );

  useEffect(() => () => {
    stopProgressTimer();
    parseAbortRef.current?.abort();
    if (travelContextPatchTimerRef.current) {
      clearTimeout(travelContextPatchTimerRef.current);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const existingId = searchParams.get('sessionId');

    (async () => {
      if (isParsingPreviewMode(searchParams)) {
        setUseLegacyFlow(true);
        setSessionLoading(false);
        setStep('parsing');
        setParseProgress(68);
        setParseStepIndex(2);
        setParseStepLabel('路线识别');
        setParseEtaSec(20);
        setSources(PARSING_PREVIEW_SOURCES);
        setSummary(PARSING_PREVIEW_SUMMARY);
        setRecognizedTags(PARSING_PREVIEW_TAGS);
        return;
      }

      try {
        if (existingId) {
          const session = await guideToPlanApi.getSession(existingId);
          if (cancelled) return;
          setSessionId(session.id);
          syncSessionMeta(session);
          setSources(sourcesFromSession(session.importedGuides));
          if (session.travelContext) {
            setTripContext(tripContextFromApi(session.travelContext));
          }
          // 先结束全屏 loading，理解/草案数据在后台 hydrate
          setSessionLoading(false);
          await applySessionResume(session, () => cancelled);
        } else {
          const bootstrapCountry = resolveGuideSessionCountryCode({});
          const session = await guideToPlanApi.createSession(
            bootstrapCountry ? { countryCode: bootstrapCountry } : {},
          );
          if (cancelled) return;
          setSessionId(session.id);
          syncSessionMeta(session);
          setSearchParams({ sessionId: session.id }, { replace: true });
          setSessionLoading(false);
        }
      } catch (err) {
        if (!cancelled && isGuideToPlanUnavailable(err)) {
          setUseLegacyFlow(true);
          setSessionLoading(false);
        } else if (!cancelled) {
          toast.error(extractApiErrorMessage(err));
          setSessionLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // 仅 mount 时初始化；勿用 sessionInitRef（StrictMode 下会卡死 loading）
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once session bootstrap
  }, []);

  useEffect(() => {
    if (!sessionId || useLegacyFlow) return;
    guideToPlanApi
      .getImportPreview(sessionId)
      .then(setImportPreview)
      .catch(() => setImportPreview(null));
  }, [sessionId, sources.length, useLegacyFlow]);

  const handleImport = useCallback(
    async (payload: GuideImportPayload) => {
      if (useLegacyFlow) {
        setSources((prev) => [...prev, payloadToLocalSource(payload)]);
        toast.success('已添加攻略');
        return;
      }
      if (!sessionId) return;

      if (importBlocked) {
        toast.error('解析或生成进行中，请稍后再导入');
        return;
      }

      if (payload.kind === 'text') {
        const contentErr = validateGuideTextContent(payload.content);
        if (contentErr) {
          toast.error(contentErr);
          return;
        }
      }

      if (payload.kind === 'file' && payload.file.name.toLowerCase().endsWith('.txt')) {
        try {
          const text = await payload.file.text();
          const contentErr = validateGuideTextContent(text);
          if (contentErr) {
            toast.error(contentErr);
            return;
          }
        } catch {
          // 无法预读时交由后端校验
        }
      }

      setImporting(true);
      try {
        switch (payload.kind) {
          case 'link':
            await guideToPlanApi.importGuide(sessionId, {
              sourceType: 'link',
              sourceUrl: payload.url,
            });
            break;
          case 'text':
            await guideToPlanApi.importGuide(sessionId, {
              sourceType: 'text',
              content: payload.content,
              title: payload.title,
            });
            break;
          case 'screenshot':
            await guideToPlanApi.importScreenshot(sessionId, payload.file, payload.title);
            break;
          case 'file':
            await guideToPlanApi.importFile(sessionId, payload.file, payload.title);
            break;
        }
        await refreshSession(sessionId);
        toast.success('已添加攻略');
      } catch (err) {
        toast.error(extractApiErrorMessage(err));
        throw err;
      } finally {
        setImporting(false);
      }
    },
    [sessionId, useLegacyFlow, refreshSession, importBlocked],
  );

  const handleRemoveSource = useCallback(
    async (id: string) => {
      if (useLegacyFlow) {
        setSources((prev) => prev.filter((s) => s.id !== id));
        return;
      }
      if (!sessionId) return;
      if (importBlocked) {
        toast.error('解析或生成进行中，请稍后再删除');
        return;
      }
      try {
        await guideToPlanApi.deleteGuide(sessionId, id);
        await refreshSession(sessionId);
      } catch (err) {
        toast.error(extractApiErrorMessage(err));
      }
    },
    [sessionId, useLegacyFlow, refreshSession, importBlocked],
  );

  const runLegacyParse = async () => {
    setStep('parsing');
    setParseProgress(5);
    stopProgressTimer();
    progressTimerRef.current = setInterval(() => {
      setParseProgress((p) => (p >= 92 ? p : p + 4));
    }, 350);

    try {
      const guides: ImportedGuide[] = [];
      for (const source of sources) {
        const { guide } = await guidesApi.parse({ source, locale: 'zh-CN' });
        guides.push(guide);
      }
      const { summary: merged } = await guidesApi.merge({
        guideIds: guides.map((g) => g.id),
        guides,
      });
      setParsedGuides(guides);
      setSummary(merged);
      setTripContext((prev) => ({
        ...prev,
        destination: prev.destination ?? merged.destinationHint,
      }));
      setParseProgress(100);
      setTimeout(() => setStep('summary'), 400);
    } finally {
      stopProgressTimer();
    }
  };

  const runApiParse = async () => {
    if (!sessionId) return;

    if (sources.length === 0) {
      toast.error('请先导入至少一篇攻略');
      return;
    }

    setStep('parsing');
    setSessionStatus('parsing');
    setParseProgress(0);
    setParseError(null);
    parseAbortRef.current?.abort();
    const abort = new AbortController();
    parseAbortRef.current = abort;

    try {
      await ensureCountryCodeOnSession(sessionId);
      await guideToPlanApi.parseAsync(sessionId);

      const finalProgress = await waitForParseJob(sessionId, abort.signal);
      if (abort.signal.aborted) return;

      if (finalProgress.status === 'failed') {
        await handleParseFailure(sessionId, finalProgress.error);
        return;
      }

      await finishParseSuccess(sessionId);
    } catch (err) {
      if (!abort.signal.aborted) {
        toast.error(extractApiErrorMessage(err));
        setStep('import');
      }
    }
  };

  const handleParseAndContinue = async () => {
    if (sources.length === 0) {
      toast.error('请先导入至少一篇攻略');
      return;
    }
    if (!useLegacyFlow && sessionStatus && !sessionCanParse(sessionStatus, sources.length)) {
      toast.error(
        sessionStatus === 'generating' ? '草案生成中，请稍后再解析' : '请先导入至少一篇攻略',
      );
      return;
    }
    if (step === 'parsing' || generating) {
      return;
    }
    try {
      if (useLegacyFlow) await runLegacyParse();
      else await runApiParse();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '攻略解析失败');
      setStep('import');
    }
  };

  const handleGenerateDraft = async () => {
    if (!summary) return;

    if (!useLegacyFlow && !generateGuard.allowed) {
      toast.error(generateGuard.message ?? '无法生成草案');
      return;
    }

    setGenerating(true);
    try {
      if (useLegacyFlow) {
        const { candidate: draft } = await guidesApi.generateDraft({
          summary,
          tripContext,
          guideIds: parsedGuides.map((g) => g.id),
        });
        setCandidate(draft);
        const legacyDetail = legacyCandidateToDetail(draft);
        setPlanDetail(legacyDetail);
        setPlanCandidates([legacyDetail]);
        setStep('draft');
        return;
      }

      if (!sessionId) return;
      setSessionStatus('generating');
      await guideToPlanApi.patchTravelContext(sessionId, tripContextToApi(tripContext));
      const generated = await guideToPlanApi.generatePlan(sessionId, {
        variants: ['faithful', 'comfortable', 'risk_min'],
      });
      await syncPlanCandidates(generated);
      await refreshSession(sessionId);
      setStep('draft');
      void expandMissingPlanVariants();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const planCandidateId = planDetail?.id ?? candidate?.id;

  const navigateToTrip = (tripId: string) => {
    toast.success('行程已创建');
    navigate(`/dashboard/plan-studio?tripId=${tripId}&source=guide_import`);
  };

  const handleAcceptPlan = async (mode: AcceptPlanMode = 'accept_all') => {
    if (!useLegacyFlow && !canAcceptDraft) {
      toast.error('请先生成草案');
      return;
    }

    setCreatingTrip(true);
    try {
      if (useLegacyFlow) {
        if (!summary) return;
        const message = buildNlPromptFromGuide(summary, tripContext);
        const response = await tripsApi.createFromNLv3({
          text: message,
          isNewConversation: true,
        });
        const tripId = response.trip?.id;
        if (tripId) {
          toast.success('行程草案已创建');
          navigate(`/dashboard/plan-studio?tripId=${tripId}&source=guide_import`);
          return;
        }
        toast.error('未能创建行程，请稍后重试');
        return;
      }

      if (!sessionId || !planCandidateId) return;
      const result = await guideToPlanApi.acceptPlan(sessionId, {
        acceptanceMode: mode,
        planCandidateId,
      });

      if (isAcceptReviewResponse(result)) {
        setReviewItems(result.items ?? []);
        setStep('review');
        return;
      }

      navigateToTrip(result.tripId);
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setCreatingTrip(false);
    }
  };

  const handleRefreshReviewItems = useCallback(async (showLoading = true) => {
    if (!sessionId || !planCandidateId || useLegacyFlow) return;
    if (showLoading) setLoadingReviewItems(true);
    try {
      const { items } = await guideToPlanApi.getReviewItems(sessionId, planCandidateId);
      setReviewItems(items ?? []);
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      if (showLoading) setLoadingReviewItems(false);
    }
  }, [sessionId, planCandidateId, useLegacyFlow]);

  useEffect(() => {
    if (step !== 'review' || useLegacyFlow || !sessionId || !planCandidateId) return;
    void handleRefreshReviewItems(reviewItems.length === 0);
  }, [step, sessionId, planCandidateId, useLegacyFlow, handleRefreshReviewItems]);

  const handleConfirmReview = async (acceptedItemKeys: string[]) => {
    if (!sessionId || !planCandidateId) return;
    if (!useLegacyFlow && !canAcceptDraft) {
      toast.error('请先生成草案');
      return;
    }
    setCreatingTrip(true);
    try {
      const { tripId } = await guideToPlanApi.confirmPlan(sessionId, planCandidateId, {
        planCandidateId,
        acceptedItemKeys,
      });
      navigateToTrip(tripId);
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setCreatingTrip(false);
    }
  };

  const handleAbandonSession = async () => {
    if (sessionId && !useLegacyFlow) {
      try {
        await guideToPlanApi.abandonSession(sessionId);
        toast.success('已放弃本次导入');
      } catch (err) {
        toast.error(extractApiErrorMessage(err));
        return;
      }
    }
    navigate('/dashboard/trips/new');
  };

  const handleContinueLater = () => {
    if (sessionId && !useLegacyFlow) {
      setSearchParams({ sessionId }, { replace: true });
    }
    navigate('/dashboard/trips/new');
  };

  const goBack = () => {
    if (step === 'import') navigate('/dashboard/trips/new');
    else if (step === 'parsing') setStep('import');
    else if (step === 'summary') setStep('import');
    else if (step === 'draft') setStep('summary');
    else if (step === 'compare') setStep('draft');
    else if (step === 'review') setStep('compare');
  };

  const tripContextLabel = [
    tripContext.startDate && tripContext.endDate
      ? `${tripContext.startDate} — ${tripContext.endDate}`
      : null,
    tripContext.transportMode === 'self_drive' ? '自驾' : null,
    tripContext.travelerProfile === 'family_with_elderly' ? '有老人同行' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  if (sessionLoading) {
    return <LogoLoading size={48} fullScreen />;
  }

  return (
    <TripCreationFlowShell
      steps={GUIDE_FLOW_STEPS}
      currentStepId={step}
      navAriaLabel="攻略导入进度"
      title={header.title}
      subtitle={header.subtitle}
      onBack={goBack}
      className="min-h-full"
    >
      {useLegacyFlow ? (
        <Alert className="mb-4 border-amber-200/80 bg-amber-50/60">
          <Info className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-xs text-amber-950/85 leading-relaxed">
            演示模式：Guide-to-Plan 后端未就绪，导入与解析使用本地模拟，行为可能与正式环境不一致。
          </AlertDescription>
        </Alert>
      ) : null}
      <div className={guideImportUi.stackLg}>
        {step === 'import' && (
          <GuideImportTwoColumn
            align="start"
            className="gap-4 lg:gap-5"
            mainClassName={guideImportUi.stackCompact}
            main={
              <>
                {parseError && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                    <p className="font-medium text-destructive">上次解析失败</p>
                    <p className="mt-1 text-xs text-destructive/90 leading-relaxed">{parseError}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 px-2 text-xs text-destructive"
                      onClick={() => setParseError(null)}
                    >
                      知道了
                    </Button>
                  </div>
                )}
                <GuideImportInputPanel
                  onImport={handleImport}
                  importing={importing}
                  disabled={sessionLoading || importBlocked}
                  compact
                  lockHint={
                    importBlocked
                      ? '解析或草案生成进行中，请完成后再导入或删除攻略。'
                      : undefined
                  }
                />
                {sources.length > 0 && (
                  <>
                    <div>
                      <GuideImportSectionHeader
                        title={`已添加 ${sources.length} 条攻略`}
                        description="路线、餐厅、住宿、避坑可分开导入，系统会合并理解"
                        compact
                      />
                      <GuideSourceList
                        sources={sources}
                        onRemove={handleRemoveSource}
                        removeDisabled={importBlocked}
                        compact
                      />
                    </div>
                    <GuideExtractionPreview
                      places={importPreview?.estimatedPlaces ?? estimate.places}
                      restaurants={importPreview?.estimatedRestaurants ?? estimate.restaurants}
                      accommodations={importPreview?.estimatedHotels ?? estimate.accommodations}
                      risks={importPreview?.estimatedRisks ?? estimate.risks}
                      compact
                    />
                  </>
                )}
                <GuideImportFooterActions
                  compact
                  secondary={
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 items-start sm:items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={handleContinueLater}
                      >
                        稍后继续
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-muted-foreground/80 text-xs"
                        onClick={() => void handleAbandonSession()}
                      >
                        放弃导入
                      </Button>
                    </div>
                  }
                  primary={
                    <Button
                      type="button"
                      className={guideImportPrimaryButtonClass('min-w-[200px]')}
                      disabled={parseBlocked || importing}
                      onClick={() => void handleParseAndContinue()}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      开始解析攻略
                    </Button>
                  }
                  footnote="解析过程安全加密，内容仅你可见"
                />
              </>
            }
            aside={<GuideImportSidebar compact />}
          />
        )}

        {step === 'parsing' && (
          <GuideParsingProgress
            sources={sources}
            liveSummary={summary}
            progress={parseProgress}
            recognizedTags={recognizedTags}
            activeStepIndex={parseStepIndex}
            currentStepLabel={parseStepLabel}
            estimatedSecondsRemaining={parseEtaSec}
            onAddSource={() => {
              if (importBlocked || step === 'parsing') {
                toast.error('解析进行中，请稍后再添加');
                return;
              }
              setStep('import');
            }}
            addSourceDisabled={importBlocked || step === 'parsing'}
          />
        )}

        {step === 'summary' && summary && (
          <div className={guideImportUi.stackCompact}>
            <GuideImportTwoColumn
              align="start"
              className={travelContextFocus ? 'gap-4 lg:gap-5' : undefined}
              gridClassName={travelContextFocus ? guideImportUi.gridMainSidebarWide : undefined}
              scrollable={!travelContextFocus}
              header={
                travelContextFocus ? (
                  <GuideUnderstandingIntro
                    guideCount={sources.length}
                    suggestedTripDays={understandingMeta.suggestedTripDays}
                    suggestedDays={summary.suggestedDays}
                  />
                ) : undefined
              }
              mainClassName={travelContextFocus ? guideImportUi.stackCompact : undefined}
              main={
                <GuideUnderstandingSummary
                  summary={summary}
                  guideCount={sources.length}
                  places={understandingPlaces}
                  suggestedTripDays={understandingMeta.suggestedTripDays}
                  pendingConfirmations={understandingMeta.pendingConfirmations}
                  requiresTravelContext={understandingMeta.requiresTravelContext}
                  parseRequired={understandingMeta.parseRequired}
                  parsedGuideCount={understandingMeta.parsedGuideCount}
                  suppressTravelContextAlert={travelContextFocus}
                  compact={travelContextFocus}
                  showIntro={!travelContextFocus}
                  onStartParse={
                    understandingMeta.parseRequired
                      ? () => void handleParseAndContinue()
                      : undefined
                  }
                  parseDisabled={parseBlocked || importing}
                  interactivePlaces={!useLegacyFlow && !!sessionId}
                  countryCode={sessionCountryCode ?? tripContext.countryCode}
                  unmatchedPlaceCount={understandingMeta.unmatchedPlaceCount}
                  onBindPlace={handleBindPlace}
                  onRejectPlace={handleRejectPlace}
                  onRematchPlaces={handleRematchPlaces}
                  placeActionPendingId={placeActionPendingId}
                  rematchingPlaces={rematchingPlaces}
                />
              }
              aside={
                <div className="flex flex-col gap-3 min-w-0 pb-4">
                  <GuideTripContextForm
                    value={tripContext}
                    onChange={setTripContext}
                    onPatch={handleTripContextPatch}
                    variant="sidebar"
                    compact={travelContextFocus}
                    pendingConfirmations={understandingMeta.pendingConfirmations}
                  />
                  <GuideImportFooterActions
                    compact
                    layout="stacked"
                    className="w-full"
                    primary={
                      <div className="flex flex-col gap-2 w-full">
                        <Button
                          type="button"
                          className={guideImportPrimaryButtonClass('w-full')}
                          disabled={generating || !canGenerateDraft}
                          title={!canGenerateDraft ? generateGuard.message : undefined}
                          onClick={() => void handleGenerateDraft()}
                        >
                          {generating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              生成中…
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              继续生成行程草案
                            </>
                          )}
                        </Button>
                        {!canGenerateDraft && generateGuard.message ? (
                          <p className="text-[11px] text-destructive leading-snug px-0.5">
                            {generateGuard.message}
                          </p>
                        ) : null}
                      </div>
                    }
                    secondary={
                      <div className="flex flex-col gap-2 w-full">
                        <Button type="button" variant="outline" className="w-full" onClick={() => setStep('import')}>
                          返回修改攻略
                        </Button>
                        {understandingMeta.parseRequired && (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => void handleParseAndContinue()}
                            disabled={parseBlocked || importing}
                          >
                            重新解析攻略
                          </Button>
                        )}
                      </div>
                    }
                  />
                </div>
              }
            />
          </div>
        )}

        {step === 'draft' && candidate && summary && planDetail && (
          <GuideDraftResultView
            candidate={candidate}
            planDetail={planDetail}
            planCandidates={planCandidates}
            onSelectPlanCandidate={(id) => void loadPlanDetail(id)}
            loadingPlanDetail={loadingPlanDetail}
            summary={summary}
            sources={sources}
            tripContextLabel={tripContextLabel}
            onViewComparison={() => setStep('compare')}
            onEnterPlanning={() => void handleAcceptPlan('accept_all')}
            entering={creatingTrip}
            acceptDisabled={!canAcceptDraft}
            expandingVariants={expandingVariants}
          />
        )}

        {step === 'compare' && candidate && (
          <GuideComparisonView
            candidate={candidate}
            tripContext={tripContext}
            onAcceptAll={() => void handleAcceptPlan('accept_all')}
            onViewItems={() => void handleAcceptPlan('review_items')}
            onKeepOriginal={() => void handleAcceptPlan('keep_faithful')}
            accepting={creatingTrip}
            acceptDisabled={!canAcceptDraft}
          />
        )}

        {step === 'review' && (
          <GuideReviewItemsView
            items={reviewItems}
            loading={loadingReviewItems}
            confirming={creatingTrip}
            onBack={() => setStep('compare')}
            onConfirm={(keys) => void handleConfirmReview(keys)}
            confirmDisabled={!canAcceptDraft}
          />
        )}
      </div>
    </TripCreationFlowShell>
  );
}
