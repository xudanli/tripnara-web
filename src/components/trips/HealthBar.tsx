import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthBarProps {
  executable: number; // 0-100
  buffer: number; // 0-100
  risk: number; // 0-100 (风险越低越好)
  cost: number; // 0-100 (成本控制)
  className?: string;
}

export default function HealthBar({ executable, buffer, risk, cost, className }: HealthBarProps) {
  const getHealthColor = (value: number, reverse = false) => {
    const score = reverse ? 100 - value : value;
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthIcon = (value: number, reverse = false) => {
    const score = reverse ? 100 - value : value;
    if (score >= 80) return <CheckCircle2 className="h-4 w-4" />;
    if (score >= 60) return <AlertTriangle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  const overallHealth = Math.round((executable * 0.4 + buffer * 0.2 + (100 - risk) * 0.3 + cost * 0.1));

  return (
    <TooltipProvider>
      <div className={cn('space-y-3', className)}>
        {/* 综合健康度 */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">健康度</span>
              <span className={cn('text-sm font-bold', getHealthColor(overallHealth))}>
                {overallHealth}%
              </span>
            </div>
            <Progress value={overallHealth} className="h-2" />
          </div>
        </div>

        {/* 4 个指标 */}
        <div className="grid grid-cols-4 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                <div className={cn('mb-1', getHealthColor(executable))}>
                  {getHealthIcon(executable)}
                </div>
                <div className="text-xs font-medium">可执行度</div>
                <div className={cn('text-xs', getHealthColor(executable))}>
                  {executable}%
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>计划的可执行程度</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                <div className={cn('mb-1', getHealthColor(buffer))}>
                  {getHealthIcon(buffer)}
                </div>
                <div className="text-xs font-medium">缓冲</div>
                <div className={cn('text-xs', getHealthColor(buffer))}>
                  {buffer}%
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>时间缓冲充足度</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                <div className={cn('mb-1', getHealthColor(risk, true))}>
                  {getHealthIcon(risk, true)}
                </div>
                <div className="text-xs font-medium">风险</div>
                <div className={cn('text-xs', getHealthColor(risk, true))}>
                  {risk}%
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>风险等级（越低越好）</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                <div className={cn('mb-1', getHealthColor(cost))}>
                  {getHealthIcon(cost)}
                </div>
                <div className="text-xs font-medium">成本</div>
                <div className={cn('text-xs', getHealthColor(cost))}>
                  {cost}%
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>成本控制情况</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

