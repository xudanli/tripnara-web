/**
 * 地形信息卡片组件
 * @module components/fitness/TerrainInfoCard
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { 
  type TerrainType, 
  type TerrainRiskLevel,
  TERRAIN_CHARACTERISTICS 
} from '@/types/fitness';
import { TerrainBadge } from './TerrainBadge';
import { RiskLevelIndicator, CriticalRiskBanner } from './RiskLevelIndicator';
import { 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  Gauge, 
  Backpack, 
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface TerrainInfoCardProps {
  /** 地形类型 */
  terrain: TerrainType;
  /** 当前月份（用于季节检查） */
  currentMonth?: number;
  /** 是否可折叠 */
  collapsible?: boolean;
  /** 默认是否折叠 */
  defaultCollapsed?: boolean;
  /** 是否紧凑模式 */
  compact?: boolean;
  /** 是否显示标题 */
  showHeader?: boolean;
  /** 额外 className */
  className?: string;
}

/** 将疲劳系数转换为用户友好的文字 */
function getFatigueLabel(factor: number, isZh: boolean): { label: string; color: string } {
  if (factor <= 1.0) {
    return { label: isZh ? '正常' : 'Normal', color: 'text-green-600' };
  } else if (factor <= 1.3) {
    return { label: isZh ? '稍高' : 'Slightly Higher', color: 'text-yellow-600' };
  } else if (factor <= 1.6) {
    return { label: isZh ? '较高' : 'Higher', color: 'text-orange-600' };
  } else {
    return { label: isZh ? '很高' : 'Very High', color: 'text-red-600' };
  }
}

/** 将速度乘数转换为用户友好的文字 */
function getSpeedLabel(multiplier: number, isZh: boolean): { label: string; color: string } {
  if (multiplier >= 0.9) {
    return { label: isZh ? '正常' : 'Normal', color: 'text-green-600' };
  } else if (multiplier >= 0.7) {
    return { label: isZh ? '较慢' : 'Slower', color: 'text-yellow-600' };
  } else if (multiplier >= 0.55) {
    return { label: isZh ? '缓慢' : 'Slow', color: 'text-orange-600' };
  } else {
    return { label: isZh ? '很慢' : 'Very Slow', color: 'text-red-600' };
  }
}

/** 获取月份名称 */
function getMonthName(month: number, isZh: boolean): string {
  const monthNames = {
    zh: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  };
  return isZh ? monthNames.zh[month - 1] : monthNames.en[month - 1];
}

/** 检查当前月份是否为最佳季节 */
function isBestSeason(currentMonth: number, bestSeasons?: number[]): boolean {
  if (!bestSeasons || bestSeasons.length === 0) return true;
  return bestSeasons.includes(currentMonth);
}

