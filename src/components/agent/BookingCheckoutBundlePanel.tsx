/**
 * submit_checkout：checkout.bundle — 锁价结算单
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  BUNDLE_LOCK_STATUS_META,
  bundleRemainingSeconds,
  formatBundleCountdown,
  formatBundleTotalPrice,
} from '@/lib/booking-checkout-bundle-ui';
import type { BookingCheckoutBundle } from '@/types/booking-checkout-bundle';
import { Clock, ExternalLink, Lock, Receipt } from 'lucide-react';

export interface BookingCheckoutBundlePanelProps {
  bundle: BookingCheckoutBundle;
  disclaimerZh?: string;
  className?: string;
}

export function BookingCheckoutBundlePanel({
  bundle,
  disclaimerZh,
  className,
}: BookingCheckoutBundlePanelProps) {
  const [remainingSec, setRemainingSec] = useState<number | null>(
    bundleRemainingSeconds(bundle.expires_at)
  );

  useEffect(() => {
    if (!bundle.expires_at) return;
    const tick = () => setRemainingSec(bundleRemainingSeconds(bundle.expires_at));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [bundle.expires_at]);

  const totalLabel = formatBundleTotalPrice(bundle);
  const showLockedTotal = bundle.quote_only === false;
  const disclaimer = disclaimerZh?.trim() || bundle.disclaimer_zh?.trim();

  return (
    <Card className={cn('border-violet-500/25 bg-violet-50/20 dark:bg-violet-950/15', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-violet-700 dark:text-violet-300" aria-hidden />
              锁价结算单
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {showLockedTotal
                ? '组合价格已锁定，请在倒计时内完成供应商下单。'
                : '部分条目为采样价，跳转供应商前请再次确认。'}
            </CardDescription>
          </div>
          {bundle.expires_at && remainingSec != null ? (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] gap-1 h-6 tabular-nums',
                remainingSec <= 60
                  ? 'border-red-500/40 bg-red-50 text-red-950 dark:bg-red-950/35'
                  : 'border-violet-500/35 bg-violet-50/80 dark:bg-violet-950/30'
              )}
            >
              <Clock className="h-3 w-3" aria-hidden />
              {remainingSec > 0 ? `锁价剩余 ${formatBundleCountdown(remainingSec)}` : '锁价已过期'}
            </Badge>
          ) : null}
        </div>
        {totalLabel ? (
          <div className="mt-2 flex items-center gap-2">
            {showLockedTotal ? (
              <Lock className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />
            ) : null}
            <span className="text-sm font-semibold tabular-nums text-foreground">
              组合总价 {totalLabel}
            </span>
            {showLockedTotal ? (
              <Badge
                variant="outline"
                className="text-[10px] h-5 border-emerald-500/40 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/35"
              >
                已锁价
              </Badge>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {bundle.lines.map((line, idx) => {
          const meta = BUNDLE_LOCK_STATUS_META[line.lock_status];
          const price =
            line.price_label ??
            (line.price_numeric != null
              ? `${line.currency ? `${line.currency} ` : ''}${line.price_numeric.toLocaleString()}`
              : null);

          return (
            <div
              key={line.item_id ?? `${line.label_zh}-${idx}`}
              className="flex flex-col gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className={cn('text-[10px] h-5', meta.badgeClass)}>
                    {meta.label}
                  </Badge>
                  {price ? (
                    <span className="text-[10px] font-medium tabular-nums">{price}</span>
                  ) : null}
                </div>
                <div className="mt-1 text-sm font-medium">{line.label_zh}</div>
                {line.lock_detail_zh ? (
                  <p className="text-xs text-muted-foreground mt-0.5">{line.lock_detail_zh}</p>
                ) : null}
              </div>
              {line.href && line.lock_status === 'LOCK_FAILED' ? (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-8 shrink-0 rounded-full text-xs gap-1.5"
                  onClick={() => window.open(line.href!, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  手动预订
                </Button>
              ) : line.href ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 shrink-0 rounded-full text-xs gap-1.5"
                  onClick={() => window.open(line.href!, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  去预订
                </Button>
              ) : null}
            </div>
          );
        })}
        {disclaimer ? (
          <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">{disclaimer}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
