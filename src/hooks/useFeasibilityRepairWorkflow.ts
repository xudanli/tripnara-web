import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { applyRepair, getRepairOptions, previewRepair } from '@/api/feasibility-repair';
import { resolveGuardianNegotiationForDev } from '@/lib/readiness-cascade-mock.util';
import { normalizeGuardianNegotiationResult } from '@/lib/readiness-guardian-negotiation.util';
import type { GuardianNegotiationResult } from '@/types/readiness-guardian-negotiation';
import type { GuardianPersonaPresentation } from '@/types/guardian-presentation';
import type {
  CascadeCausalPreAnalysis,
  CascadeUiHint,
} from '@/types/readiness-cascade';
import type {
  PreviewRepairResponse,
  RepairDrawerPhase,
} from '@/types/feasibility-repair';
import type { FeasibilityRepairOptionDto } from '@/types/trip-feasibility-report';
import { isPlanClassAction } from '@/lib/feasibility-repair-plan-class';
import { isSyntheticPlanBRepairOption } from '@/lib/feasibility-proof-plan-b';
import {
  isRepairOptionNotInBlockerListError,
  mergeAuthoritativeRepairOptions,
  parseInvalidRepairOptionFromError,
} from '@/lib/feasibility-repair-options';

export interface UseFeasibilityRepairWorkflowOptions {
  tripId: string;
  issueId: string | null | undefined;
  /** repair-options / preview / apply 使用的权威 issueId（可与展示 issue 不同） */
  repairIssueId?: string | null;
  /** 初始选项（报告内嵌 planBOptions / repairOptions） */
  initialOptions?: FeasibilityRepairOptionDto[];
  onApplied?: () => void | Promise<void>;
  onOptionsLoaded?: (options: FeasibilityRepairOptionDto[]) => void;
  /** 拉取 repair-options 后按行程语境过滤 */
  filterLoadedOptions?: (
    options: FeasibilityRepairOptionDto[],
  ) => FeasibilityRepairOptionDto[];
}

