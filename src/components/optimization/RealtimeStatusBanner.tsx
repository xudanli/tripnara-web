/**
 * 实时状态横幅组件
 * 
 * 显示天气、路况、人体状态的实时更新
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type {
  RealtimeStateResponse,
  VisibilityLevel,
  RoadStatusType,
  SeverityLevel,
} from '@/types/optimization-v2';
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  Wind,
  Eye,
  EyeOff,
  Thermometer,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MinusCircle,
  Car,
  Activity,
  Mountain,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Bell,
  BellOff,
  Wifi,
  WifiOff,
} from 'lucide-react';

// ==================== 配置 ====================

const VISIBILITY_CONFIG: Record<VisibilityLevel, { label: string; icon: React.ElementType; color: string }> = {
  EXCELLENT: { label: '极佳', icon: Eye, color: 'text-green-500' },
  GOOD: { label: '良好', icon: Eye, color: 'text-blue-500' },
  MODERATE: { label: '中等', icon: Eye, color: 'text-yellow-500' },
  POOR: { label: '较差', icon: EyeOff, color: 'text-orange-500' },
  VERY_POOR: { label: '极差', icon: EyeOff, color: 'text-red-500' },
};

const ROAD_STATUS_CONFIG: Record<RoadStatusType, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  OPEN: { label: '通行', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
  RESTRICTED: { label: '限行', icon: MinusCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  CLOSED: { label: '关闭', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
};

// ==================== 子组件 ====================

/** 天气图标选择 */
function WeatherIcon({ 
  temperature, 
  precipitation 
}: { 
  temperature: number; 
  precipitation: number;
}) {
  if (precipitation > 0.7) {
    return temperature < 2 ? <CloudSnow className="h-5 w-5" /> : <CloudRain className="h-5 w-5" />;
  }
  if (precipitation > 0.3) {
    return <Cloud className="h-5 w-5" />;
  }
  return <Sun className="h-5 w-5" />;
}

