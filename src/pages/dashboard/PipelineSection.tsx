import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TripDetail, PipelineStage } from '@/types/trip';
import { tripsApi } from '@/api/trips';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, Circle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface PipelineSectionProps {
  activeTrip: TripDetail | null;
}

export default function PipelineSection({ activeTrip }: PipelineSectionProps) {
  const navigate = useNavigate();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTrip) {
      loadPipelineStatus();
    } else {
      setStages([]);
    }
  }, [activeTrip]);

  const loadPipelineStatus = async () => {
    if (!activeTrip) return;

    try {
      setLoading(true);
      const data = await tripsApi.getPipelineStatus(activeTrip.id);
      setStages(data.stages || []);
    } catch (err: any) {
      console.error('Failed to load pipeline status:', err);
      // 如果API失败，使用默认阶段（降级处理）
      setStages(getDefaultStages());
    } finally {
      setLoading(false);
    }
  };

  // 降级处理：如果API失败，使用基于行程状态的默认阶段
  const getDefaultStages = (): PipelineStage[] => {
    if (!activeTrip) return [];

    return [
      {
        id: '1',
        name: '明确旅行目标',
        status: 'completed',
      },
      {
        id: '2',
        name: '判断路线是否成立',
        status: activeTrip.TripDay && activeTrip.TripDay.length > 0 ? 'completed' : 'pending',
      },
      {
        id: '3',
        name: '生成可执行日程',
        status:
          activeTrip.statistics?.progress === 'ONGOING' || activeTrip.statistics?.totalItems > 0
            ? 'in-progress'
            : 'pending',
      },
      {
        id: '4',
        name: '风险评估与缓冲',
        status: 'pending',
      },
      {
        id: '5',
        name: 'Plan B 备选系统',
        status: 'pending',
      },
      {
        id: '6',
        name: '行前准备清单',
        status: 'pending',
      },
    ];
  };

  const getStatusIcon = (status: PipelineStage['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'risk':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: PipelineStage['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            ✓
          </Badge>
        );
      case 'in-progress':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            进行中
          </Badge>
        );
      case 'risk':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            有风险
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
            未开始
          </Badge>
        );
    }
  };

  const getRouteForStage = (stage: PipelineStage): string | undefined => {
    if (!activeTrip) return undefined;

    switch (stage.id) {
      case '1':
      case '2':
        return `/dashboard/trips/${activeTrip.id}`;
      case '3':
        return `/dashboard/trips/${activeTrip.id}/schedule`;
      case '4':
        return `/dashboard/trips/${activeTrip.id}/decision`;
      case '5':
        return `/dashboard/trips/what-if?tripId=${activeTrip.id}`;
      case '6':
        return `/dashboard/trips/${activeTrip.id}`;
      default:
        return undefined;
    }
  };

  if (!activeTrip) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>旅程工作流</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-6 h-6 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stages.length === 0) {
    return null;
  }

  // 计算进度百分比
  const completedCount = stages.filter((s) => s.status === 'completed').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>旅程工作流</CardTitle>
        <CardDescription>
          决策阶段图 - 清晰了解你的旅程规划进度 ({completedCount}/{stages.length} 已完成)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const route = getRouteForStage(stage);
            return (
              <div
                key={stage.id}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-lg border transition-all',
                  stage.status === 'in-progress' && 'bg-blue-50 border-blue-200',
                  stage.status === 'completed' && 'bg-green-50/50 border-green-200',
                  stage.status === 'risk' && 'bg-amber-50 border-amber-200',
                  stage.status === 'pending' && 'bg-gray-50 border-gray-200',
                  route && 'cursor-pointer hover:shadow-md'
                )}
                onClick={() => route && navigate(route)}
              >
                {/* 序号和图标 */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-gray-300 text-sm font-medium">
                    {index + 1}
                  </div>
                  {getStatusIcon(stage.status)}
                </div>

                {/* 内容 */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                    <div className="flex items-center gap-2">
                      {stage.completedAt && (
                        <span className="text-xs text-gray-500">
                          {format(new Date(stage.completedAt), 'M月d日', { locale: zhCN })}
                        </span>
                      )}
                      {getStatusBadge(stage.status)}
                    </div>
                  </div>
                  {stage.summary && (
                    <div className="mt-2 p-2 bg-white/60 rounded text-sm text-gray-700 whitespace-pre-line">
                      {stage.summary}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
