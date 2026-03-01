/**
 * 学习进度卡片组件
 * 展示系统对用户偏好的学习程度
 * 使用 /v2/user/optimization/preferences 接口
 */

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  Shield,
  Star,
  Wallet,
  Target,
  Activity,
  Clock,
  Cloud,
  Compass,
  Gauge,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { optimizationApi } from '@/api/optimization-v2';
import { useAuth } from '@/hooks/useAuth';

interface LearningProgressCardProps {
  className?: string;
}

/** 
 * API 返回的 weights 结构
 * GET /v2/user/optimization/preferences/:userId
 */
interface PreferencesWeights {
  safety: number;
  experienceDensity: number;
  philosophyAlignment: number;
  timeSlack: number;
  fatigueRisk: number;
  weatherRisk: number;
  budgetOverrun: number;
  pacingVariance: number;
}

const dimensionConfig: Record<keyof PreferencesWeights, { label: string; icon: React.ReactNode; color: string }> = {
  safety: {
    label: '安全',
    icon: <Shield className="h-4 w-4" />,
    color: 'text-green-500',
  },
  experienceDensity: {
    label: '体验密度',
    icon: <Star className="h-4 w-4" />,
    color: 'text-amber-500',
  },
  philosophyAlignment: {
    label: '哲学契合',
    icon: <Compass className="h-4 w-4" />,
    color: 'text-purple-500',
  },
  timeSlack: {
    label: '时间余量',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-blue-500',
  },
  fatigueRisk: {
    label: '疲劳风险',
    icon: <Activity className="h-4 w-4" />,
    color: 'text-orange-500',
  },
  weatherRisk: {
    label: '天气风险',
    icon: <Cloud className="h-4 w-4" />,
    color: 'text-cyan-500',
  },
  budgetOverrun: {
    label: '预算超支',
    icon: <Wallet className="h-4 w-4" />,
    color: 'text-emerald-500',
  },
  pacingVariance: {
    label: '节奏波动',
    icon: <Gauge className="h-4 w-4" />,
    color: 'text-rose-500',
  },
};

const defaultConfig = {
  label: '未知',
  icon: <Activity className="h-4 w-4" />,
  color: 'text-gray-500',
};

function WeightItem({
  dimension,
  weight,
}: {
  dimension: string;
  weight: number;
}) {
  const config = dimensionConfig[dimension as keyof PreferencesWeights] || defaultConfig;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={config.color}>{config.icon}</span>
          <span className="text-sm font-medium">{config.label}</span>
        </div>
        <span className="text-xs font-medium">
          {(weight * 100).toFixed(0)}%
        </span>
      </div>
      <Progress value={weight * 100} className="h-2" />
    </div>
  );
}

export function LearningProgressCard({ className }: LearningProgressCardProps) {
  const { user } = useAuth();
  
  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['optimization-v2', 'preferences', user?.id],
    queryFn: () => optimizationApi.getPreferences(user!.id),
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-pulse flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">加载中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !preferences) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <span className="text-muted-foreground">
            {error instanceof Error ? error.message : '暂无学习数据'}
          </span>
        </CardContent>
      </Card>
    );
  }

  const confidencePercent = preferences.confidence 
    ? (preferences.confidence * 100).toFixed(0) 
    : '0';
  const lastUpdatedDate = preferences.lastUpdated 
    ? new Date(preferences.lastUpdated).toLocaleDateString('zh-CN')
    : '-';

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              学习进度
            </CardTitle>
            <CardDescription>
              系统正在学习您的偏好，以提供更精准的推荐
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            置信度 {confidencePercent}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 总体指标 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">学习置信度</span>
            </div>
            <div className="text-2xl font-bold">{confidencePercent}%</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">最后更新</span>
            </div>
            <div className="text-sm font-medium">{lastUpdatedDate}</div>
          </div>
        </div>

        {/* 8维权重详情 */}
        <div>
          <h4 className="text-sm font-semibold mb-4">个性化权重配置</h4>
          <div className="space-y-4">
            {preferences.weights && Object.entries(preferences.weights).map(([key, value]) => (
              <WeightItem
                key={key}
                dimension={key}
                weight={typeof value === 'number' ? value : 0}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default LearningProgressCard;
