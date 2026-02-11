/**
 * 反馈表单组件
 * 
 * 收集用户对行程的满意度反馈
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { 
  FeedbackType, 
  FeedbackData, 
  ModificationType,
  SubmitFeedbackRequest,
} from '@/types/optimization-v2';
import {
  Star,
  Shield,
  Sparkles,
  Gauge,
  Compass,
  Battery,
  Activity,
  Edit,
  CheckCircle,
  XCircle,
  Send,
  Loader2,
} from 'lucide-react';

// ==================== 配置 ====================

const FEEDBACK_TYPE_CONFIG: Record<FeedbackType, {
  label: string;
  description: string;
  icon: React.ElementType;
}> = {
  SATISFACTION_RATING: {
    label: '满意度评分',
    description: '对完成行程的整体满意度',
    icon: Star,
  },
  FATIGUE_REPORT: {
    label: '疲劳报告',
    description: '记录实际疲劳程度',
    icon: Battery,
  },
  PLAN_MODIFICATION: {
    label: '计划修改',
    description: '记录行程中做的调整',
    icon: Edit,
  },
  PREFERENCE_UPDATE: {
    label: '偏好更新',
    description: '更新个人旅行偏好',
    icon: Compass,
  },
  TRIP_COMPLETION: {
    label: '行程完成',
    description: '标记行程完成',
    icon: CheckCircle,
  },
  EARLY_TERMINATION: {
    label: '提前终止',
    description: '记录提前结束原因',
    icon: XCircle,
  },
};

const MODIFICATION_TYPE_CONFIG: Record<ModificationType, string> = {
  SPLIT_DAY: '拆分天数',
  INSERT_REST: '插入休息',
  REMOVE_ACTIVITY: '移除活动',
  REORDER: '调整顺序',
  OTHER: '其他',
};

const RATING_LABELS = {
  1: '非常不满意',
  2: '不满意',
  3: '一般',
  4: '满意',
  5: '非常满意',
};

// ==================== 子组件 ====================

/** 星级评分组件 */
function StarRating({
  value,
  onChange,
  label,
  description,
  icon: Icon,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
  icon?: React.ElementType;
}) {
  const [hoverValue, setHoverValue] = React.useState(0);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <Label>{label}</Label>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="p-1 transition-transform hover:scale-110"
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            onClick={() => onChange(star)}
          >
            <Star
              className={cn(
                'h-6 w-6 transition-colors',
                (hoverValue || value) >= star
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              )}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {RATING_LABELS[(hoverValue || value) as keyof typeof RATING_LABELS] || '点击评分'}
        </span>
      </div>
    </div>
  );
}

/** 疲劳度滑块 */
function FatigueSlider({
  value,
  onChange,
  label,
  predicted,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  predicted?: number;
}) {
  const getColor = (v: number) => {
    if (v < 0.5) return 'text-green-500';
    if (v < 1) return 'text-yellow-500';
    if (v < 1.5) return 'text-orange-500';
    return 'text-red-500';
  };

  const getLabel = (v: number) => {
    if (v < 0.5) return '轻松';
    if (v < 1) return '正常';
    if (v < 1.5) return '疲劳';
    return '非常疲劳';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <span className={cn('font-medium', getColor(value))}>
            {getLabel(value)}
          </span>
          <span className="text-sm text-muted-foreground">
            ({value.toFixed(1)})
          </span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={2}
        step={0.1}
        className="py-2"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>轻松 (0)</span>
        <span>正常 (1)</span>
        <span>非常疲劳 (2)</span>
      </div>
      {predicted !== undefined && (
        <p className="text-xs text-muted-foreground">
          系统预测: {predicted.toFixed(1)} ({getLabel(predicted)})
        </p>
      )}
    </div>
  );
}

