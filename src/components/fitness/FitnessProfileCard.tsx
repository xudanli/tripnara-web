/**
 * 体能画像卡片组件
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { RefreshCw, Info, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { FitnessProfile } from '@/types/fitness';
import { FITNESS_LEVEL_CONFIG, CONFIDENCE_LEVEL_CONFIG, DEFAULT_FITNESS_PROFILE } from '@/constants/fitness';
import { FitnessLevelBadge } from './FitnessLevelBadge';
import { ConfidenceBadge } from './ConfidenceBadge';
import { DimensionRadarChart } from './DimensionRadarChart';
import { trackProfileViewed } from '@/utils/fitness-analytics';

interface FitnessProfileCardProps {
  profile: FitnessProfile;
  isDefault?: boolean;
  onReassess?: () => void;
  showChart?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * 体能画像卡片
 * 
 * @example
 * ```tsx
 * <FitnessProfileCard
 *   profile={fitnessProfile}
 *   isDefault={false}
 *   onReassess={() => setShowQuestionnaire(true)}
 * />
 * ```
 */
export function FitnessProfileCard({
  profile,
  isDefault = false,
  onReassess,
  showChart = true,
  compact = false,
  className,
}: FitnessProfileCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  const levelConfig = FITNESS_LEVEL_CONFIG[profile.fitnessLevel] || FITNESS_LEVEL_CONFIG.MEDIUM;
  const ____confidenceConfig = CONFIDENCE_LEVEL_CONFIG[profile.confidence] || CONFIDENCE_LEVEL_CONFIG.LOW;
  const dimensions = profile.dimensions ?? DEFAULT_FITNESS_PROFILE.dimensions;

  // 埋点
  const handleViewProfile = () => {
    trackProfileViewed(isDefault ? 'default' : 'assessed');
  };

  return (
    <Card className={cn('overflow-hidden', className)} onClick={handleViewProfile}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            🏔️ 体能画像
            {isDefault && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      默认
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>您尚未完成体能评估，当前使用默认参数</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {onReassess && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onReassess();
                }}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                {isDefault ? '开始评估' : '重新评估'}
              </Button>
            )}
            
            {compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 总评分区域 */}
        <div className="flex items-center gap-6">
          {/* 评分圆环 */}
          <div className="relative">
            <div className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center',
              'border-4',
              levelConfig.borderColor,
              levelConfig.bgColor,
            )}>
              <div className="text-center">
                <span className={cn('text-2xl font-bold', levelConfig.color)}>
                  {profile.overallScore}
                </span>
                <span className="text-xs text-muted-foreground block">/100</span>
              </div>
            </div>
          </div>

          {/* 等级和描述 */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <FitnessLevelBadge level={profile.fitnessLevel} />
              <ConfidenceBadge level={profile.confidence} size="sm" />
            </div>
            <p className="text-sm text-muted-foreground">
              {profile.levelDescription}
            </p>
          </div>
        </div>

        {/* 展开的详细内容 */}
        {expanded && (
          <>
            {/* 雷达图 */}
            {showChart && (
              <div className="flex justify-center py-4">
                <DimensionRadarChart 
                  dimensions={dimensions}
                  size={200}
                />
              </div>
            )}

            {/* 维度进度条（移动端友好的替代显示） */}
            {!showChart && (
              <div className="space-y-3">
                <DimensionProgress
                  label="爬升能力"
                  emoji="🧗"
                  value={dimensions.climbingAbility}
                />
                <DimensionProgress
                  label="耐力"
                  emoji="🏃"
                  value={dimensions.endurance}
                />
                <DimensionProgress
                  label="恢复速度"
                  emoji="🔄"
                  value={dimensions.recoverySpeed}
                />
              </div>
            )}

            {/* 推荐参数 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">
                  推荐单日爬升
                </p>
                <p className="text-lg font-semibold">
                  {profile.recommendedDailyAscentM}
                  <span className="text-sm font-normal text-muted-foreground ml-1">米</span>
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">
                  推荐单日距离
                </p>
                <p className="text-lg font-semibold">
                  {profile.recommendedDailyDistanceKm}
                  <span className="text-sm font-normal text-muted-foreground ml-1">公里</span>
                </p>
              </div>
            </div>

            {/* 年龄信息 */}
            {profile.ageInfo && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                <span className="text-lg">👤</span>
                <div className="flex-1">
                  <span className="text-sm">
                    {profile.ageInfo.ageGroup}岁
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    修正系数 ×{profile.ageInfo.modifier}
                  </span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{profile.ageInfo.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {/* 完成行程数 */}
            {profile.completedTripCount > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                基于 {profile.completedTripCount} 次行程数据
              </p>
            )}

            {/* 低置信度提示 */}
            {profile.confidence === 'LOW' && !isDefault && (
              <p className="text-xs text-center text-amber-600 bg-amber-50 p-2 rounded">
                💡 完成更多行程并提交反馈，可以提高评估准确度
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// 维度进度条子组件
function DimensionProgress({ 
  label, 
  emoji, 
  value 
}: { 
  label: string; 
  emoji: string; 
  value: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1">
          <span>{emoji}</span>
          <span>{label}</span>
        </span>
        <span className="font-medium">{value}</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}
