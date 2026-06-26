import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface DimensionBarProps {
  label: string;
  value: number;
  weight?: number;
  className?: string;
}

export function DimensionBar({ label, value, weight, className }: DimensionBarProps) {
  const pct = Math.round(value * 100);
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {pct}%
          {weight != null ? ` · 权重 ${(weight * 100).toFixed(0)}%` : ''}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
