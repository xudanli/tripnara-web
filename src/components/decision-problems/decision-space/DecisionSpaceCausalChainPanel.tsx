import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { deferUntilIdle } from '@/lib/idle-defer.util';
import { buildDecisionCausalChain } from '@/lib/decision-causal-chain.util';
import type { PlanningCausalChain } from '@/dto/frontend-planning-causal-chain.types';
import {
  CAUSAL_CHAIN_SEVERITY_COLORS,
  formatCausalChainBasisAge,
  planningCausalChainNodesFromCheckerCascade,
  sortCausalChainNodes,
  type PlanningCausalChainNode,
} from '@/dto/frontend-planning-causal-chain.types';
import { useDecisionCausalChain } from '@/components/plan-studio/workbench/arrange-itinerary/useDecisionCausalChain';
import type {
  DecisionCheckerCascadeNodeDto,
  DecisionCheckerEvidenceDto,
} from '@/types/decision-checker';
import type { CausalStoryView } from '@/types/causal-trace';
import type { DecisionOption } from '@/types/decision-problem';
import { hasGatewayCausalStoryView } from '@/lib/causal-trace-view.util';
import { textsSubstantiallyOverlap, assessmentRedundantWithChainNodes, extractCausalInterventionHint } from '@/lib/text-dedupe.util';
import {
  isCausalChainOptionIdNode,
  resolveCausalStoryRecommendedSummary,
} from '@/lib/causal-story-option-display.util';
import { CausalStoryFactorList } from './CausalStoryFactorList';
import { DecisionGuardianWarningBanner } from './DecisionGuardianWarningBanner';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';
import { DecisionCheckerEmpty } from '@/components/plan-studio/workbench/decision-checker/decision-checker-ui';

export interface DecisionSpaceCausalChainPanelProps {
  tripId?: string;
  /** orchestration.activeProposalId — 绑定待确认草案级联模拟 */
  proposalId?: string | null;
  /** decision-checker impact.cascade — BFF 无数据时的兜底 */
  checkerCascade?: DecisionCheckerCascadeNodeDto[];
  detail?: DecisionProblemDetail | GatewayDecisionProblemDetailResult | null;
  evidence?: DecisionCheckerEvidenceDto;
  narrative?: string | null;
  /** decision-inspector 统一读模型；仅当含 nodes 时优先于独立 causal-chain */
  inspectorCausalChain?: PlanningCausalChain | null;
  inspectorLoading?: boolean;
  onInspectorRefresh?: () => void;
  /** BFF tabEmptyState.causalChain — deferred，Tab 打开时再拉 causal-chain */
  tabEmpty?: boolean;
  emptyMessage?: string;
  /** 决策空间 + inspector 已返回时禁用客户端断言/checker 兜底 */
  preferInspectorOnly?: boolean;
  /** 因果链 Tab 可见时才按需拉 decision-causal-chain */
  tabActive?: boolean;
  /**
   * binding.mode=problem（仅 problemId，无 proposalId）：
   * inspector 首包 causalChain 为空 → Tab 打开时拉 GET decision-causal-chain
   */
  /** binding.mode=problem（仅 problemId，无 proposalId） */
  problemOnlyBinding?: boolean;
  /** problem 模式 Tab 懒加载 causal-chain 时传入 */
  problemId?: string | null;
  /** 选中方案后追加 option_preview 传播节点 */
  optionId?: string | null;
  /** Gateway causalStoryView — 优先于 legacy BFF causal-chain */
  causalStoryView?: CausalStoryView | null;
  guardianCausalStoryView?: CausalStoryView | null;
  /** 中栏可选方案 — 将 recommendedOption 技术 id 映射为「方案 A · 标题」 */
  focusProblemOptions?: DecisionOption[];
  /** 已解析的 Abu headline — 兼容 partial guardianCausalStoryView */
  guardianWarningHeadline?: string | null;
  guardianWarningContextLabel?: string | null;
  guardianPrimaryEnforcement?: import('@/types/decision-problem').PrimaryEnforcement | string | null;
  className?: string;
}

