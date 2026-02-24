import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { DateTime } from 'luxon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Wrench, Info, MoreVertical, MapPin, Star, ChevronDown, ChevronUp, ExternalLink, X, ChevronLeft, ChevronRight, Utensils, Hotel, Coffee, Fuel, Compass, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import type { ItineraryItem, BookingStatus } from '@/types/trip';
import type { PersonaMode } from '@/components/common/PersonaModeToggle';
import type { PlaceImageInfo } from '@/types/place-image';
import type { PlaceCategory } from '@/types/places-routes';
import Logo from '@/components/common/Logo';
import { WeatherMini } from '@/components/weather/WeatherCard';
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { toast } from 'sonner';

interface ItineraryItemRowProps {
  item: ItineraryItem;
  dayIndex: number;
  itemIndex: number;
  personaMode: PersonaMode;
  /** 地点图片列表（从上传 API 获取，由父组件批量加载后传入） */
  placeImages?: PlaceImageInfo[] | null;
  /** 目的地时区（IANA 格式，如 "Atlantic/Reykjavik"），用于正确显示时间 */
  timezone?: string;
  /** 货币单位（如 "CNY", "USD"），用于正确显示费用 */
  currency?: string;
  /** 默认天气位置（当行程项没有坐标时使用，通常为目的地坐标） */
  defaultWeatherLocation?: { lat: number; lng: number } | null;
  onEdit?: (item: ItineraryItem) => void;
  onDelete?: (item: ItineraryItem) => void;
  onReplace?: (item: ItineraryItem) => void;
  onApplyPatch?: (item: ItineraryItem) => void;
  /** 问 NARA - 与 AI 助手联动 */
  onAskNara?: (item: ItineraryItem, question: string) => void;
  /** 搜索附近 - 打开附近地点搜索对话框 */
  onSearchNearby?: (item: ItineraryItem, category?: PlaceCategory) => void;
  /** 是否高亮（证据点击时用于在行程中高亮对应行程项） */
  highlighted?: boolean;
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

// 预订状态标签映射
const bookingStatusLabels: Record<BookingStatus, { label: string; color: string; icon: string }> = {
  BOOKED: { label: '已预订', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '✅' },
  NEED_BOOKING: { label: '待预订', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '📅' },
  NO_BOOKING: { label: '无需预订', color: 'bg-gray-50 text-gray-600 border-gray-200', icon: '✓' },
};

export default function ItineraryItemRow({
  item,
  personaMode,
  placeImages,
  timezone = 'UTC',
  currency = 'CNY',
  defaultWeatherLocation,
  onEdit,
  onDelete,
  onReplace,
  onApplyPatch,
  onAskNara,
  onSearchNearby,
  highlighted,
}: ItineraryItemRowProps) {
  const { t } = useTranslation();
  const place = item.Place;
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  
  // 获取地点的坐标（支持多种格式）
  const getPlaceCoordinates = useMemo(() => {
    if (!place) return null;
    
    // 优先使用标准格式 latitude/longitude
    if (place.latitude !== undefined && place.longitude !== undefined) {
      return { lat: place.latitude, lng: place.longitude };
    }
    
    // 其次使用兼容格式 lat/lng
    if (place.lat !== undefined && place.lng !== undefined) {
      return { lat: place.lat, lng: place.lng };
    }
    
    // 最后尝试从 metadata 中获取
    const metadata = place.metadata as any;
    if (metadata?.location?.lat !== undefined && metadata?.location?.lng !== undefined) {
      return { lat: metadata.location.lat, lng: metadata.location.lng };
    }
    if (metadata?.latitude !== undefined && metadata?.longitude !== undefined) {
      return { lat: metadata.latitude, lng: metadata.longitude };
    }
    
    return null;
  }, [place]);
  // 详情弹窗状态
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  // 图片查看器状态
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // 辅助函数：将 UTC 时间转换为目的地本地时间显示
  const formatTimeInTimezone = (utcString: string | undefined | null): string => {
    if (!utcString) return '';
    const dt = DateTime.fromISO(utcString, { zone: 'UTC' }).setZone(timezone);
    return dt.isValid ? dt.toFormat('HH:mm') : '';
  };

  // ==================== 基础字段提取 ====================
  // 优先显示中文名称，如果 nameCN 为空字符串或未定义，则使用 nameEN
  // 无 Place 时（如从推荐加入的自定义住宿）：用 note 首行作为名称
  const name = (place?.nameCN && place.nameCN.trim()) 
    ? place.nameCN 
    : (place?.nameEN && place.nameEN.trim()) 
      ? place.nameEN 
      : (item.note?.split('\n')[0]?.trim()) || item.type || '未知地点';
  const category = (place?.category || item.type || '').toUpperCase();
  // 使用目的地时区显示时间
  const startTime = formatTimeInTimezone(item.startTime);
  const endTime = formatTimeInTimezone(item.endTime);

  // ==================== 天气显示逻辑 ====================
  // 室内类型（不显示天气）
  const INDOOR_CATEGORIES = ['MUSEUM', 'SHOPPING', 'HOTEL'];
  
  // 判断是否显示天气（户外活动或未明确归类的类型）
  const shouldShowWeather = useMemo(() => {
    // 餐饮类型可能是户外也可能是室内，默认显示
    if (['RESTAURANT', 'CAFE', 'BAR'].includes(category)) {
      return true; // 显示天气，因为前往途中也需要考虑天气
    }
    // 明确的室内类型不显示
    if (INDOOR_CATEGORIES.includes(category)) {
      return false;
    }
    // 其他类型默认显示
    return true;
  }, [category]);
  
  // 获取地点坐标（优先使用 Place 坐标，其次使用默认位置）
  const placeLocation = useMemo(() => {
    // 1. 尝试从 Place 获取坐标
    if (place) {
      const placeData = place as any;
      const lat = placeData.latitude || placeData.metadata?.location?.lat || placeData.lat;
      const lng = placeData.longitude || placeData.metadata?.location?.lng || placeData.lng;
      if (lat && lng && typeof lat === 'number' && typeof lng === 'number') {
        return { lat, lng };
      }
    }
    // 2. 使用默认位置（目的地坐标）
    if (defaultWeatherLocation) {
      return defaultWeatherLocation;
    }
    return null;
  }, [place, defaultWeatherLocation]);
  
  // 判断是否是预报（非当天）
  const isWeatherForecast = useMemo(() => {
    if (!item.startTime) return false;
    const itemDate = new Date(item.startTime);
    const today = new Date();
    return itemDate.toDateString() !== today.toDateString();
  }, [item.startTime]);

  // 实际停留时长（基于 startTime 和 endTime 计算）
  const actualDuration = (item.startTime && item.endTime) 
    ? Math.round((new Date(item.endTime).getTime() - new Date(item.startTime).getTime()) / (1000 * 60))
    : null;
  
  // 预计时长（从 physicalMetadata 获取，作为参考）
  const physicalMetadata = (place as any)?.physicalMetadata || {};
  // ✅ 确保 estimatedDuration 是数字类型，避免对象被传递
  const estimatedDuration = typeof physicalMetadata.estimated_duration_min === 'number' 
    ? physicalMetadata.estimated_duration_min 
    : null;
  
  // 显示实际停留时长，如果没有则显示预估时长
  const formatDurationDisplay = (minutes: number) => {
    // ✅ 防御性检查：确保输入是数字
    if (typeof minutes !== 'number' || isNaN(minutes)) return '约60分钟';
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };
  
  // ✅ 确保 durationDisplay 始终是字符串
  const durationDisplay = actualDuration 
    ? formatDurationDisplay(actualDuration)
    : estimatedDuration 
      ? `约${estimatedDuration}分钟`
      : category === 'ATTRACTION' ? '约60-120分钟'
      : category === 'RESTAURANT' ? '约60-90分钟'
      : category === 'SHOPPING' ? '约30-60分钟'
      : '约60分钟';

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
    const physicalMetadata = (place as any).physicalMetadata || {};
    
    // 地址
    const address = place.address || null;
    
    // 评分
    const rating = place.rating || null;
    
    // 开放时间 - 优先使用 physicalMetadata.openingHours，其次使用 metadata.openingHours
    const rawOpeningHours = physicalMetadata.openingHours || metadata.openingHours;
    
    // 根据行程日期判断季节（北半球）
    const getSeason = (date: Date): 'spring' | 'summer' | 'autumn' | 'winter' => {
      const month = date.getMonth() + 1; // 1-12
      if (month >= 3 && month <= 5) return 'spring';
      if (month >= 6 && month <= 8) return 'summer';
      if (month >= 9 && month <= 11) return 'autumn';
      return 'winter'; // 12, 1, 2
    };

    // 解析包含季节信息的开放时间字符串
    const parseSeasonalHours = (text: string, targetDate: Date): string | null => {
      // 匹配格式：全年24小时开放 (游客中心开放时间: 夏季9:00-18:00, 冬季10:00-16:00)
      const seasonalMatch = text.match(/(夏季|春天|春季|summer|spring)[：:]\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/i);
      const winterMatch = text.match(/(冬季|冬天|winter)[：:]\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/i);
      
      const season = getSeason(targetDate);
      
      // 提取前面的描述（如 "全年24小时开放"）
      const prefixMatch = text.match(/^([^(（]+)/);
      const prefix = prefixMatch ? prefixMatch[1].trim() : '';
      
      // 根据季节返回对应时间
      if (season === 'winter' && winterMatch) {
        const hours = `${winterMatch[2]}-${winterMatch[3]}`;
        // 如果有前缀描述，保留它
        return prefix ? `${prefix} (${hours})` : hours;
      }
      if ((season === 'spring' || season === 'summer') && seasonalMatch) {
        const hours = `${seasonalMatch[2]}-${seasonalMatch[3]}`;
        // 如果有前缀描述，保留它
        return prefix ? `${prefix} (${hours})` : hours;
      }
      
      // 如果没有匹配到季节信息，返回原文本
      return text;
    };

    // 获取今日营业时间
    const getTodayHours = (): string | null => {
      // 如果没有数据，返回 null
      if (!rawOpeningHours) return null;
      
      // 获取行程日期（用于判断季节）
      const tripDate = item.startTime 
        ? DateTime.fromISO(item.startTime, { zone: 'UTC' }).setZone(timezone).toJSDate()
        : new Date();
      
      // 如果是字符串格式
      if (typeof rawOpeningHours === 'string') {
        // 检查是否包含季节信息
        if (rawOpeningHours.includes('夏季') || rawOpeningHours.includes('冬季') || 
            rawOpeningHours.includes('summer') || rawOpeningHours.includes('winter')) {
          const parsed = parseSeasonalHours(rawOpeningHours, tripDate);
          return parsed;
        }
        // 普通格式直接返回（如 "09:00-18:00" 或 "08:30-17:00（周一闭馆）"）
        return rawOpeningHours;
      }
      
      // 如果是对象格式
      const openingHours = rawOpeningHours as Record<string, any>;
      
      // 优先使用 text 字段（如 "08:30-17:00（周一闭馆）"）
      if (openingHours.text) {
        const text = openingHours.text;
        // 检查是否包含季节信息
        if (typeof text === 'string' && (text.includes('夏季') || text.includes('冬季') || 
            text.includes('summer') || text.includes('winter'))) {
          const parsed = parseSeasonalHours(text, tripDate);
          return parsed;
        }
        return text;
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
  
  // 收集所有可用的图片（用于详情弹窗和图片查看器）
  const allImages = useMemo(() => {
    const images: Array<{ url: string; caption?: string }> = [];
    
    // 1. 优先添加上传的图片
    if (placeImages && placeImages.length > 0) {
      placeImages.forEach(img => {
        images.push({ url: img.url, caption: img.caption });
      });
    }
    
    // 2. 添加地点自带的图片（避免重复）
    if (placeImagesFromMetadata && Array.isArray(placeImagesFromMetadata)) {
      placeImagesFromMetadata.forEach((imgUrl: string) => {
        if (typeof imgUrl === 'string' && !images.some(i => i.url === imgUrl)) {
          images.push({ url: imgUrl });
        }
      });
    }
    
    return images;
  }, [placeImages, placeImagesFromMetadata]);

  // 打开详情弹窗
  const handleOpenDetail = () => {
    setDetailDialogOpen(true);
  };
  
  // 打开图片查看器
  const handleOpenImageViewer = (index: number) => {
    setCurrentImageIndex(index);
    setImageViewerOpen(true);
  };

  // 打开地图导航（Google Maps）
  const handleOpenNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
    const coords = getPlaceCoordinates;
    if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`);
    } else {
      toast.error('无法获取目的地坐标', {
        description: '该地点缺少坐标信息，无法打开导航',
        duration: 5000,
      });
    }
  };

  return (
    <>
    <div
      className={cn(
        'p-3 border rounded-lg hover:border-primary transition-colors group cursor-pointer',
        abuFields ? getStatusColor(abuFields.status) : '',
        highlighted && 'border-primary bg-primary/5 ring-1 ring-primary/20'
      )}
      onClick={handleOpenDetail}
    >
        <div className="flex items-start gap-3">
        {/* 左侧：图片（优先使用上传的图片，其次使用地点自带图片） */}
        <div 
          className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => {
            e.stopPropagation(); // 阻止触发卡片点击
            if (allImages.length > 0) {
              const primaryImage = placeImages?.find(img => img.isPrimary) || placeImages?.[0];
              const imageIndex = primaryImage 
                ? allImages.findIndex(img => img.url === primaryImage.url)
                : 0;
              handleOpenImageViewer(imageIndex >= 0 ? imageIndex : 0);
            }
          }}
        >
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
          {/* 第一行：时间 + 跨天标签 + 评分 */}
          <div className="flex items-center gap-2 mb-1">
            {/* 根据 crossDayInfo 显示不同的时间格式 */}
            {item.crossDayInfo?.displayMode === 'checkout' ? (
              // 退房项：只显示退房时间
              <span className="text-sm font-medium text-gray-700">
                {item.crossDayInfo?.timeLabels?.end || '退房'}: {endTime}
              </span>
            ) : (
              // 正常项或入住项
              <span className="text-sm font-medium text-gray-700">
                {startTime}{endTime && ` -${endTime}`}
              </span>
            )}
            
            {/* 跨天标签 */}
            {item.crossDayInfo?.isCrossDay && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  item.crossDayInfo?.displayMode === 'checkout' 
                    ? "bg-orange-50 text-orange-600 border-orange-200" 
                    : "bg-blue-50 text-blue-600 border-blue-200"
                )}
              >
                {item.crossDayInfo?.displayMode === 'checkout' ? '退房' : 
                 item.crossDayInfo?.displayMode === 'checkin' ? '入住' : '跨天'}
              </Badge>
            )}
            
            {placeDetails?.rating && (
              <span className="flex items-center text-xs text-amber-500">
                <Star className="w-3 h-3 mr-0.5 fill-current" />
                {placeDetails.rating.toFixed(1)}
              </span>
            )}
            
            {/* 天气信息（仅户外活动显示） */}
            {shouldShowWeather && placeLocation && (
              <WeatherMini 
                location={placeLocation}
                isForecast={isWeatherForecast}
              />
            )}
          </div>

          {/* 地点名称 */}
          <div className="font-medium text-base mb-1">
            <div className="flex items-center gap-2">
              <span className="truncate block">{name}</span>
              {/* ✅ 显示必游标记（如果存在） */}
              {(item.isRequired || item.note?.includes('[必游]')) && (
                <Badge variant="default" className="text-xs shrink-0">
                  必游
                </Badge>
              )}
            </div>
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
                🕐 {typeof placeDetails.todayHours === 'string' ? placeDetails.todayHours : String(placeDetails.todayHours || '')}
                {placeDetails.isOpen === true && ' · 营业中'}
                {placeDetails.isOpen === false && ' · 已关闭'}
              </Badge>
            )}
            
            {/* 地点参考价格 */}
            {placeDetails?.price && (
              <Badge variant="outline" className="text-xs text-emerald-600">
                {/* ✅ 确保 price 是字符串 */}
                {typeof placeDetails.price === 'string' ? placeDetails.price : String(placeDetails.price || '')}
              </Badge>
            )}
            
            {/* 行程项费用信息 */}
            {item.estimatedCost && item.estimatedCost > 0 && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                💰 预估 {formatCurrency(item.estimatedCost, currency)}
              </Badge>
            )}
            {item.actualCost && item.actualCost > 0 && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  item.isPaid 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}
              >
                {item.isPaid ? '✅' : '💳'} 实付 {formatCurrency(item.actualCost, currency)}
                {!item.isPaid && ' · 待付'}
              </Badge>
            )}
            
            {/* 预订状态 */}
            {item.bookingStatus && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs cursor-pointer", bookingStatusLabels[item.bookingStatus]?.color)}
                    >
                      {/* ✅ 确保所有值都是字符串，避免渲染对象 */}
                      {bookingStatusLabels[item.bookingStatus]?.icon || ''} {bookingStatusLabels[item.bookingStatus]?.label || String(item.bookingStatus || '')}
                      {item.bookingConfirmation && typeof item.bookingConfirmation === 'string' ? ` · ${item.bookingConfirmation}` : ''}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1 text-xs">
                      <div>状态: {bookingStatusLabels[item.bookingStatus]?.label}</div>
                      {item.bookingConfirmation && <div>确认号: {item.bookingConfirmation}</div>}
                      {item.bookedAt && <div>预订时间: {format(new Date(item.bookedAt), 'yyyy-MM-dd HH:mm')}</div>}
                      {item.bookingUrl && (
                        <a 
                          href={item.bookingUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> 查看预订
                        </a>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* 信息 chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 全局：预计时长 */}
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {durationDisplay}
            </Badge>

            {/* Abu 视图：开放状态 + 风险badge + 来源 */}
            {abuFields && (
              <>
                <Badge 
                  variant={abuFields.openingStatus === '休息' ? 'destructive' : abuFields.openingStatus === '未知' ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {/* ✅ 确保 openingStatus 是字符串 */}
                  {typeof abuFields.openingStatus === 'string' ? abuFields.openingStatus : String(abuFields.openingStatus || '')}
                </Badge>
                {abuFields.risks.map((risk, idx) => (
                  <Badge
                    key={idx}
                    variant={risk.severity === 'high' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {/* ✅ 确保 label 是字符串 */}
                    {typeof risk.label === 'string' ? risk.label : String(risk.label || '')}
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
                    {/* ✅ 确保 label 是字符串 */}
                    {typeof problem.label === 'string' ? problem.label : String(problem.label || '')}
                  </Badge>
                ))}
                {neptuneFields.suggestions.map((suggestion, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {/* ✅ 确保 suggestion 是字符串 */}
                    {typeof suggestion === 'string' ? suggestion : String(suggestion || '')}
                  </Badge>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex-shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* 导航按钮 */}
          {getPlaceCoordinates && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                    onClick={handleOpenNavigation}
                  >
                    <Compass className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>导航</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
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
          
          {/* 更多操作下拉菜单（Fitts's Law: 44×44px 触控目标） */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-11 w-11 min-h-[44px] min-w-[44px] p-0"
                aria-label={t('planStudio.scheduleTab.moreActions', { defaultValue: '更多操作' })}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              {onSearchNearby && (
                <>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger 
                      disabled={!getPlaceCoordinates}
                      className={cn(
                        !getPlaceCoordinates && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="font-medium">搜索附近</span>
                      {!getPlaceCoordinates && (
                        <span className="ml-auto text-xs text-muted-foreground">（需坐标）</span>
                      )}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="min-w-[160px]">
                      <DropdownMenuItem 
                        onSelect={() => {
                          if (getPlaceCoordinates) {
                            onSearchNearby(item, 'ATTRACTION');
                          }
                        }}
                        disabled={!getPlaceCoordinates}
                        className="cursor-pointer"
                      >
                        <Star className="w-4 h-4 mr-2 text-amber-500" />
                        <span>景点</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onSelect={() => {
                          if (getPlaceCoordinates) {
                            onSearchNearby(item, 'RESTAURANT');
                          }
                        }}
                        disabled={!getPlaceCoordinates}
                        className="cursor-pointer"
                      >
                        <Utensils className="w-4 h-4 mr-2 text-red-500" />
                        <span>餐厅</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onSelect={() => {
                          if (getPlaceCoordinates) {
                            onSearchNearby(item, 'HOTEL');
                          }
                        }}
                        disabled={!getPlaceCoordinates}
                        className="cursor-pointer"
                      >
                        <Hotel className="w-4 h-4 mr-2 text-purple-500" />
                        <span>酒店</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onSelect={() => {
                          if (getPlaceCoordinates) {
                            onSearchNearby(item, 'CAFE');
                          }
                        }}
                        disabled={!getPlaceCoordinates}
                        className="cursor-pointer"
                      >
                        <Coffee className="w-4 h-4 mr-2 text-amber-700" />
                        <span>休息点</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onSelect={() => {
                          if (getPlaceCoordinates) {
                            onSearchNearby(item, 'TRANSPORT');
                          }
                        }}
                        disabled={!getPlaceCoordinates}
                        className="cursor-pointer"
                      >
                        <Fuel className="w-4 h-4 mr-2 text-green-600" />
                        <span>加油站</span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <div className="h-px bg-slate-200 my-1" />
                </>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(item)} className="min-h-[44px] cursor-pointer">
                  <Pencil className="w-4 h-4 mr-2" />
                  {t('planStudio.scheduleTab.actions.edit')}
                </DropdownMenuItem>
              )}
              {onReplace && (
                <DropdownMenuItem onClick={() => onReplace(item)} className="min-h-[44px] cursor-pointer">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('planStudio.scheduleTab.actions.replace')}
                </DropdownMenuItem>
              )}
              {neptuneFields && onApplyPatch && (
                <DropdownMenuItem onClick={() => onApplyPatch(item)} className="min-h-[44px] cursor-pointer">
                  <Wrench className="w-4 h-4 mr-2" />
                  {t('tripViews.neptune.applyFix')}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <div className="h-px bg-slate-200 my-1" />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 min-h-[44px] cursor-pointer"
                    onClick={() => onDelete(item)}
                    aria-label={t('planStudio.scheduleTab.actions.delete', { defaultValue: '删除' })}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('planStudio.scheduleTab.actions.delete')}
                  </DropdownMenuItem>
                </>
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
              onClick={(e) => e.stopPropagation()}
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
                      {/* ✅ 确保 tag 是字符串 */}
                      {typeof tag === 'string' ? tag : String(tag || '')}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>

    {/* 详情弹窗 */}
    <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-500" />
            {name}
          </DialogTitle>
          <DialogDescription>
            {placeDetails?.address || place?.address}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* 图片画廊 */}
          {allImages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>图片 ({allImages.length})</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {allImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group"
                    onClick={() => handleOpenImageViewer(idx)}
                  >
                    <img
                      src={img.url}
                      alt={img.caption || `${name} - 图片 ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    {idx === 0 && allImages.length > 1 && (
                      <div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                        +{allImages.length - 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 基本信息 */}
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              {placeDetails?.rating && (
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-medium">{placeDetails.rating.toFixed(1)}</span>
                </div>
              )}
              {placeDetails?.price && (
                <span className="text-muted-foreground">
                  {/* ✅ 确保 price 是字符串 */}
                  {typeof placeDetails.price === 'string' ? placeDetails.price : String(placeDetails.price || '')}
                </span>
              )}
              {placeDetails?.todayHours && (
                <span className="text-muted-foreground">
                  🕐 {typeof placeDetails.todayHours === 'string' ? placeDetails.todayHours : String(placeDetails.todayHours || '')}
                  {placeDetails.isOpen === true && ' · 营业中'}
                  {placeDetails.isOpen === false && ' · 已关闭'}
                </span>
              )}
            </div>

            {/* 时间信息 */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>
                {startTime}{endTime && ` - ${endTime}`}
                {durationDisplay && ` · ${durationDisplay}`}
              </span>
            </div>

            {/* 描述 */}
            {placeDetails?.description && (
              <div className="text-sm text-muted-foreground leading-relaxed">
                {placeDetails.description}
              </div>
            )}

            {/* 联系信息 */}
            {(placeDetails?.phone || placeDetails?.website) && (
              <div className="flex items-center gap-4 text-sm">
                {placeDetails.phone && (
                  <a href={`tel:${placeDetails.phone}`} className="text-primary hover:underline">
                    📞 {placeDetails.phone}
                  </a>
                )}
                {placeDetails.website && (
                  <a 
                    href={placeDetails.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    🔗 官网 <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* 标签 */}
            {placeDetails?.tags && placeDetails.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {placeDetails.tags.map((tag: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* 图片查看器（大图） */}
    {allImages.length > 0 && (
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 bg-black/95 [&>button]:hidden">
          <div className="relative w-full h-[80vh] flex items-center justify-center">
            {/* 关闭按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={() => setImageViewerOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>

            {/* 上一张按钮 */}
            {allImages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 z-10 text-white hover:bg-white/20"
                onClick={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            )}

            {/* 图片 */}
            <img
              src={allImages[currentImageIndex]?.url}
              alt={allImages[currentImageIndex]?.caption || `${name} - 图片 ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />

            {/* 下一张按钮 */}
            {allImages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 z-10 text-white hover:bg-white/20"
                onClick={() => setCurrentImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            )}

            {/* 图片信息 */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-lg text-sm">
              {allImages[currentImageIndex]?.caption || `${name} (${currentImageIndex + 1}/${allImages.length})`}
            </div>

            {/* 缩略图导航（多张图片时显示） */}
            {allImages.length > 1 && (
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={cn(
                      "flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all",
                      idx === currentImageIndex 
                        ? "border-white" 
                        : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img
                      src={img.url}
                      alt={`缩略图 ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}