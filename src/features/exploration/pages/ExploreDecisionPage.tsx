/**
 * 风险发现 + 修复方案 — check 完成后直接进入此页
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Lightbulb, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ExploreFlowLayout,
  ExploreFooterNav,
  ExplorePrimaryButton,
} from '@/features/exploration/components/ExploreFlowLayout';
import { ExplorePlanSummaryStrip } from '@/features/exploration/components/ExplorePlanSummaryStrip';
import { ConsumerRiskCard } from '@/features/exploration/components/ConsumerRiskCard';
import { ExploreCheckStatusBanner } from '@/features/exploration/components/ExploreCheckStatusBanner';
import { IssueCountBadge } from '@/features/exploration/components/IssueCountBadge';
import { RepairOptionCard } from '@/features/exploration/components/RepairOptionCard';
import { RevalidationBanner } from '@/features/exploration/components/RevalidationBanner';
import { exploreBasePath } from '@/features/exploration/constants';
import { exploreUi } from '@/features/exploration/explore-ui';
import { toApiRouteId } from '@/features/exploration/lib/route-id.util';
import {
  checkVerdictHeadline,
  checkVerdictIsBlocking,
} from '@/features/exploration/lib/check-verdict.util';
import {
  formatExplorationCheckIssueChips,
  formatExplorationIssuesSummary,
  getExplorationIssueSourceKind,
  isOntologyConsumerIssue,
  explorationIssueSourceLabel,
} from '@/features/exploration/api/helpers';
import {
  applyDecision,
  fetchIssues,
  fetchRepairOptions,
  isExplorationUnavailable,
  submitDecision,
  trackExplorationEvent,
} from '@/features/exploration/api/client';
import type {
  ApplyDecisionResponse,
  ConsumerIssueView,
  ConsumerRepairOption,
  IssuesListResponse,
} from '@/features/exploration/api/types';
import { useExplorationFlow } from '@/features/exploration/hooks/useExplorationFlow';
import { useExplorationTravelContext } from '@/features/exploration/context/ExplorationTravelContext';
import {
  applyExplorationDecisionViaIntent,
  loadExplorationDecisions,
  submitExplorationDecisionViaIntent,
} from '@/features/exploration/travel-context/exploration-travel-context';
import { useAuth } from '@/hooks/useAuth';
import {
  PoiConfirmationSheet,
  buildPoiIssueFromProblemId,
  isPoiConfirmationIssue,
  resolvePoiConfirmCountryCode,
  resolvePoiConfirmLocale,
  resolvePoiFromConsumerIssue,
} from '@/features/poi-resolution';
import type { ConfirmPoiResponse, ResolvedPoi } from '@/features/poi-resolution/types';
import { cn } from '@/lib/utils';

function formatCheckDuration(ms: number | undefined): string {
  if (!ms) return '';
  return ` · 耗时 ${(ms / 1000).toFixed(1)}s`;
}

export default function ExploreDecisionPage() {
  const { scenarioId = '', problemId = '' } = useParams<{
    scenarioId: string;
    problemId: string;
  }>();
  const navigate = useNavigate();
  const base = exploreBasePath(scenarioId);
  const { flow } = useExplorationFlow(scenarioId);
  const travelContext = useExplorationTravelContext();
  const { accessToken } = useAuth();
  const routeId = toApiRouteId(
    travelContext.planView?.selectedRouteId ?? flow.selectedRouteId ?? 'highland-south',
  );
  const detailPath = `${base}/routes/${encodeURIComponent(routeId)}`;

  const verdictStatus = flow.checkVerdict;
  const routeBlocked =
    checkVerdictIsBlocking(verdictStatus) || (flow.checkBlockerCount ?? 0) > 0;
  const verdictHeadline = checkVerdictHeadline(verdictStatus);
  const totalIssueCount = flow.checkIssueCount ?? 0;
  const issueChips = formatExplorationCheckIssueChips(
    {
      gatewayOpenCount: flow.checkGatewayOpenCount,
      ontologyIssueCount: flow.checkOntologyIssueCount,
      unresolvedPoiCount: flow.checkUnresolvedPoiCount,
    },
    undefined,
  );

  const [issue, setIssue] = useState<ConsumerIssueView | null>(null);
  const [issuesSummary, setIssuesSummary] = useState<IssuesListResponse | null>(null);
  const [options, setOptions] = useState<ConsumerRepairOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<ApplyDecisionResponse | null>(null);
  const [poiSheetOpen, setPoiSheetOpen] = useState(false);
  const [poiConfirmed, setPoiConfirmed] = useState(false);

  const isPoiIssue = Boolean(issue && isPoiConfirmationIssue(issue));
  const isOntologyIssue = Boolean(issue && isOntologyConsumerIssue(issue));
  const issueSourceKind = issue ? getExplorationIssueSourceKind(issue) : null;
  const poiForSheet = issue && isPoiIssue ? resolvePoiFromConsumerIssue(issue) : null;
  const poiCountryCode = issue ? resolvePoiConfirmCountryCode(issue) : 'IS';
  const poiLocale = issue ? resolvePoiConfirmLocale(issue) : 'zh';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const provider = travelContext.getProvider();
        if (travelContext.enabled && provider) {
          const issuesData = await loadExplorationDecisions(provider);
          if (cancelled) return;
          setIssuesSummary(issuesData);

          const matched =
            issuesData.displayedIssues.find((i) => i.issueId === problemId) ??
            issuesData.displayedIssues[0] ??
            buildPoiIssueFromProblemId(problemId);

          if (matched && isPoiConfirmationIssue(matched)) {
            setIssue(matched);
            setOptions([]);
            setPoiSheetOpen(true);
            return;
          }

          if (matched && isOntologyConsumerIssue(matched)) {
            setIssue(matched);
            setOptions([]);
            return;
          }

          const optionsData = await fetchRepairOptions(scenarioId, problemId).catch(() => []);
          if (cancelled) return;

          setIssue(matched);
          setOptions(optionsData);
          setSelectedOptionId(
            optionsData.find((o) => o.canApply !== false)?.optionId ?? optionsData[0]?.optionId ?? null,
          );
          return;
        }

        const issuesData = await fetchIssues(scenarioId).catch(() => null);
        if (cancelled) return;
        if (issuesData) setIssuesSummary(issuesData);

        const matched =
          issuesData?.displayedIssues.find((i) => i.issueId === problemId) ??
          issuesData?.displayedIssues[0] ??
          buildPoiIssueFromProblemId(problemId);

        if (matched && isPoiConfirmationIssue(matched)) {
          setIssue(matched);
          setOptions([]);
          setPoiSheetOpen(true);
          return;
        }

        if (matched && isOntologyConsumerIssue(matched)) {
          setIssue(matched);
          setOptions([]);
          return;
        }

        const optionsData = await fetchRepairOptions(scenarioId, problemId).catch(() => []);
        if (cancelled) return;

        setIssue(matched);
        setOptions(optionsData);
        setSelectedOptionId(
          optionsData.find((o) => o.canApply !== false)?.optionId ?? optionsData[0]?.optionId ?? null,
        );
      } catch (err) {
        if (isExplorationUnavailable(err) && !cancelled) {
          setIssue({
            issueId: problemId,
            severity: 'BLOCK',
            headline: '第 5 天高地路线与当前车辆不匹配',
            explanation:
              '根据冰岛道路管理规定，F208 高地道路要求使用四驱车辆。你当前选择的是 2WD，不符合通行条件。',
            consequence: '你选择的车辆无法合法、安全地完成该路段。',
            affectedDay: 5,
            affectedSegmentLabel: '南岸 → F208 → 东部峡湾',
            decisionRequired: true,
            source: {
              gatewayAssessmentBatchId: 'mock-batch-001',
              canonicalIssueId: 'vehicle-f208-mismatch',
              tripId: 'mock-trip',
              tripVersion: 1,
            },
          });
          setOptions([
            {
              optionId: 'upgrade-vehicle',
              title: '升级至合规四驱 SUV',
              summary: '保留 F208 高地体验，更换车辆类型',
              preserves: ['高地探索体验', '原路线结构'],
              sacrifices: ['车辆租赁成本上升'],
              canApply: true,
            },
            {
              optionId: 'reroute-south',
              title: '改走南岸替代路线',
              summary: '跳过 F 路，改走已铺装南岸路段',
              preserves: ['2WD 车辆可用', '南岸核心景点'],
              sacrifices: ['高地探索体验'],
              canApply: true,
            },
          ]);
          setSelectedOptionId('upgrade-vehicle');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scenarioId, problemId, travelContext.enabled, travelContext.getProvider]);

  const handlePoiConfirmed = (_result: ConfirmPoiResponse, _originalPoi: ResolvedPoi) => {
    setPoiConfirmed(true);
    setPoiSheetOpen(false);
    toast.success('地点已确认，可继续探索');
  };

  const handleApply = async () => {
    if (!selectedOptionId) return;
    setApplying(true);
    try {
      if (flow.sessionId) {
        void trackExplorationEvent(flow.sessionId, 'repair_option_selected', {
          scenarioId,
          protocolId: flow.researchProtocolId,
          entryVariant: flow.assignedVariant,
          tripId: flow.tripId,
          routeId,
          currentStep: 'decision',
        });
      }
      const provider = travelContext.getProvider();
      if (travelContext.enabled && provider) {
        await submitExplorationDecisionViaIntent(provider, problemId, {
          optionId: selectedOptionId,
          acknowledgement: ['我已了解变更影响'],
        });
        const result = await applyExplorationDecisionViaIntent(provider, problemId);
        setApplyResult(result);
      } else {
        await submitDecision(scenarioId, problemId, {
          optionId: selectedOptionId,
          acknowledgement: ['我已了解变更影响'],
        });
        const result = await applyDecision(scenarioId, problemId);
        setApplyResult(result);
      }
      if (flow.sessionId) {
        void trackExplorationEvent(flow.sessionId, 'decision_applied', {
          scenarioId,
          protocolId: flow.researchProtocolId,
          entryVariant: flow.assignedVariant,
          tripId: flow.tripId,
          routeId,
          currentStep: 'decision',
        });
      }
    } catch (err) {
      if (isExplorationUnavailable(err)) {
        setApplyResult({
          originalProblem: { problemId, resolved: true, workflowStatus: 'RESOLVED' },
          revalidation: { status: 'PASSED' },
          issues: { displayedIssues: [], totalIssueCount: 0 },
        });
        toast.message('演示模式：修改已模拟应用');
        return;
      }
      toast.error(err instanceof Error ? err.message : '应用修复失败');
    } finally {
      setApplying(false);
    }
  };

  const displayedCount = issue ? 1 : 0;
  const issueTotal = totalIssueCount > 0 ? totalIssueCount : displayedCount;

  return (
    <ExploreFlowLayout
      scenarioId={scenarioId}
      currentStep="decision"
      title={
        poiConfirmed
          ? '地点已确认'
          : applyResult
            ? '修复已应用'
            : isPoiIssue
              ? '请确认途经地点'
              : isOntologyIssue
                ? '行程约束冲突'
                : routeBlocked
                  ? '这条路线目前走不通'
                  : '风险发现与修复方案'
      }
      subtitle={
        poiConfirmed
          ? '该地点已写入你的偏好，下次将直接命中。'
          : applyResult
            ? '系统已重新验证。你可以继续探索后续商品。'
            : isPoiIssue
              ? '从下方弹层选择正确 POI，确认后继续。'
              : isOntologyIssue
                ? '此为信息型阻断，请调整旅行条件或路线后再检查。'
                : routeBlocked
                  ? `共 ${issueTotal} 个问题。先了解风险，再选择修复方案。`
                  : '了解问题影响，选择保留什么、牺牲什么。'
      }
      onBack={() => navigate(detailPath)}
      maxWidth="7xl"
      footer={
        poiConfirmed || applyResult ? (
          <ExploreFooterNav
            onBack={() => navigate(detailPath)}
            backLabel="返回路线详情"
            onPrimary={() => navigate(`${base}/continue`)}
            primaryLabel="继续探索商品"
          />
        ) : isPoiIssue ? (
          <ExploreFooterNav
            onBack={() => navigate(detailPath)}
            backLabel="返回路线详情"
            onPrimary={() => setPoiSheetOpen(true)}
            primaryLabel="确认地点"
          />
        ) : isOntologyIssue ? (
          <ExploreFooterNav
            onBack={() => navigate(`${base}/conditions`)}
            backLabel="调整旅行条件"
            onPrimary={() => navigate(`${base}/compare`)}
            primaryLabel="重新选路"
          />
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground text-left"
              onClick={() => navigate(detailPath)}
            >
              返回路线详情
            </button>
            <ExplorePrimaryButton
              className="min-w-[200px]"
              disabled={!selectedOptionId || applying || loading}
              onClick={handleApply}
            >
              {applying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  应用并验证…
                </>
              ) : (
                <>
                  应用所选方案
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </ExplorePrimaryButton>
          </div>
        )
      }
    >
      <ExplorePlanSummaryStrip className="mb-4" />

      {loading && (
        <p className="text-sm text-muted-foreground mb-4 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在加载问题与修复方案…
        </p>
      )}

      {applyResult && (
        <RevalidationBanner
          resolved={applyResult.originalProblem?.resolved}
          revalidationStatus={applyResult.revalidation?.status}
          newIssueCount={applyResult.issues?.blockerIssueCount ?? applyResult.issues?.totalIssueCount}
        />
      )}

      {!applyResult && !loading && !poiConfirmed && (
        <div className="space-y-6">
          <ExploreCheckStatusBanner
            blockerIssueCount={flow.checkBlockerCount}
            ontologyIssueCount={flow.checkOntologyIssueCount}
            gatewayOpenCount={flow.checkGatewayOpenCount}
            unresolvedPoiCount={flow.checkUnresolvedPoiCount}
            diagnosis={flow.checkDiagnosis}
            issues={issuesSummary}
          />

          {verdictHeadline && !isPoiIssue && (
            <div className={cn(routeBlocked ? exploreUi.rejectBanner : exploreUi.warnCard)}>
              <p className={routeBlocked ? exploreUi.rejectHeading : 'text-sm font-medium text-foreground'}>
                {verdictHeadline}
              </p>
              {routeBlocked && issueTotal > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {issuesSummary
                    ? formatExplorationIssuesSummary(issuesSummary)
                    : `判定依据 · 共 ${issueTotal} 个问题`}
                  {formatCheckDuration(flow.checkDurationMs)}
                </p>
              )}
              {issueChips.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  {issueChips.join(' · ')}
                </p>
              )}
            </div>
          )}

          {issueTotal > 0 && !isPoiIssue && (
            <div
              className={cn(
                'rounded-xl px-4 py-3 border',
                routeBlocked ? exploreUi.rejectBanner : exploreUi.warnCard,
              )}
            >
              <IssueCountBadge
                displayedCount={displayedCount}
                totalCount={issueTotal}
                preferredSeverity={issue?.severity}
              />
            </div>
          )}

          {issue && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
              <div className="space-y-2">
                {issueSourceKind && (
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {explorationIssueSourceLabel(issueSourceKind)}
                  </p>
                )}
                <ConsumerRiskCard issue={issue} />
              </div>
              <aside>
                <div className={cn(exploreUi.tipBox, 'flex gap-2 p-4')}>
                  <Lightbulb className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isPoiIssue
                      ? '请在弹层中选择正确的官方 POI。也可前往 Compare 页查看全部途经地点。'
                      : isOntologyIssue
                        ? '本体约束暂无 Gateway 修复方案。请返回条件页调整车辆/保险/取车时间，或重新选路后再检查。'
                        : '下方列出可选修复方案。应用后将自动重新验证路线是否走得通。'}
                  </p>
                </div>
              </aside>
            </div>
          )}

          {!isPoiIssue && !isOntologyIssue ? (
            <div>
              <h2 className="text-sm font-semibold mb-3">选择修复方案</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map((option) => (
                  <RepairOptionCard
                    key={option.optionId}
                    option={option}
                    selected={selectedOptionId === option.optionId}
                    onSelect={() => setSelectedOptionId(option.optionId)}
                  />
                ))}
              </div>
              {options.length === 0 && (
                <p className="text-sm text-muted-foreground">暂无可用的修复方案，请返回调整路线或条件。</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              也可{' '}
              <button
                type="button"
                className={exploreUi.linkInline}
                onClick={() => navigate(`${base}/compare`)}
              >
                前往 Compare 页
              </button>{' '}
              查看全部途经地点。
            </p>
          )}
        </div>
      )}

      <PoiConfirmationSheet
        open={poiSheetOpen && Boolean(poiForSheet)}
        onOpenChange={setPoiSheetOpen}
        poi={poiForSheet}
        accessToken={accessToken}
        countryCode={poiCountryCode}
        locale={poiLocale}
        onConfirmed={handlePoiConfirmed}
      />
    </ExploreFlowLayout>
  );
}