export function useFeasibilityRepairWorkflow({
  tripId,
  issueId,
  repairIssueId,
  initialOptions,
  onApplied,
  onOptionsLoaded,
  filterLoadedOptions,
}: UseFeasibilityRepairWorkflowOptions) {
  const [phase, setPhase] = useState<RepairDrawerPhase>('select_option');
  const [options, setOptions] = useState<FeasibilityRepairOptionDto[]>(initialOptions ?? []);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRepairResponse | null>(null);
  const [guardianNegotiation, setGuardianNegotiation] = useState<GuardianNegotiationResult | null>(
    null,
  );
  const [guardianMock, setGuardianMock] = useState(false);
  const [forceDecisionRepair, setForceDecisionRepair] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [cascadeHints, setCascadeHints] = useState<CascadeUiHint[]>([]);
  const [cascadePreAnalysis, setCascadePreAnalysis] = useState<CascadeCausalPreAnalysis | null>(
    null,
  );
  const [issueMessage, setIssueMessage] = useState<string | null>(null);
  const [deferredChoosePoints, setDeferredChoosePoints] = useState<string[]>([]);
  const [deferredPresentation, setDeferredPresentation] =
    useState<GuardianPersonaPresentation | null>(null);

  useEffect(() => {
    setOptions(initialOptions ?? []);
    setSelectedOptionId(null);
    setPreview(null);
    setPhase('select_option');
    setForceDecisionRepair(false);
    setPreviewError(null);
    setApplyError(null);
    setCascadeHints([]);
    setCascadePreAnalysis(null);
    setIssueMessage(null);
    setDeferredChoosePoints([]);
    setDeferredPresentation(null);
  }, [issueId, initialOptions]);

  const apiIssueId = repairIssueId ?? issueId;

  const loadOptions = useCallback(async () => {
    if (!apiIssueId) return;
    try {
      setOptionsLoading(true);
      const res = await getRepairOptions(tripId, apiIssueId);
      const apiOptions = filterLoadedOptions
        ? filterLoadedOptions(res.options)
        : res.options;
      const merged = mergeAuthoritativeRepairOptions(apiOptions, initialOptions ?? []);
      setOptions(merged);
      onOptionsLoaded?.(merged);
      setCascadeHints(res.cascadeUiHints ?? []);
      setCascadePreAnalysis(res.causalPreAnalysis ?? null);
      setIssueMessage(res.issueMessage ?? res.blockerMessage ?? null);
      const guardianRaw = res.guardianNegotiation;
      const { data, isMock } = resolveGuardianNegotiationForDev(
        normalizeGuardianNegotiationResult(guardianRaw),
      );
      setGuardianNegotiation(data);
      setGuardianMock(isMock);
    } catch {
      toast.error('加载修复方案失败');
    } finally {
      setOptionsLoading(false);
    }
  }, [tripId, apiIssueId, initialOptions, onOptionsLoaded, filterLoadedOptions]);

  const selectOption = useCallback(
    async (optionId: string) => {
      if (!apiIssueId) return;
      const picked = options.find((o) => o.id === optionId);
      setSelectedOptionId(optionId);
      setPreviewError(null);
      setForceDecisionRepair(false);

      if (picked && isSyntheticPlanBRepairOption(picked)) {
        setPreview(null);
        setPhase('guidance_ready');
        setPreviewError(null);
        return;
      }

      setPhase('preview_loading');

      try {
        const res = await previewRepair(tripId, apiIssueId, optionId);
        setPreview(res);
        if (res.cascadeUiHints?.length) {
          setCascadeHints(res.cascadeUiHints);
        }
        if (res.causalPreAnalysis) {
          setCascadePreAnalysis(res.causalPreAnalysis);
        }
        if (res.guardianNegotiation) {
          const { data, isMock } = resolveGuardianNegotiationForDev(
            normalizeGuardianNegotiationResult(res.guardianNegotiation),
          );
          setGuardianNegotiation(data);
          setGuardianMock(isMock);
        }
        if (res.status === 'would_defer' || res.wouldDefer) {
          setDeferredChoosePoints(res.humanDecisionPointsFlat ?? []);
          setDeferredPresentation(res.presentation ?? null);
          setPhase('preview_deferred');
        } else {
          setPhase('preview_ready');
        }
      } catch (e) {
        setPreview(null);
        setPhase('select_option');
        const message = e instanceof Error ? e.message : '预览失败';
        if (isRepairOptionNotInBlockerListError(message)) {
          const invalidId = parseInvalidRepairOptionFromError(message);
          if (invalidId) {
            setOptions((prev) => prev.filter((option) => option.id !== invalidId));
          }
          setSelectedOptionId(null);
          setPreviewError(
            '该方案与当前阻塞项不匹配，已从列表移除。请重新加载方案或改在时间轴手动调整。',
          );
          return;
        }
        setPreviewError(message);
      }
    },
    [tripId, apiIssueId, options],
  );

  const confirmApply = useCallback(async () => {
    if (!apiIssueId || !selectedOptionId) return;
    const selectedOption = options.find((o) => o.id === selectedOptionId);
    setPhase('applying');
    setApplyError(null);
    try {
      const res = await applyRepair(tripId, apiIssueId, {
        optionId: selectedOptionId,
        ...(isPlanClassAction(selectedOption?.actionType)
          ? { executeDecision: true }
          : {}),
        ...(forceDecisionRepair
          ? { forceDecisionRepair: true, persistDecision: true }
          : {}),
      });

      if (res.guardianNegotiation) {
        const { data, isMock } = resolveGuardianNegotiationForDev(
          normalizeGuardianNegotiationResult(res.guardianNegotiation),
        );
        setGuardianNegotiation(data);
        setGuardianMock(isMock);
      }

      if (res.status === 'deferred') {
        setDeferredChoosePoints(res.humanDecisionPointsFlat ?? []);
        setDeferredPresentation(res.presentation ?? null);
        setPhase('apply_deferred');
        return;
      }

      setPhase('done');
      await onApplied?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : '应用修复失败';
      setApplyError(message);
      setPhase(preview?.status === 'would_defer' ? 'preview_deferred' : 'preview_ready');
      throw e instanceof Error ? e : new Error(message);
    }
  }, [tripId, apiIssueId, selectedOptionId, options, forceDecisionRepair, onApplied, preview?.status]);

  const reset = useCallback(() => {
    setSelectedOptionId(null);
    setPreview(null);
    setPhase('select_option');
    setForceDecisionRepair(false);
    setPreviewError(null);
    setApplyError(null);
    setDeferredChoosePoints([]);
    setDeferredPresentation(null);
  }, []);

  const applyBlocked =
    (phase === 'preview_deferred' ||
      preview?.wouldDefer === true ||
      preview?.status === 'would_defer') &&
    !forceDecisionRepair;

  const guardianBlocked =
    guardianNegotiation?.consensus === 'BLOCKED' && !forceDecisionRepair;

  const confirmDisabled = applyBlocked || guardianBlocked;
  const confirmLabel =
    applyBlocked || guardianBlocked ? '需先确认协商点' : '确认应用';

  const selectedOption = selectedOptionId
    ? options.find((option) => option.id === selectedOptionId) ?? null
    : null;
  const guidanceOption =
    selectedOption && isSyntheticPlanBRepairOption(selectedOption) ? selectedOption : null;

  return {
    phase,
    options,
    optionsLoading,
    selectedOptionId,
    selectedOption,
    guidanceOption,
    preview,
    previewError,
    applyError,
    issueMessage,
    cascadeHints,
    cascadePreAnalysis,
    guardianNegotiation,
    guardianMock,
    forceDecisionRepair,
    setForceDecisionRepair,
    loadOptions,
    selectOption,
    confirmApply,
    reset,
    applyBlocked,
    guardianBlocked,
    confirmDisabled,
    confirmLabel,
    deferredChoosePoints,
    deferredPresentation,
    setDeferredPresentation,
    isApplying: phase === 'applying',
    isPreviewLoading: phase === 'preview_loading',
    showPreview:
      phase !== 'select_option' || selectedOptionId != null || guidanceOption != null,
  };
}
