import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import type {
  ExecutePlanningWorkbenchResponse,
  ConsolidatedDecisionStatus,
} from '@/api/planning-workbench';
import { tripsApi } from '@/api/trips';
import type { TripDetail } from '@/types/trip';
import { toast } from 'sonner';
import PersonaCard from '@/components/planning-workbench/PersonaCard';
import { cn } from '@/lib/utils';
import {
  getGateStatusIcon,
  getGateStatusLabel,
  getGateStatusClasses,
  normalizeGateStatus,
} from '@/lib/gate-status';

interface PlanningWorkbenchTabProps {
  tripId: string;
}

export default function PlanningWorkbenchTab({ tripId }: PlanningWorkbenchTabProps) {
  const [loading, setLoading] = useState(false);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [result, setResult] = useState<ExecutePlanningWorkbenchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    if (!tripId) return;
    try {
      const data = await tripsApi.getById(tripId);
      setTrip(data);
    } catch (err) {
      console.error('Failed to load trip:', err);
      toast.error('加载行程信息失败');
    }
  };

  const handleExecute = async () => {
    if (!trip) {
      toast.error('请先加载行程信息');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 构建规划上下文
      // 从 trip.destination 解析国家代码和城市
      const destinationParts = trip.destination?.split(',') || [];
      const country = destinationParts[0]?.trim().toUpperCase() || '';
      const city = destinationParts.length > 1 ? destinationParts.slice(1).join(',').trim() : undefined;

      // 计算天数
      const days = trip.TripDay?.length || 0;
      if (days === 0) {
        toast.error('行程天数不能为0，请先设置行程日期');
        return;
      }

      // 构建约束条件
      const constraints: any = {};
      if (trip.totalBudget) {
        constraints.budget = {
          total: trip.totalBudget,
          currency: 'CNY', // 默认 CNY，可以从 trip 中获取
        };
      }

      // 调用规划工作台 API
      const response = await planningWorkbenchApi.execute({
        context: {
          destination: {
            country,
            city,
          },
          days,
          travelMode: 'mixed', // 默认混合模式，可以从 trip 配置中获取
          constraints: Object.keys(constraints).length > 0 ? constraints : undefined,
        },
        tripId,
        userAction: 'generate',
      });

      setResult(response);
      toast.success('规划工作台执行成功');
    } catch (err: any) {
      console.error('Planning workbench execution failed:', err);
      const errorMessage = err.message || '执行规划工作台失败，请稍后重试';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getConsolidatedDecisionStyle = (status: ConsolidatedDecisionStatus) => {
    // 标准化状态（支持旧状态映射）
    const normalizedStatus = normalizeGateStatus(status);
    
    // 获取状态配置
    const StatusIcon = getGateStatusIcon(normalizedStatus);
    const label = getGateStatusLabel(normalizedStatus);
    const className = getGateStatusClasses(normalizedStatus);
    
    return {
      icon: <StatusIcon className="w-5 h-5" />,
      label,
      className,
    };
  };

  return (
    <div className="space-y-6">
      {/* 操作区域 */}
      <Card>
        <CardHeader>
          <CardTitle>规划工作台</CardTitle>
          <CardDescription>
            做决策与做取舍的地方。三人格（Abu/Dr.Dre/Neptune）将评估您的行程方案。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {trip
                  ? `行程：${trip.destination || '未设置'}，${trip.TripDay?.length || 0} 天`
                  : '请先加载行程信息'}
              </p>
            </div>
            <Button
              onClick={handleExecute}
              disabled={loading || !trip}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  执行中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  执行规划
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Card className={cn('border', getGateStatusClasses('REJECT'))}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              {(() => {
                const ErrorIcon = getGateStatusIcon('REJECT');
                return <ErrorIcon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', getGateStatusClasses('REJECT').split(' ').find(cls => cls.startsWith('text-')))} />;
              })()}
              <div className="flex-1">
                <p className={cn('text-sm font-medium', getGateStatusClasses('REJECT').split(' ').find(cls => cls.startsWith('text-')))}>执行失败</p>
                <p className={cn('text-sm mt-1', getGateStatusClasses('REJECT').split(' ').find(cls => cls.startsWith('text-')))}>{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 结果展示 */}
      {result && (
        <div className="space-y-6">
          {/* 综合决策 */}
          {result.uiOutput.consolidatedDecision && (
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>综合决策</CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1',
                      getConsolidatedDecisionStyle(result.uiOutput.consolidatedDecision.status)
                        .className
                    )}
                  >
                    {getConsolidatedDecisionStyle(result.uiOutput.consolidatedDecision.status).icon}
                    {getConsolidatedDecisionStyle(result.uiOutput.consolidatedDecision.status).label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {result.uiOutput.consolidatedDecision.summary}
                </p>
                {result.uiOutput.consolidatedDecision.nextSteps &&
                  result.uiOutput.consolidatedDecision.nextSteps.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-900">下一步：</p>
                      <ul className="space-y-1">
                        {result.uiOutput.consolidatedDecision.nextSteps.map((step, index) => (
                          <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

          {/* 三人格输出 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PersonaCard persona={result.uiOutput.personas.abu} />
            <PersonaCard persona={result.uiOutput.personas.drdre} />
            <PersonaCard persona={result.uiOutput.personas.neptune} />
          </div>

          {/* 规划状态信息 */}
          {result.planState && (
            <Card>
              <CardHeader>
                <CardTitle>规划状态</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">规划 ID</p>
                    <p className="font-medium mt-1">{result.planState.plan_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">版本</p>
                    <p className="font-medium mt-1">{result.planState.plan_version}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">状态</p>
                    <Badge variant="outline" className="mt-1">
                      {result.planState.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">时间戳</p>
                    <p className="font-medium mt-1 text-xs">
                      {new Date(result.uiOutput.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 空状态 */}
      {!result && !loading && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                点击"执行规划"按钮开始规划工作台流程
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
