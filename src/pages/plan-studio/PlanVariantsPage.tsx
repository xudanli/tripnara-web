import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decisionApi } from '@/api/decision';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import { tripsApi } from '@/api/trips';
import PlanVariantsComparison from '@/components/constraints/PlanVariantsComparison';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { PlanVariant, ConstraintDSL } from '@/types/constraints';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

export default function PlanVariantsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [variants, setVariants] = useState<PlanVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [trip, setTrip] = useState<any>(null);
  const [runId, setRunId] = useState<string | null>(null);

  useEffect(() => {
    if (tripId) {
      loadTrip();
    }
  }, [tripId]);

  const loadTrip = async () => {
    if (!tripId) return;
    try {
      const tripData = await tripsApi.getTrip(tripId);
      setTrip(tripData);
    } catch (error: any) {
      console.error('加载行程失败:', error);
      toast.error('加载行程失败，请稍后重试');
    }
  };

  const handleGenerateVariants = async () => {
    if (!tripId) return;
    
    setLoading(true);
    try {
      // 加载当前状态和约束
      const [planStateData, tripData] = await Promise.all([
        planningWorkbenchApi.getState(tripId).catch(() => null),
        tripsApi.getTrip(tripId).catch(() => null),
      ]);

      if (!tripData) {
        toast.error('无法加载行程信息');
        return;
      }

      // 构建约束DSL
      const constraints: ConstraintDSL = {
        hard_constraints: {},
        soft_constraints: {},
      };

      // 添加预算约束
      if (tripData.budgetConfig?.totalBudget) {
        constraints.hard_constraints.budget = {
          max: tripData.budgetConfig.totalBudget,
          currency: tripData.budgetConfig.currency || 'CNY',
          flexible: false,
        };
      }

      // 添加日期窗口约束
      if (tripData.startDate && tripData.endDate) {
        constraints.hard_constraints.date_window = {
          start: tripData.startDate,
          end: tripData.endDate,
          flexible: false,
        };
      }

      // 添加节奏偏好（如果有）
      if (tripData.preferences?.pace) {
        const paceMap: Record<string, 'relaxed' | 'moderate' | 'intense'> = {
          'relaxed': 'relaxed',
          'moderate': 'moderate',
          'intense': 'intense',
          '轻松': 'relaxed',
          '中等': 'moderate',
          '紧凑': 'intense',
        };
        const pacePreference = paceMap[tripData.preferences.pace.toLowerCase()] || 'moderate';
        constraints.soft_constraints.pace = {
          preference: pacePreference,
          weight: 0.8,
        };
      }

      // 构建状态对象
      const state = {
        context: {
          destination: tripData.destination,
          startDate: tripData.startDate,
          durationDays: tripData.durationDays || 7,
          preferences: tripData.preferences || {},
          budget: tripData.budgetConfig || {},
        },
        candidatesByDate: planStateData?.candidatesByDate || {},
        signals: planStateData?.signals || {},
        policies: {
          constraintDSL: constraints,
        },
      };

      const result = await decisionApi.generateMultiplePlans({
        state,
        constraints,
      });

      setVariants(result.variants);
      setRunId(result.log.runId); // 保存 runId 用于反馈
      toast.success(`成功生成 ${result.variants.length} 个方案`);
    } catch (error: any) {
      console.error('生成方案失败:', error);
      toast.error(error.message || '生成方案失败，请稍后重试');
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
      // TODO: 应用选中的方案
      // 这里需要调用规划工作台的API来应用方案
      // await planningWorkbenchApi.applyPlan(tripId, variant.plan);
      
      toast.success(`已选择${variant.id === 'conservative' ? '保守' : variant.id === 'balanced' ? '平衡' : '激进'}方案`);
      
      // 返回规划工作台
      setTimeout(() => {
        navigate(`/dashboard/plan-studio?tripId=${tripId}`);
      }, 1500);
    } catch (error: any) {
      console.error('应用方案失败:', error);
      toast.error(error.message || '应用方案失败，请稍后重试');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 头部 */}
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
        <Button 
          onClick={handleGenerateVariants} 
          disabled={loading || !tripId}
        >
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

      {/* 方案对比 */}
      {variants.length > 0 && (
        <PlanVariantsComparison
          variants={variants}
          onSelect={handleSelectVariant}
          runId={runId || undefined}
          tripId={tripId}
          userId={undefined} // TODO: 从用户上下文获取
        />
      )}

      {/* 空状态 */}
      {!loading && variants.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">还没有生成方案</h3>
              <p className="text-muted-foreground mb-4">
                点击"生成多个方案"按钮，系统将为您生成保守、平衡、激进三种方案供您对比选择
              </p>
              <Button onClick={handleGenerateVariants} disabled={!tripId}>
                生成多个方案
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 加载状态 */}
      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Spinner className="w-8 h-8 mb-4" />
            <p className="text-muted-foreground">正在生成方案，请稍候...</p>
            <p className="text-sm text-muted-foreground mt-2">
              这可能需要 10-30 秒
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
