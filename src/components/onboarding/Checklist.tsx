import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChecklistProgressIllustration } from '@/components/illustrations/OnboardingIllustrations';

export type ChecklistStep = 'style' | 'places' | 'schedule' | 'optimize' | 'execute';

interface ChecklistItem {
  id: ChecklistStep;
  label: string;
  path: string;
  query?: string;
}

const checklistItems: ChecklistItem[] = [
  { id: 'style', label: 'Pick a style', path: '/dashboard/plan-studio', query: 'tab=intent' },
  { id: 'places', label: 'Add 3 places', path: '/dashboard/plan-studio', query: 'tab=places' },
  { id: 'schedule', label: 'Schedule 1 day', path: '/dashboard/plan-studio', query: 'tab=schedule' },
  { id: 'optimize', label: 'Run Optimize', path: '/dashboard/plan-studio', query: 'tab=optimize' },
  { id: 'execute', label: 'Enter Execute', path: '/dashboard/execute' },
];

interface ChecklistProps {
  completedSteps: ChecklistStep[];
  currentStep?: ChecklistStep;
  onStepClick?: (step: ChecklistStep) => void;
  className?: string;
}

export default function Checklist({
  completedSteps,
  currentStep,
  onStepClick,
  className,
}: ChecklistProps) {
  const navigate = useNavigate();

  const handleStepClick = (item: ChecklistItem) => {
    if (onStepClick) {
      onStepClick(item.id);
    }
    const url = item.query ? `${item.path}?${item.query}` : item.path;
    navigate(url);
  };

  const getStepNumber = (step: ChecklistStep) => {
    return checklistItems.findIndex((item) => item.id === step) + 1;
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-base">Your first trip checklist</CardTitle>
          {completedSteps.length === 0 && (
            <div className="opacity-40">
              <ChecklistProgressIllustration size={60} />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {checklistItems.map((item, idx) => {
            const isCompleted = completedSteps.includes(item.id);
            const isCurrent = currentStep === item.id;
            const stepNumber = idx + 1;

            return (
              <button
                key={item.id}
                onClick={() => handleStepClick(item)}
                className={cn(
                  'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors',
                  'hover:bg-gray-50',
                  isCurrent && 'bg-primary/10 border border-primary'
                )}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-400">{stepNumber}</span>
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm flex-1',
                    isCompleted ? 'text-muted-foreground line-through' : 'font-medium'
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
          {completedSteps.length} / {checklistItems.length} completed
        </div>
      </CardContent>
    </Card>
  );
}

