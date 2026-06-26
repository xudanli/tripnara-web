import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOpenTrustedProjectInPlanStudio } from '@/hooks/useOpenTrustedProjectInPlanStudio';
import type { TrustedProjectListing } from '@/types/trusted-projects';
import type { ButtonProps } from '@/components/ui/button';

interface OpenTrustedProjectInPlanStudioButtonProps extends ButtonProps {
  project: TrustedProjectListing;
  label?: string;
}

export function OpenTrustedProjectInPlanStudioButton({
  project,
  label = '在规划工作台规划',
  ...buttonProps
}: OpenTrustedProjectInPlanStudioButtonProps) {
  const openInPlanStudio = useOpenTrustedProjectInPlanStudio();

  return (
    <Button
      {...buttonProps}
      disabled={buttonProps.disabled || openInPlanStudio.isPending}
      onClick={(event) => {
        buttonProps.onClick?.(event);
        if (event.defaultPrevented) return;
        openInPlanStudio.mutate(project);
      }}
    >
      <Compass className="mr-1 h-4 w-4" />
      {openInPlanStudio.isPending ? '准备中…' : label}
    </Button>
  );
}
