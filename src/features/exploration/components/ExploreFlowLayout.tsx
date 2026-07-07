import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TripCreationFlowShell, type TripCreationMaxWidth } from '@/components/guide-import/TripCreationFlowShell';
import { EXPLORE_FLOW_STEP_ITEMS } from '@/components/guide-import/GuideFlowStepper';
import { guideImportPrimaryButtonClass } from '@/components/guide-import/guide-import-ui';
import { exploreUi } from '../explore-ui';
import type { ExploreFlowStepId } from '../constants';

interface ExploreFlowLayoutProps {
  scenarioId: string;
  currentStep: ExploreFlowStepId;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  maxWidth?: TripCreationMaxWidth;
  className?: string;
  /** 收紧主区内边距，便于首屏展示更多内容 */
  dense?: boolean;
}

export function ExploreFlowLayout({
  currentStep,
  title,
  subtitle,
  children,
  footer,
  onBack,
  maxWidth = '6xl',
  className,
  dense = false,
}: ExploreFlowLayoutProps) {
  return (
    <TripCreationFlowShell
      steps={EXPLORE_FLOW_STEP_ITEMS}
      currentStepId={currentStep}
      navAriaLabel="探索规划进度"
      title={title}
      subtitle={subtitle}
      footer={footer}
      onBack={onBack}
      maxWidth={maxWidth}
      dense={dense}
      className={className}
    >
      {children}
    </TripCreationFlowShell>
  );
}

interface ExploreFooterNavProps {
  onBack?: () => void;
  backLabel?: string;
  onPrimary: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  secondary?: ReactNode;
}

export function ExploreFooterNav({
  onBack,
  backLabel = '上一步',
  onPrimary,
  primaryLabel,
  primaryDisabled,
  secondary,
}: ExploreFooterNavProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {onBack && (
          <Button type="button" variant="outline" onClick={onBack}>
            {backLabel}
          </Button>
        )}
        {secondary}
      </div>
      <Button
        type="button"
        className={guideImportPrimaryButtonClass(exploreUi.primaryBtnMin)}
        onClick={onPrimary}
        disabled={primaryDisabled}
      >
        {primaryLabel}
      </Button>
    </div>
  );
}

/** @deprecated 使用 Button default variant（bg-primary） */
export function ExplorePrimaryButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return <Button className={cn(guideImportPrimaryButtonClass(), className)} {...props} />;
}