/** 天气状态块 */
function WeatherBlock({
  weather,
  compact = false,
}: {
  weather: RealtimeStateResponse['weather'];
  compact?: boolean;
}) {
  const visConfig = VISIBILITY_CONFIG[weather.visibility as VisibilityLevel] ?? VISIBILITY_CONFIG.MODERATE;
  const VisIcon = visConfig?.icon ?? Eye;

  return (
    <div className={cn(
      'flex items-center gap-4',
      compact && 'gap-2'
    )}>
      {/* 温度 */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-muted-foreground" />
              <span className={cn('font-medium tabular-nums', compact && 'text-sm')}>
                {weather.temperatureC}°C
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>当前温度</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* 风速 */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <Wind className={cn(
                'h-4 w-4',
                weather.windSpeedMs > 15 ? 'text-red-500' : 
                weather.windSpeedMs > 10 ? 'text-yellow-500' : 
                'text-muted-foreground'
              )} />
              <span className={cn('tabular-nums', compact && 'text-sm')}>
                {weather.windSpeedMs.toFixed(1)} m/s
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            风速 {weather.windSpeedMs > 15 ? '（强风警告）' : weather.windSpeedMs > 10 ? '（注意风力）' : ''}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* 降水概率 */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <WeatherIcon 
                temperature={weather.temperatureC} 
                precipitation={weather.precipitationProbability} 
              />
              <span className={cn('tabular-nums', compact && 'text-sm')}>
                {Math.round(weather.precipitationProbability * 100)}%
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>降水概率</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* 能见度 */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <VisIcon className={cn('h-4 w-4', visConfig.color)} />
              {!compact && <span className="text-sm">{visConfig.label}</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent>能见度: {visConfig.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* 警报 */}
      {weather.alerts && weather.alerts.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {weather.alerts.length}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {weather.alerts.map((alert, i) => (
                  <p key={i}>{alert}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

/** 路况状态块 */
function RoadStatusBlock({
  roads,
  compact = false,
}: {
  roads: RealtimeStateResponse['roads'];
  compact?: boolean;
}) {
  const openCount = roads.filter(r => r.status === 'OPEN').length;
  const restrictedCount = roads.filter(r => r.status === 'RESTRICTED').length;
  const closedCount = roads.filter(r => r.status === 'CLOSED').length;

  const overallStatus: RoadStatusType = 
    closedCount > 0 ? 'CLOSED' : 
    restrictedCount > 0 ? 'RESTRICTED' : 
    'OPEN';
  
  const statusConfig = ROAD_STATUS_CONFIG[overallStatus];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Car className="h-4 w-4 text-muted-foreground" />
        <span className={cn('font-medium', compact && 'text-sm')}>路况</span>
      </div>
      
      <div className="flex items-center gap-2">
        {openCount > 0 && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            {openCount}
          </Badge>
        )}
        {restrictedCount > 0 && (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <MinusCircle className="h-3 w-3 mr-1" />
            {restrictedCount}
          </Badge>
        )}
        {closedCount > 0 && (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            {closedCount}
          </Badge>
        )}
      </div>
    </div>
  );
}

/** 人体状态块 */
function HumanStateBlock({
  human,
  compact = false,
}: {
  human: RealtimeStateResponse['human'];
  compact?: boolean;
}) {
  const fatiguePercent = Math.round(human.fatigueLevel * 100);
  const altitudeRiskPercent = Math.round(human.altitudeSicknessRisk * 100);

  const getFatigueColor = (level: number) => {
    if (level < 0.3) return 'text-green-500';
    if (level < 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={cn(
      'flex items-center gap-4',
      compact && 'gap-3'
    )}>
      {/* 疲劳度 */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Activity className={cn('h-4 w-4', getFatigueColor(human.fatigueLevel))} />
              <div className="flex items-center gap-1.5">
                <span className={cn('text-sm', compact && 'hidden sm:inline')}>疲劳</span>
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'h-full rounded-full transition-all',
                      human.fatigueLevel < 0.3 ? 'bg-green-500' :
                      human.fatigueLevel < 0.6 ? 'bg-yellow-500' :
                      'bg-red-500'
                    )}
                    style={{ width: `${fatiguePercent}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {fatiguePercent}%
                </span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            疲劳度: {fatiguePercent}%
            {human.fatigueLevel >= 0.6 && ' (建议休息)'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* 高反风险 */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Mountain className={cn(
                'h-4 w-4',
                human.altitudeSicknessRisk < 0.3 ? 'text-green-500' :
                human.altitudeSicknessRisk < 0.6 ? 'text-yellow-500' :
                'text-red-500'
              )} />
              <div className="flex items-center gap-1.5">
                <span className={cn('text-sm', compact && 'hidden sm:inline')}>高反</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {altitudeRiskPercent}%
                </span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            高原反应风险: {altitudeRiskPercent}%
            {human.altitudeSicknessRisk >= 0.5 && ' (注意监测)'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* 建议 */}
      {human.recommendations && human.recommendations.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="gap-1 cursor-help">
                <Bell className="h-3 w-3" />
                {human.recommendations.length} 条建议
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <ul className="space-y-1 text-sm">
                {human.recommendations.map((rec, i) => (
                  <li key={i}>• {rec}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ==================== 主组件 ====================

export interface RealtimeStatusBannerProps {
  /** 实时状态数据 */
  state?: RealtimeStateResponse;
  /** 是否已连接 */
  connected?: boolean;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 是否正在刷新 */
  refreshing?: boolean;
  /** 是否紧凑模式 */
  compact?: boolean;
  /** 是否可展开 */
  collapsible?: boolean;
  /** 默认是否展开 */
  defaultExpanded?: boolean;
  /** 严重级别过滤 */
  minSeverity?: SeverityLevel;
  /** 自定义类名 */
  className?: string;
}

export function RealtimeStatusBanner({
  state,
  connected = true,
  onRefresh,
  refreshing = false,
  compact = false,
  collapsible = false,
  defaultExpanded = true,
  minSeverity = 'INFO',
  className,
}: RealtimeStatusBannerProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  // 计算整体状态
  const getOverallSeverity = (): SeverityLevel => {
    if (!state) return 'INFO';
    
    const roads = state.roads || [];
    const weather = state.weather || { alerts: [] };
    const human = state.human || { fatigueLevel: 0, altitudeSicknessRisk: 0 };
    
    const hasClosedRoad = roads.some(r => r.status === 'CLOSED');
    const hasWeatherAlert = (weather.alerts || []).length > 0;
    const highFatigue = (human.fatigueLevel || 0) >= 0.7;
    const highAltitudeRisk = (human.altitudeSicknessRisk || 0) >= 0.6;
    
    if (hasClosedRoad || (hasWeatherAlert && (weather.alerts || []).some(a => 
      a.toLowerCase().includes('severe') || a.toLowerCase().includes('危险')
    ))) {
      return 'CRITICAL';
    }
    
    if (hasWeatherAlert || highFatigue || highAltitudeRisk || 
        roads.some(r => r.status === 'RESTRICTED')) {
      return 'WARNING';
    }
    
    return 'INFO';
  };

  const severity = getOverallSeverity();
  const severityColors = {
    INFO: 'bg-blue-50 border-blue-200',
    WARNING: 'bg-yellow-50 border-yellow-200',
    CRITICAL: 'bg-red-50 border-red-200',
  };

  if (!state) {
    return (
      <div className={cn(
        'flex items-center justify-between px-4 py-3 rounded-lg border bg-muted/50',
        className
      )}>
        <div className="flex items-center gap-2 text-muted-foreground">
          {connected ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">加载实时状态...</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span className="text-sm">未连接</span>
            </>
          )}
        </div>
      </div>
    );
  }

  const content = (
    <div className={cn(
      'flex flex-wrap items-center gap-4',
      compact ? 'gap-3' : 'gap-6'
    )}>
      <WeatherBlock weather={state.weather} compact={compact} />
      <div className="w-px h-6 bg-border" />
      <RoadStatusBlock roads={state.roads} compact={compact} />
      <div className="w-px h-6 bg-border" />
      <HumanStateBlock human={state.human} compact={compact} />
    </div>
  );

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {connected ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <span className="text-sm font-medium">实时状态</span>
        <span className="text-xs text-muted-foreground">
          更新于 {new Date(state.updatedAt).toLocaleTimeString('zh-CN')}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          </Button>
        )}
        {collapsible && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );

  if (collapsible) {
    return (
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <div className={cn(
          'rounded-lg border px-4 py-3',
          severityColors[severity],
          className
        )}>
          <CollapsibleTrigger asChild>
            <div className="cursor-pointer">{header}</div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 pt-3 border-t">
              {content}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  return (
    <div className={cn(
      'rounded-lg border px-4 py-3',
      severityColors[severity],
      className
    )}>
      {header}
      <div className="mt-3">
        {content}
      </div>
    </div>
  );
}

// ==================== 导出 ====================

export default RealtimeStatusBanner;
export { WeatherBlock, RoadStatusBlock, HumanStateBlock };
