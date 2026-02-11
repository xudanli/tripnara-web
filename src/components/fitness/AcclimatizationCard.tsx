/**
 * 高海拔适应卡片组件
 * @module components/fitness/AcclimatizationCard
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { 
  type AcclimatizationState, 
  type AMSSensitivity,
  type HumanCapabilityModel
} from '@/types/fitness';
import { 
  Mountain, 
  TrendingUp, 
  Calendar, 
  AlertTriangle, 
  HelpCircle,
  Info,
  AlertOctagon,
  Heart
} from 'lucide-react';

interface AcclimatizationCardProps {
  /** 高海拔适应状态 */
  acclimatizationState?: AcclimatizationState;
  /** 高反敏感度 */
  amsSensitivity?: AMSSensitivity;
  /** 适应速率修正 */
  acclimatizationRateModifier?: number;
  /** 是否显示详细说明 */
  showDetails?: boolean;
  /** 是否显示首次引导 */
  showGuide?: boolean;
  /** 额外 className */
  className?: string;
}

/** 高反敏感度配置 */
const AMS_SENSITIVITY_CONFIG: Record<AMSSensitivity, {
  labelEn: string;
  labelZh: string;
  descEn: string;
  descZh: string;
  color: string;
  bgColor: string;
}> = {
  LOW: {
    labelEn: 'Low Sensitivity',
    labelZh: '低敏感',
    descEn: 'Less susceptible to altitude sickness. Can ascend faster with proper acclimatization.',
    descZh: '对高原反应不敏感，适应后可较快提升海拔。',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  MEDIUM: {
    labelEn: 'Medium Sensitivity',
    labelZh: '中等敏感',
    descEn: 'Normal susceptibility to altitude sickness. Follow standard acclimatization guidelines.',
    descZh: '对高原反应敏感度适中，建议遵循标准适应规则。',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  HIGH: {
    labelEn: 'High Sensitivity',
    labelZh: '高敏感',
    descEn: 'More susceptible to altitude sickness. Requires slower ascent and extra rest days.',
    descZh: '对高原反应较敏感，需要更慢的爬升速度和更多休息日。',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
};

/** 获取适应效率等级 */
function getEfficiencyLevel(efficiency: number, isZh: boolean): { label: string; color: string } {
  if (efficiency >= 0.8) {
    return { label: isZh ? '优秀' : 'Excellent', color: 'text-green-600' };
  } else if (efficiency >= 0.6) {
    return { label: isZh ? '良好' : 'Good', color: 'text-blue-600' };
  } else if (efficiency >= 0.4) {
    return { label: isZh ? '一般' : 'Fair', color: 'text-yellow-600' };
  } else {
    return { label: isZh ? '需提升' : 'Needs Improvement', color: 'text-orange-600' };
  }
}

/** 计算建议的下一步海拔增益 */
function calculateRecommendedAscent(
  currentAltitude: number,
  sensitivity: AMSSensitivity,
  rateModifier: number = 1.0
): number {
  // 基础规则：3000m以上每天睡眠海拔增益不超过300-500m
  const baseGain = sensitivity === 'HIGH' ? 300 : sensitivity === 'MEDIUM' ? 400 : 500;
  return Math.round(baseGain * rateModifier);
}

export function AcclimatizationCard({
  acclimatizationState,
  amsSensitivity = 'MEDIUM',
  acclimatizationRateModifier = 1.0,
  showDetails = true,
  showGuide = false,
  className,
}: AcclimatizationCardProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language?.startsWith('zh') ?? false;
  const [showAMSAlert, setShowAMSAlert] = useState(false);
  const [guideOpen, setGuideOpen] = useState(showGuide);
  
  const sensitivityConfig = AMS_SENSITIVITY_CONFIG[amsSensitivity];
  
  // 如果没有适应状态数据，显示默认状态
  if (!acclimatizationState) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mountain className="w-5 h-5" />
            {isZh ? '高海拔适应' : 'Altitude Acclimatization'}
          </CardTitle>
          <CardDescription>
            {isZh 
              ? '完成高海拔行程后，系统将记录您的适应状态'
              : 'After completing high-altitude trips, the system will track your acclimatization status'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Mountain className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              {isZh ? '暂无适应记录' : 'No acclimatization records yet'}
            </p>
            <p className="text-xs mt-1">
              {isZh 
                ? '参加高海拔（>2500m）行程后将自动记录'
                : 'Records will be created automatically after high-altitude trips (>2500m)'
              }
            </p>
          </div>
          
          {/* 高反敏感度设置 */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {isZh ? '高反敏感度' : 'AMS Sensitivity'}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {isZh 
                        ? '高反敏感度影响系统对您高海拔行程的推荐策略。如果您有高反历史，建议设置为"高敏感"。'
                        : 'AMS sensitivity affects how the system recommends high-altitude trips. If you have a history of altitude sickness, set this to "High Sensitivity".'
                      }
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Badge className={cn(sensitivityConfig.bgColor, sensitivityConfig.color, 'border-0')}>
                {isZh ? sensitivityConfig.labelZh : sensitivityConfig.labelEn}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const {
    acclimatizedAltitudeM,
    daysAtCurrentAltitude,
    totalAcclimatizationDays,
    acclimatizationEfficiency,
    hasAMSSymptoms,
    lastAltitudeChangeDate,
  } = acclimatizationState;
  
  const efficiencyInfo = getEfficiencyLevel(acclimatizationEfficiency, isZh);
  const recommendedAscent = calculateRecommendedAscent(
    acclimatizedAltitudeM,
    amsSensitivity,
    acclimatizationRateModifier
  );
  
  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mountain className="w-5 h-5" />
            {isZh ? '高海拔适应' : 'Altitude Acclimatization'}
            {hasAMSSymptoms && (
              <Badge 
                variant="destructive" 
                className="ml-2 animate-pulse cursor-pointer"
                onClick={() => setShowAMSAlert(true)}
              >
                <AlertOctagon className="w-3 h-3 mr-1" />
                {isZh ? '有高反症状' : 'AMS Symptoms'}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {isZh 
              ? '追踪您的高海拔适应进度，获得更安全的行程建议'
              : 'Track your altitude adaptation progress for safer trip recommendations'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 主要指标 */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* 已适应海拔 */}
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50">
              <div className="flex items-center gap-2 mb-1">
                <Mountain className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {isZh ? '已适应海拔' : 'Acclimatized Altitude'}
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {acclimatizedAltitudeM.toLocaleString()} m
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {isZh 
                  ? `建议下次最高睡眠海拔: ${(acclimatizedAltitudeM + recommendedAscent).toLocaleString()}m`
                  : `Recommended max sleep altitude: ${(acclimatizedAltitudeM + recommendedAscent).toLocaleString()}m`
                }
              </p>
            </div>
            
            {/* 适应效率 */}
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">
                  {isZh ? '适应效率' : 'Efficiency'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-green-700">
                  {Math.round(acclimatizationEfficiency * 100)}%
                </p>
                <span className={cn('text-sm', efficiencyInfo.color)}>
                  ({efficiencyInfo.label})
                </span>
              </div>
              <Progress 
                value={acclimatizationEfficiency * 100} 
                className="h-1.5 mt-2"
              />
            </div>
          </div>
          
          {/* 详细信息 */}
          {showDetails && (
            <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isZh ? '当前海拔停留' : 'Days at Current'}
                  </p>
                  <p className="text-sm font-medium">
                    {daysAtCurrentAltitude} {isZh ? '天' : 'days'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isZh ? '累积适应天数' : 'Total Acc. Days'}
                  </p>
                  <p className="text-sm font-medium">
                    {totalAcclimatizationDays} {isZh ? '天' : 'days'}
                  </p>
                </div>
              </div>
              
              {lastAltitudeChangeDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isZh ? '上次海拔变化' : 'Last Alt. Change'}
                    </p>
                    <p className="text-sm font-medium">
                      {new Date(lastAltitudeChangeDate).toLocaleDateString(isZh ? 'zh-CN' : 'en-US')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 高反敏感度 */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {isZh ? '高反敏感度' : 'AMS Sensitivity'}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {isZh ? sensitivityConfig.descZh : sensitivityConfig.descEn}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Badge className={cn(sensitivityConfig.bgColor, sensitivityConfig.color, 'border-0')}>
                {isZh ? sensitivityConfig.labelZh : sensitivityConfig.labelEn}
              </Badge>
            </div>
            
            {/* 速率修正显示 */}
            {acclimatizationRateModifier !== 1.0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {isZh 
                  ? `个人适应速率修正: ${acclimatizationRateModifier.toFixed(2)}x`
                  : `Personal adaptation rate modifier: ${acclimatizationRateModifier.toFixed(2)}x`
                }
              </p>
            )}
          </div>
          
          {/* 建议提示 */}
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  {isZh ? '适应建议' : 'Acclimatization Advice'}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {isZh 
                    ? `根据您的适应状态，建议单日睡眠海拔增益不超过 ${recommendedAscent}m。在 ${acclimatizedAltitudeM > 3000 ? '3000m以上' : '高海拔地区'}，每上升 1000m 建议安排 1-2 天适应。`
                    : `Based on your acclimatization status, recommended daily sleeping altitude gain should not exceed ${recommendedAscent}m. ${acclimatizedAltitudeM > 3000 ? 'Above 3000m' : 'At high altitude'}, schedule 1-2 rest days per 1000m gained.`
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 高反症状警告弹窗 */}
      <AlertDialog open={showAMSAlert} onOpenChange={setShowAMSAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertOctagon className="w-5 h-5" />
              {isZh ? '高原反应症状警告' : 'Altitude Sickness Warning'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {isZh 
                  ? '系统检测到您可能正在经历高原反应症状。请认真对待以下建议：'
                  : 'The system detected you may be experiencing altitude sickness symptoms. Please take the following advice seriously:'
                }
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>{isZh ? '立即停止上升，就地休息' : 'Stop ascending immediately and rest in place'}</li>
                <li>{isZh ? '多喝水，避免剧烈运动' : 'Drink plenty of water, avoid strenuous activity'}</li>
                <li>{isZh ? '如症状加重，立即下撤至较低海拔' : 'If symptoms worsen, descend to lower altitude immediately'}</li>
                <li>{isZh ? '必要时寻求医疗帮助' : 'Seek medical help if necessary'}</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>
              {isZh ? '我已了解' : 'I Understand'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* 首次引导弹窗 */}
      <AlertDialog open={guideOpen} onOpenChange={setGuideOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Mountain className="w-5 h-5 text-blue-600" />
              {isZh ? '什么是高海拔适应？' : 'What is Altitude Acclimatization?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {isZh 
                  ? '高海拔适应是人体逐渐适应高海拔低氧环境的过程。系统会追踪您的适应状态，帮助您更安全地规划高海拔行程。'
                  : 'Altitude acclimatization is the process by which your body gradually adapts to high-altitude, low-oxygen environments. The system tracks your adaptation status to help you plan high-altitude trips more safely.'
                }
              </p>
              <div className="space-y-2 text-sm">
                <p><strong>{isZh ? '高反敏感度' : 'AMS Sensitivity'}：</strong></p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li><span className="text-green-600">{isZh ? '低敏感' : 'Low'}</span>: {isZh ? '对高反不敏感，适应较快' : 'Less susceptible, adapts faster'}</li>
                  <li><span className="text-yellow-600">{isZh ? '中等敏感' : 'Medium'}</span>: {isZh ? '正常水平，遵循标准规则' : 'Normal level, follow standard rules'}</li>
                  <li><span className="text-red-600">{isZh ? '高敏感' : 'High'}</span>: {isZh ? '易受高反影响，需更慢爬升' : 'More susceptible, needs slower ascent'}</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>
              {isZh ? '了解了' : 'Got it'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default AcclimatizationCard;
