/**
 * 实地报告表单组件
 * 
 * 用户提交实地观察到的天气、路况、风险、身体状态
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { FieldReportRequest, FieldReportType } from '@/types/optimization-v2';
import {
  Cloud,
  Car,
  AlertTriangle,
  Activity,
  MapPin,
  Wind,
  Eye,
  ThermometerSnowflake,
  Construction,
  Mountain,
  HeartPulse,
  Send,
  Loader2,
  CheckCircle,
} from 'lucide-react';

// ==================== 配置 ====================

const REPORT_TYPE_CONFIG: Record<FieldReportType, {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}> = {
  WEATHER: {
    label: '天气状况',
    description: '报告当前天气情况',
    icon: Cloud,
    color: 'text-blue-500',
  },
  ROAD_STATUS: {
    label: '路况信息',
    description: '报告道路通行情况',
    icon: Car,
    color: 'text-orange-500',
  },
  HAZARD: {
    label: '风险警报',
    description: '报告发现的危险情况',
    icon: AlertTriangle,
    color: 'text-red-500',
  },
  HUMAN_STATE: {
    label: '身体状态',
    description: '报告身体状况',
    icon: Activity,
    color: 'text-green-500',
  },
};

const WEATHER_CONDITIONS = [
  { value: 'sunny', label: '晴朗' },
  { value: 'cloudy', label: '多云' },
  { value: 'overcast', label: '阴天' },
  { value: 'light_rain', label: '小雨' },
  { value: 'heavy_rain', label: '大雨' },
  { value: 'snow', label: '下雪' },
  { value: 'fog', label: '大雾' },
  { value: 'storm', label: '暴风雨' },
];

const VISIBILITY_OPTIONS = [
  { value: 'excellent', label: '极佳 (>10km)' },
  { value: 'good', label: '良好 (5-10km)' },
  { value: 'moderate', label: '中等 (1-5km)' },
  { value: 'poor', label: '较差 (200m-1km)' },
  { value: 'very_poor', label: '极差 (<200m)' },
];

const ROAD_CONDITIONS = [
  { value: 'dry', label: '干燥' },
  { value: 'wet', label: '潮湿' },
  { value: 'icy', label: '结冰' },
  { value: 'snowy', label: '积雪' },
  { value: 'muddy', label: '泥泞' },
  { value: 'flooded', label: '积水' },
];

const OBSTACLES = [
  { value: 'none', label: '无障碍' },
  { value: 'rocks', label: '落石' },
  { value: 'debris', label: '碎石/杂物' },
  { value: 'vehicle', label: '事故车辆' },
  { value: 'construction', label: '施工' },
  { value: 'closed', label: '道路封闭' },
];

const HAZARD_TYPES = [
  { value: 'rockfall', label: '落石风险' },
  { value: 'avalanche', label: '雪崩风险' },
  { value: 'flood', label: '洪水风险' },
  { value: 'wildlife', label: '野生动物' },
  { value: 'cliff', label: '悬崖/陡坡' },
  { value: 'equipment', label: '设施损坏' },
  { value: 'other', label: '其他' },
];

const HAZARD_SEVERITY = [
  { value: 'low', label: '低', color: 'bg-green-100 text-green-700' },
  { value: 'medium', label: '中', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'high', label: '高', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: '危险', color: 'bg-red-100 text-red-700' },
];

const FEELING_OPTIONS = [
  { value: 'great', label: '状态极佳', emoji: '😊' },
  { value: 'good', label: '状态良好', emoji: '🙂' },
  { value: 'normal', label: '一般', emoji: '😐' },
  { value: 'tired', label: '有些疲劳', emoji: '😓' },
  { value: 'exhausted', label: '非常疲劳', emoji: '😫' },
  { value: 'unwell', label: '身体不适', emoji: '🤒' },
];

const SYMPTOMS = [
  { value: 'headache', label: '头痛' },
  { value: 'dizziness', label: '头晕' },
  { value: 'nausea', label: '恶心' },
  { value: 'shortness_of_breath', label: '呼吸急促' },
  { value: 'fatigue', label: '极度疲劳' },
  { value: 'muscle_pain', label: '肌肉酸痛' },
  { value: 'dehydration', label: '脱水' },
  { value: 'altitude_sickness', label: '高原反应' },
];

// ==================== 子组件 ====================

/** 置信度选择 */
function ConfidenceSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">报告置信度</Label>
        <span className="text-sm text-muted-foreground">
          {Math.round(value * 100)}%
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={1}
        step={0.1}
        className="py-2"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>不太确定</span>
        <span>非常确定</span>
      </div>
    </div>
  );
}

