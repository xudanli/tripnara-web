/**
 * Planning Assistant V2 - 天气信息显示组件
 */

import { Card, CardContent } from '@/components/ui/card';
import { Cloud, Thermometer, Droplets, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeatherInfo } from '@/api/planning-assistant-v2';

interface WeatherDisplayProps {
  weather: WeatherInfo;
  className?: string;
}

export function WeatherDisplay({ weather, className }: WeatherDisplayProps) {
  if (!weather) {
    return null;
  }

  return (
    <Card className={cn('mt-4', className)}>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <Cloud className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{weather.temperature}°C</span>
              <span className="text-sm text-muted-foreground">{weather.condition}</span>
            </div>
            {weather.descriptionCN && (
              <p className="text-sm text-muted-foreground mt-1">{weather.descriptionCN}</p>
            )}
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              {weather.humidity !== undefined && (
                <div className="flex items-center gap-1">
                  <Droplets className="w-3 h-3" />
                  湿度 {weather.humidity}%
                </div>
              )}
              {weather.windSpeed !== undefined && (
                <div className="flex items-center gap-1">
                  <Wind className="w-3 h-3" />
                  风速 {weather.windSpeed} km/h
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
