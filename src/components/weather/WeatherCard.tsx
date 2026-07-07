/**
 * 天气卡片组件
 * 
 * 用于显示当前天气信息，支持紧凑模式和详情模式
 */

import { useState } from 'react';
import { useWeather } from '@/hooks/useWeather';
import type { GetCurrentWeatherParams } from '@/types/weather';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  Sun, 
  Wind, 
  AlertTriangle,
  RefreshCw,
  Droplets,
  Eye,
  Gauge,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeatherCardProps {
  /** 位置坐标 */
  location: { lat: number; lng: number } | null;
  /** 是否包含详细风速信息（冰岛特定） */
  includeWindDetails?: boolean;
  /** 紧凑模式（默认 false） */
  compact?: boolean;
  /** 自定义刷新间隔（毫秒，默认 5 分钟） */
  refreshInterval?: number;
  /** 位置名称（用于显示） */
  locationName?: string;
}

/**
 * 获取天气图标
 */
function getWeatherIcon(condition: string, size: 'sm' | 'md' = 'md') {
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  
  switch (condition) {
    case 'sunny':
      return <Sun className={cn(iconSize, 'text-amber-500')} />;
    case 'cloudy':
      return <Cloud className={cn(iconSize, 'text-gray-500')} />;
    case 'rainy':
      return <CloudRain className={cn(iconSize, 'text-muted-foreground')} />;
    case 'snowy':
      return <CloudSnow className={cn(iconSize, 'text-muted-foreground')} />;
    case 'stormy':
      return <CloudRain className={cn(iconSize, 'text-muted-foreground')} />;
    case 'foggy':
      return <Cloud className={cn(iconSize, 'text-gray-400')} />;
    case 'hazy':
      return <Cloud className={cn(iconSize, 'text-orange-400')} />;
    case 'windy':
      return <Wind className={cn(iconSize, 'text-gray-600')} />;
    default:
      return <Cloud className={cn(iconSize, 'text-gray-400')} />;
  }
}

/**
 * 获取天气条件的中文标签
 */
function getWeatherLabel(condition: string): string {
  const labels: Record<string, string> = {
    sunny: '晴天',
    cloudy: '多云',
    rainy: '雨天',
    snowy: '雪天',
    stormy: '暴风雨',
    foggy: '雾天',
    hazy: '雾霾',
    windy: '大风',
  };
  return labels[condition] || condition;
}

/**
 * 获取警告颜色
 */
function getAlertColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-gate-reject text-gate-reject-foreground border-gate-reject-border';
    case 'warning':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'info':
      return 'bg-muted/15 text-muted-foreground border-border';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export function WeatherCard({
  location,
  includeWindDetails = false,
  compact = false,
  refreshInterval = 5 * 60 * 1000,
  locationName,
}: WeatherCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const weatherParams: GetCurrentWeatherParams | null = location
    ? {
        lat: location.lat,
        lng: location.lng,
        includeWindDetails,
      }
    : null;

  const { data, loading, error, refetch } = useWeather(weatherParams, {
    enabled: Boolean(location),
    refreshInterval,
  });

  if (!location) {
    return null;
  }

  // 加载状态
  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>加载天气...</span>
      </div>
    );
  }

  // 错误状态
  if (error && !data) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              天气数据不可用
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{error}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // 没有数据
  if (!data) {
    return null;
  }

  // 紧凑模式
  if (compact) {
    const hasAlerts = data.alerts && data.alerts.length > 0;
    const criticalAlerts = data.alerts?.filter(a => a.severity === 'critical') || [];
    const warningAlerts = data.alerts?.filter(a => a.severity === 'warning') || [];

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 gap-2',
              hasAlerts && 'border-amber-300 bg-amber-50'
            )}
          >
            {getWeatherIcon(data.condition, 'sm')}
            <span className="font-medium">{Math.round(data.temperature)}°C</span>
            {data.windSpeed > 0 && (
              <span className="text-xs text-muted-foreground">
                <Wind className="w-3 h-3 inline mr-0.5" />
                {Math.round(data.windSpeed)}
              </span>
            )}
            {hasAlerts && (
              <Badge 
                variant="outline" 
                className={cn(
                  'ml-1 h-4 px-1 text-[10px]',
                  criticalAlerts.length > 0 && 'bg-gate-reject text-gate-reject-foreground border-gate-reject-border',
                  criticalAlerts.length === 0 && warningAlerts.length > 0 && 'bg-amber-100 text-amber-700 border-amber-300'
                )}
              >
                {criticalAlerts.length > 0 ? criticalAlerts.length : warningAlerts.length}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <WeatherDetails 
            data={data} 
            locationName={locationName}
            onRefresh={refetch}
          />
        </PopoverContent>
      </Popover>
    );
  }

  // 完整模式
  return (
    <Card className="border-gray-200">
      <CardContent className="p-4">
        <WeatherDetails 
          data={data} 
          locationName={locationName}
          onRefresh={refetch}
          expanded={showDetails}
          onToggleExpanded={() => setShowDetails(!showDetails)}
        />
      </CardContent>
    </Card>
  );
}

