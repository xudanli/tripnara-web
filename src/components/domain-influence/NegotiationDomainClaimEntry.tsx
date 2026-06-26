import { useMemo, useState } from 'react';
import { UserCheck, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useTripDomainInfluence } from '@/hooks/useTripDomainInfluence';
import type { TripDomain } from '@/types/trip-domain-influence';
import { DomainClaimDialog } from './DomainInfluenceClaimPanel';
import { DomainInfluenceClaimWorkbenchDialog } from './DomainInfluenceClaimWorkbenchDialog';

interface NegotiationDomainClaimEntryProps {
  tripId: string;
  domain: TripDomain;
  domainLabel?: string;
  onClaimed?: () => void;
  className?: string;
}

/** 结构化协商 · 待认领领域：就地打开认领对话框 */
export function NegotiationDomainClaimEntry({
  tripId,
  domain,
  domainLabel,
  onClaimed,
  className,
}: NegotiationDomainClaimEntryProps) {
  const {
    snapshot,
    recommendations,
    loading,
    submitting,
    claimDomain,
    reload,
  } = useTripDomainInfluence(tripId);

  const [claimOpen, setClaimOpen] = useState(false);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);

  const domainItem = useMemo(
    () => snapshot?.domains.find((d) => d.domain === domain) ?? null,
    [snapshot, domain],
  );

  const recommendation = useMemo(
    () => recommendations.find((r) => r.domain === domain) ?? null,
    [recommendations, domain],
  );

  const myClaim = domainItem?.claims.find((c) => c.claimSource === 'explicit');

  const handleClaimSubmit = async (
    payload: Parameters<typeof claimDomain>[0],
  ) => {
    await claimDomain(payload);
    setClaimOpen(false);
    await reload();
    onClaimed?.();
  };

  if (loading && !domainItem) {
    return (
      <div className={className}>
        <Spinner className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  if (!domainItem) {
    return null;
  }

  const label = domainLabel ?? domainItem.domainLabel;

  return (
    <>
      <div className={className}>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setClaimOpen(true)}
          >
            <UserCheck className="h-3.5 w-3.5" />
            {myClaim ? `更新「${label}」认领` : `认领「${label}」`}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setWorkbenchOpen(true)}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            全部领域
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
          认领后任务将进入讨论，并开启 Round Robin；也可在时间轴「行程领域分解」中管理。
        </p>
      </div>

      <DomainClaimDialog
        open={claimOpen}
        onOpenChange={setClaimOpen}
        domain={domainItem}
        recommendation={recommendation}
        submitting={submitting}
        onSubmit={handleClaimSubmit}
      />

      <DomainInfluenceClaimWorkbenchDialog
        tripId={tripId}
        open={workbenchOpen}
        onOpenChange={setWorkbenchOpen}
      />
    </>
  );
}
