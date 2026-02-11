/**
 * 风险等级指示器组件
 * @module components/fitness/RiskLevelIndicator
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { type TerrainRiskLevel } from '@/types/fitness';
import { 
  Shield, 
  ShieldAlert, 
  ShieldX,
  AlertOctagon
} from 'lucide-react';

interface RiskLevelIndicatorProps {
  /** 风险等级 */
  level: TerrainRiskLevel;
  /** 是否显示文字标签 */
  showLabel?: boolean;
  /** 是否显示 tooltip */
  showTooltip?: boolean;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 额外 className */
  className?: string;
}

/** 风险等级配置 */
const RISK_LEVEL_CONFIG: Record<TerrainRiskLevel, {
  labelEn: string;
  labelZh: string;
  descEn: string;
  descZh: string;
  icon: typeof Shield;
  colors: string;
  pulseClass?: string;
}> = {
  LOW: {
    labelEn: 'Low Risk',
    labelZh: '低风险',
    descEn: 'Safe for most hikers with basic preparation',
    descZh: '适合大多数徒步者，仅需基本准备',
    icon: Shield,
    colors: 'bg-green-100 text-green-700 border-green-300',
  },
  MEDIUM: {
    labelEn: 'Medium Risk',
    labelZh: '中等风险',
    descEn: 'Requires experience and proper equipment',
    descZh: '需要一定经验和合适装备',
    icon: ShieldAlert,
    colors: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  HIGH: {
    labelEn: 'High Risk',
    labelZh: '高风险',
    descEn: 'Advanced skills and technical gear required',
    descZh: '需要专业技能和技术装备',
    icon: ShieldX,
    colors: 'bg-orange-100 text-orange-700 border-orange-300',
  },
  CRITICAL: {
    labelEn: 'Critical Risk',
    labelZh: '极高风险',
    descEn: 'Expert level only. Life-threatening conditions possible.',
    descZh: '仅限专家级别。可能存在生命危险。',
    icon: AlertOctagon,
    colors: 'bg-red-100 text-red-700 border-red-300',
    pulseClass: 'animate-pulse',
  },
};

export function RiskLevelIndicator({
  level,
  showLabel = true,
  showTooltip = true,
  size = 'md',
  className,
}: RiskLevelIndicatorProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language?.startsWith('zh') ?? false;
  
  const config = RISK_LEVEL_CONFIG[level];
  const label = isZh ? config.labelZh : config.labelEn;
  const description = isZh ? config.descZh : config.descEn;
  const IconComponent = config.icon;
  
  const sizeConfig = {
    sm: {
      badge: 'text-xs px-1.5 py-0.5 gap-1',
      icon: 'w-3 h-3',
    },
    md: {
      badge: 'text-sm px-2 py-1 gap-1.5',
      icon: 'w-4 h-4',
    },
    lg: {
      badge: 'text-base px-3 py-1.5 gap-2',
      icon: 'w-5 h-5',
    },
  };
  
  const indicator = (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center font-medium transition-colors cursor-default',
        config.colors,
        config.pulseClass,
        sizeConfig[size].badge,
        className
      )}
    >
      <IconComponent className={sizeConfig[size].icon} />
      {showLabel && <span>{label}</span>}
    </Badge>
  );
  
  if (!showTooltip) {
    return indicator;
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{label}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** 紧凑型风险指示器（仅图标） */
export function RiskLevelIcon({
  level,
  size = 'md',
  className,
}: Omit<RiskLevelIndicatorProps, 'showLabel' | 'showTooltip'>) {
  return (
    <RiskLevelIndicator
      level={level}
      showLabel={false}
      showTooltip={true}
      size={size}
      className={className}
    />
  );
}

/** 风险等级警告横幅（用于 CRITICAL 级别） */
export function CriticalRiskBanner({ 
  className,
  onDismiss,
}: { 
  className?: string;
  onDismiss?: () => void;
}) {
  const { i18n } = useTranslation();
  const isZh = i18n.language?.startsWith('zh') ?? false;
  
  return (
    <div 
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg',
        'bg-red-50 border-2 border-red-300',
        'animate-pulse',
        className
      )}
    >
      <AlertOctagon className="w-6 h-6 text-red-600 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold text-red-800">
          {isZh ? '极高风险警告' : 'Critical Risk Warning'}
        </p>
        <p className="text-sm text-red-700">
          {isZh 
            ? '此路段存在严重安全风险，仅建议具有专业技能和装备的人员通过。'
            : 'This section poses serious safety risks. Only recommended for personnel with professional skills and equipment.'
          }
        </p>
      </div>
      {onDismiss && (
        <button 
          onClick={onDismiss}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
        >
          {isZh ? '我了解风险' : 'I understand the risks'}
        </button>
      )}
    </div>
  );
}

export default RiskLevelIndicator;
