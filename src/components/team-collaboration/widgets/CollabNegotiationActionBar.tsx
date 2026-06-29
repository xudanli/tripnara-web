import { Handshake, MessageSquare, Sparkles, Vote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { workbenchPrimaryAction } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';

interface CollabNegotiationActionBarProps {
  onStartVote?: () => void;
  onGenerateCompromise?: () => void;
  onDiscussWithAssistant?: () => void;
  voteDisabled?: boolean;
  className?: string;
}

export function CollabNegotiationActionBar({
  onStartVote,
  onGenerateCompromise,
  onDiscussWithAssistant,
  voteDisabled,
  className,
}: CollabNegotiationActionBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 border-t border-border/60 pt-3',
        className,
      )}
    >
      {onStartVote ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={voteDisabled}
          onClick={onStartVote}
        >
          <Vote className="h-3.5 w-3.5" />
          发起投票
        </Button>
      ) : null}
      {onGenerateCompromise ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={onGenerateCompromise}
        >
          <Handshake className="h-3.5 w-3.5" />
          生成妥协方案
        </Button>
      ) : null}
      {onDiscussWithAssistant ? (
        <Button
          type="button"
          size="sm"
          className={cn('h-8 gap-1.5 text-xs', workbenchPrimaryAction)}
          onClick={onDiscussWithAssistant}
        >
          <Sparkles className="h-3.5 w-3.5" />
          与 Nara 讨论
        </Button>
      ) : null}
      {onDiscussWithAssistant ? (
        <span className="hidden text-[10px] text-muted-foreground sm:inline">
          <MessageSquare className="mr-1 inline h-3 w-3" />
          AI 可汇总各方观点并给出下一步
        </span>
      ) : null}
    </div>
  );
}
