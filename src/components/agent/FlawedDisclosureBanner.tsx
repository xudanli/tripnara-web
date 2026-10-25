/**
 * route_and_run：仅有 trusted_delivery.flawed_disclosure、尚无完整 flawed_draft_v1 时的轻量 Banner
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { trustedDeliveryFlawedHeadline } from '@/lib/trusted-delivery-ui';
import type { TrustedDeliveryV1 } from '@/types/trusted-delivery';
import { AlertTriangle } from 'lucide-react';

export interface FlawedDisclosureBannerProps {
  trustedDelivery: TrustedDeliveryV1;
  className?: string;
}

export function FlawedDisclosureBanner({
  trustedDelivery,
  className,
}: FlawedDisclosureBannerProps) {
  if (!trustedDelivery.flawed_disclosure.present) return null;

  return (
    <div
      className={cn(
        'mb-2 rounded-lg border border-amber-500/45 bg-amber-50/90 px-3 py-2.5 dark:border-amber-600/40 dark:bg-amber-950/30',
        className
      )}
      role="alert"
    >
      <div className="flex flex-wrap items-start gap-2">
        <AlertTriangle
          className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300 mt-0.5"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-amber-950 dark:text-amber-50">
              瑕疵草案 · 尚未完全验证
            </span>
            <Badge variant="outline" className="text-[10px] h-5 border-amber-600/40 text-amber-900">
              草案
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-amber-950/90 dark:text-amber-100/90">
            {trustedDeliveryFlawedHeadline(trustedDelivery)}
          </p>
        </div>
      </div>
    </div>
  );
}
