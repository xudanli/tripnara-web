import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { TrustedProjectPublishBlockedCard } from '../components/TrustedProjectPublishBlockedCard';
import { useCanPublishTrustedProject } from '@/hooks/useCanPublishTrustedProject';
import { tripsApi } from '@/api/trips';
import { trustedProjectsApi } from '@/api/trusted-projects';
import {
  buildTrustedProjectCreateInitialFromRouteTemplate,
  parseTrustedProjectCreateSearchParams,
} from '@/lib/trusted-project-create-bridge';
import type { TrustedProjectCommercialType } from '@/types/trusted-projects';

export default function TrustedProjectCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canPublish, isLoading: capsLoading, blockReason } = useCanPublishTrustedProject();
  const { tripId: tripIdParam, routeTemplate } = useMemo(
    () => parseTrustedProjectCreateSearchParams(searchParams),
    [searchParams]
  );
  const templateInitial = useMemo(
    () => buildTrustedProjectCreateInitialFromRouteTemplate(routeTemplate),
    [routeTemplate]
  );

  const [tripLoading, setTripLoading] = useState(Boolean(tripIdParam));
  const [linkedTripId, setLinkedTripId] = useState<string | undefined>(tripIdParam);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState('');
  const [commercialType, setCommercialType] =
    useState<TrustedProjectCommercialType>('NON_COMMERCIAL');
  const [slotsTotal, setSlotsTotal] = useState('6');
  const [budgetMinYuan, setBudgetMinYuan] = useState('');
  const [budgetMaxYuan, setBudgetMaxYuan] = useState('');
  const [riskDisclosure, setRiskDisclosure] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [prefillApplied, setPrefillApplied] = useState(false);

  useEffect(() => {
    if (prefillApplied) return;

    if (templateInitial) {
      setTitle((prev) => prev || templateInitial.title || '');
      setDestination((prev) => prev || templateInitial.destination || '');
      setStartDate((prev) => prev || templateInitial.startDate || '');
      setEndDate((prev) => prev || templateInitial.endDate || '');
      setSummary((prev) => prev || templateInitial.summary || '');
      if (templateInitial.slotsTotal != null) {
        setSlotsTotal(String(templateInitial.slotsTotal));
      }
      if (templateInitial.budgetMinCents != null) {
        setBudgetMinYuan(String(Math.round(templateInitial.budgetMinCents / 100)));
      }
      if (templateInitial.budgetMaxCents != null) {
        setBudgetMaxYuan(String(Math.round(templateInitial.budgetMaxCents / 100)));
      }
    }
  }, [templateInitial, prefillApplied]);

  useEffect(() => {
    if (!tripIdParam) {
      setTripLoading(false);
      return;
    }

    let cancelled = false;
    setLinkedTripId(tripIdParam);
    setTripLoading(true);

    void tripsApi
      .getById(tripIdParam)
      .then((trip) => {
        if (cancelled) return;
        setTitle((prev) => prev || trip.name || `${trip.destination} 招募`);
        setDestination((prev) => prev || trip.destination);
        setStartDate((prev) => prev || trip.startDate?.slice(0, 10) || '');
        setEndDate((prev) => prev || trip.endDate?.slice(0, 10) || '');
        if (trip.totalBudget > 0) {
          setBudgetMaxYuan((prev) => prev || String(Math.round(trip.totalBudget / 100)));
        }
        setPrefillApplied(true);
      })
      .catch(() => {
        if (!cancelled) toast.message('无法加载关联行程，请手动填写');
      })
      .finally(() => {
        if (!cancelled) setTripLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tripIdParam]);

  useEffect(() => {
    if (templateInitial && !tripIdParam) {
      setPrefillApplied(true);
    }
  }, [templateInitial, tripIdParam]);

  const prefillBanner = linkedTripId
    ? `已关联行程 ${linkedTripId.slice(0, 8)}…`
    : templateInitial?.routeTemplateHeadline;

  const handleCreate = async () => {
    if (!title.trim() || !destination.trim() || !startDate || !endDate || !riskDisclosure.trim()) {
      toast.error('请填写标题、目的地、日期与风险披露');
      return;
    }
    if (commercialType === 'COMMERCIAL' && !refundPolicy.trim()) {
      toast.error('商业项目需填写退款政策');
      return;
    }

    const budgetMinCents = budgetMinYuan.trim()
      ? Math.round(Number.parseFloat(budgetMinYuan) * 100)
      : undefined;
    const budgetMaxCents = budgetMaxYuan.trim()
      ? Math.round(Number.parseFloat(budgetMaxYuan) * 100)
      : undefined;

    setSubmitting(true);
    try {
      const created = await trustedProjectsApi.create({
        title: title.trim(),
        destination: destination.trim(),
        startDate,
        endDate,
        summary: summary.trim(),
        commercialType,
        slotsTotal: Number.parseInt(slotsTotal, 10) || 6,
        budgetMinCents,
        budgetMaxCents,
        riskDisclosure: riskDisclosure.trim(),
        refundPolicy: commercialType === 'COMMERCIAL' ? refundPolicy.trim() : undefined,
        tripId: linkedTripId,
      });
      toast.success('草稿已创建');
      navigate(`/dashboard/trusted-projects/${created.id}/manage`);
    } catch {
      toast.error('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard/trusted-projects"
          title="创建可信项目"
          subtitle="保存草稿后提交平台审核"
          maxWidth="full"
        />
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 md:px-6 md:py-8">
        {capsLoading && (
          <div className="flex justify-center py-16">
            <LogoLoading size={36} />
          </div>
        )}

        {!capsLoading && !canPublish && (
          <TrustedProjectPublishBlockedCard reason={blockReason} />
        )}

        {!capsLoading && canPublish && (
          <>
        {tripLoading && (
          <div className="mb-4 flex justify-center">
            <LogoLoading size={28} />
          </div>
        )}

        {prefillBanner && !tripLoading && (
          <p className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
            {prefillBanner}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">项目信息</CardTitle>
            <CardDescription>公开发布需发布权限与专业/机构认证</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tp-title">标题</Label>
              <Input id="tp-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tp-dest">目的地</Label>
              <Input id="tp-dest" value={destination} onChange={(e) => setDestination(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tp-start">开始日期</Label>
                <Input
                  id="tp-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tp-end">结束日期</Label>
                <Input
                  id="tp-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>项目类型</Label>
              <RadioGroup
                value={commercialType}
                onValueChange={(v) => setCommercialType(v as TrustedProjectCommercialType)}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="NON_COMMERCIAL" id="nc" />
                  <Label htmlFor="nc" className="font-normal">
                    非商业
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="COMMERCIAL" id="c" />
                  <Label htmlFor="c" className="font-normal">
                    商业
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tp-slots">总名额</Label>
              <Input
                id="tp-slots"
                type="number"
                min={1}
                value={slotsTotal}
                onChange={(e) => setSlotsTotal(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tp-bmin">预算下限（元，可选）</Label>
                <Input
                  id="tp-bmin"
                  type="number"
                  min={0}
                  value={budgetMinYuan}
                  onChange={(e) => setBudgetMinYuan(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tp-bmax">预算上限（元，可选）</Label>
                <Input
                  id="tp-bmax"
                  type="number"
                  min={0}
                  value={budgetMaxYuan}
                  onChange={(e) => setBudgetMaxYuan(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tp-summary">简介</Label>
              <Textarea
                id="tp-summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tp-risk">风险披露（必填）</Label>
              <Textarea
                id="tp-risk"
                value={riskDisclosure}
                onChange={(e) => setRiskDisclosure(e.target.value)}
                rows={3}
              />
            </div>
            {commercialType === 'COMMERCIAL' && (
              <div className="space-y-2">
                <Label htmlFor="tp-refund">退款政策（必填）</Label>
                <Textarea
                  id="tp-refund"
                  value={refundPolicy}
                  onChange={(e) => setRefundPolicy(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            <Button onClick={() => void handleCreate()} disabled={submitting || tripLoading} className="w-full">
              {submitting ? '创建中…' : '保存草稿'}
            </Button>
          </CardContent>
        </Card>
          </>
        )}
      </div>
    </div>
  );
}