/** 位置输入 */
function LocationInput({
  location,
  onChange,
}: {
  location?: { lat: number; lng: number; segmentId?: string };
  onChange: (location: { lat: number; lng: number; segmentId?: string } | undefined) => void;
}) {
  const [useCurrentLocation, setUseCurrentLocation] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('您的浏览器不支持定位');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      (error) => {
        console.error('获取位置失败:', error);
        setLoading(false);
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          位置信息
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">使用当前位置</span>
          <Switch
            checked={useCurrentLocation}
            onCheckedChange={(checked) => {
              setUseCurrentLocation(checked);
              if (checked) getCurrentLocation();
            }}
          />
        </div>
      </div>

      {useCurrentLocation ? (
        <div className="p-3 rounded-lg bg-muted/50 text-sm">
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              获取位置中...
            </div>
          ) : location ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              已定位: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </div>
          ) : (
            <span className="text-muted-foreground">点击获取当前位置</span>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">纬度</Label>
            <Input
              type="number"
              step="0.000001"
              placeholder="例: 64.123456"
              value={location?.lat ?? ''}
              onChange={(e) => onChange({
                lat: parseFloat(e.target.value) || 0,
                lng: location?.lng ?? 0,
              })}
            />
          </div>
          <div>
            <Label className="text-xs">经度</Label>
            <Input
              type="number"
              step="0.000001"
              placeholder="例: -21.123456"
              value={location?.lng ?? ''}
              onChange={(e) => onChange({
                lat: location?.lat ?? 0,
                lng: parseFloat(e.target.value) || 0,
              })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** 症状多选 */
function SymptomSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(s => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>症状选择 (可多选)</Label>
      <div className="flex flex-wrap gap-2">
        {SYMPTOMS.map((symptom) => (
          <Badge
            key={symptom.value}
            variant={selected.includes(symptom.value) ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggle(symptom.value)}
          >
            {symptom.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

export interface FieldReportFormProps {
  /** 预设报告类型 */
  defaultType?: FieldReportType;
  /** 预设位置 */
  defaultLocation?: { lat: number; lng: number; segmentId?: string };
  /** 提交回调 */
  onSubmit: (request: FieldReportRequest) => Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
  /** 是否提交中 */
  isSubmitting?: boolean;
  /** 自定义类名 */
  className?: string;
}

export function FieldReportForm({
  defaultType = 'WEATHER',
  defaultLocation,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className,
}: FieldReportFormProps) {
  // ==================== 状态 ====================
  const [reportType, setReportType] = React.useState<FieldReportType>(defaultType);
  const [location, setLocation] = React.useState(defaultLocation);
  const [confidence, setConfidence] = React.useState(0.8);
  
  // 天气数据
  const [weatherCondition, setWeatherCondition] = React.useState('');
  const [windStrong, setWindStrong] = React.useState(false);
  const [visibility, setVisibility] = React.useState('');
  
  // 路况数据
  const [roadCondition, setRoadCondition] = React.useState('');
  const [obstacle, setObstacle] = React.useState('');
  
  // 风险数据
  const [hazardType, setHazardType] = React.useState('');
  const [hazardSeverity, setHazardSeverity] = React.useState('');
  const [hazardDescription, setHazardDescription] = React.useState('');
  
  // 身体状态
  const [feeling, setFeeling] = React.useState('');
  const [symptoms, setSymptoms] = React.useState<string[]>([]);

  const typeConfig = REPORT_TYPE_CONFIG[reportType];
  const TypeIcon = typeConfig.icon;

  // ==================== 提交 ====================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const request: FieldReportRequest = {
      type: reportType,
      location,
      confidence,
      data: {
        // 天气数据
        ...(reportType === 'WEATHER' && {
          condition: weatherCondition,
          windStrong,
          visibility,
        }),
        // 路况数据
        ...(reportType === 'ROAD_STATUS' && {
          roadCondition,
          obstacle,
        }),
        // 风险数据
        ...(reportType === 'HAZARD' && {
          hazardType,
          severity: hazardSeverity,
        }),
        // 身体状态
        ...(reportType === 'HUMAN_STATE' && {
          feeling,
          symptoms,
        }),
      },
    };

    await onSubmit(request);
  };

  // ==================== 渲染 ====================
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            'bg-primary/10'
          )}>
            <TypeIcon className={cn('h-5 w-5', typeConfig.color)} />
          </div>
          <div>
            <CardTitle>实地报告</CardTitle>
            <CardDescription>分享您在现场观察到的情况</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 报告类型选择 */}
          <Tabs value={reportType} onValueChange={(v) => setReportType(v as FieldReportType)}>
            <TabsList className="grid grid-cols-4 w-full">
              {Object.entries(REPORT_TYPE_CONFIG).map(([key, config]) => (
                <TabsTrigger key={key} value={key} className="gap-1">
                  <config.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* 天气报告 */}
            <TabsContent value="WEATHER" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>天气状况</Label>
                <Select value={weatherCondition} onValueChange={setWeatherCondition}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择天气状况" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEATHER_CONDITIONS.map((w) => (
                      <SelectItem key={w.value} value={w.value}>
                        {w.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Wind className="h-4 w-4" />
                  强风
                </Label>
                <Switch checked={windStrong} onCheckedChange={setWindStrong} />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  能见度
                </Label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择能见度" />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_OPTIONS.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* 路况报告 */}
            <TabsContent value="ROAD_STATUS" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>路面状况</Label>
                <Select value={roadCondition} onValueChange={setRoadCondition}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择路面状况" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROAD_CONDITIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Construction className="h-4 w-4" />
                  障碍物
                </Label>
                <Select value={obstacle} onValueChange={setObstacle}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择障碍类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {OBSTACLES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* 风险报告 */}
            <TabsContent value="HAZARD" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mountain className="h-4 w-4" />
                  风险类型
                </Label>
                <Select value={hazardType} onValueChange={setHazardType}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择风险类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {HAZARD_TYPES.map((h) => (
                      <SelectItem key={h.value} value={h.value}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>严重程度</Label>
                <div className="flex gap-2">
                  {HAZARD_SEVERITY.map((s) => (
                    <Badge
                      key={s.value}
                      variant={hazardSeverity === s.value ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer',
                        hazardSeverity === s.value && s.color
                      )}
                      onClick={() => setHazardSeverity(s.value)}
                    >
                      {s.label}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>详细描述</Label>
                <Textarea
                  value={hazardDescription}
                  onChange={(e) => setHazardDescription(e.target.value)}
                  placeholder="请描述您观察到的具体情况..."
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* 身体状态报告 */}
            <TabsContent value="HUMAN_STATE" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4" />
                  当前感受
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {FEELING_OPTIONS.map((f) => (
                    <Button
                      key={f.value}
                      type="button"
                      variant={feeling === f.value ? 'default' : 'outline'}
                      className="h-auto py-3 flex-col gap-1"
                      onClick={() => setFeeling(f.value)}
                    >
                      <span className="text-xl">{f.emoji}</span>
                      <span className="text-xs">{f.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
              
              <SymptomSelector
                selected={symptoms}
                onChange={setSymptoms}
              />
            </TabsContent>
          </Tabs>

          {/* 位置信息 */}
          <LocationInput
            location={location}
            onChange={setLocation}
          />

          {/* 置信度 */}
          <ConfidenceSelector
            value={confidence}
            onChange={setConfidence}
          />

          {/* 提交按钮 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                取消
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  提交报告
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ==================== 导出 ====================

export default FieldReportForm;
export {
  ConfidenceSelector,
  LocationInput,
  SymptomSelector,
  REPORT_TYPE_CONFIG,
  WEATHER_CONDITIONS,
  ROAD_CONDITIONS,
  HAZARD_TYPES,
};
