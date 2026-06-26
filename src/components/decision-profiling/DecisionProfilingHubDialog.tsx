import { Compass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDecisionProfilingOnboarding } from '@/hooks/useDecisionProfiling';
import type { DecisionProfilingStep } from '@/types/trip-decision-profiling';
import { DecisionProfilingPanel } from './DecisionProfilingPanel';

interface DecisionProfilingHubDialogProps {
  tripId: string;
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStep?: DecisionProfilingStep | null;
  forceOpenQuiz?: boolean;
  forceReuseProfile?: boolean;
  initialSurface?: import('@/lib/decision-profiling-navigation').DecisionProfilingSurface | null;
  showTrigger?: boolean;
}

function profilingPendingCount(onboarding: {
  travelStyleCompleted: boolean;
  moneyDnaCompleted: boolean;
  quizCompleted: boolean;
  teamCompletionRate: number;
}): number {
  if (!onboarding.quizCompleted) {
    return (
      (onboarding.travelStyleCompleted ? 0 : 1) + (onboarding.moneyDnaCompleted ? 0 : 1)
    );
  }
  if (onboarding.teamCompletionRate < 95) return 1;
  return 0;
}

/** 规划工作台右上角：决策风格画像与摩擦预警（非常驻团队 Tab 区块） */
export function DecisionProfilingHubDialog({
  tripId,
  className,
  open,
  onOpenChange,
  initialStep,
  forceOpenQuiz,
  forceReuseProfile,
  initialSurface,
  showTrigger = true,
}: DecisionProfilingHubDialogProps) {
  const { data: onboarding } = useDecisionProfilingOnboarding(tripId);
  const pending = onboarding ? profilingPendingCount(onboarding) : 0;

  const trigger = showTrigger ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('relative gap-1.5 text-xs sm:text-sm', className)}
    >
      <Compass className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="hidden sm:inline">决策画像</span>
      <span className="sm:hidden">画像</span>
      {pending > 0 ? (
        <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 rounded-full px-1.5 text-[10px]">
          {pending}
        </Badge>
      ) : null}
    </Button>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="flex max-h-[min(92vh,900px)] w-[min(96vw,880px)] max-w-none flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-1 border-b px-5 py-4 text-left">
          <DialogTitle className="text-base font-semibold tracking-tight">决策风格画像 · 摩擦预警</DialogTitle>
          <DialogDescription>
            Travel Style · Money DNA · 团队摩擦矩阵 · 分摊机制共识
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <DecisionProfilingPanel
              tripId={tripId}
              variant="embedded"
              initialStep={initialStep}
              forceOpenQuiz={forceOpenQuiz}
              forceReuseProfile={forceReuseProfile}
              initialSurface={initialSurface}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
