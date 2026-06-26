import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  NARRATIVE_ARC_LABELS,
} from '@/lib/narrative-engine-display.util';
import { cn } from '@/lib/utils';
import type { GenerateCandidatesResult, ThemeCandidate } from '@/types/narrative-engine';

const MAX_REGENERATE = 3;

const CONFIDENCE_LABELS: Record<ThemeCandidate['confidence'], string> = {
  high: '高匹配',
  medium: '中等',
  low: '探索向',
};

interface NarrativeThemeCandidateListProps {
  session: GenerateCandidatesResult;
  selectedId?: string;
  onSelect: (candidate: ThemeCandidate) => void;
  onRegenerate: () => void;
  onConfirm: () => void;
  isRegenerating?: boolean;
  isConfirming?: boolean;
  className?: string;
}

export function NarrativeThemeCandidateList({
  session,
  selectedId,
  onSelect,
  onRegenerate,
  onConfirm,
  isRegenerating = false,
  isConfirming = false,
  className,
}: NarrativeThemeCandidateListProps) {
  const regenerateRemaining = MAX_REGENERATE - session.regenerateCount;
  const canRegenerate = regenerateRemaining > 0 && !isRegenerating && !isConfirming;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            选一个最贴近此刻感受的主题
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            主题会写入行程叙事层，不影响路线可行性判断
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 text-xs"
          disabled={!canRegenerate}
          onClick={onRegenerate}
        >
          {isRegenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5">
            换一批
            {regenerateRemaining > 0 ? `（剩 ${regenerateRemaining}）` : ''}
          </span>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-1">
        {session.candidates.map((candidate) => {
          const selected = selectedId === candidate.id;
          return (
            <Card
              key={candidate.id}
              className={cn(
                'cursor-pointer transition-colors hover:border-primary/40',
                selected && 'border-primary ring-1 ring-primary/20 bg-primary/5'
              )}
              onClick={() => !isConfirming && onSelect(candidate)}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{candidate.title}</CardTitle>
                  <div className="flex flex-wrap gap-1 shrink-0 justify-end">
                    <Badge variant="outline" className="text-[10px]">
                      {NARRATIVE_ARC_LABELS[candidate.arcTemplate]}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {CONFIDENCE_LABELS[candidate.confidence]}
                    </Badge>
                    {candidate.fallbackGenerated && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        规则模板
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-sm text-foreground/80">
                  {candidate.tagline}
                </CardDescription>
              </CardHeader>
              {candidate.resonanceHint && (
                <CardContent className="px-4 pb-4 pt-0">
                  <p className="text-xs text-muted-foreground">{candidate.resonanceHint}</p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Button
        type="button"
        className="w-full sm:w-auto"
        disabled={!selectedId || isConfirming || isRegenerating}
        onClick={onConfirm}
      >
        {isConfirming ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            确认中…
          </>
        ) : (
          '确认这个主题'
        )}
      </Button>
    </div>
  );
}
