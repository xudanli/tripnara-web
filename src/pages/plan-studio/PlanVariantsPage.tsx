import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decisionAdapter } from '@/api/decision-adapter';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import { tripsApi } from '@/api/trips';
import PlanVariantsComparison from '@/components/constraints/PlanVariantsComparison';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { PlanVariant } from '@/types/constraints';
import { toast } from 'sonner';
import { LogoLoading } from '@/components/common/LogoLoading';
import { buildGenerateMultiplePlansRequest } from '@/lib/plan-variants-request';
import type { TripDetail } from '@/types/trip';

export default function PlanVariantsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [variants, setVariants] = useState<PlanVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [_trip, setTrip] = useState<TripDetail | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  useEffect(() => {
    if (tripId) {
      loadTrip();
    }
  }, [tripId]);

  const loadTrip = async () => {
    if (!tripId) return;
    try {
      const tripData = await tripsApi.getById(tripId);
      setTrip(tripData);
    } catch (error: unknown) {
      console.error('加载行程失败:', error);
      toast.error('加载行程失败，请稍后重试');
    }
  };

  const handleGenerateVariants = async () => {
    if (!tripId) return;

    setLoading(true);
    try {
      const [planStateData, tripData] = await Promise.all([
        planningWorkbenchApi.getState(tripId).catch(() => null),
        tripsApi.getById(tripId).catch(() => null),
      ]);

      if (!tripData) {
        toast.error('无法加载行程信息');
        return;
      }

      const request = buildGenerateMultiplePlansRequest(tripData, planStateData);
      const result = await decisionAdapter.generateMultiplePlans(request);

      setVariants(result.variants);
      setRunId(result.log.runId);
      toast.success(`成功生成 ${result.variants.length} 个方案`);
    } catch (error: unknown) {
      console.error('生成方案失败:', error);
      const message =
        error instanceof Error ? error.message : '生成方案失败，请稍后重试';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVariant = async (variant: PlanVariant) => {
    if (!tripId || !variant.plan) {
      toast.warning('方案数据不完整，无法应用');
      return;
    }

    try {
      toast.success(
        `已选择${variant.id === 'conservative' ? '保守' : variant.id === 'balanced' ? '平衡' : '激进'}方案`,
      );

      setTimeout(() => {
        navigate(`/dashboard/plan-studio?tripId=${tripId}`);
      }, 1500);
    } catch (error: unknown) {
      console.error('应用方案失败:', error);
      const message =
        error instanceof Error ? error.message : '应用方案失败，请稍后重试';
      toast.error(message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/dashboard/plan-studio?tripId=${tripId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回规划工作台
          </Button>
          <div>
            <h1 className="text-2xl font-bold">方案对比</h1>
            <p className="text-muted-foreground mt-1">
              生成多个方案变体，选择最适合您的方案
            </p>
          </div>
        </div>
        <Button onClick={handleGenerateVariants} disabled={loading || !tripId}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            '生成多个方案'
          )}
        </Button>
      </div>

      {variants.length > 0 && (
        <PlanVariantsComparison
          variants={variants}
          onSelect={handleSelectVariant}
          runId={runId || undefined}
          tripId={tripId}
          userId={undefined}
        />
      )}

      {!loading && variants.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">还没有生成方案</h3>
              <p className="text-muted-foreground mb-4">
                点击「生成多个方案」按钮，系统将为您生成保守、平衡、激进三种方案供您对比选择
              </p>
              <Button onClick={handleGenerateVariants} disabled={!tripId}>
                生成多个方案
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LogoLoading size={40} className="mb-4" />
            <p className="text-muted-foreground">正在生成方案，请稍候...</p>
            <p className="text-sm text-muted-foreground mt-2">这可能需要 10-30 秒</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