/**
 * 天气详情内容
 */
function WeatherDetails({
  data,
  locationName,
  onRefresh,
  expanded = false,
  onToggleExpanded,
}: {
  data: any;
  locationName?: string;
  onRefresh: () => void;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}) {
  const hasAlerts = data.alerts && data.alerts.length > 0;
  const criticalAlerts = data.alerts?.filter((a: any) => a.severity === 'critical') || [];
  const warningAlerts = data.alerts?.filter((a: any) => a.severity === 'warning') || [];

  return (
    <div className="space-y-3">
      {/* 头部：位置和刷新 */}
      <div className="flex items-start justify-between">
        <div>
          {locationName && (
            <p className="text-xs text-muted-foreground mb-1">{locationName}</p>
          )}
          <div className="flex items-center gap-2">
            {getWeatherIcon(data.condition, 'md')}
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{Math.round(data.temperature)}</span>
                <span className="text-sm text-muted-foreground">°C</span>
                {data.feelsLikeTemperature !== undefined && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (体感 {Math.round(data.feelsLikeTemperature)}°)
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{getWeatherLabel(data.condition)}</p>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onRefresh}
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      {/* 警告信息 */}
      {hasAlerts && (
        <div className="space-y-2">
          {criticalAlerts.map((alert: any, idx: number) => (
            <Badge
              key={idx}
              variant="outline"
              className={cn('w-full justify-start text-xs', getAlertColor(alert.severity))}
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              <span className="font-medium">{alert.title}</span>
            </Badge>
          ))}
          {warningAlerts.map((alert: any, idx: number) => (
            <Badge
              key={idx}
              variant="outline"
              className={cn('w-full justify-start text-xs', getAlertColor(alert.severity))}
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              <span>{alert.title}</span>
            </Badge>
          ))}
        </div>
      )}

      {/* 详细信息（可展开） */}
      {onToggleExpanded && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={onToggleExpanded}
          >
            {expanded ? (
              <>收起详情 <ChevronUp className="w-3 h-3 ml-1" /></>
            ) : (
              <>查看详情 <ChevronDown className="w-3 h-3 ml-1" /></>
            )}
          </Button>

          {expanded && (
            <div className="space-y-2 pt-2 border-t border-dashed border-gray-200">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Droplets className="w-3 h-3" />
                  <span>湿度: {data.humidity}%</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Eye className="w-3 h-3" />
                  <span>能见度: {(data.visibility / 1000).toFixed(1)} km</span>
                </div>
                {data.windSpeed > 0 && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Wind className="w-3 h-3" />
                    <span>风速: {Math.round(data.windSpeed)} m/s</span>
                    {data.windDirection !== undefined && (
                      <span className="text-[10px]">
                        ({Math.round(data.windDirection)}°)
                      </span>
                    )}
                  </div>
                )}
                {data.metadata?.windGust && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Gauge className="w-3 h-3" />
                    <span>阵风: {Math.round(data.metadata.windGust)} m/s</span>
                  </div>
                )}
                {data.metadata?.pressure && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Gauge className="w-3 h-3" />
                    <span>气压: {data.metadata.pressure} hPa</span>
                  </div>
                )}
              </div>

              {/* 数据源信息 */}
              <div className="text-[10px] text-muted-foreground pt-1">
                数据源: {data.source}
                {data.metadata?.stationName && ` · ${data.metadata.stationName}`}
                {data.lastUpdated && (
                  <span className="ml-2">
                    更新于: {new Date(data.lastUpdated).toLocaleTimeString('zh-CN', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* 如果没有展开/收起功能，直接显示基本信息 */}
      {!onToggleExpanded && (
        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-dashed border-gray-200">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Droplets className="w-3 h-3" />
            <span>湿度: {data.humidity}%</span>
          </div>
          {data.windSpeed > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Wind className="w-3 h-3" />
              <span>风速: {Math.round(data.windSpeed)} m/s</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== WeatherMini 轻量级天气组件 ====================

interface WeatherMiniProps {
  /** 位置坐标 */
  location: { lat: number; lng: number } | null;
  /** 是否显示为预报（非当天） */
  isForecast?: boolean;
}

/**
 * 轻量级天气迷你组件
 * 用于行程项行内显示，只显示图标和温度
 */
export function WeatherMini({ location, isForecast = false }: WeatherMiniProps) {
  const { data, loading, error } = useWeather(
    location ? { lat: location.lat, lng: location.lng } : null,
    { enabled: Boolean(location), refreshInterval: 10 * 60 * 1000 },
  );

  if (!location) {
    return null;
  }

  // 加载中 - 显示小型加载图标
  if (loading && !data) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <RefreshCw className="w-3 h-3 animate-spin" />
      </span>
    );
  }

  // 错误或无数据 - 不显示
  if (error || !data) {
    return null;
  }

  // 判断是否为极端天气
  const isExtremeWeather = 
    data.temperature > 35 || 
    data.temperature < -10 || 
    data.condition === 'stormy' ||
    data.condition === 'snowy' ||
    (data.alerts && data.alerts.length > 0);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            className={cn(
              "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md cursor-default",
              isExtremeWeather 
                ? "bg-amber-50 text-amber-700 border border-amber-200" 
                : "bg-muted/15 text-muted-foreground border border-border"
            )}
          >
            {getWeatherIcon(data.condition, 'sm')}
            <span className="font-medium">{Math.round(data.temperature)}°</span>
            {isForecast && <span className="text-[10px] opacity-70">预</span>}
            {isExtremeWeather && <AlertTriangle className="w-3 h-3 text-amber-500" />}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-medium">
              {getWeatherLabel(data.condition)} {Math.round(data.temperature)}°C
            </div>
            <div className="text-xs text-muted-foreground">
              {data.feelsLikeTemperature !== undefined && (
                <>体感 {Math.round(data.feelsLikeTemperature)}°C · </>
              )}
              湿度 {data.humidity}%
            </div>
            {data.windSpeed > 0 && (
              <div className="text-xs text-muted-foreground">
                风速 {Math.round(data.windSpeed)} m/s
              </div>
            )}
            {data.alerts && data.alerts.length > 0 && (
              <div className="text-xs text-amber-600 font-medium">
                ⚠️ {data.alerts[0].title}
              </div>
            )}
            {isForecast && (
              <div className="text-xs text-muted-foreground italic">
                * 天气预报，实际可能有变化
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ==================== TripCardWeather 行程卡片天气组件 ====================

interface TripCardWeatherProps {
  /** 目的地国家代码（如 "IS", "JP"） */
  countryCode: string;
  /** 行程开始日期 */
  startDate: string;
  /** 是否显示（仅在即将出发的行程显示） */
  showOnlyUpcoming?: boolean;
}

// 常见国家首都坐标
const COUNTRY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  'IS': { lat: 64.1466, lng: -21.9426, name: '冰岛' },
  'JP': { lat: 35.6762, lng: 139.6503, name: '日本' },
  'TH': { lat: 13.7563, lng: 100.5018, name: '泰国' },
  'KR': { lat: 37.5665, lng: 126.9780, name: '韩国' },
  'US': { lat: 40.7128, lng: -74.0060, name: '美国' },
  'GB': { lat: 51.5074, lng: -0.1278, name: '英国' },
  'FR': { lat: 48.8566, lng: 2.3522, name: '法国' },
  'CN': { lat: 39.9042, lng: 116.4074, name: '中国' },
  'SG': { lat: 1.3521, lng: 103.8198, name: '新加坡' },
  'AU': { lat: -33.8688, lng: 151.2093, name: '澳大利亚' },
  'NZ': { lat: -36.8485, lng: 174.7633, name: '新西兰' },
  'DE': { lat: 52.5200, lng: 13.4050, name: '德国' },
  'IT': { lat: 41.9028, lng: 12.4964, name: '意大利' },
  'ES': { lat: 40.4168, lng: -3.7038, name: '西班牙' },
  'HK': { lat: 22.3193, lng: 114.1694, name: '香港' },
  'TW': { lat: 25.0330, lng: 121.5654, name: '台湾' },
  'MY': { lat: 3.1390, lng: 101.6869, name: '马来西亚' },
  'VN': { lat: 21.0285, lng: 105.8542, name: '越南' },
  'ID': { lat: -6.2088, lng: 106.8456, name: '印尼' },
  'PH': { lat: 14.5995, lng: 120.9842, name: '菲律宾' },
};

/**
 * 行程卡片天气组件
 * 用于在行程列表中显示即将出发行程的目的地天气
 */
export function TripCardWeather({ countryCode, startDate, showOnlyUpcoming = true }: TripCardWeatherProps) {
  const code = countryCode?.split(',')[0]?.trim().toUpperCase();
  const coords = COUNTRY_COORDS[code];

  const daysUntilStart = Math.ceil(
    (new Date(startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  );
  const isUpcoming = daysUntilStart >= 0 && daysUntilStart <= 7;
  const shouldFetch = Boolean(coords) && (!showOnlyUpcoming || isUpcoming);

  const { data, loading, error } = useWeather(
    coords ? { lat: coords.lat, lng: coords.lng } : null,
    { enabled: shouldFetch, refreshInterval: 15 * 60 * 1000 },
  );

  if (showOnlyUpcoming && !isUpcoming) {
    return null;
  }

  if (!coords) {
    return null;
  }

  // 加载中
  if (loading && !data) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <RefreshCw className="w-3 h-3 animate-spin" />
      </div>
    );
  }

  // 错误或无数据
  if (error || !data) {
    return null;
  }

  // 判断是否有警告
  const hasAlerts = data.alerts && data.alerts.length > 0;
  const isExtremeWeather = 
    data.temperature > 35 || 
    data.temperature < -10 || 
    data.condition === 'stormy' ||
    hasAlerts;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
              isExtremeWeather 
                ? "bg-amber-50 text-amber-700 border border-amber-200" 
                : "bg-muted/15 text-muted-foreground border border-border"
            )}
          >
            {getWeatherIcon(data.condition, 'sm')}
            <span className="font-medium">{Math.round(data.temperature)}°C</span>
            {hasAlerts && <AlertTriangle className="w-3 h-3 text-amber-500" />}
            {daysUntilStart === 0 && <span className="text-[10px]">今天出发</span>}
            {daysUntilStart > 0 && daysUntilStart <= 3 && (
              <span className="text-[10px]">{daysUntilStart}天后出发</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-medium">
              {coords.name} · {getWeatherLabel(data.condition)} {Math.round(data.temperature)}°C
            </div>
            <div className="text-xs text-muted-foreground">
              {data.feelsLikeTemperature !== undefined && (
                <>体感 {Math.round(data.feelsLikeTemperature)}°C · </>
              )}
              湿度 {data.humidity}%
            </div>
            {hasAlerts && (
              <div className="text-xs text-amber-600 font-medium mt-1">
                ⚠️ {data.alerts![0].title}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** 行程列表卡片内紧凑温度读数（只读 metric，中性字色） */
export function TripListCompactWeather({ countryCode }: { countryCode: string }) {
  const code = countryCode?.split(',')[0]?.trim().toUpperCase();
  const coords = COUNTRY_COORDS[code];

  const { data, loading } = useWeather(
    coords ? { lat: coords.lat, lng: coords.lng } : null,
    { enabled: Boolean(coords), refreshInterval: 15 * 60 * 1000 },
  );

  if (!coords) return <span className="text-muted-foreground">—</span>;
  if (loading && !data) return <span className="text-muted-foreground text-xs">…</span>;
  if (!data) return <span className="text-muted-foreground">—</span>;

  return (
    <span className="font-mono-brand text-muted-foreground tabular-nums">
      {Math.round(data.temperature)}°C
    </span>
  );
}

// ==================== WeatherAlertBanner 天气预警横幅 ====================

interface WeatherAlertBannerProps {
  /** 位置坐标 */
  location: { lat: number; lng: number } | null;
  /** 位置名称 */
  locationName?: string;
  /** 行程开始日期（用于判断紧急程度） */
  startDate?: string;
  /** 自定义类名 */
  className?: string;
  /** 关闭回调 */
  onDismiss?: () => void;
}

/**
 * 天气预警横幅组件
 * 当目的地有极端天气或天气警告时显示
 */
export function WeatherAlertBanner({ 
  location, 
  locationName,
  startDate,
  className,
  onDismiss 
}: WeatherAlertBannerProps) {
  const { data, loading, error } = useWeather(
    location ? { lat: location.lat, lng: location.lng } : null,
    { enabled: Boolean(location), refreshInterval: 10 * 60 * 1000 },
  );

  if (!location) {
    return null;
  }

  // 加载中或错误，不显示
  if (loading || error || !data) {
    return null;
  }

  // 判断是否需要显示警告
  const hasAlerts = data.alerts && data.alerts.length > 0;
  const isExtremeHeat = data.temperature > 35;
  const isExtremeCold = data.temperature < -10;
  const isStorm = data.condition === 'stormy';
  const isHeavySnow = data.condition === 'snowy' && hasAlerts;
  
  const shouldShow = hasAlerts || isExtremeHeat || isExtremeCold || isStorm || isHeavySnow;
  
  if (!shouldShow) {
    return null;
  }

  // 计算距离出发还有多少天
  const daysUntilStart = startDate 
    ? Math.ceil((new Date(startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isUrgent = daysUntilStart !== null && daysUntilStart >= 0 && daysUntilStart <= 3;

  // 确定警告级别和样式
  let severity: 'critical' | 'warning' | 'info' = 'warning';
  let title = '天气提醒';
  let message = '';
  let suggestion = '';

  if (hasAlerts) {
    const alert = data.alerts![0];
    severity = alert.severity === 'critical' ? 'critical' : 'warning';
    title = alert.title;
    message = alert.description || '';
  } else if (isExtremeHeat) {
    severity = 'warning';
    title = '高温预警';
    message = `${locationName || '目的地'}当前气温 ${Math.round(data.temperature)}°C，体感温度可能更高`;
    suggestion = '建议携带防晒用品，避免中午时段户外活动，多补充水分';
  } else if (isExtremeCold) {
    severity = 'warning';
    title = '低温预警';
    message = `${locationName || '目的地'}当前气温 ${Math.round(data.temperature)}°C`;
    suggestion = '建议携带保暖衣物，注意防寒保暖，户外活动时间不宜过长';
  } else if (isStorm) {
    severity = 'critical';
    title = '暴风雨预警';
    message = `${locationName || '目的地'}当前有暴风雨天气`;
    suggestion = '建议调整行程安排，避免户外活动，关注当地天气预报';
  } else if (isHeavySnow) {
    severity = 'warning';
    title = '大雪预警';
    message = `${locationName || '目的地'}当前有大雪天气`;
    suggestion = '建议关注交通状况，准备防滑装备，预留额外出行时间';
  }

  const bgColor = {
    critical: 'bg-gate-reject border-gate-reject-border',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-muted/15 border-border',
  }[severity];

  const textColor = {
    critical: 'text-gate-reject-foreground',
    warning: 'text-amber-800',
    info: 'text-muted-foreground',
  }[severity];

  const iconColor = {
    critical: 'text-gate-reject-foreground',
    warning: 'text-amber-500',
    info: 'text-muted-foreground',
  }[severity];

  return (
    <div className={cn(
      "rounded-lg border p-4",
      bgColor,
      className
    )}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={cn("w-5 h-5 mt-0.5 flex-shrink-0", iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn("font-medium", textColor)}>{title}</h4>
            {isUrgent && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gate-reject text-gate-reject-foreground border-gate-reject-border">
                {daysUntilStart === 0 ? '今天出发' : `${daysUntilStart}天后出发`}
              </Badge>
            )}
          </div>
          <p className={cn("text-sm", textColor, "opacity-90")}>{message}</p>
          {suggestion && (
            <p className={cn("text-sm mt-2", textColor, "opacity-75")}>
              💡 {suggestion}
            </p>
          )}
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mt-1 -mr-1"
            onClick={onDismiss}
          >
            <span className="sr-only">关闭</span>
            ×
          </Button>
        )}
      </div>
    </div>
  );
}
