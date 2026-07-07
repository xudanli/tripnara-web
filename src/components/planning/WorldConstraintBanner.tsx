import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  formatWorldConstraintBannerZh,
  shouldShowRoadBanner,
} from '@/lib/route-run-optimization-explain';
import type { WorldConstraintMaterialization } from '@/types/world-model-guards';
import { MapPinned } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorldConstraintBannerProps {
  materialization?: WorldConstraintMaterialization | null;
  className?: string;
}

/** L1：路政/公告约束（`applied_events > 0` 且有道路或天气日） */
export function WorldConstraintBanner({ materialization, className }: WorldConstraintBannerProps) {
  const wm = materialization ?? undefined;
  if (!shouldShowRoadBanner(wm)) return null;

  const text = formatWorldConstraintBannerZh(wm);
  if (!text) return null;

  return (
    <Alert
      className={cn(
        'border-gate-allow-border/45 bg-gate-allow/80 text-gate-allow-foreground [&>svg]:text-gate-allow-foreground',
        className
      )}
    >
      <MapPinned className="h-4 w-4" />
      <AlertDescription className="text-sm leading-relaxed">{text}</AlertDescription>
    </Alert>
  );
}
