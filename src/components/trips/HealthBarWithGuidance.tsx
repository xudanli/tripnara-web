/**
 * 健康度组件 - 控制中枢版本
 * 包含人话总结、下一步建议和可点击的建议卡
 */

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Compass, Wallet, Shield, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface HealthBarWithGuidanceProps {
  executable: number; // 0-100
  buffer: number; // 0-100
  risk: number; // 0-100 (风险越低越好)
  cost: number; // 0-100 (成本控制)
  className?: string;
  onMetricClick?: (metricName: 'schedule' | 'budget' | 'pace' | 'feasibility') => void;
  onNavigateToPlanStudio?: () => void;
  onNavigateToBudget?: () => void;
  tripStatus?: string;
  overallScore?: number; // 🆕 优先使用 API 返回的整体健康度分数（0-100）
}

export default function HealthBarWithGuidance({ 
  executable, 
  buffer, 
  risk, 
  cost, 
  className,
  onMetricClick,
  onNavigateToPlanStudio,
  onNavigateToBudget,
  tripStatus = 'PLANNING',
  overallScore, // 🆕 优先使用 API 返回的整体健康度分数
}: HealthBarWithGuidanceProps) {
  // 🆕 优先使用 API 返回的 overallScore，如果没有则使用木桶效应计算
  const overallHealth = overallScore !== undefined && overallScore !== null
    ? Math.round(overallScore)
    : Math.round(Math.min(
        executable,        // 可执行度
        buffer,            // 缓冲
        100 - risk,        // 风险（反转：风险越低越好）
        cost               // 成本
      ));

  // 🆕 生成人话总结和下一步建议
  const getHealthSummary = () => {
    if (overallHealth >= 90) {
      // 🎯 健康度很高时：简化显示，只给最核心的下一步
      // 检查是否有未完成的必要步骤（如预算未设置）
      const needsBudget = cost >= 80 && tripStatus === 'PLANNING';
      
      return {
        status: '非常稳定',
        statusColor: 'text-green-600',
        statusIcon: '🟢',
        summary: '行程状态良好',
        nextStep: needsBudget
          ? '建议下一步：设置预算约束'
          : tripStatus === 'PLANNING'
          ? '可以继续细化行程安排'
          : '可以继续执行',
        showMetrics: false, // 🆕 健康度高时不显示指标卡
      };
    } else if (overallHealth >= 70) {
      return {
        status: '基本稳定',
        statusColor: 'text-yellow-600',
        statusIcon: '🟡',
        summary: '整体良好，但有一些可以优化的地方',
        nextStep: tripStatus === 'PLANNING'
          ? '建议检查行程安排，优化薄弱环节'
          : '建议关注潜在问题，及时调整',
        showMetrics: true,
      };
    } else {
      // 找出最低的指标
      const metrics = [
        { name: '可执行度', value: executable, key: 'executable' },
        { name: '缓冲', value: buffer, key: 'buffer' },
        { name: '风险', value: 100 - risk, key: 'risk' },
        { name: '成本', value: cost, key: 'cost' },
      ];
      const lowestMetric = metrics.reduce((min, m) => m.value < min.value ? m : min);
      
      return {
        status: '需要优化',
        statusColor: 'text-red-600',
        statusIcon: '🔴',
        summary: `${lowestMetric.name}偏低，建议优先处理`,
        nextStep: tripStatus === 'PLANNING'
          ? `立即优化${lowestMetric.name} →`
          : `检查${lowestMetric.name}相关问题`,
        lowestMetric: lowestMetric.key,
        showMetrics: true,
      };
    }
  };

  const healthSummary = getHealthSummary();

  // 🆕 生成指标建议卡数据
  const getMetricCards = () => {
    const cards = [
      {
        name: '可执行度',
        value: executable,
        icon: Compass,
        description: executable >= 80 
          ? '路线顺畅，无明显赶路'
          : executable >= 60
          ? '部分行程可能较紧，建议检查时间安排'
          : '行程安排较紧，建议增加缓冲时间',
        nextStep: executable >= 80 
          ? undefined
          : '优化时间安排 →',
        onClick: () => onMetricClick?.('schedule'),
        color: executable >= 80 ? 'green' : executable >= 60 ? 'yellow' : 'red',
      },
      {
        name: '成本',
        value: cost,
        icon: Wallet,
        description: cost >= 80
          ? '预算控制良好'
          : cost >= 60
          ? '预算使用正常，建议关注后续支出'
          : '预算使用率较高，建议检查预算设置',
        nextStep: cost >= 80
          ? undefined // 🎯 成本100%时不显示"添加预算"建议（避免矛盾）
          : '查看预算详情 →',
        onClick: () => {
          if (cost < 80 && onNavigateToBudget) {
            onNavigateToBudget();
          } else {
            onMetricClick?.('feasibility');
          }
        },
        color: cost >= 80 ? 'green' : cost >= 60 ? 'yellow' : 'red',
      },
      {
        name: '风险',
        value: 100 - risk,
        icon: Shield,
        description: risk <= 20
          ? '当前无天气 / 行程冲突风险'
          : risk <= 40
          ? '存在一些潜在风险，建议关注'
          : '存在较高风险，建议立即处理',
        nextStep: risk <= 20
          ? undefined
          : '查看风险详情 →',
        onClick: () => onMetricClick?.('pace'),
        color: risk <= 20 ? 'green' : risk <= 40 ? 'yellow' : 'red',
      },
      {
        name: '缓冲',
        value: buffer,
        icon: Activity,
        description: buffer >= 80
          ? '缓冲时间充足'
          : buffer >= 60
          ? '缓冲时间基本够用'
          : '缓冲时间不足，建议增加',
        nextStep: buffer >= 80
          ? undefined
          : '优化行程节奏 →',
        onClick: () => onMetricClick?.('budget'),
        color: buffer >= 80 ? 'green' : buffer >= 60 ? 'yellow' : 'red',
      },
    ];

    // 🆕 优化显示逻辑：
    // - 健康度 >= 90：不显示指标卡（避免信息冗余和逻辑矛盾）
    // - 健康度 < 90：显示问题指标，优先显示最严重的
    if (overallHealth >= 90) {
      // 🎯 健康度高时不显示指标卡，避免"100%但还要添加预算"的矛盾
      return [];
    } else {
      // 健康度低时，只显示有问题的指标（< 80），优先显示最严重的
      const problemCards = cards.filter(card => card.color !== 'green');
      return problemCards.sort((a, b) => {
        const aScore = a.color === 'red' ? 3 : a.color === 'yellow' ? 2 : 1;
        const bScore = b.color === 'red' ? 3 : b.color === 'yellow' ? 2 : 1;
        return bScore - aScore;
      });
    }
  };

  const metricCards = getMetricCards();

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          text: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-600',
        };
      case 'yellow':
        return {
          text: 'text-yellow-600',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-600',
        };
      case 'red':
        return {
          text: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
        };
      default:
        return {
          text: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: 'text-gray-600',
        };
    }
  };

  // 🎯 恢复之前的样式：始终显示所有指标
  const allMetricCards = [
    {
      name: '可执行度',
      value: executable,
      icon: Compass,
      description: executable >= 80 
        ? '路线顺畅，无明显赶路'
        : executable >= 60
        ? '部分行程可能较紧，建议检查时间安排'
        : '行程安排较紧，建议增加缓冲时间',
      nextStep: executable >= 80 
        ? undefined
        : '优化时间安排 →',
      onClick: () => onMetricClick?.('schedule'),
      color: executable >= 80 ? 'green' : executable >= 60 ? 'yellow' : 'red',
    },
    {
      name: '成本',
      value: cost,
      icon: Wallet,
      description: cost >= 80
        ? '预算控制良好'
        : cost >= 60
        ? '预算使用正常，建议关注后续支出'
        : '预算使用率较高，建议检查预算设置',
      nextStep: cost >= 80 && tripStatus === 'PLANNING'
        ? '添加住宿 & 交通预算 →'
        : cost < 80
        ? '查看预算详情 →'
        : undefined,
      onClick: () => {
        if (cost < 80 && onNavigateToBudget) {
          onNavigateToBudget();
        } else if (cost >= 80 && tripStatus === 'PLANNING' && onNavigateToBudget) {
          onNavigateToBudget();
        } else {
          onMetricClick?.('feasibility');
        }
      },
      color: cost >= 80 ? 'green' : cost >= 60 ? 'yellow' : 'red',
    },
    {
      name: '风险',
      value: 100 - risk,
      icon: Shield,
      description: risk <= 20
        ? '当前无天气 / 行程冲突风险'
        : risk <= 40
        ? '存在一些潜在风险，建议关注'
        : '存在较高风险，建议立即处理',
      nextStep: risk <= 20
        ? undefined
        : '查看风险详情 →',
      onClick: () => onMetricClick?.('pace'),
      color: risk <= 20 ? 'green' : risk <= 40 ? 'yellow' : 'red',
    },
    {
      name: '缓冲',
      value: buffer,
      icon: Activity,
      description: buffer >= 80
        ? '缓冲时间充足'
        : buffer >= 60
        ? '缓冲时间基本够用'
        : '缓冲时间不足，建议增加',
      nextStep: buffer >= 80
        ? undefined
        : '优化行程节奏 →',
      onClick: () => onMetricClick?.('budget'),
      color: buffer >= 80 ? 'green' : buffer >= 60 ? 'yellow' : 'red',
    },
  ];

  return (
    <TooltipProvider>
      <div className={cn('space-y-2', className)}>
        {/* 🎯 恢复明显的健康度显示 - 更紧凑 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{healthSummary.statusIcon}</span>
              <span className="text-xs font-medium text-gray-700">健康度</span>
            </div>
            <span className={cn('text-sm font-bold', 
              overallHealth >= 80 ? 'text-green-600' : 
              overallHealth >= 60 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {overallHealth}%
            </span>
          </div>
          
          {/* 🎯 恢复进度条：始终显示 - 更小的高度 */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
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

          {/* 🎯 恢复状态和下一步建议 - 更紧凑 */}
          {overallHealth < 90 && (
            <div className="space-y-0.5">
              <p className="text-xs text-gray-600 leading-tight">
                {healthSummary.summary}
              </p>
              {healthSummary.nextStep && (
                <p className="text-xs text-gray-500 leading-tight">
                  {healthSummary.nextStep}
                </p>
              )}
            </div>
          )}
          {overallHealth >= 90 && healthSummary.nextStep && (
            <p className="text-xs text-gray-600 leading-tight">
              {healthSummary.nextStep}
            </p>
          )}
        </div>

        {/* 🎯 恢复4个指标的网格展示 - 更紧凑 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {allMetricCards.map((card) => {
            const colors = getColorClasses(card.color);
            const Icon = card.icon;
            
              return (
                <Tooltip key={card.name}>
                  <TooltipTrigger asChild>
                    <div
                      onClick={card.onClick}
                      className={cn(
                        'p-2 rounded-md border cursor-pointer transition-all group',
                        'hover:shadow-sm hover:border-opacity-80',
                        colors.bg,
                        colors.border
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Icon className={cn('w-4 h-4', colors.icon)} />
                        <div className="text-center">
                          <div className="text-xs font-medium text-gray-700 mb-0.5">
                            {card.name}
                          </div>
                          <div className={cn('text-sm font-bold', colors.text)}>
                            {card.value}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium mb-1">{card.name}: {card.value}%</p>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                    {card.nextStep && (
                      <p className="text-xs text-muted-foreground mt-1">{card.nextStep}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
