import { ChevronRight, PauseCircle, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { workbenchInsetPanel } from '@/components/plan-studio/workbench/workbench-ui';
import { buildTripAutomationAuthorizationPath } from '@/lib/travel-status-navigation.util';
import type { TravelStatusAutomation } from '@/api/travel-status.types';

interface TravelStatusAutomationSummaryProps {
  automation: TravelStatusAutomation;
  tripId?: string;
  className?: string;
}

export default function TravelStatusAutomationSummary({
  automation,
  tripId,
  className,
}: TravelStatusAutomationSummaryProps) {
  const navigate = useNavigate();
  const interactive = Boolean(tripId);
  const { tierCounts } = automation;

  const body = (
    <>
      {automation.paused ? (
        <PauseCircle className="mt-0.5 h-4 w-4 shrink-0 text-gate-confirm-foreground" />
      ) : (
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1 text-xs leading-relaxed">
        <p className="font-medium text-foreground">
          {automation.paused ? '自动化已暂停' : automation.uiLevelLabel}
        </p>
        <p className="mt-0.5 text-muted-foreground">
          可自动 {tierCounts.auto} 类 · 需确认 {tierCounts.ask} 类
          {tierCounts.deny > 0 ? ` · 禁止 ${tierCounts.deny} 类` : ''}
        </p>
      </div>
      {interactive ? (
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </>
  );

  if (!interactive) {
    return (
      <div className={cn(workbenchInsetPanel, 'flex items-start gap-2.5 px-3 py-2.5', className)}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        workbenchInsetPanel,
        'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/20',
        className,
      )}
      onClick={() => navigate(buildTripAutomationAuthorizationPath(tripId!))}
    >
      {body}
    </button>
  );
}
