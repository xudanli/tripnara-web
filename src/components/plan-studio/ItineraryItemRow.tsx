import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Wrench, Info, MoreVertical } from 'lucide-react';
import type { ItineraryItem } from '@/types/trip';
import type { PersonaMode } from '@/components/common/PersonaModeToggle';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ItineraryItemRowProps {
  item: ItineraryItem;
  dayIndex: number;
  itemIndex: number;
  personaMode: PersonaMode;
  onEdit?: (item: ItineraryItem) => void;
  onDelete?: (item: ItineraryItem) => void;
  onReplace?: (item: ItineraryItem) => void;
  onApplyPatch?: (item: ItineraryItem) => void;
}

// 类别图标映射
const categoryIcons: Record<string, string> = {
  ATTRACTION: '🏛️',
  RESTAURANT: '🍽️',
  SHOPPING: '🛍️',
  HOTEL: '🏨',
  TRANSIT_HUB: '🚉',
};

// 类别标签映射
const categoryLabels: Record<string, string> = {
  ATTRACTION: '景点',
  RESTAURANT: '餐饮',
  SHOPPING: '购物',
  HOTEL: '酒店',
  TRANSIT_HUB: '交通',
};

export default function ItineraryItemRow({
  item,
  dayIndex,
  itemIndex,
  personaMode,
  onEdit,
  onDelete,
  onReplace,
  onApplyPatch,
}: ItineraryItemRowProps) {
  const { t } = useTranslation();
  const place = item.Place;

  // ==================== 基础字段提取 ====================
  // 优先显示中文名称，如果 nameCN 为空字符串或未定义，则使用 nameEN
  const name = (place?.nameCN && place.nameCN.trim()) 
    ? place.nameCN 
    : (place?.nameEN && place.nameEN.trim()) 
      ? place.nameEN 
      : item.type || '未知地点';
  const category = (place?.category || item.type || '').toUpperCase();
  const cityName = (place?.City?.nameCN && place.City.nameCN.trim()) 
    ? place.City.nameCN 
    : (place?.City?.nameEN && place.City.nameEN.trim()) 
      ? place.City.nameEN 
      : '';
  const address = place?.address || '';
  const rating = place?.rating;
  const startTime = item.startTime ? format(new Date(item.startTime), 'HH:mm') : '';
  const endTime = item.endTime ? format(new Date(item.endTime), 'HH:mm') : '';

  // 预计时长（优先从 physicalMetadata，否则使用默认值）
  // 注意：place 的类型可能不同，需要兼容处理
  const physicalMetadata = (place as any)?.physicalMetadata || {};
  const estimatedDuration = physicalMetadata.estimated_duration_min;
  const durationDisplay = estimatedDuration 
    ? `${estimatedDuration}分钟`
    : category === 'ATTRACTION' ? '60-120分钟'
    : category === 'RESTAURANT' ? '60-90分钟'
    : category === 'SHOPPING' ? '30-60分钟'
    : '60分钟';

  // ==================== Abu 视图字段 ====================
  const getAbuFields = () => {
    if (personaMode !== 'abu' || !place) return null;

    const metadata = (place as any).metadata || {};
    const physicalMetadata = (place as any).physicalMetadata || {};
    const openingHours = metadata.openingHours || {};

    // 开放状态
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayHours = openingHours[today] || openingHours['monday'] || null;
    const openingStatus = todayHours 
      ? `今日 ${todayHours}` 
      : todayHours === null 
        ? '未知' 
        : '休息';

    // 风险标记
    const risks: Array<{ type: string; label: string; severity: 'high' | 'medium' | 'low' }> = [];
    
    // 体力风险
    const fatigueScore = physicalMetadata.base_fatigue_score || 0;
    const intensityFactor = physicalMetadata.intensity_factor || 1;
    if (fatigueScore * intensityFactor > 70) {
      risks.push({ type: 'fatigue', label: '⚠️ 体力偏高', severity: 'high' });
    }

    // 无障碍风险
    if (physicalMetadata.wheelchair_accessible === false) {
      risks.push({ type: 'accessibility', label: '♿ 无障碍不确定', severity: 'medium' });
    }

    // 电梯风险
    if (physicalMetadata.has_elevator === false) {
      risks.push({ type: 'elevator', label: '🛗 无电梯', severity: 'medium' });
    }

    // 时间窗风险（如果行程项时间窗小于预计时长）
    if (item.startTime && item.endTime && estimatedDuration) {
      const start = new Date(item.startTime);
      const end = new Date(item.endTime);
      const timeWindow = (end.getTime() - start.getTime()) / (1000 * 60); // 分钟
      if (timeWindow < estimatedDuration) {
        risks.push({ type: 'time', label: '⏳ 时间不足', severity: 'high' });
      }
    }

    // 证据来源
    const externalSource = metadata.externalSource || '未知';
    const lastCrawledAt = metadata.lastCrawledAt;
    const evidenceText = lastCrawledAt 
      ? `${externalSource} · ${format(new Date(lastCrawledAt), 'MM/dd')} 抓取`
      : `来源 ${externalSource}`;

    // 状态判断（绿/黄/红）
    const hasHighRisk = risks.some(r => r.severity === 'high');
    const hasMediumRisk = risks.some(r => r.severity === 'medium');
    const status = hasHighRisk ? 'red' : hasMediumRisk || openingStatus === '未知' ? 'yellow' : 'green';

    return {
      openingStatus,
      risks,
      evidenceText,
      status,
    };
  };

  // ==================== Dr.Dre 视图字段 ====================
  const getDreFields = () => {
    if (personaMode !== 'dre' || !place) return null;

    const physicalMetadata = (place as any).physicalMetadata || {};
    const baseFatigue = physicalMetadata.base_fatigue_score || 0;
    const intensityFactor = physicalMetadata.intensity_factor || 1;
    const fatigueScore = baseFatigue * intensityFactor;

    // 体力等级
    const fatigueLevel = fatigueScore < 30 ? '轻' : fatigueScore < 60 ? '中' : '重';
    const fatigueDisplay = `🥾${fatigueLevel}`;

    // 地形类型
    const terrainType = physicalMetadata.terrain_type || 'FLAT';
    const terrainLabels: Record<string, string> = {
      FLAT: '平地',
      HILLY: '丘陵',
      MOUNTAIN: '山地',
      COASTAL: '海岸',
    };
    const terrainDisplay = `🗻${terrainLabels[terrainType] || terrainType}`;

    // 休息程度（seated_ratio）
    const seatedRatio = physicalMetadata.seated_ratio || 0;
    const restLevel = seatedRatio > 0.7 ? '高' : seatedRatio > 0.4 ? '中' : '低';
    const restDisplay = `🧘休息${restLevel}`;

    return {
      fatigueDisplay,
      terrainDisplay,
      restDisplay,
      fatigueScore,
    };
  };

  // ==================== Neptune 视图字段 ====================
  const getNeptuneFields = () => {
    if (personaMode !== 'neptune' || !place) return null;

    // 问题类型（简化版本，实际应该从后端获取）
    const problems: Array<{ type: string; label: string }> = [];
    const metadata = (place as any).metadata || {};
    const physicalMetadata = (place as any).physicalMetadata || {};

    // 时间窗冲突
    if (item.startTime && item.endTime && estimatedDuration) {
      const start = new Date(item.startTime);
      const end = new Date(item.endTime);
      const timeWindow = (end.getTime() - start.getTime()) / (1000 * 60);
      if (timeWindow < estimatedDuration) {
        problems.push({ type: 'time_conflict', label: '时间窗冲突' });
      }
    }

    // 闭园风险
    const openingHours = metadata.openingHours || {};
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (!openingHours[today] && !openingHours['monday']) {
      problems.push({ type: 'closure_risk', label: '闭园风险' });
    }

    // 体力超标
    const fatigueScore = (physicalMetadata.base_fatigue_score || 0) * (physicalMetadata.intensity_factor || 1);
    if (fatigueScore > 80) {
      problems.push({ type: 'fatigue_exceeded', label: '体力超标' });
    }

    // 无障碍不匹配
    if (physicalMetadata.wheelchair_accessible === false) {
      problems.push({ type: 'accessibility_mismatch', label: '无障碍不匹配' });
    }

    // 信息缺失
    if (!estimatedDuration || !metadata.openingHours) {
      problems.push({ type: 'info_missing', label: '信息缺失' });
    }

    // 修复建议（简化版本）
    const suggestions: string[] = [];
    if (problems.some(p => p.type === 'time_conflict')) {
      suggestions.push('建议：移动到 15:00 后');
    }
    if (problems.some(p => p.type === 'closure_risk')) {
      suggestions.push('建议：换成开放的地点');
    }
    if (problems.some(p => p.type === 'fatigue_exceeded')) {
      suggestions.push('建议：替换为更轻松的地点');
    }

    return {
      problems,
      suggestions,
      hasAlternatives: true, // 实际应该从后端获取
    };
  };

  const abuFields = getAbuFields();
  const dreFields = getDreFields();
  const neptuneFields = getNeptuneFields();

  // 状态颜色
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'red':
        return 'border-red-300 bg-red-50';
      case 'yellow':
        return 'border-yellow-300 bg-yellow-50';
      case 'green':
        return 'border-green-300 bg-green-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  // 获取图片（从 metadata 或 images 字段）
  const placeImages = (place as any)?.images || (place as any)?.metadata?.images || [];
  const placeImage = placeImages && placeImages.length > 0 ? placeImages[0] : null;

  return (
    <div
      className={`p-3 border rounded-lg hover:border-primary transition-colors group ${abuFields ? getStatusColor(abuFields.status) : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* 左侧：图片占位符 */}
        <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
          {placeImage ? (
            <img 
              src={placeImage} 
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <div className="text-gray-400 text-xs text-center px-1">
                {categoryIcons[category] || '📍'}
              </div>
            </div>
          )}
        </div>

        {/* 中间：时间、地点名称、类别、信息 */}
        <div className="flex-1 min-w-0">
          {/* 时间 */}
          <div className="text-sm font-medium text-gray-700 mb-1">
            {startTime}{endTime && ` -${endTime}`}
          </div>

          {/* 地点名称 */}
          <div className="font-medium text-base mb-2">
            <span className="truncate block">{name}</span>
          </div>

          {/* 类别 */}
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {categoryIcons[category] || '📍'} {categoryLabels[category] || category}
            </Badge>
          </div>

          {/* 信息 chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 全局：预计时长 */}
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {durationDisplay} 未知
            </Badge>

            {/* Abu 视图：开放状态 + 风险badge + 来源 */}
            {abuFields && (
              <>
                <Badge 
                  variant={abuFields.openingStatus === '休息' ? 'destructive' : abuFields.openingStatus === '未知' ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {abuFields.openingStatus}
                </Badge>
                {abuFields.risks.map((risk, idx) => (
                  <Badge
                    key={idx}
                    variant={risk.severity === 'high' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {risk.label}
                  </Badge>
                ))}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 px-2 text-xs">
                        <Info className="h-3 w-3 mr-1" />
                        来源 {abuFields.evidenceText || '未知'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{abuFields.evidenceText || '未知'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}

            {/* Dr.Dre 视图：体力 + 地形 + 休息程度 */}
            {dreFields && (
              <>
                <Badge variant="outline" className="text-xs">
                  {dreFields.fatigueDisplay}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {dreFields.terrainDisplay}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {dreFields.restDisplay}
                </Badge>
              </>
            )}

            {/* Neptune 视图：问题类型 + 修复建议 */}
            {neptuneFields && (
              <>
                {neptuneFields.problems.map((problem, idx) => (
                  <Badge key={idx} variant="destructive" className="text-xs">
                    {problem.label}
                  </Badge>
                ))}
                {neptuneFields.suggestions.map((suggestion, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {suggestion}
                  </Badge>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 右侧：操作按钮 - 收起在下拉菜单中 */}
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  {t('planStudio.scheduleTab.actions.edit')}
                </DropdownMenuItem>
              )}
              {onReplace && (
                <DropdownMenuItem onClick={() => onReplace(item)}>
                  {t('planStudio.scheduleTab.actions.replace')}
                </DropdownMenuItem>
              )}
              {neptuneFields && onApplyPatch && (
                <DropdownMenuItem onClick={() => onApplyPatch(item)}>
                  <Wrench className="w-4 h-4 mr-2" />
                  {t('tripViews.neptune.applyFix')}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => onDelete(item)}
                >
                  {t('planStudio.scheduleTab.actions.delete')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}