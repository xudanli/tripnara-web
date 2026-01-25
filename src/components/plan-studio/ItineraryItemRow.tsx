import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Wrench, Info, MoreVertical, MapPin, Star, ChevronDown, ChevronUp } from 'lucide-react';
import type { ItineraryItem } from '@/types/trip';
import type { PersonaMode } from '@/components/common/PersonaModeToggle';
import type { PlaceImageInfo } from '@/types/place-image';
import Logo from '@/components/common/Logo';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ItineraryItemRowProps {
  item: ItineraryItem;
  dayIndex: number;
  itemIndex: number;
  personaMode: PersonaMode;
  /** 地点图片列表（从上传 API 获取，由父组件批量加载后传入） */
  placeImages?: PlaceImageInfo[] | null;
  onEdit?: (item: ItineraryItem) => void;
  onDelete?: (item: ItineraryItem) => void;
  onReplace?: (item: ItineraryItem) => void;
  onApplyPatch?: (item: ItineraryItem) => void;
  /** 问 NARA - 与 AI 助手联动 */
  onAskNara?: (item: ItineraryItem, question: string) => void;
}

// 类别图标映射
const categoryIcons: Record<string, string> = {
  ATTRACTION: '🏛️',
  RESTAURANT: '🍽️',
  CAFE: '☕',
  BAR: '🍸',
  SHOPPING: '🛍️',
  HOTEL: '🏨',
  MUSEUM: '🏛️',
  PARK: '🌳',
  TRANSPORT: '🚉',
  TRANSIT_HUB: '🚉',
  OTHER: '📍',
};

// 类别标签映射
const categoryLabels: Record<string, string> = {
  ATTRACTION: '景点',
  RESTAURANT: '餐厅',
  CAFE: '咖啡厅',
  BAR: '酒吧',
  SHOPPING: '购物',
  HOTEL: '酒店',
  MUSEUM: '博物馆',
  PARK: '公园',
  TRANSPORT: '交通',
  TRANSIT_HUB: '交通',
  OTHER: '其他',
};

