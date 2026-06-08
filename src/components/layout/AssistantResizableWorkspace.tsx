import type { ReactNode } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { AGENT_SIDEBAR_WIDTH } from '@/lib/agent-sidebar-layout';
import { cn } from '@/lib/utils';

export type AssistantPanelResizeSize = {
  asPercentage: number;
  inPixels: number;
};

export interface AssistantResizableWorkspaceProps {
  main: ReactNode;
  sidebarExpanded: boolean;
  assistantWidth: number;
  onAssistantResize: (size: AssistantPanelResizeSize) => void;
  renderAssistantSidebar: (expanded: boolean) => ReactNode;
  className?: string;
}

/**
 * 主内容 + 右侧智能体：展开时可拖拽调宽（300–800px），收起时为固定窄条。
 */
export function AssistantResizableWorkspace({
  main,
  sidebarExpanded,
  assistantWidth,
  onAssistantResize,
  renderAssistantSidebar,
  className,
}: AssistantResizableWorkspaceProps) {
  if (!sidebarExpanded) {
    return (
      <div className={cn('flex flex-1 h-full min-w-0', className)}>
        <div className="flex-1 min-w-0 h-full overflow-hidden">{main}</div>
        {renderAssistantSidebar(false)}
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      key="assistant-resizable-expanded"
      orientation="horizontal"
      className={cn('flex-1 h-full min-w-0', className)}
    >
      <ResizablePanel id="workspace-main" minSize={200} className="min-w-0">
        <div className="h-full min-w-0 overflow-hidden">{main}</div>
      </ResizablePanel>

      <ResizableHandle withHandle aria-label="调整智能体面板宽度" />

      <ResizablePanel
        id="workspace-assistant"
        defaultSize={assistantWidth}
        minSize={AGENT_SIDEBAR_WIDTH.MIN}
        maxSize={AGENT_SIDEBAR_WIDTH.MAX}
        onResize={(panelSize) => onAssistantResize(panelSize)}
        className="min-w-0 flex flex-col"
      >
        {renderAssistantSidebar(true)}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
