import { Check, Handshake, Sparkles, Vote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { workbenchPrimaryAction } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';

interface CollabNegotiationActionBarProps {
  onStartVote?: () => void;
  onGenerateCompromise?: () => void;
  onDiscussWithAssistant?: () => void;
  onReachConsensus?: () => void;
  voteDisabled?: boolean;
  className?: string;
}

export function CollabNegotiationActionBar({
  onStartVote,
  onGenerateCompromise,
  onDiscussWithAssistant,
  onReachConsensus,
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
      {onDiscussWithAssistant ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={onDiscussWithAssistant}
        >
          <Sparkles className="h-3.5 w-3.5" />
          与 Nara 讨论
        </Button>
      ) : null}
      {onReachConsensus ? (
        <Button
          type="button"
          size="sm"
          className={cn('ml-auto h-8 gap-1.5 text-xs', workbenchPrimaryAction)}
          onClick={onReachConsensus}
        >
          <Check className="h-3.5 w-3.5" />
          达成共识并写回
        </Button>
      ) : null}
    </div>
  );
}
