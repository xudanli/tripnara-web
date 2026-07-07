import type { ExecutePlanningWorkbenchResponse } from '@/api/planning-workbench';
import type { PlanGateVerificationModel } from '@/lib/plan-gate-verification.util';
import type { PlanGateUserConfirmationState } from '@/types/plan-gate';
import PlanGateChoosePanel from '@/components/planning-workbench/PlanGateChoosePanel';
import { PlanGateTradeoffPanel } from '../PlanGateTradeoffPanel';
import { planGateCard, planGateSectionTitle } from '../plan-gate-ui';

export interface PlanGateTradeoffsStepProps {
  result: ExecutePlanningWorkbenchResponse;
  verification: PlanGateVerificationModel;
  tripId: string;
  userId?: string | null;
  userConfirmations: PlanGateUserConfirmationState[];
  onUserConfirmationsChange: (next: PlanGateUserConfirmationState[]) => void;
  onPresentationChange: (presentation: import('@/types/guardian-presentation').GuardianPersonaPresentation) => void;
  onRegenerate: () => void | Promise<void>;
  onChooseSuccess: (selectedIndex: number, selectedText: string) => void;
  onContinue?: () => void;
}

export function PlanGateTradeoffsStep({
  result,
  verification,
  tripId,
  userId,
  userConfirmations,
  onUserConfirmationsChange,
  onPresentationChange,
  onRegenerate,
  onChooseSuccess,
  onContinue,
}: PlanGateTradeoffsStepProps) {
  const hasPlanGateTradeoffs = verification.pendingConfirmations.some((p) => p.kind === 'trade_off');
  const presentation = result.uiOutput.presentation;

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className={planGateCard}>
        <h3 className={planGateSectionTitle}>确认本次取舍</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          多个目标无法同时最优时，请选择你可接受的调整方式。选定后系统将据此重新验证方案。
        </p>
      </div>

      {hasPlanGateTradeoffs ? (
        <PlanGateTradeoffPanel
          confirmations={verification.pendingConfirmations}
          userConfirmations={userConfirmations}
          onChange={onUserConfirmationsChange}
          onContinue={onContinue}
        />
      ) : presentation ? (
        <PlanGateChoosePanel
          presentation={presentation}
          tripId={tripId}
          userId={userId}
          onPresentationChange={onPresentationChange}
          onRegenerate={onRegenerate}
          onChooseSuccess={onChooseSuccess}
          variant="plan-gate"
        />
      ) : null}
    </div>
  );
}
