/**
 * 商品包装 + 承诺（Sprint 4A / 4B）
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ExploreFlowLayout, ExploreFooterNav } from '@/features/exploration/components/ExploreFlowLayout';
import { PackageCardStack } from '@/features/exploration/components/PackageCardStack';
import { PriceRangeInput } from '@/features/exploration/components/PriceRangeInput';
import { ResearchDisclaimer } from '@/features/exploration/components/ResearchDisclaimer';
import { DepositCheckoutPanel } from '@/features/exploration/components/DepositCheckoutPanel';
import { exploreBasePath } from '@/features/exploration/constants';
import { toApiRouteId } from '@/features/exploration/lib/route-id.util';
import {
  fetchContinuePackages,
  isExplorationUnavailable,
  submitContinueFeedback,
  submitResearchCommitment,
  trackExplorationEvent,
} from '@/features/exploration/api/client';
import type { ContinuePackageCard } from '@/features/exploration/api/types';
import { useExplorationFlow } from '@/features/exploration/hooks/useExplorationFlow';
import { useExplorationTravelContext } from '@/features/exploration/context/ExplorationTravelContext';
import { ExplorePlanSummaryStrip } from '@/features/exploration/components/ExplorePlanSummaryStrip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MOCK_PACKAGES: ContinuePackageCard[] = [
  { packageId: 'full_report', title: '完整研究报告', subtitle: 'PDF + 路线证据链' },
  { packageId: 'expert_review', title: '专家复核', subtitle: '48h 内人工审阅' },
  { packageId: 'trip_assurance', title: '行程保障', subtitle: '出发前再次验证' },
  { packageId: 'auto_repair', title: '自动修复', subtitle: '问题出现即推送方案' },
];

export default function ExploreContinuePage() {
  const { scenarioId = '' } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const base = exploreBasePath(scenarioId);
  const { flow } = useExplorationFlow(scenarioId);
  const travelContext = useExplorationTravelContext();

  const [packages, setPackages] = useState<ContinuePackageCard[]>(MOCK_PACKAGES);
  const [rankings, setRankings] = useState<string[]>(MOCK_PACKAGES.map((p) => p.packageId));
  const [valueScores, setValueScores] = useState<Record<string, number>>(
    Object.fromEntries(MOCK_PACKAGES.map((p) => [p.packageId, 4])),
  );
  const [trustScores, setTrustScores] = useState<Record<string, number>>(
    Object.fromEntries(MOCK_PACKAGES.map((p) => [p.packageId, 4])),
  );
  const [priceMin, setPriceMin] = useState(29);
  const [priceMax, setPriceMax] = useState(79);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewed, setViewed] = useState<Set<string>>(new Set());

  const decisionBackPath = useMemo(() => {
    if (flow.lastProblemId) {
      return `${base}/decisions/${encodeURIComponent(flow.lastProblemId)}`;
    }
    const routeId =
      travelContext.planView?.selectedRouteId ??
      flow.selectedRouteId ??
      'highland-south';
    return `${base}/routes/${encodeURIComponent(toApiRouteId(routeId))}`;
  }, [base, flow.lastProblemId, flow.selectedRouteId, travelContext.planView?.selectedRouteId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchContinuePackages(scenarioId);
        if (cancelled) return;
        const ordered = data.presentationOrder
          .map((id) => data.packages.find((p) => p.packageId === id))
          .filter(Boolean) as ContinuePackageCard[];
        const list = ordered.length ? ordered : data.packages;
        setPackages(list);
        setRankings(list.map((p) => p.packageId));
        setValueScores(Object.fromEntries(list.map((p) => [p.packageId, 4])));
        setTrustScores(Object.fromEntries(list.map((p) => [p.packageId, 4])));
      } catch (err) {
        if (!isExplorationUnavailable(err)) {
          console.warn('[explore/continue] API failed, using mock', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scenarioId]);

  useEffect(() => {
    packages.forEach((pkg) => {
      if (viewed.has(pkg.packageId) || !flow.sessionId) return;
      setViewed((prev) => new Set(prev).add(pkg.packageId));
      void trackExplorationEvent(flow.sessionId!, 'package_card_viewed', {
        scenarioId,
        protocolId: flow.researchProtocolId,
        entryVariant: flow.assignedVariant,
        tripId: flow.tripId,
        currentStep: 'continue',
        packageId: pkg.packageId,
      });
    });
  }, [packages, viewed, flow, scenarioId]);

  const handleScoreChange = (packageId: string, field: 'value' | 'trust', score: number) => {
    if (field === 'value') {
      setValueScores((prev) => ({ ...prev, [packageId]: score }));
    } else {
      setTrustScores((prev) => ({ ...prev, [packageId]: score }));
    }
  };

  const handleSubmitFeedback = async () => {
    setSubmitting(true);
    try {
      await submitContinueFeedback(scenarioId, {
        packageRankings: rankings,
        valueScores,
        trustScores,
        acceptablePriceUsd: { currency: 'USD', min: priceMin, max: priceMax },
        leastPreferredPackageId: rankings[rankings.length - 1],
      });
      if (flow.sessionId) {
        void trackExplorationEvent(flow.sessionId, 'package_rank_submitted', {
          scenarioId,
          currentStep: 'continue',
        });
      }
      toast.success('感谢你的反馈');
    } catch (err) {
      if (isExplorationUnavailable(err)) {
        toast.message('演示模式：反馈已记录');
      } else {
        toast.error(err instanceof Error ? err.message : '提交失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotifyMe = async () => {
    if (!flow.sessionId) return;
    void trackExplorationEvent(flow.sessionId, 'commitment_option_selected', {
      scenarioId,
      currentStep: 'continue',
      commitmentType: 'NOTIFY_ME',
    });
    try {
      await submitResearchCommitment(flow.sessionId, {
        commitmentType: 'NOTIFY_ME',
        email: email || undefined,
      });
      void trackExplorationEvent(flow.sessionId, 'notify_me_submitted', {
        scenarioId,
        currentStep: 'continue',
      });
      toast.success('已登记，产品上线时会通知你');
    } catch (err) {
      if (isExplorationUnavailable(err)) {
        toast.message('演示模式：已登记通知');
      } else {
        toast.error(err instanceof Error ? err.message : '提交失败');
      }
    }
  };

  const handleSelfCheck = async () => {
    if (!flow.sessionId) return;
    void trackExplorationEvent(flow.sessionId, 'commitment_option_selected', {
      scenarioId,
      currentStep: 'continue',
      commitmentType: 'SELF_CHECK',
    });
    try {
      await submitResearchCommitment(flow.sessionId, { commitmentType: 'SELF_CHECK' });
      void trackExplorationEvent(flow.sessionId, 'self_check_selected', {
        scenarioId,
        currentStep: 'continue',
      });
      toast.success('已记录你的选择');
    } catch (err) {
      if (isExplorationUnavailable(err)) {
        toast.message('演示模式：已记录');
      } else {
        toast.error(err instanceof Error ? err.message : '提交失败');
      }
    }
  };

  return (
    <ExploreFlowLayout
      scenarioId={scenarioId}
      currentStep="continue"
      title="如果 TripNARA 能帮你把这些路线真正走通，你愿意为哪种结果付费？"
      subtitle="请按偏好排序商品卡，并告诉我们可接受的价格区间。"
      onBack={() => navigate(decisionBackPath)}
      maxWidth="6xl"
      dense
      footer={
        <ExploreFooterNav
          onBack={() =>
            navigate(
              flow.lastProblemId
                ? `${base}/decisions/${encodeURIComponent(flow.lastProblemId)}`
                : `${base}/routes/${encodeURIComponent(toApiRouteId(flow.selectedRouteId ?? 'highland-south'))}`,
            )
          }
          backLabel="返回"
          onPrimary={handleSubmitFeedback}
          primaryLabel={submitting ? '提交中…' : '提交反馈'}
          primaryDisabled={submitting}
        />
      }
    >
      <div className="space-y-2">
        <ExplorePlanSummaryStrip className="py-2 gap-1" />

        {loading && (
          <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            正在加载商品卡…
          </p>
        )}

        <ResearchDisclaimer className="mb-0 p-2.5 rounded-xl text-[11px] leading-snug" />

        <PackageCardStack
          packages={packages}
          rankings={rankings}
          valueScores={valueScores}
          trustScores={trustScores}
          onReorder={setRankings}
          onScoreChange={handleScoreChange}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <p className="text-[11px] font-medium text-foreground mb-1.5">可接受价格区间</p>
            <PriceRangeInput
              min={priceMin}
              max={priceMax}
              onChange={(min, max) => {
                setPriceMin(min);
                setPriceMax(max);
              }}
            />
          </div>

          <div>
            <p className="text-[11px] font-medium text-foreground mb-1.5">上线后如何联系你？</p>
            <Input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-8 text-xs mb-2"
            />
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" size="sm" className="h-7 text-xs" onClick={handleNotifyMe}>
                产品上线通知我
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={handleSelfCheck}>
                我自己再核对一遍
              </Button>
            </div>
          </div>
        </div>

        {flow.sessionId && (
          <DepositCheckoutPanel sessionId={flow.sessionId} email={email} />
        )}
      </div>
    </ExploreFlowLayout>
  );
}
