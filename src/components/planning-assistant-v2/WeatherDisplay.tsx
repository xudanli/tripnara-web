/**
 * Planning Assistant V2 - 天气信息显示组件
 *
 * 支持两种 API 结构：
 * 1. 新格式：{ city, country, current: { weather_description, temperature, humidity, wind_speed }, units?: { wind_speed } }
 * 2. 旧格式：{ condition, temperature, humidity, windSpeed, descriptionCN }
 *
 * 注意：response.reply 或 response.messageCN 已作为主内容在 MessageBubble 中展示，本组件仅展示结构化天气卡片。
 */

import { Card, CardContent } from '@/components/ui/card';
import { Cloud, Droplets, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';

/** 新 API 结构：嵌套 current */
interface WeatherCurrent {
  weather_description?: string;
  temperature?: number;
  humidity?: number;
  wind_speed?: number;
}

interface WeatherApiResponse {
  city?: string;
  country?: string;
  current?: WeatherCurrent;
  units?: { wind_speed?: string };
  // 旧格式兼容
  condition?: string;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  descriptionCN?: string;
}

interface WeatherDisplayProps {
  weather: WeatherApiResponse | null | undefined;
  className?: string;
}

export function WeatherDisplay({ weather, className }: WeatherDisplayProps) {
  if (!weather) {
    return null;
  }

  const curr = weather.current;
  const temperature = curr?.temperature ?? weather.temperature;
  const condition =
    curr?.weather_description ?? weather.condition ?? weather.descriptionCN ?? '';
  const humidity = curr?.humidity ?? weather.humidity;
  const windSpeed = curr?.wind_speed ?? weather.windSpeed;
  const windUnit = weather.units?.wind_speed ?? 'm/s';

  const hasLocation = weather.city || weather.country;

  return (
    <Card className={cn('mt-4 weather-card', className)}>
      <CardContent className="pt-4">
        {hasLocation && (
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            {weather.city}
            {weather.country ? `（${weather.country}）` : ''}
          </h4>
        )}
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <Cloud className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-base">
              {condition}
              {temperature != null && `，${temperature}°C`}
            </p>
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              {humidity != null && (
                <div className="flex items-center gap-1">
                  <Droplets className="w-3 h-3" />
                  湿度 {humidity}%
                </div>
              )}
              {windSpeed != null && (
                <div className="flex items-center gap-1">
                  <Wind className="w-3 h-3" />
                  风速 {windSpeed} {windUnit}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
