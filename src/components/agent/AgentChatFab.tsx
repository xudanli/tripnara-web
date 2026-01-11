import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import AgentChatDialog from './AgentChatDialog';

interface AgentChatFabProps {
  activeTripId?: string | null;
  onSystem2Response?: () => void;
}

export default function AgentChatFab({ activeTripId, onSystem2Response }: AgentChatFabProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 悬浮按钮 */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="icon"
          className={cn(
            'h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200',
            'bg-primary hover:bg-primary/90',
            open && 'scale-95'
          )}
          onClick={() => setOpen(true)}
          title="打开 Nara"
        >
          <Bot className="w-6 h-6" />
        </Button>
      </div>

      {/* 弹窗 */}
      <AgentChatDialog
        open={open}
        onOpenChange={setOpen}
        activeTripId={activeTripId}
        onSystem2Response={onSystem2Response}
      />
    </>
  );
}