/** 完成进度组件 */
function CompletionProgress({
  daysCompleted,
  totalDays,
  onChange,
}: {
  daysCompleted: number;
  totalDays: number;
  onChange: (completed: number, total: number) => void;
}) {
  const percentage = totalDays > 0 ? Math.round((daysCompleted / totalDays) * 100) : 0;

  return (
    <div className="space-y-3">
      <Label>完成进度</Label>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">已完成天数</Label>
          <Select
            value={String(daysCompleted)}
            onValueChange={(v) => onChange(Number(v), totalDays)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: totalDays + 1 }, (_, i) => (
                <SelectItem key={i} value={String(i)}>
                  {i} 天
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">计划总天数</Label>
          <Select
            value={String(totalDays)}
            onValueChange={(v) => onChange(daysCompleted, Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 30 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {i + 1} 天
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm font-medium tabular-nums">{percentage}%</span>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

export interface FeedbackFormProps {
  /** 用户 ID */
  userId: string;
  /** 行程 ID */
  tripId: string;
  /** 预设反馈类型 */
  defaultType?: FeedbackType;
  /** 预测疲劳度（用于对比） */
  predictedFatigue?: number;
  /** 计划总天数 */
  totalDays?: number;
  /** 提交回调 */
  onSubmit: (request: SubmitFeedbackRequest) => Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
  /** 是否提交中 */
  isSubmitting?: boolean;
  /** 自定义类名 */
  className?: string;
}

export function FeedbackForm({
  userId,
  tripId,
  defaultType = 'SATISFACTION_RATING',
  predictedFatigue,
  totalDays = 7,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className,
}: FeedbackFormProps) {
  // ==================== 状态 ====================
  const [feedbackType, setFeedbackType] = React.useState<FeedbackType>(defaultType);
  const [data, setData] = React.useState<FeedbackData>({
    overallSatisfaction: 0,
    safetyPerception: 0,
    experienceQuality: 0,
    pacingComfort: 0,
    philosophyMatch: 0,
    actualFatigueLevel: predictedFatigue ?? 1,
    predictedFatigueLevel: predictedFatigue,
    modificationType: undefined,
    modificationReason: '',
    completionRate: 1,
    daysCompleted: totalDays,
    totalDays,
  });

  const typeConfig = FEEDBACK_TYPE_CONFIG[feedbackType];
  const TypeIcon = typeConfig.icon;

  // ==================== 更新方法 ====================
  const updateData = <K extends keyof FeedbackData>(key: K, value: FeedbackData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  // ==================== 提交 ====================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 构建请求
    const request: SubmitFeedbackRequest = {
      userId,
      tripId,
      type: feedbackType,
      data: {
        // 根据类型只包含相关数据
        ...(feedbackType === 'SATISFACTION_RATING' && {
          overallSatisfaction: data.overallSatisfaction,
          safetyPerception: data.safetyPerception,
          experienceQuality: data.experienceQuality,
          pacingComfort: data.pacingComfort,
          philosophyMatch: data.philosophyMatch,
        }),
        ...(feedbackType === 'FATIGUE_REPORT' && {
          actualFatigueLevel: data.actualFatigueLevel,
          predictedFatigueLevel: data.predictedFatigueLevel,
        }),
        ...(feedbackType === 'PLAN_MODIFICATION' && {
          modificationType: data.modificationType,
          modificationReason: data.modificationReason,
        }),
        ...((feedbackType === 'TRIP_COMPLETION' || feedbackType === 'EARLY_TERMINATION') && {
          completionRate: data.daysCompleted! / data.totalDays!,
          daysCompleted: data.daysCompleted,
          totalDays: data.totalDays,
        }),
      },
    };

    await onSubmit(request);
  };

  // ==================== 渲染 ====================
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <TypeIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>提交反馈</CardTitle>
            <CardDescription>{typeConfig.description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 反馈类型选择 */}
          <div className="space-y-2">
            <Label>反馈类型</Label>
            <Select
              value={feedbackType}
              onValueChange={(v) => setFeedbackType(v as FeedbackType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FEEDBACK_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <config.icon className="h-4 w-4" />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 满意度评分表单 */}
          {feedbackType === 'SATISFACTION_RATING' && (
            <div className="space-y-6">
              <StarRating
                value={data.overallSatisfaction ?? 0}
                onChange={(v) => updateData('overallSatisfaction', v)}
                label="整体满意度"
                description="对这次行程的总体评价"
                icon={Star}
              />
              <StarRating
                value={data.safetyPerception ?? 0}
                onChange={(v) => updateData('safetyPerception', v)}
                label="安全感受"
                description="行程中的安全感"
                icon={Shield}
              />
              <StarRating
                value={data.experienceQuality ?? 0}
                onChange={(v) => updateData('experienceQuality', v)}
                label="体验质量"
                description="景点和活动的体验"
                icon={Sparkles}
              />
              <StarRating
                value={data.pacingComfort ?? 0}
                onChange={(v) => updateData('pacingComfort', v)}
                label="节奏舒适度"
                description="行程安排的松紧程度"
                icon={Gauge}
              />
              <StarRating
                value={data.philosophyMatch ?? 0}
                onChange={(v) => updateData('philosophyMatch', v)}
                label="理念契合"
                description="与您旅行风格的匹配度"
                icon={Compass}
              />
            </div>
          )}

          {/* 疲劳报告表单 */}
          {feedbackType === 'FATIGUE_REPORT' && (
            <FatigueSlider
              value={data.actualFatigueLevel ?? 1}
              onChange={(v) => updateData('actualFatigueLevel', v)}
              label="实际疲劳程度"
              predicted={data.predictedFatigueLevel}
            />
          )}

          {/* 计划修改表单 */}
          {feedbackType === 'PLAN_MODIFICATION' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>修改类型</Label>
                <Select
                  value={data.modificationType}
                  onValueChange={(v) => updateData('modificationType', v as ModificationType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择修改类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MODIFICATION_TYPE_CONFIG).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>修改原因</Label>
                <Textarea
                  value={data.modificationReason}
                  onChange={(e) => updateData('modificationReason', e.target.value)}
                  placeholder="请简要说明做出修改的原因..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* 行程完成/提前终止表单 */}
          {(feedbackType === 'TRIP_COMPLETION' || feedbackType === 'EARLY_TERMINATION') && (
            <CompletionProgress
              daysCompleted={data.daysCompleted ?? 0}
              totalDays={data.totalDays ?? totalDays}
              onChange={(completed, total) => {
                updateData('daysCompleted', completed);
                updateData('totalDays', total);
              }}
            />
          )}

          {/* 提交按钮 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                取消
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  提交反馈
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ==================== 导出 ====================

export default FeedbackForm;
export { 
  StarRating, 
  FatigueSlider, 
  CompletionProgress,
  FEEDBACK_TYPE_CONFIG,
  MODIFICATION_TYPE_CONFIG,
};
