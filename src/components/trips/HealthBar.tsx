import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
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
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
              {/* 渐变背景 */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-orange-500 via-yellow-500 via-lime-500 to-green-500" />
              {/* 进度指示器（白色遮罩，从右向左） */}
              <div 
                className="absolute top-0 right-0 h-full bg-white/90 transition-all duration-300"
                style={{ width: `${100 - overallHealth}%` }}
              />
              {/* 刻度线 */}
              <div className="absolute top-0 left-0 right-0 h-full flex items-center pointer-events-none">
                {[0, 25, 50, 75, 100].map((mark) => (
                  <div
                    key={mark}
                    className="absolute h-full w-px bg-white/70"
                    style={{ left: `${mark}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4 个指标 */}
        <div className="grid grid-cols-4 gap-2.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center p-2.5 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className={cn('mb-1.5', getHealthColor(executable))}>
                  {getHealthIcon(executable)}
                </div>
                <div className="text-xs font-medium mb-0.5">可执行度</div>
                <div className={cn('text-xs font-semibold', getHealthColor(executable))}>
                  {executable}%
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold mb-1">可执行度</p>
              <p className="text-xs text-muted-foreground">
                基于时间窗口、营业时间、距离等因素综合评估。值越高表示行程越容易按计划执行。
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center p-2.5 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className={cn('mb-1.5', getHealthColor(buffer))}>
                  {getHealthIcon(buffer)}
                </div>
                <div className="text-xs font-medium mb-0.5">缓冲</div>
                <div className={cn('text-xs font-semibold', getHealthColor(buffer))}>
                  {buffer}%
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold mb-1">缓冲</p>
              <p className="text-xs text-muted-foreground">
                行程中预留的缓冲时间占比。充足的缓冲可以应对突发情况，如交通延误、活动超时等。
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center p-2.5 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className={cn('mb-1.5', getHealthColor(risk, true))}>
                  {getHealthIcon(risk, true)}
                </div>
                <div className="text-xs font-medium mb-0.5">风险</div>
                <div className={cn('text-xs font-semibold', getHealthColor(risk, true))}>
                  {risk}%
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold mb-1">风险</p>
              <p className="text-xs text-muted-foreground">
                综合评估安全风险、时间冲突、天气等因素。值越低表示行程越安全可靠。
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center p-2.5 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className={cn('mb-1.5', getHealthColor(cost))}>
                  {getHealthIcon(cost)}
                </div>
                <div className="text-xs font-medium mb-0.5">成本</div>
                <div className={cn('text-xs font-semibold', getHealthColor(cost))}>
                  {cost}%
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold mb-1">成本</p>
              <p className="text-xs text-muted-foreground">
                预算使用情况。基于总预算、每日预算和实际花费计算。值越高表示成本控制越好。
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

