import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { TripDetail } from '@/types/trip';
import type { GuardianPersonaPresentation } from '@/types/guardian-presentation';
import {
  usePlanGateFlow,
  type PlanGateInputsSummary,
} from '@/hooks/usePlanGateFlow';
import { PlanGateStepHeader } from './PlanGateStepHeader';
import { PlanGateFooter } from './PlanGateFooter';
import { PlanGateEmptyStep } from './steps/PlanGateEmptyStep';
import { PlanGateGeneratingStep } from './steps/PlanGateGeneratingStep';
import { PlanGateVerifyStep } from './steps/PlanGateVerifyStep';
import { PlanGateTradeoffsStep } from './steps/PlanGateTradeoffsStep';
import { PlanGateCompareStep } from './steps/PlanGateCompareStep';
import { PlanGateSubmitStep } from './steps/PlanGateSubmitStep';
import { PlanGateSuccessStep } from './steps/PlanGateSuccessStep';
import { PlanGatePreTripTasksDrawer } from './PlanGatePreTripTasksDrawer';
import { isValidPartialCommitSelection } from '@/lib/plan-gate-commit.util';
import {
  buildPlanStudioDecisionProblemPath,
  buildPlanStudioDecisionSpacePath,
} from '@/lib/plan-studio-decision-navigation.util';
import { planGateBody, planGateShell } from './plan-gate-ui';

export interface PlanGateWizardProps {
  tripId: string;
  initialTrip?: TripDetail | null;
  autoGenerateOnOpen?: boolean;
  inputsSummary?: PlanGateInputsSummary;
  onPlanCommitted?: () => void;
  onClose?: () => void;
}

