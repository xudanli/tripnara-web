import { CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PortalPhase } from '../shell/participant-phase';

interface ProgressStep {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
}

const PHASE_ORDER: PortalPhase[] = ['joining', 'consenting', 'profiling', 'active'];

const STEP_LABELS: Record<PortalPhase, string> = {
  joining: '接受邀请',
  consenting: '知情同意',
  profiling: '填写偏好',
  active: '参与项目',
  withdrawn: '已退出',
  declined: '已拒绝',
};

function buildSteps(phase: PortalPhase): ProgressStep[] {
  if (phase === 'declined' || phase === 'withdrawn') {
    return [{ id: 'joining', label: STEP_LABELS.joining, done: true, current: false }];
  }

  const currentIndex = PHASE_ORDER.indexOf(phase);

  return PHASE_ORDER.map((stepPhase, index) => ({
    id: stepPhase,
    label: STEP_LABELS[stepPhase],
    done: index < currentIndex,
    current: index === currentIndex,
  }));
}

interface CompletionProgressCardProps {
  phase: PortalPhase;
  completionRate?: number;
}

export function CompletionProgressCard({ phase, completionRate }: CompletionProgressCardProps) {
  if (phase === 'declined' || phase === 'withdrawn') return null;

  const steps = buildSteps(phase);
  const doneCount = steps.filter((s) => s.done).length;
  const rateLabel =
    completionRate != null ? `${Math.round(completionRate * 100)}%` : `${doneCount}/${steps.length}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">完成进度 · {rateLabel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              'flex items-center gap-2 text-sm',
              step.current && 'font-medium text-foreground',
              !step.current && !step.done && 'text-muted-foreground',
            )}
          >
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Circle
                className={cn(
                  'h-4 w-4 shrink-0',
                  step.current ? 'text-primary' : 'text-muted-foreground/50',
                )}
              />
            )}
            <span>{step.label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
