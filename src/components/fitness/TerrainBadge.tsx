/**
 * 地形类型标签组件
 * @module components/fitness/TerrainBadge
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { 
  type TerrainType, 
  type TerrainCharacteristics,
  TERRAIN_CHARACTERISTICS 
} from '@/types/fitness';
import { 
  Mountain, 
  Snowflake, 
  Sun, 
  TreePine, 
  Waves, 
  CircleDot,
  Footprints,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';

interface TerrainBadgeProps {
  /** 地形类型 */
  terrain: TerrainType;
  /** 是否显示 tooltip */
  showTooltip?: boolean;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 额外 className */
  className?: string;
}

/** 获取地形图标 */
const getTerrainIcon = (terrain: TerrainType) => {
  const iconProps = { className: 'w-3.5 h-3.5' };
  
  switch (terrain) {
    case 'easy':
      return <Footprints {...iconProps} />;
    case 'moderate':
      return <Mountain {...iconProps} />;
    case 'technical':
      return <AlertTriangle {...iconProps} />;
    case 'extreme':
      return <AlertTriangle {...iconProps} />;
    case 'alpine':
      return <Mountain {...iconProps} />;
    case 'glacier':
      return <Snowflake {...iconProps} />;
    case 'desert':
      return <Sun {...iconProps} />;
    case 'jungle':
      return <TreePine {...iconProps} />;
    case 'coastal':
      return <Waves {...iconProps} />;
    case 'scree':
      return <CircleDot {...iconProps} />;
    default:
      return <HelpCircle {...iconProps} />;
  }
};

/** 获取地形样式类名 */
const getTerrainClasses = (_terrain: TerrainType, characteristics: TerrainCharacteristics) => {
  const { riskLevel } = characteristics;
  
  // 基于风险等级的颜色
  const riskColors: Record<string, string> = {
    LOW: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
    CRITICAL: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
  };
  
  return riskColors[riskLevel] || riskColors.MEDIUM;
};

/** 地形名称映射 */
const TERRAIN_NAMES: Record<TerrainType, { en: string; zh: string }> = {
  easy: { en: 'Easy', zh: '简单' },
  moderate: { en: 'Moderate', zh: '中等' },
  technical: { en: 'Technical', zh: '技术型' },
  extreme: { en: 'Extreme', zh: '极限' },
  alpine: { en: 'Alpine', zh: '高山' },
  glacier: { en: 'Glacier', zh: '冰川' },
  desert: { en: 'Desert', zh: '沙漠' },
  jungle: { en: 'Jungle', zh: '丛林' },
  coastal: { en: 'Coastal', zh: '海岸' },
  scree: { en: 'Scree', zh: '碎石坡' },
};

export function TerrainBadge({ 
  terrain, 
  showTooltip = true, 
  size = 'md',
  className 
}: TerrainBadgeProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language?.startsWith('zh') ?? false;
  
  const characteristics = TERRAIN_CHARACTERISTICS[terrain];
  const terrainName = TERRAIN_NAMES[terrain];
  const displayName = isZh ? terrainName.zh : terrainName.en;
  const description = isZh ? characteristics.descriptionZh : characteristics.description;
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-sm px-2 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };
  
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center font-medium transition-colors cursor-default',
        getTerrainClasses(terrain, characteristics),
        sizeClasses[size],
        className
      )}
    >
      {getTerrainIcon(terrain)}
      <span>{displayName}</span>
    </Badge>
  );
  
  if (!showTooltip) {
    return badge;
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{displayName}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default TerrainBadge;