export function PlanGateWizard({
  tripId,
  initialTrip,
  autoGenerateOnOpen,
  inputsSummary,
  onPlanCommitted,
  onClose,
}: PlanGateWizardProps) {
  const navigate = useNavigate();
  const flow = usePlanGateFlow({
    tripId,
    initialTrip,
    autoGenerateOnOpen,
    inputsSummary,
    onPlanCommitted,
  });

  const [presentationOverride, setPresentationOverride] = useState<GuardianPersonaPresentation | null>(
    null,
  );
  const [preTripTasksOpen, setPreTripTasksOpen] = useState(false);

  const openPreTripTasks = useCallback(() => setPreTripTasksOpen(true), []);

  const handlePresentationChange = useCallback((presentation: GuardianPersonaPresentation) => {
    setPresentationOverride(presentation);
  }, []);

  const resultWithPresentation = flow.result
    ? {
        ...flow.result,
        uiOutput: {
          ...flow.result.uiOutput,
          presentation: presentationOverride ?? flow.result.uiOutput.presentation,
        },
      }
    : null;

  const currency =
    (flow.trip as TripDetail & { budgetConfig?: { currency?: string } })?.budgetConfig?.currency ??
    'CNY';

  const canSubmit =
    flow.canSubmit &&
    isValidPartialCommitSelection(flow.partialCommitEnabled, flow.partialCommitDays);

  const handleOpenDecisionApply = useCallback(() => {
    const problemId = flow.agentPlanDraftMutation?.problemId;
    if (problemId) {
      navigate(buildPlanStudioDecisionProblemPath(tripId, problemId));
    } else {
      navigate(buildPlanStudioDecisionSpacePath(tripId));
    }
    onClose?.();
  }, [flow.agentPlanDraftMutation?.problemId, navigate, onClose, tripId]);

  return (
    <div className={planGateShell}>
      <PlanGateStepHeader activeStep={flow.activeStep} />

      <div className={planGateBody}>
        {flow.error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{flow.error}</AlertDescription>
          </Alert>
        ) : null}

        {flow.activeStep === 'success' && flow.commitSuccess ? (
          <PlanGateSuccessStep
            result={flow.commitSuccess}
            tripId={tripId}
            onClose={() => onClose?.()}
            onViewPreTripTasks={openPreTripTasks}
          />
        ) : null}

        {flow.activeStep === 'generate' ? (
          <PlanGateEmptyStep
            trip={flow.trip}
            tripLoading={flow.tripLoading || flow.readinessLoading}
            tripLoadError={flow.tripLoadError}
            loading={flow.loading}
            inputsSummary={flow.inputsSummary}
            onGenerate={() => void flow.handleGenerate()}
            onRetryLoad={() => {
              void flow.loadTrip();
              void flow.loadReadiness();
            }}
          />
        ) : null}

        {flow.activeStep === 'generating' ? (
          <PlanGateGeneratingStep
            loadingStage={flow.loadingStage}
            pipelineSteps={flow.pipelineSteps}
            tripId={tripId}
          />
        ) : null}

        {flow.activeStep === 'verify' && resultWithPresentation && flow.verification ? (
          <PlanGateVerifyStep
            result={resultWithPresentation}
            tripId={tripId}
            verification={flow.verification}
            effectiveGateStatus={flow.effectiveGateStatus ?? 'NEED_CONFIRM'}
            headline={flow.workbenchRiskExplanation}
            userConfirmations={flow.userConfirmations}
            onUserConfirmationsChange={flow.setUserConfirmations}
            currency={currency}
            blockers={flow.planGate?.submitEligibility.blockers}
          />
        ) : null}

        {flow.activeStep === 'tradeoffs' && resultWithPresentation && flow.verification ? (
          <PlanGateTradeoffsStep
            result={resultWithPresentation}
            verification={flow.verification}
            tripId={tripId}
            userId={flow.userId}
            userConfirmations={flow.userConfirmations}
            onUserConfirmationsChange={flow.setUserConfirmations}
            onPresentationChange={handlePresentationChange}
            onRegenerate={() => void flow.handleRegenerateAfterChoose()}
            onChooseSuccess={flow.handleChooseSuccess}
            onContinue={() => flow.setActiveStep('verify')}
          />
        ) : null}

        {flow.activeStep === 'compare' && resultWithPresentation ? (
          <PlanGateCompareStep
            tripId={tripId}
            trip={flow.trip}
            result={resultWithPresentation}
            currency={currency}
          />
        ) : null}

        {flow.activeStep === 'submit' && resultWithPresentation ? (
          <PlanGateSubmitStep
            result={resultWithPresentation}
            tripId={tripId}
            submitEligibility={flow.planGate?.submitEligibility}
            preTripTasks={flow.planGate?.preTripTasks}
            currency={currency}
            dayCount={flow.trip?.TripDay?.length ?? 0}
            onViewPreTripTasks={openPreTripTasks}
            partialCommitEnabled={flow.partialCommitEnabled}
            onPartialCommitEnabledChange={flow.setPartialCommitEnabled}
            partialCommitDays={flow.partialCommitDays}
            onPartialCommitDaysChange={flow.setPartialCommitDays}
            partialCommitDayOptions={flow.partialCommitDayOptions}
            writeChainBlocksCommit={flow.writeChainBlocksCommit}
            agentPlanDraftMutation={flow.agentPlanDraftMutation}
          />
        ) : null}
      </div>

      <PlanGatePreTripTasksDrawer
        open={preTripTasksOpen}
        onOpenChange={setPreTripTasksOpen}
        tripId={tripId}
        planId={flow.result?.planState?.plan_id ?? flow.commitSuccess?.committedPlanId}
        embedded={
          flow.activeStep === 'success'
            ? flow.commitSuccess?.preTripTasks
            : flow.planGate?.preTripTasks
        }
      />

      <PlanGateFooter
        activeStep={flow.activeStep}
        loading={flow.loading}
        committing={flow.committing}
        canSubmit={canSubmit}
        choosePending={flow.chooseActive}
        onGenerate={() => void flow.handleGenerate()}
        onContinueToSubmit={() => flow.setActiveStep('submit')}
        onContinueToCompare={() => flow.setActiveStep('compare')}
        onCommit={() => void flow.handleCommit()}
        onBack={onClose}
        writeChainBlocksCommit={flow.writeChainBlocksCommit}
        onOpenDecisionApply={handleOpenDecisionApply}
      />
    </div>
  );
}
