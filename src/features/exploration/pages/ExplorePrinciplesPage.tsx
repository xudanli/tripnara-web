/**
 * 旅行原则 — 六原则卡片 + 排序
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mountain,
  Car,
  Camera,
  MapPin,
  Wallet,
  Bed,
  Check,
  Circle,
  Sparkles,
  GripVertical,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ExploreFlowLayout, ExploreFooterNav } from '@/features/exploration/components/ExploreFlowLayout';
import { ScenarioSummaryBar } from '@/features/exploration/components/ScenarioSummaryBar';
import { CONSUMER_PRINCIPLES } from '@/features/exploration/data/mock-iceland';
import type { ConsumerPrincipleId } from '@/features/exploration/types';
import { exploreUi, semanticInfoText } from '@/features/exploration/explore-ui';
import {
  isPrinciplesSummaryUnavailable,
  isScenarioLocked,
  previewPrinciplesSummary,
  generateCandidates,
  isExplorationUnavailable,
  regenerateCandidates,
  savePrinciples,
  trackExplorationEvent,
} from '@/features/exploration/api/client';
import type { PrinciplesSummaryView } from '@/features/exploration/api/types';
import { getStaleCandidatesBannerText } from '@/features/exploration/api/helpers';
import { toApiPrinciples } from '@/features/exploration/principle-mapping';
import { routesEntryPath } from '@/features/exploration/flow-state';
import { exploreBasePath } from '@/features/exploration/constants';
import { useExplorationFlow } from '@/features/exploration/hooks/useExplorationFlow';
import { useExplorationTravelContext } from '@/features/exploration/context/ExplorationTravelContext';
import { submitExplorationPrinciplesAndCandidates } from '@/features/exploration/travel-context/exploration-travel-context';
import { cn } from '@/lib/utils';

const ICONS = {
  mountain: Mountain,
  car: Car,
  camera: Camera,
  'map-pin': MapPin,
  wallet: Wallet,
  bed: Bed,
} as const;

const MAX_PRINCIPLES = 3;
const SUMMARY_DEBOUNCE_MS = 400;
const SUMMARY_FALLBACK = '总结暂不可用，仍可继续选择原则并进入下一步。';

function resolveSummaryDisplay(
  view: PrinciplesSummaryView | null,
  loading: boolean,
  errorText: string | null,
): string {
  if (loading) return '正在生成总结…';
  if (errorText) return errorText;
  if (!view) return SUMMARY_FALLBACK;
  return view.summary ?? view.placeholder ?? SUMMARY_FALLBACK;
}

export default function ExplorePrinciplesPage() {
  const { scenarioId = '' } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const base = exploreBasePath(scenarioId);
  const { flow, update } = useExplorationFlow(scenarioId);
  const travelContext = useExplorationTravelContext();

  const [selected, setSelected] = useState<ConsumerPrincipleId[]>([
    'experience',
    'pace',
    'lodging',
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [summaryView, setSummaryView] = useState<PrinciplesSummaryView | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (!scenarioId) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSummaryLoading(true);
      setSummaryError(null);
      void previewPrinciplesSummary(
        scenarioId,
        { principles: toApiPrinciples(selected) },
        controller.signal,
      )
        .then((data) => {
          setSummaryView(data);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setSummaryView(null);
          if (isScenarioLocked(err)) {
            setSummaryError('该行程场景已锁定，总结预览不可用，仍可继续提交原则。');
            return;
          }
          if (isPrinciplesSummaryUnavailable(err) || isExplorationUnavailable(err)) {
            setSummaryError(SUMMARY_FALLBACK);
            return;
          }
          setSummaryError(err instanceof Error ? err.message : SUMMARY_FALLBACK);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setSummaryLoading(false);
          }
        });
    }, SUMMARY_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [scenarioId, selected]);

  const summaryDisplay = resolveSummaryDisplay(summaryView, summaryLoading, summaryError);

  const toggle = (id: ConsumerPrincipleId) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= MAX_PRINCIPLES) {
        toast.message('已替换优先级最低的一项', {
          description: '如需调整顺序，请点击下方排序标签',
        });
        return [...prev.slice(0, MAX_PRINCIPLES - 1), id];
      }
      return [...prev, id];
    });
  };

  const promoteToTop = (id: ConsumerPrincipleId) => {
    setSelected((prev) => {
      if (!prev.includes(id)) return prev;
      return [id, ...prev.filter((x) => x !== id)];
    });
  };

  const handleContinue = async () => {
    if (selected.length === 0) {
      toast.error('请至少选择 1 项旅行原则');
      return;
    }
    setSubmitting(true);
    const nextPath = routesEntryPath(scenarioId);
    try {
      const provider = travelContext.getProvider();
      if (travelContext.enabled && provider) {
        const detail = await submitExplorationPrinciplesAndCandidates(provider, {
          principles: toApiPrinciples(selected),
        });
        update({ materializationStatus: detail.materializationStatus ?? 'MATERIALIZED' });
        if (detail.candidatesStatus?.status === 'STALE') {
          toast.message('旅行原则已更新', {
            description: getStaleCandidatesBannerText(),
          });
        }
      } else {
        const res = await savePrinciples(scenarioId, { principles: toApiPrinciples(selected) });
        update({ materializationStatus: 'MATERIALIZED' });
        const needsRegenerate =
          (res.candidatesInvalidated ?? 0) > 0 || res.candidatesStatus?.status === 'STALE';
        if (needsRegenerate) {
          toast.message('旅行原则已更新', {
            description: getStaleCandidatesBannerText(),
          });
          await regenerateCandidates(scenarioId);
        } else {
          await generateCandidates(scenarioId);
        }
      }
      if (flow.sessionId) {
        void trackExplorationEvent(flow.sessionId, 'principles_submitted', {
          scenarioId,
          protocolId: flow.researchProtocolId,
          entryVariant: flow.assignedVariant,
          tripId: flow.tripId,
          currentStep: 'principles',
        });
      }
      navigate(nextPath);
    } catch (err) {
      if (isExplorationUnavailable(err)) {
        toast.message('演示模式：跳过原则提交');
        navigate(nextPath);
        return;
      }
      toast.error(err instanceof Error ? err.message : '提交原则失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ExploreFlowLayout
      scenarioId={scenarioId}
      currentStep="principles"
      title="这趟旅行，你最在意的什么？"
      subtitle="最多选择 3 项并排优先级，后续路线将据此推荐。"
      onBack={() => navigate(`${base}/conditions`)}
      footer={
        <ExploreFooterNav
          onBack={() => navigate(`${base}/conditions`)}
          onPrimary={handleContinue}
          primaryLabel={submitting ? '保存中…' : '继续'}
          primaryDisabled={selected.length === 0 || submitting}
        />
      }
    >
      <ScenarioSummaryBar scenarioId={scenarioId} className="mb-3 py-2" />

      <p className="text-[11px] text-muted-foreground mb-2 leading-snug">
        已选 {selected.length}/{MAX_PRINCIPLES} 项 · 点击已选卡片可取消 · 选满后点击其他卡片将替换优先级最低的一项
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
        {CONSUMER_PRINCIPLES.map((principle) => {
          const Icon = ICONS[principle.icon as keyof typeof ICONS] ?? Mountain;
          const isSelected = selected.includes(principle.id);
          const rank = selected.indexOf(principle.id);

          return (
            <button
              key={principle.id}
              type="button"
              onClick={() => toggle(principle.id)}
              aria-pressed={isSelected}
              className={cn(
                'rounded-xl border p-3 text-left transition-all cursor-pointer',
                'active:scale-[0.99]',
                isSelected ? exploreUi.cardSelected : exploreUi.cardHover,
                !isSelected && selected.length >= MAX_PRINCIPLES && 'opacity-90 hover:opacity-100',
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-foreground" />
                </div>
                {isSelected ? (
                  <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </span>
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground/40" />
                )}
              </div>
              <h3 className="text-sm font-semibold text-foreground leading-snug">{principle.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                {principle.description}
              </p>
              {isSelected && rank >= 0 && (
                <span className="inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-border bg-muted text-foreground">
                  优先级 {rank + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 mb-2">
          <p className="text-[11px] font-medium text-muted-foreground mb-2">你的优先级排序</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {selected.map((id, idx) => {
              const p = CONSUMER_PRINCIPLES.find((x) => x.id === id);
              return (
                <div key={id} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => promoteToTop(id)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
                    title="设为最高优先级"
                  >
                    <GripVertical className="w-3 h-3 text-muted-foreground" />
                    {idx + 1}. {p?.title}
                  </button>
                  {idx < selected.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={cn(exploreUi.tipBox, 'flex gap-2.5 items-start p-3 rounded-xl')}>
        {summaryLoading ? (
          <Loader2 className={cn('w-4 h-4 flex-shrink-0 mt-0.5 animate-spin', semanticInfoText)} />
        ) : (
          <Sparkles className={cn('w-4 h-4 flex-shrink-0 mt-0.5', semanticInfoText)} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-foreground mb-0.5">系统智能总结</p>
          <p
            className={cn(
              'text-xs leading-snug',
              summaryError ? 'text-muted-foreground/80' : 'text-muted-foreground',
            )}
            aria-live="polite"
          >
            {summaryDisplay}
          </p>
          {summaryView?.highlights && summaryView.highlights.length > 0 && !summaryLoading && !summaryError ? (
            <ul className="mt-2 space-y-1">
              {summaryView.highlights.map((item) => (
                <li key={item} className="text-[11px] text-muted-foreground leading-snug flex gap-1.5">
                  <span className="text-foreground/60">·</span>
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {submitting && (
        <p className="mt-2 text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          正在保存原则并生成路线候选…
        </p>
      )}
    </ExploreFlowLayout>
  );
}
