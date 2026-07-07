import { cn } from '@/lib/utils';
import { exploreUi, semanticWarnText } from '../explore-ui';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CandidatesStaleBannerProps {
  message: string;
  onRegenerate?: () => void;
  regenerating?: boolean;
  showRegenerate?: boolean;
}

export function CandidatesStaleBanner({
  message,
  onRegenerate,
  regenerating = false,
  showRegenerate = true,
}: CandidatesStaleBannerProps) {
  return (
    <div className={cn(exploreUi.warnCard, 'flex flex-col sm:flex-row sm:items-center gap-3 mb-4')}>
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <AlertTriangle className={cn('w-4 h-4 shrink-0 mt-0.5', semanticWarnText)} />
        <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
      </div>
      {showRegenerate && onRegenerate ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 text-xs"
          disabled={regenerating}
          onClick={onRegenerate}
        >
          {regenerating ? '正在重新生成…' : '重新生成路线'}
        </Button>
      ) : null}
    </div>
  );
}
