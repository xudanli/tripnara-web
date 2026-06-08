import { cn } from '@/lib/utils';
import { compatibilityFitClass, plazaBadge } from '../lib/plaza-visual';

interface CompatibilityBadgeProps {
  percent: number;
  className?: string;
}

/** 动态契合度角标 — 层级+标签，非情绪化色块 */
export function CompatibilityBadge({ percent, className }: CompatibilityBadgeProps) {
  return (
    <span className={cn(plazaBadge.fit, compatibilityFitClass(percent), className)}>
      {percent}
      <span className="text-[10px] font-normal opacity-70">%</span>
    </span>
  );
}
