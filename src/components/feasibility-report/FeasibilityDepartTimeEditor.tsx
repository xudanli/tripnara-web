import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFeasibilityTravelTiming } from '@/hooks/useFeasibilityTravelTiming';
import { isInterDayTravelIssue } from '@/lib/feasibility-travel-timing';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';
import { FeasibilityTravelTimingDialog } from './FeasibilityTravelTimingDialog';

export interface FeasibilityDepartTimeEditorProps {
  tripId: string;
  issue: FeasibilityIssueDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void | Promise<void>;
}

/** 可执行性 / 规划待办：按 issue 打开「安排出发时间」弹窗 */
export function FeasibilityDepartTimeEditor({
  tripId,
  issue,
  open,
  onOpenChange,
  onSaved,
}: FeasibilityDepartTimeEditorProps) {
  const dayNumber = issue?.affectedDays?.[0] ?? null;
  const enabled = Boolean(open && issue && isInterDayTravelIssue(issue));
  const { viewModel, trip, dayItems, nextDayItems, loading } = useFeasibilityTravelTiming(
    tripId,
    enabled ? issue ?? undefined : undefined,
    dayNumber,
  );

  if (!issue || !isInterDayTravelIssue(issue)) return null;

  return (
    <FeasibilityTravelTimingDialog
      open={open && Boolean(viewModel) && !loading}
      onOpenChange={onOpenChange}
      tripId={tripId}
      view={viewModel!}
      trip={trip}
      dayItems={[...dayItems, ...nextDayItems]}
      onSaved={onSaved}
    />
  );
}

export interface DepartTimeButtonProps {
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default';
  className?: string;
  compact?: boolean;
}

export function DepartTimeButton({
  onClick,
  variant = 'outline',
  size = 'sm',
  className,
  compact = false,
}: DepartTimeButtonProps) {
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn(compact ? 'h-7 text-xs' : 'h-8 text-xs', className)}
      onClick={onClick}
    >
      安排出发时间
    </Button>
  );
}
