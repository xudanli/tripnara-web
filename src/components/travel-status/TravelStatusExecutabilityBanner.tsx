import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ExecutabilityStatus } from '@/api/travel-status.types';
import {
  travelStatusExecutabilityIconShell,
  travelStatusExecutabilityLabel,
  travelStatusExecutabilityPill,
  travelStatusExecutabilityShell,
  travelStatusSnapshotBody,
} from './travel-status-ui';

interface TravelStatusExecutabilityBannerProps {
  status: ExecutabilityStatus;
  headline: string;
  subheadline?: string;
  suggestedConfirmCount?: number;
  onReviewSuggested?: () => void;
  actions?: ReactNode;
  embedded?: boolean;
  /** 单行：图标 + 状态 + 标题 + 操作同一行 */
  layout?: 'stacked' | 'inline';
  className?: string;
}

const STATUS_ICON = {
  READY: CheckCircle2,
  NEEDS_ATTENTION: AlertTriangle,
  BLOCKED: XCircle,
} as const;

export default function TravelStatusExecutabilityBanner({
  status,
  headline,
  subheadline,
  suggestedConfirmCount = 0,
  onReviewSuggested,
  actions,
  embedded = false,
  layout = 'stacked',
  className,
}: TravelStatusExecutabilityBannerProps) {
  const Icon = STATUS_ICON[status] ?? AlertTriangle;
  const inline = layout === 'inline';

  return (
    <div
      className={cn(
        embedded ? travelStatusExecutabilityShell(status) : cn('rounded-xl border border-border/70', travelStatusExecutabilityShell(status)),
        className,
      )}
    >
      <div
        className={cn(
          inline ? 'flex items-center gap-2 px-3 py-2' : cn(travelStatusSnapshotBody, 'flex gap-3 sm:gap-4'),
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg border',
            inline ? 'h-7 w-7' : 'h-9 w-9',
            travelStatusExecutabilityIconShell(status),
          )}
        >
          <Icon className={cn(inline ? 'h-3.5 w-3.5' : 'h-4 w-4')} aria-hidden />
        </div>

        {inline ? (
          <>
            <span className={cn(travelStatusExecutabilityPill(status), 'shrink-0')}>
              {travelStatusExecutabilityLabel(status)}
            </span>
            <p
              className="min-w-0 flex-1 truncate text-sm font-medium leading-none text-foreground"
              title={subheadline ? `${headline} — ${subheadline}` : headline}
            >
              {headline}
            </p>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </>
        ) : (
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className={travelStatusExecutabilityPill(status)}>
                {travelStatusExecutabilityLabel(status)}
              </span>
              {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>

            <p className="mt-2 text-sm font-semibold leading-snug tracking-tight text-foreground">
              {headline}
            </p>

            {subheadline ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subheadline}</p>
            ) : null}

            {suggestedConfirmCount > 0 && onReviewSuggested ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2.5 h-7 px-2.5 text-[11px] font-medium"
                onClick={onReviewSuggested}
              >
                查看 {suggestedConfirmCount} 项建议确认
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