export default function ItineraryItemRow({
  item,
  personaMode,
  placeImages,
  onEdit,
  onDelete,
  onReplace,
  onApplyPatch,
  onAskNara,
}: ItineraryItemRowProps) {
  const { t } = useTranslation();
  const place = item.Place;
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  // ==================== 基础字段提取 ====================
  // 优先显示中文名称，如果 nameCN 为空字符串或未定义，则使用 nameEN
  const name = (place?.nameCN && place.nameCN.trim()) 
    ? place.nameCN 
    : (place?.nameEN && place.nameEN.trim()) 
      ? place.nameEN 
      : item.type || '未知地点';
  const category = (place?.category || item.type || '').toUpperCase();
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

  // ==================== 地点详情字段 ====================
  const getPlaceDetails = () => {
    if (!place) return null;

    const metadata = place.metadata || {};
    
    // 地址
    const address = place.address || null;
    
    // 评分
    const rating = place.rating || null;
    
    // 开放时间 - 支持新的结构化格式
    const openingHours = metadata.openingHours || {};
    
    // 获取今日营业时间
    const getTodayHours = (): string | null => {
      // 优先使用 text 字段（如 "08:30-17:00（周一闭馆）"）
      if (openingHours.text) {
        return openingHours.text;
      }
      
      // 按星期获取
      const dayMap: Record<number, string> = {
        0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat'
      };
      const today = new Date().getDay();
      const dayKey = dayMap[today];
    
      // 尝试获取具体星期的时间
      if (openingHours[dayKey]) {
        return openingHours[dayKey];
      }
      
      // 尝试使用统一时间（工作日/周末）
      const isWeekend = today === 0 || today === 6;
      if (isWeekend && openingHours.weekend) {
        return openingHours.weekend;
      }
      if (!isWeekend && openingHours.weekday) {
        return openingHours.weekday;
      }
      
      // 兼容旧格式：尝试用英文星期名
      const todayEn = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      if (openingHours[todayEn]) {
        return openingHours[todayEn];
      }
      
      return null;
    };
    
    const todayHours = getTodayHours();
    
    // 判断当前是否营业
    const isOpenNow = (): boolean | null => {
      // 如果有 business_status，优先使用
      if (metadata.business_status) {
        if (metadata.business_status === 'CLOSED_TEMPORARILY' || 
            metadata.business_status === 'CLOSED_PERMANENTLY') {
          return false;
        }
      }
      
      if (!todayHours || todayHours === 'closed') return false;
      
      // 尝试解析时间范围
      try {
        // 提取时间部分（去除括号内的说明文字）
        const timeMatch = todayHours.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
        if (!timeMatch) return null;
        
        const [, openTime, closeTime] = timeMatch;
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [openH, openM] = openTime.split(':').map(Number);
        const [closeH, closeM] = closeTime.split(':').map(Number);
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;
        return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
      } catch {
        return null; // 无法判断
      }
    };
    
    // 简介/描述
    const description = place.description || null;
    
    // 电话
    const phone = metadata.phone || null;
    
    // 网站
    const website = metadata.website || null;
    
    // 价格（支持两种格式）
    const price = metadata.price;
    const priceLevel = metadata.priceLevel;
    const priceDisplay = price 
      ? `¥${price}` 
      : priceLevel 
        ? '¥'.repeat(priceLevel) 
        : null;
    
    // 标签
    const tags = metadata.tags || [];

    return {
      address,
      rating,
      todayHours,
      isOpen: isOpenNow(),
      description,
      phone,
      website,
      price: priceDisplay,
      priceLevel,
      tags: tags.slice(0, 5), // 最多显示5个标签
      businessStatus: metadata.business_status,
    };
  };

  const placeDetails = getPlaceDetails();

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
  const placeImagesFromMetadata = (place as any)?.images || (place as any)?.metadata?.images || [];
  const placeImage = placeImagesFromMetadata && placeImagesFromMetadata.length > 0 ? placeImagesFromMetadata[0] : null;

  return (
    <div
      className={`p-3 border rounded-lg hover:border-primary transition-colors group ${abuFields ? getStatusColor(abuFields.status) : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* 左侧：图片（优先使用上传的图片，其次使用地点自带图片） */}
        <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
          {(() => {
            // 优先使用上传的图片（主图优先）
            const primaryImage = placeImages?.find(img => img.isPrimary) || placeImages?.[0];
            if (primaryImage && !imageLoadError) {
              return (
                <img 
                  src={primaryImage.url} 
                  alt={primaryImage.caption || name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    setImageLoadError(true);
                  }}
                />
              );
            }
            // 其次使用地点自带的图片
            if (placeImage && !imageLoadError) {
              return (
                <img 
                  src={placeImage} 
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    setImageLoadError(true);
                  }}
                />
              );
            }
            // 最后显示默认图标
            return (
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <div className="text-gray-400 text-2xl text-center px-1">
                  {categoryIcons[category] || '📍'}
                </div>
              </div>
            );
          })()}
        </div>

        {/* 中间：时间、地点名称、类别、信息 */}
        <div className="flex-1 min-w-0">
          {/* 第一行：时间 + 地点名称 + 评分 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-700">
              {startTime}{endTime && ` -${endTime}`}
            </span>
            {placeDetails?.rating && (
              <span className="flex items-center text-xs text-amber-500">
                <Star className="w-3 h-3 mr-0.5 fill-current" />
                {placeDetails.rating.toFixed(1)}
              </span>
            )}
          </div>

          {/* 地点名称 */}
          <div className="font-medium text-base mb-1">
            <span className="truncate block">{name}</span>
          </div>

          {/* 第二行：地址 */}
          {placeDetails?.address && (
            <div className="flex items-start gap-1 text-xs text-muted-foreground mb-2">
              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1">{placeDetails.address}</span>
            </div>
          )}

          {/* 第三行：类别 + 营业状态 + 开放时间 + 价格 */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {categoryIcons[category] || '📍'} {categoryLabels[category] || category}
            </Badge>
            
            {/* 营业状态警告（临时关闭/永久关闭） */}
            {placeDetails?.businessStatus === 'CLOSED_TEMPORARILY' && (
              <Badge variant="destructive" className="text-xs">
                ⚠️ 临时关闭
              </Badge>
            )}
            {placeDetails?.businessStatus === 'CLOSED_PERMANENTLY' && (
              <Badge variant="destructive" className="text-xs">
                ❌ 已永久关闭
              </Badge>
            )}
            
            {/* 开放时间状态（仅在正常营业时显示） */}
            {placeDetails?.todayHours && placeDetails?.businessStatus !== 'CLOSED_TEMPORARILY' && placeDetails?.businessStatus !== 'CLOSED_PERMANENTLY' && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  placeDetails.isOpen === true && "bg-emerald-50 text-emerald-700 border-emerald-200",
                  placeDetails.isOpen === false && "bg-red-50 text-red-700 border-red-200"
                )}
              >
                🕐 {placeDetails.todayHours}
                {placeDetails.isOpen === true && ' · 营业中'}
                {placeDetails.isOpen === false && ' · 已关闭'}
              </Badge>
            )}
            
            {/* 价格 */}
            {placeDetails?.price && (
              <Badge variant="outline" className="text-xs text-emerald-600">
                {placeDetails.price}
              </Badge>
            )}
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

        {/* 右侧：操作按钮 */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {/* 问 NARA 按钮 - Logo 图标 */}
          {onAskNara && place && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-7 w-7 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    onClick={() => onAskNara(item, `关于${place.nameCN || place.nameEN}，有什么推荐或注意事项？`)}
                  >
                    <Logo variant="icon" size={16} color="currentColor" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>问 NARA</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* 更多操作下拉菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onAskNara && place && (
                <>
                  <DropdownMenuItem onSelect={() => onAskNara(item, `${place.nameCN || place.nameEN}附近有什么好吃的餐厅？`)}>
                    🍽️ 附近餐厅
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onAskNara(item, `${place.nameCN || place.nameEN}建议游玩多长时间？`)}>
                    ⏱️ 停留时间
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onAskNara(item, `去${place.nameCN || place.nameEN}有什么注意事项？`)}>
                    ⚠️ 注意事项
                  </DropdownMenuItem>
                  <div className="h-px bg-slate-200 my-1" />
                </>
              )}
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

      {/* 可展开的详情区域 */}
      {placeDetails && (placeDetails.description || placeDetails.phone || placeDetails.website || (placeDetails.tags && placeDetails.tags.length > 0)) && (
        <Collapsible open={detailsExpanded} onOpenChange={setDetailsExpanded}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-2 h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              {detailsExpanded ? (
                <>收起详情 <ChevronUp className="w-3 h-3 ml-1" /></>
              ) : (
                <>查看详情 <ChevronDown className="w-3 h-3 ml-1" /></>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 pt-2 border-t border-dashed border-gray-200 space-y-2 text-sm">
              {/* 简介 */}
              {placeDetails.description && (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {placeDetails.description}
                </p>
              )}
              
              {/* 联系信息 */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {placeDetails.phone && (
                  <span>📞 {placeDetails.phone}</span>
                )}
                {placeDetails.website && (
                  <a 
                    href={placeDetails.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    🔗 官网
                  </a>
                )}
              </div>
              
              {/* 标签 */}
              {placeDetails.tags && placeDetails.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {placeDetails.tags.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs px-1.5 py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}