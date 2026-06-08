/**
 * 用户偏好设置面板
 * 
 * 展示和调整用户的8维权重偏好
 */

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { useUserPreferences } from '@/hooks/useOptimizationV2';
import { 
  DEFAULT_WEIGHTS, 
  DIMENSION_LABELS,
  type ObjectiveFunctionWeights,
} from '@/types/optimization-v2';

import {
  Settings2,
  RefreshCw,
  Save,
  RotateCcw,
  Shield,
  Star,
  Compass,
  Clock,
  Battery,
  Cloud,
  Wallet,
  Activity,
  Info,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

// ==================== 类型 ====================

export interface UserPreferencesPanelProps {
  userId?: string;
  initialWeights?: ObjectiveFunctionWeights;
  onWeightsChange?: (weights: ObjectiveFunctionWeights) => void;
  onSave?: (weights: ObjectiveFunctionWeights) => Promise<void>;
  readonly?: boolean;
  compact?: boolean;
  className?: string;
}

// ==================== 配置 ====================

const DIMENSION_ICONS: Record<keyof ObjectiveFunctionWeights, React.ElementType> = {
  safety: Shield,
  experienceDensity: Star,
  philosophyAlignment: Compass,
  timeSlack: Clock,
  fatigueRisk: Battery,
  weatherRisk: Cloud,
  budgetOverrun: Wallet,
  pacingVariance: Activity,
};

const DIMENSION_DESCRIPTIONS: Record<keyof ObjectiveFunctionWeights, string> = {
  safety: '路线安全性，包括路况、海拔、危险区域等风险因素',
  experienceDensity: '旅行体验质量，景点丰富度和活动密度',
  philosophyAlignment: '与您的旅行理念契合度（如探险型、文化型）',
  timeSlack: '行程时间缓冲，预留应对意外的余量',
  fatigueRisk: '控制疲劳累积，避免过度劳累',
  weatherRisk: '天气风险应对，避开恶劣天气',
  budgetOverrun: '预算控制，避免超支',
  pacingVariance: '节奏稳定性，避免忽快忽慢',
};

const DIMENSION_COLORS: Record<keyof ObjectiveFunctionWeights, string> = {
  safety: 'text-red-600',
  experienceDensity: 'text-amber-600',
  philosophyAlignment: 'text-purple-600',
  timeSlack: 'text-blue-600',
  fatigueRisk: 'text-orange-600',
  weatherRisk: 'text-cyan-600',
  budgetOverrun: 'text-green-600',
  pacingVariance: 'text-pink-600',
};

// ==================== 子组件 ====================

function WeightSlider({
  dimensionKey,
  value,
  onChange,
  readonly,
}: {
  dimensionKey: keyof ObjectiveFunctionWeights;
  value: number;
  onChange: (value: number) => void;
  readonly?: boolean;
}) {
  const Icon = DIMENSION_ICONS[dimensionKey];
  const label = DIMENSION_LABELS[dimensionKey];
  const description = DIMENSION_DESCRIPTIONS[dimensionKey];
  const color = DIMENSION_COLORS[dimensionKey];
  const percentage = Math.round(value * 100);
  
  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                <Icon className={cn('h-4 w-4', color)} />
                <Label className="text-sm font-medium">{label}</Label>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p>{description}</p>
            </TooltipContent>
          </Tooltip>
          
          <span className="text-sm font-medium tabular-nums w-12 text-right">
            {percentage}%
          </span>
        </div>
        
        <Slider
          value={[percentage]}
          onValueChange={([v]) => onChange(v / 100)}
          min={0}
          max={50}
          step={1}
          disabled={readonly}
          className={cn(readonly && 'opacity-50 cursor-not-allowed')}
        />
      </div>
    </TooltipProvider>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  let variant: 'default' | 'secondary' | 'outline' = 'outline';
  let label = '学习中';
  
  if (percentage >= 80) {
    variant = 'default';
    label = '高置信';
  } else if (percentage >= 50) {
    variant = 'secondary';
    label = '中置信';
  }
  
  return (
    <Badge variant={variant} className="gap-1">
      <Sparkles className="h-3 w-3" />
      {label} {percentage}%
    </Badge>
  );
}

function WeightsSummary({ weights }: { weights: ObjectiveFunctionWeights }) {
  const total = Object.values(weights).reduce((sum, v) => sum + v, 0);
  const sorted = Object.entries(weights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">最重视:</span>
      {sorted.map(([key, value]) => {
        const Icon = DIMENSION_ICONS[key as keyof ObjectiveFunctionWeights];
        const label = DIMENSION_LABELS[key as keyof ObjectiveFunctionWeights];
        const color = DIMENSION_COLORS[key as keyof ObjectiveFunctionWeights];
        
        return (
          <Badge key={key} variant="outline" className="gap-1 text-xs">
            <Icon className={cn('h-3 w-3', color)} />
            {label}
            <span className="text-muted-foreground">{Math.round(value * 100)}%</span>
          </Badge>
        );
      })}
      {Math.abs(total - 1) > 0.01 && (
        <Badge variant="destructive" className="text-xs">
          总和 {Math.round(total * 100)}% (应为100%)
        </Badge>
      )}
    </div>
  );
}

// ==================== 主组件 ====================

export function UserPreferencesPanel({
  userId,
  initialWeights,
  onWeightsChange,
  onSave,
  readonly = false,
  compact = false,
  className,
}: UserPreferencesPanelProps) {
  // 获取服务端偏好
  const { 
    data: serverPreferences, 
    isLoading,
    refetch,
  } = useUserPreferences(userId);
  
  // 本地编辑状态
  const [localWeights, setLocalWeights] = React.useState<ObjectiveFunctionWeights>(
    initialWeights ?? DEFAULT_WEIGHTS
  );
  const [isDirty, setIsDirty] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  
  // 同步服务端数据
  React.useEffect(() => {
    if (serverPreferences?.weights && !isDirty) {
      setLocalWeights(serverPreferences.weights);
    }
  }, [serverPreferences, isDirty]);
  
  // 处理权重变更
  const handleWeightChange = React.useCallback((
    key: keyof ObjectiveFunctionWeights,
    value: number
  ) => {
    setLocalWeights(prev => {
      const updated = { ...prev, [key]: value };
      onWeightsChange?.(updated);
      return updated;
    });
    setIsDirty(true);
  }, [onWeightsChange]);
  
  // 重置为默认
  const handleReset = React.useCallback(() => {
    setLocalWeights(DEFAULT_WEIGHTS);
    onWeightsChange?.(DEFAULT_WEIGHTS);
    setIsDirty(true);
  }, [onWeightsChange]);
  
  // 恢复服务端值
  const handleRevert = React.useCallback(() => {
    if (serverPreferences?.weights) {
      setLocalWeights(serverPreferences.weights);
      onWeightsChange?.(serverPreferences.weights);
    }
    setIsDirty(false);
  }, [serverPreferences, onWeightsChange]);
  
  // 保存
  const handleSave = React.useCallback(async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      await onSave(localWeights);
      setIsDirty(false);
      toast.success('偏好已保存');
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  }, [localWeights, onSave]);
  
  // 加载状态
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  const dimensionKeys = Object.keys(DEFAULT_WEIGHTS) as (keyof ObjectiveFunctionWeights)[];
  
  return (
    <Card className={className}>
      <CardHeader className={cn(compact && 'pb-3')}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className={cn('flex items-center gap-2', compact && 'text-base')}>
              <Settings2 className="h-5 w-5" />
              我的旅行偏好
            </CardTitle>
            {!compact && (
              <CardDescription>
                以下为当前生效的权重概况。默认由系统根据您的反馈自动学习，无需逐项填写。
              </CardDescription>
            )}
          </div>
          
          {serverPreferences?.confidence !== undefined && (
            <ConfidenceBadge confidence={serverPreferences.confidence} />
          )}
        </div>
        
        {serverPreferences?.lastUpdated && (
          <p className="text-xs text-muted-foreground">
            最后更新: {new Date(serverPreferences.lastUpdated).toLocaleDateString('zh-CN')}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <WeightsSummary weights={localWeights} />

        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            系统会持续根据您的<strong className="font-medium text-foreground/90">行程反馈、满意度与方案对比中的选择</strong>
            等更新权重，相当于「记忆存储」在服务端；大多数用户<strong className="font-medium text-foreground/90">不用手填</strong>
            。若您对安全、节奏、预算等有明确主观要求，可展开下方逐项微调，保存后以您的设定为准。
          </p>
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" type="button" className="w-full justify-between gap-2 sm:max-w-md">
              <span>手动微调各维度权重（可选）</span>
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 transition-transform', advancedOpen && 'rotate-180')}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            <div
              className={cn(
                'space-y-4 pt-2',
                compact && 'grid grid-cols-2 gap-4 space-y-0'
              )}
            >
              {dimensionKeys.map((key) => (
                <WeightSlider
                  key={key}
                  dimensionKey={key}
                  value={localWeights[key]}
                  onChange={(v) => handleWeightChange(key, v)}
                  readonly={readonly}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* 操作按钮 */}
        {!readonly && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              重置默认
            </Button>

            {isDirty && serverPreferences && (
              <Button variant="ghost" size="sm" onClick={handleRevert}>
                撤销更改
              </Button>
            )}

            <div className="flex-1" />

            {userId && (
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1">
                <RefreshCw className="h-4 w-4" />
                刷新
              </Button>
            )}

            {onSave && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="gap-1"
              >
                <Save className="h-4 w-4" />
                {isSaving ? '保存中...' : '保存偏好'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default UserPreferencesPanel;
