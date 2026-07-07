/**
 * 优化流程进度条组件
 * 
 * 展示 Abu→Dre→Neptune 三守护者的优化进度
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2, Circle, AlertCircle, Shield, Compass, Wrench } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ==================== 类型 ====================

export type OptimizeStepStatus = 'pending' | 'running' | 'completed' | 'error';

export interface OptimizeStep {
  id: string;
  label: string;
  description: string;
  status: OptimizeStepStatus;
  result?: {
    score?: number;
    message?: string;
  };
}

export interface OptimizeProgressStepperProps {
  steps: OptimizeStep[];
  currentStep?: string;
  compact?: boolean;
  showLabels?: boolean;
  className?: string;
}

// ==================== 配置 ====================

export const GUARDIAN_STEPS: Record<string, { 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
  label: string;
  description: string;
}> = {
  evaluate: {
    icon: Circle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/15',
    label: '评估中',
    description: '分析当前计划的效用评分',
  },
  abu: {
    icon: Shield,
    color: 'text-gate-reject-foreground',
    bgColor: 'bg-gate-reject',
    label: 'Abu 安全检查',
    description: '安全守护者检查危险因素',
  },
  dre: {
    icon: Compass,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: 'Dre 体验优化',
    description: '体验守护者优化旅行节奏',
  },
  neptune: {
    icon: Wrench,
    color: 'text-gate-allow-foreground',
    bgColor: 'bg-gate-allow',
    label: 'Neptune 修复',
    description: '修复守护者处理约束冲突',
  },
};

export const DEFAULT_OPTIMIZE_STEPS: OptimizeStep[] = [
  { id: 'evaluate', label: '评估', description: '分析当前计划', status: 'pending' },
  { id: 'abu', label: 'Abu', description: '安全检查', status: 'pending' },
  { id: 'dre', label: 'Dre', description: '体验优化', status: 'pending' },
  { id: 'neptune', label: 'Neptune', description: '约束修复', status: 'pending' },
];

// ==================== 子组件 ====================

/** 步骤状态图标 */
function StepIcon({ 
  step, 
  config,
  size = 'default',
}: { 
  step: OptimizeStep;
  config: typeof GUARDIAN_STEPS[string];
  size?: 'default' | 'large';
}) {
  const iconSize = size === 'large' ? 'h-5 w-5' : 'h-4 w-4';
  const containerSize = size === 'large' ? 'h-10 w-10' : 'h-8 w-8';
  
  if (step.status === 'running') {
    return (
      <div className={cn(
        'rounded-full flex items-center justify-center',
        containerSize,
        config.bgColor
      )}>
        <Loader2 className={cn(iconSize, config.color, 'animate-spin')} />
      </div>
    );
  }
  
  if (step.status === 'completed') {
    return (
      <div className={cn(
        'rounded-full flex items-center justify-center bg-gate-allow',
        containerSize
      )}>
        <Check className={cn(iconSize, 'text-gate-allow-foreground')} />
      </div>
    );
  }
  
  if (step.status === 'error') {
    return (
      <div className={cn(
        'rounded-full flex items-center justify-center bg-gate-reject',
        containerSize
      )}>
        <AlertCircle className={cn(iconSize, 'text-gate-reject-foreground')} />
      </div>
    );
  }
  
  const Icon = config.icon;
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center bg-muted',
      containerSize
    )}>
      <Icon className={cn(iconSize, 'text-muted-foreground')} />
    </div>
  );
}

/** 连接线 */
function StepConnector({ 
  status, 
  compact,
}: { 
  status: OptimizeStepStatus;
  compact?: boolean;
}) {
  return (
    <div className={cn(
      'flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300',
      compact ? 'mx-1' : 'mx-2',
      status === 'completed' ? 'bg-gate-allow-foreground' : 'bg-muted'
    )} />
  );
}

// ==================== 主组件 ====================

export function OptimizeProgressStepper({
  steps,
  currentStep,
  compact = false,
  showLabels = true,
  className,
}: OptimizeProgressStepperProps) {
  return (
    <TooltipProvider>
      <div className={cn(
        'flex items-center',
        compact ? 'gap-1' : 'gap-2',
        className
      )}>
        {steps.map((step, index) => {
          const config = GUARDIAN_STEPS[step.id] || {
            icon: Circle,
            color: 'text-gray-600',
            bgColor: 'bg-gray-100',
            label: step.label,
            description: step.description,
          };
          const isLast = index === steps.length - 1;
          const isCurrent = currentStep === step.id;
          
          return (
            <React.Fragment key={step.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    'flex flex-col items-center',
                    !compact && 'min-w-[60px]',
                    isCurrent && 'scale-110 transition-transform'
                  )}>
                    <StepIcon 
                      step={step} 
                      config={config}
                      size={compact ? 'default' : 'large'}
                    />
                    {showLabels && !compact && (
                      <span className={cn(
                        'text-xs mt-1 font-medium',
                        step.status === 'completed' && 'text-gate-allow-foreground',
                        step.status === 'running' && config.color,
                        step.status === 'error' && 'text-gate-reject-foreground',
                        step.status === 'pending' && 'text-muted-foreground'
                      )}>
                        {step.label}
                      </span>
                    )}
                    {step.result?.score !== undefined && !compact && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(step.result.score * 100)}%
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="space-y-1">
                    <p className="font-medium">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                    {step.result?.message && (
                      <p className="text-xs">{step.result.message}</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
              
              {!isLast && (
                <StepConnector 
                  status={step.status} 
                  compact={compact}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

// ==================== 工具函数 ====================

/**
 * 根据优化响应更新步骤状态
 */
export function updateStepsFromOptimizeResponse(
  steps: OptimizeStep[],
  response: {
    abuResult?: Record<string, unknown>;
    dreResult?: Record<string, unknown>;
    neptuneResult?: Record<string, unknown>;
  }
): OptimizeStep[] {
  return steps.map(step => {
    if (step.id === 'evaluate') {
      return { ...step, status: 'completed' as const };
    }
    if (step.id === 'abu' && response.abuResult) {
      return { 
        ...step, 
        status: 'completed' as const,
        result: {
          score: (response.abuResult as any).safetyScore,
          message: (response.abuResult as any).summary,
        },
      };
    }
    if (step.id === 'dre' && response.dreResult) {
      return { 
        ...step, 
        status: 'completed' as const,
        result: {
          message: (response.dreResult as any).summary,
        },
      };
    }
    if (step.id === 'neptune' && response.neptuneResult) {
      return { 
        ...step, 
        status: 'completed' as const,
        result: {
          message: (response.neptuneResult as any).summary,
        },
      };
    }
    return step;
  });
}

// ==================== 导出 ====================

export default OptimizeProgressStepper;
