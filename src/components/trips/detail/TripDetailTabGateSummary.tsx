import { ChevronRight } from 'lucide-react';
import TravelStatusExecutabilityBanner from '@/components/travel-status/TravelStatusExecutabilityBanner';
import { GateStatusBanner } from '@/components/ui/gate-status-banner';
import { Button } from '@/components/ui/button';
import { useTravelStatus } from '@/hooks/useTravelStatus';
import { resolveSuggestedConfirmCount } from '@/lib/travel-status-display.util';
import { cn } from '@/lib/utils';
import type { GateStatus } from '@/lib/gate-status';
import { tripDetailUi } from './trip-detail-ui';

type ExecutabilityVariant = {
  variant: 'executability';
  tripId: string;
  onOpenOverview?: () => void;
  /** 顶栏布局：规划 tab 等紧凑场景用 inline */
  bannerLayout?: 'stacked' | 'inline';
  className?: string;
};

type BudgetVariant = {
  variant: 'budget';
  tripId: string;
  tab: string;
  status: GateStatus;
  headline: string;
  description?: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
};

export type TripDetailTabGateSummaryProps = ExecutabilityVariant | BudgetVariant;

export function mapBudgetHealthToneToGateStatus(
  tone: 'verified' | 'confirm' | 'allow',
): GateStatus {
  if (tone === 'confirm') return 'NEED_CONFIRM';
  return 'ALLOW';
}

export default function TripDetailTabGateSummary(props: TripDetailTabGateSummaryProps) {
  if (props.variant === 'budget') {
    const { status, headline, description, onAction, actionLabel, className } = props;
    return (
      <div
        className={cn(
          tripDetailUi.card,
          'flex flex-col gap-2 p-3 shadow-none sm:flex-row sm:items-center sm:justify-between',
          className,
        )}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <GateStatusBanner status={status} variant="subtle" size="sm" />
          <div>
            <p className="text-sm font-semibold leading-tight text-foreground">{headline}</p>
            {description ? (
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {onAction && actionLabel ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 shrink-0 px-2.5 text-[11px]"
            onClick={onAction}
          >
            {actionLabel}
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <ExecutabilityGateSummary
      tripId={props.tripId}
      onOpenOverview={props.onOpenOverview}
      className={props.className}
      inline={props.bannerLayout === 'inline'}
    />
  );
}

function ExecutabilityGateSummary({
  tripId,
  onOpenOverview,
  className,
  inline = false,
}: {
  tripId: string;
  onOpenOverview?: () => void;
  className?: string;
  inline?: boolean;
}) {
  const { status, isLoading, isUnavailable, error } = useTravelStatus({ tripId });

  if (isLoading) {
    return null;
  }

  if (error && isUnavailable) {
    return null;
  }

  if (!status) return null;

  const pendingVerificationCount = status.pendingVerification?.items?.length ?? 0;
  const suggestedConfirmCount = resolveSuggestedConfirmCount({
    issueCount: status.executability.issueCount,
    pendingVerificationCount,
    executabilityHeadline: status.executability.headline,
  });

  return (
    <div className={cn(tripDetailUi.card, 'overflow-hidden p-0', className)}>
      <TravelStatusExecutabilityBanner
        embedded
        layout={inline ? 'inline' : 'stacked'}
        status={status.executability.status}
        headline={status.executability.headline}
        subheadline={status.executability.subheadline}
        suggestedConfirmCount={suggestedConfirmCount}
        actions={
          onOpenOverview ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[11px]"
              onClick={onOpenOverview}
            >
              查看概览
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
