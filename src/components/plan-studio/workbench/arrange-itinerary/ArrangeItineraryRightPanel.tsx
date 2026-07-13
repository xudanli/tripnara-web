import { cn } from '@/lib/utils';
import { ArrangeItineraryAssistantPanel, type ArrangeItineraryAssistantPanelProps } from './ArrangeItineraryAssistantPanel';

export interface ArrangeItineraryRightPanelProps {
  assistantProps: ArrangeItineraryAssistantPanelProps;
  className?: string;
}

/** 编排行程 · 右侧栏（路线地图与 AI 助手） */
export function ArrangeItineraryRightPanel({
  assistantProps,
  className,
}: ArrangeItineraryRightPanelProps) {
  return (
    <ArrangeItineraryAssistantPanel {...assistantProps} className={cn('h-full min-h-0', className)} />
  );
}
