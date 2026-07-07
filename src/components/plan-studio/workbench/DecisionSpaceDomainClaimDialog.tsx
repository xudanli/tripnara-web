import { useMemo } from 'react';
import { DomainClaimDialog } from '@/components/domain-influence/DomainInfluenceClaimPanel';
import { useTripDomainInfluence } from '@/hooks/useTripDomainInfluence';
import type { TripDomain } from '@/types/trip-domain-influence';

interface DecisionSpaceDomainClaimDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: TripDomain | null;
  onClaimed?: () => void | Promise<void>;
}

/** claim_required 回退：认领领域后由父级重试 POST /negotiations */
export function DecisionSpaceDomainClaimDialog({
  tripId,
  open,
  onOpenChange,
  domain,
  onClaimed,
}: DecisionSpaceDomainClaimDialogProps) {
  const { snapshot, recommendations, submitting, claimDomain, reload } = useTripDomainInfluence(
    open ? tripId : null,
  );

  const domainItem = useMemo(
    () => (domain ? snapshot?.domains.find((item) => item.domain === domain) ?? null : null),
    [snapshot, domain],
  );
  const recommendation = useMemo(
    () => (domain ? recommendations.find((item) => item.domain === domain) ?? null : null),
    [recommendations, domain],
  );

  return (
    <DomainClaimDialog
      open={open && Boolean(domainItem)}
      onOpenChange={onOpenChange}
      domain={domainItem}
      recommendation={recommendation}
      submitting={submitting}
      onSubmit={async (payload) => {
        await claimDomain(payload);
        await reload();
        onOpenChange(false);
        await onClaimed?.();
      }}
    />
  );
}