function CausalChainNodeRow({
  node,
  isLast,
}: {
  node: PlanningCausalChainNode;
  isLast: boolean;
}) {
  const colors = CAUSAL_CHAIN_SEVERITY_COLORS[node.severity] ?? CAUSAL_CHAIN_SEVERITY_COLORS.info;

  return (
    <div className="flex gap-2">
      <div className="flex flex-col items-center">
        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', colors.dotClass)} />
        {!isLast ? <span className="my-0.5 w-px flex-1 bg-border/70" aria-hidden /> : null}
      </div>
      <div className="min-w-0 pb-3">
        <p className={cn('text-[11px] leading-relaxed', colors.textClass)}>{node.description}</p>
        {node.entityLabel ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground">{node.entityLabel}</p>
        ) : null}
        {node.netImpactMinutes != null && node.netImpactMinutes !== 0 ? (
          <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
            {node.netImpactMinutes > 0 ? '+' : ''}
            {node.netImpactMinutes} 分钟
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** 决策执行空间 · 因果链（BFF 优先，客户端断言/证据兜底） */
export function DecisionSpaceCausalChainPanel({
  tripId,
  proposalId,
  checkerCascade,
  detail,
  evidence,
  narrative,
  inspectorCausalChain,
  inspectorLoading = false,
  onInspectorRefresh,
  tabEmpty = false,
  emptyMessage,
  preferInspectorOnly = false,
  tabActive = true,
  problemOnlyBinding = false,
  problemId,
  optionId,
  causalStoryView,
  guardianCausalStoryView,
  focusProblemOptions,
  guardianWarningHeadline,
  guardianWarningContextLabel,
  guardianPrimaryEnforcement,
  className,
}: DecisionSpaceCausalChainPanelProps) {
  const gatewayStory = causalStoryView ?? null;
  const preferGatewayStory = hasGatewayCausalStoryView({ causalStoryView: gatewayStory ?? undefined });

  const inspectorNodes = inspectorCausalChain?.nodes?.length
    ? sortCausalChainNodes(inspectorCausalChain.nodes)
    : [];
  const [standaloneLazyReady, setStandaloneLazyReady] = useState(false);
  const [standaloneManual, setStandaloneManual] = useState(false);

  const resolvedProposalId = proposalId?.trim() || undefined;
  const resolvedProblemId = problemId?.trim() || undefined;
  const resolvedOptionId = optionId?.trim() || undefined;
  const canFetchStandalone = Boolean(tripId && (resolvedProposalId || resolvedProblemId));
  /** meta.tabEmptyState.causalChain=true：首包 deferred，非永久空态 */
  const causalDeferred = Boolean(tabEmpty && canFetchStandalone);
  const optionScopedFetch = Boolean(resolvedOptionId);

  useEffect(() => {
    setStandaloneLazyReady(false);
    setStandaloneManual(false);
    if (!tabActive || causalDeferred || problemOnlyBinding || preferInspectorOnly) return undefined;
    return deferUntilIdle(() => setStandaloneLazyReady(true), 3_000);
  }, [
    tabActive,
    causalDeferred,
    problemOnlyBinding,
    preferInspectorOnly,
    tripId,
    resolvedProposalId,
    resolvedProblemId,
    resolvedOptionId,
  ]);

  const inspectorSettled =
    !inspectorLoading &&
    (problemOnlyBinding ||
      causalDeferred ||
      optionScopedFetch ||
      !preferInspectorOnly ||
      inspectorCausalChain != null ||
      tabEmpty);

  const shouldFetchStandalone =
    canFetchStandalone &&
    !preferGatewayStory &&
    (tabActive || optionScopedFetch) &&
    inspectorSettled &&
    (optionScopedFetch ||
      !inspectorNodes.length ||
      causalDeferred ||
      problemOnlyBinding ||
      (!preferInspectorOnly && (standaloneManual || standaloneLazyReady)));

  const bffQuery = useDecisionCausalChain(
    tripId ?? '',
    {
      proposalId: resolvedProposalId,
      problemId: resolvedProblemId,
      optionId: resolvedOptionId,
    },
    shouldFetchStandalone,
  );
  const standaloneNodes = bffQuery.data?.nodes?.length
    ? sortCausalChainNodes(bffQuery.data.nodes)
    : [];
  const useStandaloneNodes = optionScopedFetch || !inspectorNodes.length;
  const bffNodes = useStandaloneNodes
    ? standaloneNodes
    : inspectorNodes.length
      ? inspectorNodes
      : standaloneNodes;
  const optionPreviewLoading =
    optionScopedFetch && shouldFetchStandalone && (bffQuery.isLoading || bffQuery.isFetching);
  const checkerNodes = preferInspectorOnly
    ? []
    : planningCausalChainNodesFromCheckerCascade(checkerCascade);

  const fallbackSteps = preferInspectorOnly
    ? []
    : buildDecisionCausalChain({ detail, evidence, narrative });
  const assertionNodes: PlanningCausalChainNode[] = fallbackSteps.map((step, index) => ({
    id: step.id,
    order: index,
    severity: index >= fallbackSteps.length - 1 ? 'risk' : index === 0 ? 'info' : 'warn',
    description: step.text,
  }));

  const nodes = preferGatewayStory
    ? []
    : bffNodes.length
      ? bffNodes
      : checkerNodes.length
        ? checkerNodes
        : assertionNodes;
  const usingBff = !preferGatewayStory && bffNodes.length > 0;
  const causalChainMeta =
    inspectorNodes.length ? inspectorCausalChain : bffQuery.data ?? inspectorCausalChain;
  const basisAge = formatCausalChainBasisAge(
    usingBff ? causalChainMeta?.basisUpdatedAt : undefined,
  );

  if (optionPreviewLoading && !bffNodes.length && !preferGatewayStory) {
    return (
      <div className={cn('flex flex-col items-center gap-2 py-8', className)}>
        <Spinner className="h-5 w-5" />
        <p className="text-[11px] text-muted-foreground">
          正在计算方案传播链，约需 10–25 秒…
        </p>
      </div>
    );
  }

  if ((bffQuery.isLoading || inspectorLoading) && !nodes.length && !preferGatewayStory) {
    return (
      <div className={cn('flex justify-center py-8', className)}>
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (tabEmpty && !canFetchStandalone && !nodes.length) {
    return (
      <DecisionCheckerEmpty className={className}>
        {emptyMessage ?? '暂无因果链数据。'}
      </DecisionCheckerEmpty>
    );
  }

  if (
    causalDeferred &&
    !nodes.length &&
    !bffQuery.isLoading &&
    !bffQuery.isFetching &&
    bffQuery.isError
  ) {
    return (
      <DecisionCheckerEmpty className={className}>
        {emptyMessage ?? '因果链接口暂不可用，请稍后重试。'}
      </DecisionCheckerEmpty>
    );
  }

  if (!nodes.length && !preferGatewayStory) {
    return (
      <DecisionCheckerEmpty>
        暂无因果链数据。请确认 BFF 已返回 decision-causal-chain，或 problem.assertions /
        decision-checker.evidence 中有步骤。
      </DecisionCheckerEmpty>
    );
  }

  if (preferGatewayStory && gatewayStory) {
    const assessment = gatewayStory.assessment?.trim() ?? '';
    const headline = gatewayStory.headline?.trim() ?? '';
    const guardianHeadline =
      guardianWarningHeadline?.trim() ||
      guardianCausalStoryView?.headline?.trim() ||
      '';

    const recommendedOptionId = gatewayStory.recommendedOption?.optionId?.trim();
    const recommendedSummary = gatewayStory.recommendedOption
      ? resolveCausalStoryRecommendedSummary({
          recommendedOption: gatewayStory.recommendedOption,
          problemOptions: focusProblemOptions,
        })
      : null;

    const chainNodes = gatewayStory.chain.filter((node, index, arr) => {
      const desc = (node.description || node.title).trim();
      if (!desc) return false;
      if (recommendedOptionId && isCausalChainOptionIdNode(node, recommendedOptionId)) {
        return false;
      }
      if (textsSubstantiallyOverlap(desc, headline)) return false;
      if (recommendedSummary && textsSubstantiallyOverlap(desc, recommendedSummary)) return false;
      return !arr.slice(0, index).some((prev) =>
        textsSubstantiallyOverlap(desc, (prev.description || prev.title).trim()),
      );
    });

    const assessmentRedundant = assessmentRedundantWithChainNodes(assessment, chainNodes);
    const showAssessment =
      !assessmentRedundant &&
      assessment.length > 0 &&
      !textsSubstantiallyOverlap(assessment, headline);

    const interventionHint = extractCausalInterventionHint(assessment);
    const showIntervention =
      Boolean(interventionHint) &&
      chainNodes.length > 0 &&
      !chainNodes.some((node) =>
        textsSubstantiallyOverlap(interventionHint, (node.description || node.title).trim()),
      ) &&
      !textsSubstantiallyOverlap(interventionHint, headline);

    const showGuardian = guardianHeadline.length > 0;

    return (
      <div className={cn('space-y-2', className)}>
        {showGuardian ? (
          <DecisionGuardianWarningBanner
            headline={guardianHeadline}
            contextLabel={guardianWarningContextLabel}
            primaryEnforcement={guardianPrimaryEnforcement}
          />
        ) : null}
        {showAssessment ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">{assessment}</p>
        ) : null}
        {chainNodes.length || showIntervention ? (
          <CausalStoryFactorList
            nodes={chainNodes}
            trailingStep={
              showIntervention && interventionHint
                ? { label: '系统建议', description: interventionHint }
                : null
            }
          />
        ) : null}
        {gatewayStory.recommendedOption ? (
          <div className="rounded-lg border border-border/70 bg-card px-2.5 py-2 shadow-none border-l-[3px] border-l-border">
            <p className="text-[10px] font-medium text-muted-foreground">推荐方案</p>
            <p className="mt-0.5 text-[11px] leading-snug text-foreground">
              {recommendedSummary}
            </p>
            {gatewayStory.recommendedOption.expectedImprovement ? (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                预期改善：{gatewayStory.recommendedOption.expectedImprovement}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  const dedupedNodes = nodes.filter((node, index, arr) => {
    const desc = node.description.trim();
    if (!desc) return false;
    return !arr.slice(0, index).some((prev) => textsSubstantiallyOverlap(prev.description, desc));
  });

  return (
    <div className={cn('space-y-2', className)}>
      {optionPreviewLoading && bffNodes.length ? (
        <p className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground">
          <Spinner className="h-3 w-3 shrink-0" />
          正在追加方案传播节点…
        </p>
      ) : null}
      <div className="space-y-0">
        {dedupedNodes.map((node, index) => (
          <CausalChainNodeRow key={node.id} node={node} isLast={index === dedupedNodes.length - 1} />
        ))}
      </div>
      {tripId ? (
        <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2">
          <p className="text-[10px] text-muted-foreground">
            {basisAge
              ? `刷新依据 · ${basisAge}`
              : checkerNodes.length
                ? '依据来自 decision-checker 级联'
                : '依据来自当前行程验证'}
            {usingBff && causalChainMeta?.basisSource ? ` · ${causalChainMeta.basisSource}` : null}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[10px]"
            disabled={bffQuery.isFetching || inspectorLoading}
            onClick={() => {
              if (causalDeferred || problemOnlyBinding || !onInspectorRefresh) {
                setStandaloneManual(true);
                void bffQuery.refetch();
                return;
              }
              onInspectorRefresh();
            }}
          >
            <RefreshCw
              className={cn(
                'h-3 w-3',
                (bffQuery.isFetching || inspectorLoading) && 'animate-spin',
              )}
            />
            刷新依据
          </Button>
        </div>
      ) : null}
    </div>
  );
}
