import { useCallback, useState } from 'react';
import { Maximize2, Send } from 'lucide-react';
import Logo from '@/components/common/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAssistantSidebar } from '@/contexts/AssistantSidebarContext';
import { cn } from '@/lib/utils';
import {
  workbenchAiAssistantDockAvatar,
  workbenchAiAssistantDockInput,
  workbenchAiAssistantDockShell,
} from './workbench-ui';

export interface WorkbenchAiAssistantDockProps {
  className?: string;
}

/** 行程诊断栏底部 · 紧凑 AI 助理入口（展开后走全局 AgentChat 侧栏） */
export function WorkbenchAiAssistantDock({ className }: WorkbenchAiAssistantDockProps) {
  const { openAssistant, sendAssistantMessage } = useAssistantSidebar();
  const [draft, setDraft] = useState('');

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text) {
      openAssistant();
      return;
    }
    sendAssistantMessage(text);
    setDraft('');
  }, [draft, openAssistant, sendAssistantMessage]);

  return (
    <div className={cn(workbenchAiAssistantDockShell, className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={workbenchAiAssistantDockAvatar}>
            <Logo variant="icon" size={18} color="currentColor" className="text-foreground" />
          </span>
          <span className="text-xs font-semibold text-foreground">AI 助理</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={openAssistant}
          title="展开助手"
          aria-label="展开助手"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="mb-2 text-[10px] leading-relaxed text-muted-foreground">
        我正在监控：风速、道路状态、景点营业时间。有变化会主动提醒你
      </p>
      <div className="flex items-center gap-1.5">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="问我关于行程的问题..."
          className={workbenchAiAssistantDockInput}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleSend}
          aria-label="发送"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
