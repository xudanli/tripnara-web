import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Minimize2, Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import AgentChat from './AgentChat';
import { NaraAgentChatting } from '@/components/illustrations/AgentIllustrations';

interface AgentChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTripId?: string | null;
  onSystem2Response?: () => void;
}

export default function AgentChatDialog({
  open,
  onOpenChange,
  activeTripId,
  onSystem2Response,
}: AgentChatDialogProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 当弹窗关闭时，重置最小化状态
  useEffect(() => {
    if (!open) {
      setIsMinimized(false);
    }
  }, [open]);

  if (!mounted) return null;

  if (isMinimized && open) {
    // 最小化状态：显示为底部横幅
    return createPortal(
      <div className="fixed bottom-4 right-4 z-[100] w-80 animate-in slide-in-from-bottom-4">
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <NaraAgentChatting size={16} color="currentColor" highlightColor="currentColor" className="text-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Nara</span>
              <span className="text-xs text-muted-foreground">你的智能旅行副驾驶</span>
            </div>
          </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsMinimized(false)}
                title="展开"
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onOpenChange(false)}
                title="关闭"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={() => setIsMinimized(false)}
          >
            继续对话
          </Button>
        </div>
      </div>,
      document.body
    );
  }

  if (!open) return null;

  return createPortal(
    <>
      {/* 遮罩层 */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-[90] transition-opacity',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* 弹窗内容 */}
      <div
        className={cn(
          'fixed bottom-4 right-4 z-[100] w-full max-w-[500px] h-[600px]',
          'bg-background rounded-lg shadow-lg border',
          'flex flex-col overflow-hidden',
          'transition-all duration-200',
          open ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 自定义头部栏 */}
        <div className="flex-shrink-0 border-b px-4 py-3 flex items-center justify-between bg-background">
          <div className="flex items-center gap-2">
            <NaraAgentChatting size={20} color="currentColor" highlightColor="currentColor" className="text-primary" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold">Nara</span>
              <span className="text-xs text-muted-foreground">你的智能旅行副驾驶</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMinimized(true)}
              title="最小化"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
              title="关闭"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* AgentChat 内容 */}
        <div className="flex-1 overflow-hidden">
          <AgentChat
            activeTripId={activeTripId}
            onSystem2Response={onSystem2Response}
            className="h-full"
          />
        </div>
      </div>
    </>,
    document.body
  );
}