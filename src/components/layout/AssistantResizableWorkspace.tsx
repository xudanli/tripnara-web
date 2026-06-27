import { useEffect, type ReactNode } from 'react';
import { usePanelRef } from 'react-resizable-panels';
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
 * 主内容 + 右侧智能体：始终使用同一 ResizablePanelGroup，避免展开/收起时 remount 主内容区。
 * 展开时可拖拽调宽（300–800px），收起时折叠为固定窄条（56px）。
 */
export function AssistantResizableWorkspace({
  main,
  sidebarExpanded,
  assistantWidth,
  onAssistantResize,
  renderAssistantSidebar,
  className,
}: AssistantResizableWorkspaceProps) {
  const assistantPanelRef = usePanelRef();

  useEffect(() => {
    const panel = assistantPanelRef.current;
    if (!panel) return;
    if (sidebarExpanded) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }, [sidebarExpanded, assistantPanelRef]);

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className={cn('flex-1 h-full min-w-0', className)}
    >
      <ResizablePanel id="workspace-main" minSize={200} className="min-w-0">
        <div className="h-full min-w-0 overflow-hidden">{main}</div>
      </ResizablePanel>

      {sidebarExpanded ? (
        <ResizableHandle withHandle aria-label="调整智能体面板宽度" />
      ) : null}

      <ResizablePanel
        id="workspace-assistant"
        panelRef={assistantPanelRef}
        collapsible
        collapsedSize={AGENT_SIDEBAR_WIDTH.COLLAPSED}
        defaultSize={
          sidebarExpanded ? assistantWidth : AGENT_SIDEBAR_WIDTH.COLLAPSED
        }
        minSize={AGENT_SIDEBAR_WIDTH.MIN}
        maxSize={AGENT_SIDEBAR_WIDTH.MAX}
        onResize={(panelSize) => {
          if (sidebarExpanded) {
            onAssistantResize(panelSize);
          }
        }}
        className="min-w-0 flex flex-col"
      >
        {renderAssistantSidebar(true)}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
