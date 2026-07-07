import type { ExecutePlanningWorkbenchResponse } from '@/api/planning-workbench';
import type { PlanGateVerificationModel } from '@/lib/plan-gate-verification.util';
import type { GateStatus } from '@/lib/gate-status';
import type { PlanGateUserConfirmationState } from '@/types/plan-gate';
import { PlanGateConfirmPanel } from '../PlanGateConfirmPanel';
import { PlanGateDraftSummary } from '../PlanGateDraftSummary';
import { PlanGateVerificationPanel } from '../PlanGateVerificationPanel';
import { planGateTwoColumn } from '../plan-gate-ui';

export interface PlanGateVerifyStepProps {
  result: ExecutePlanningWorkbenchResponse;
  tripId: string;
  verification: PlanGateVerificationModel;
  effectiveGateStatus: GateStatus;
  headline?: string;
  userConfirmations: PlanGateUserConfirmationState[];
  onUserConfirmationsChange: (next: PlanGateUserConfirmationState[]) => void;
  currency?: string;
  blockers?: string[];
}

export function PlanGateVerifyStep({
  result,
  tripId,
  verification,
  effectiveGateStatus,
  headline,
  userConfirmations,
  onUserConfirmationsChange,
  currency,
  blockers,
}: PlanGateVerifyStepProps) {
  return (
    <div className={planGateTwoColumn}>
      <div className="space-y-4">
        <PlanGateDraftSummary result={result} tripId={tripId} currency={currency} />
        {blockers && blockers.length > 0 ? (
          <div className="rounded-lg border border-gate-reject-border/50 bg-gate-reject/8 px-3 py-2.5">
            <p className="text-[11px] font-medium text-foreground">阻塞项</p>
            <ul className="mt-1 space-y-0.5">
              {blockers.map((item) => (
                <li key={item} className="text-[11px] text-muted-foreground">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="space-y-4">
        <PlanGateVerificationPanel model={verification} />
        <PlanGateConfirmPanel
          status={effectiveGateStatus}
          headline={headline}
          confirmations={verification.pendingConfirmations}
          userConfirmations={userConfirmations}
          onChange={onUserConfirmationsChange}
          bannerMessage="提交前还需要确认以下事项"
          signOffOnly
        />
      </div>
    </div>
  );
}
