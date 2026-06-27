import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { RobustnessDashboardPanel } from '@/components/agent/RobustnessDashboardPanel';
import { useWorldModelGuardsStore } from '@/store/worldModelGuardsStore';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export interface PlanStudioRobustnessFoldProps {
  className?: string;
}

/** Plan Studio 折叠区：route_and_run observability 鲁棒性镜像 */
export function PlanStudioRobustnessFold({ className }: PlanStudioRobustnessFoldProps) {
  const robustnessDashboard = useWorldModelGuardsStore((s) => s.robustnessDashboard);
  const [open, setOpen] = useState(false);

  if (!robustnessDashboard) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground">
          鲁棒性分析（进阶）
          <ChevronDown className={cn('ml-1 h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <RobustnessDashboardPanel rollout={robustnessDashboard} />
      </CollapsibleContent>
    </Collapsible>
  );
}
