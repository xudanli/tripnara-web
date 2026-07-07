import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { planGatePrimaryButton } from './plan-gate-ui';
import type { PlanGateWizardStep } from '@/hooks/usePlanGateFlow';

export interface PlanGateFooterProps {
  activeStep: PlanGateWizardStep;
  loading: boolean;
  committing: boolean;
  canSubmit: boolean;
  choosePending: boolean;
  onGenerate: () => void;
  onContinueToSubmit: () => void;
  onContinueToCompare: () => void;
  onCommit: () => void;
  onBack?: () => void;
  writeChainBlocksCommit?: boolean;
  onOpenDecisionApply?: () => void;
}

export function PlanGateFooter({
  activeStep,
  loading,
  committing,
  canSubmit,
  choosePending,
  onGenerate,
  onContinueToSubmit,
  onContinueToCompare,
  onCommit,
  onBack,
  writeChainBlocksCommit = false,
  onOpenDecisionApply,
}: PlanGateFooterProps) {
  if (activeStep === 'generating' || activeStep === 'success') return null;

  const primaryLabel = (() => {
    if (activeStep === 'generate') return '生成方案草案';
    if (activeStep === 'tradeoffs') return '确认选择并继续';
    if (activeStep === 'compare') return '确认并继续';
    if (activeStep === 'submit') return writeChainBlocksCommit ? '前往决策空间 apply' : '提交到时间轴';
    if (activeStep === 'verify' && choosePending) return '请先完成取舍';
    if (activeStep === 'verify') return canSubmit ? '前往对比' : '处理待确认项';
    return '生成方案草案';
  })();

  const primaryDisabled =
    loading ||
    committing ||
    (activeStep === 'submit' && !writeChainBlocksCommit && !canSubmit) ||
    (activeStep === 'verify' && (choosePending || !canSubmit)) ||
    (activeStep === 'generate' && loading);

  const handlePrimary = () => {
    if (activeStep === 'generate') {
      onGenerate();
      return;
    }
    if (activeStep === 'verify' && canSubmit) {
      onContinueToCompare();
      return;
    }
    if (activeStep === 'compare') {
      onContinueToSubmit();
      return;
    }
    if (activeStep === 'submit') {
      if (writeChainBlocksCommit) {
        onOpenDecisionApply?.();
      } else {
        onCommit();
      }
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-card/95 px-5 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {onBack && activeStep !== 'generate' ? (
          <Button type="button" variant="ghost" size="sm" className="h-9 text-xs" onClick={onBack}>
            返回调整
          </Button>
        ) : null}
      </div>
      <Button
        type="button"
        className={cn(planGatePrimaryButton, 'min-w-[140px]')}
        disabled={primaryDisabled}
        onClick={handlePrimary}
      >
        {committing ? (
          <>
            <Spinner className="mr-1.5 h-3.5 w-3.5" />
            提交中…
          </>
        ) : (
          primaryLabel
        )}
      </Button>
    </div>
  );
}
