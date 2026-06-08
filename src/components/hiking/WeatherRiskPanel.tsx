import type { LaugavegurPreview } from '@/types/hiking';
import { cn } from '@/lib/utils';

interface WeatherRiskPanelProps {
  weatherRisk: LaugavegurPreview['weatherRisk'];
  className?: string;
}

export function WeatherRiskPanel({ weatherRisk, className }: WeatherRiskPanelProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <p className="text-sm font-medium">{weatherRisk.headlineZh}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">风险等级 · {weatherRisk.level}</p>
      </div>
      <ul className="space-y-2">
        {weatherRisk.rules.map((rule, i) => (
          <li
            key={i}
            className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm leading-relaxed"
          >
            {rule}
          </li>
        ))}
      </ul>
    </div>
  );
}