export function TerrainInfoCard({
  terrain,
  currentMonth = new Date().getMonth() + 1,
  collapsible = false,
  defaultCollapsed = false,
  compact = false,
  showHeader = true,
  className,
}: TerrainInfoCardProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language?.startsWith('zh') ?? false;
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);
  const [dismissedCritical, setDismissedCritical] = useState(false);
  
  const characteristics = TERRAIN_CHARACTERISTICS[terrain];
  const fatigueInfo = getFatigueLabel(characteristics.fatigueFactor, isZh);
  const speedInfo = getSpeedLabel(characteristics.speedMultiplier, isZh);
  const isCurrentBestSeason = isBestSeason(currentMonth, characteristics.bestSeasons);
  
  // 详情内容
  const detailsContent = (
    <div className={cn('space-y-4', compact && 'space-y-2')}>
      {/* CRITICAL 风险警告 */}
      {characteristics.riskLevel === 'CRITICAL' && !dismissedCritical && (
        <CriticalRiskBanner 
          className="mb-4" 
          onDismiss={() => setDismissedCritical(true)}
        />
      )}
      
      {/* 描述 */}
      <p className={cn(
        'text-muted-foreground',
        compact ? 'text-xs' : 'text-sm'
      )}>
        {isZh ? characteristics.descriptionZh : characteristics.description}
      </p>
      
      {/* 指标网格 */}
      <div className={cn(
        'grid gap-3',
        compact ? 'grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'
      )}>
        {/* 疲劳影响 */}
        <div className={cn(
          'flex items-center gap-2 p-2 rounded-lg bg-muted/50',
          compact && 'p-1.5'
        )}>
          <Zap className={cn('shrink-0', compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
          <div>
            <p className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
              {isZh ? '疲劳影响' : 'Fatigue Impact'}
            </p>
            <p className={cn(fatigueInfo.color, compact ? 'text-xs' : 'text-sm')}>
              {fatigueInfo.label} ({characteristics.fatigueFactor}x)
            </p>
          </div>
        </div>
        
        {/* 行进速度 */}
        <div className={cn(
          'flex items-center gap-2 p-2 rounded-lg bg-muted/50',
          compact && 'p-1.5'
        )}>
          <Gauge className={cn('shrink-0', compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
          <div>
            <p className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
              {isZh ? '行进速度' : 'Travel Speed'}
            </p>
            <p className={cn(speedInfo.color, compact ? 'text-xs' : 'text-sm')}>
              {speedInfo.label} ({Math.round(characteristics.speedMultiplier * 100)}%)
            </p>
          </div>
        </div>
        
        {/* 风险等级 */}
        <div className={cn(
          'flex items-center gap-2 p-2 rounded-lg bg-muted/50',
          compact && 'p-1.5'
        )}>
          <AlertTriangle className={cn('shrink-0', compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
          <div>
            <p className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
              {isZh ? '风险等级' : 'Risk Level'}
            </p>
            <RiskLevelIndicator 
              level={characteristics.riskLevel} 
              size={compact ? 'sm' : 'sm'}
              showTooltip={false}
            />
          </div>
        </div>
        
        {/* 最佳季节 */}
        {characteristics.bestSeasons && characteristics.bestSeasons.length > 0 && (
          <div className={cn(
            'flex items-center gap-2 p-2 rounded-lg',
            isCurrentBestSeason ? 'bg-green-50' : 'bg-yellow-50',
            compact && 'p-1.5'
          )}>
            <Calendar className={cn(
              'shrink-0',
              compact ? 'w-3.5 h-3.5' : 'w-4 h-4',
              isCurrentBestSeason ? 'text-green-600' : 'text-yellow-600'
            )} />
            <div>
              <p className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
                {isZh ? '最佳季节' : 'Best Season'}
              </p>
              <p className={cn(
                compact ? 'text-xs' : 'text-sm',
                isCurrentBestSeason ? 'text-green-600' : 'text-yellow-600'
              )}>
                {characteristics.bestSeasons.map(m => getMonthName(m, isZh)).join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* 季节警告 */}
      {!isCurrentBestSeason && characteristics.bestSeasons && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
          <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              {isZh ? '非最佳季节提醒' : 'Off-Season Notice'}
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              {isZh 
                ? `当前为${getMonthName(currentMonth, isZh)}，不在此地形的最佳季节范围内。请做好额外准备并注意安全。`
                : `Current month (${getMonthName(currentMonth, isZh)}) is not within the best season for this terrain. Please prepare accordingly and stay safe.`
              }
            </p>
          </div>
        </div>
      )}
      
      {/* 所需装备 */}
      {characteristics.requiredGear && characteristics.requiredGear.length > 0 && (
        <div className={cn('p-3 rounded-lg bg-muted/50', compact && 'p-2')}>
          <div className="flex items-center gap-2 mb-2">
            <Backpack className={cn(compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
            <p className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
              {isZh ? '建议装备' : 'Recommended Gear'}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {characteristics.requiredGear.map((gear) => (
              <Badge 
                key={gear} 
                variant="secondary" 
                className={cn(compact ? 'text-xs px-1.5 py-0.5' : 'text-xs')}
              >
                {gear}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
  
  // 紧凑模式（无卡片包装）
  if (compact && !showHeader) {
    return <div className={className}>{detailsContent}</div>;
  }
  
  // 可折叠模式
  if (collapsible) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
        <Card>
          {showHeader && (
            <CardHeader className="pb-2">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TerrainBadge terrain={terrain} showTooltip={false} size="md" />
                      <span>{isZh ? '地形信息' : 'Terrain Info'}</span>
                    </CardTitle>
                  </div>
                  <Button variant="ghost" size="sm">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
          )}
          <CollapsibleContent>
            <CardContent className={showHeader ? 'pt-2' : ''}>
              {detailsContent}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }
  
  // 标准卡片模式
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TerrainBadge terrain={terrain} showTooltip={false} size="md" />
              <span>{isZh ? '地形信息' : 'Terrain Info'}</span>
            </CardTitle>
            <RiskLevelIndicator level={characteristics.riskLevel} size="sm" />
          </div>
        </CardHeader>
      )}
      <CardContent className={showHeader ? 'pt-2' : ''}>
        {detailsContent}
      </CardContent>
    </Card>
  );
}

/** 紧凑型地形展示（适用于日程卡片内嵌） */
export function TerrainInfoCompact({
  terrain,
  currentMonth,
  className,
}: {
  terrain: TerrainType;
  currentMonth?: number;
  className?: string;
}) {
  return (
    <TerrainInfoCard
      terrain={terrain}
      currentMonth={currentMonth}
      compact={true}
      showHeader={false}
      className={className}
    />
  );
}

/** 行程地形摘要（多种地形汇总） */
export function TripTerrainSummary({
  terrainTypes,
  className,
}: {
  terrainTypes: TerrainType[];
  className?: string;
}) {
  const { i18n } = useTranslation();
  const isZh = i18n.language?.startsWith('zh') ?? false;
  
  // 统计地形类型
  const terrainCounts = terrainTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<TerrainType, number>);
  
  // 找出最高风险等级
  const maxRiskLevel = terrainTypes.reduce((max, type) => {
    const risk = TERRAIN_CHARACTERISTICS[type].riskLevel;
    const riskOrder = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
    return riskOrder[risk] > riskOrder[max] ? risk : max;
  }, 'LOW' as TerrainRiskLevel);
  
  // 计算平均疲劳系数
  const avgFatigueFactor = terrainTypes.length > 0 
    ? terrainTypes.reduce((sum, type) => {
        return sum + TERRAIN_CHARACTERISTICS[type].fatigueFactor;
      }, 0) / terrainTypes.length
    : 1.0;
  
  const fatigueInfo = getFatigueLabel(avgFatigueFactor, isZh);
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {isZh ? '地形难度汇总' : 'Terrain Summary'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* 地形类型分布 */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(terrainCounts).map(([type, count]) => (
              <div key={type} className="flex items-center gap-1">
                <TerrainBadge terrain={type as TerrainType} size="sm" />
                {count > 1 && (
                  <span className="text-xs text-muted-foreground">×{count}</span>
                )}
              </div>
            ))}
          </div>
          
          {/* 汇总指标 */}
          <div className="flex items-center gap-4 text-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{isZh ? '最高风险：' : 'Max Risk: '}</span>
                  <RiskLevelIndicator level={maxRiskLevel} size="sm" showTooltip={false} />
                </TooltipTrigger>
                <TooltipContent>
                  {isZh ? '行程中遇到的最高风险等级' : 'Highest risk level encountered in the trip'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  <span>{isZh ? '平均疲劳：' : 'Avg Fatigue: '}</span>
                  <span className={fatigueInfo.color}>{fatigueInfo.label}</span>
                </TooltipTrigger>
                <TooltipContent>
                  {isZh ? '行程平均疲劳影响系数' : 'Average fatigue impact factor across the trip'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TerrainInfoCard;
