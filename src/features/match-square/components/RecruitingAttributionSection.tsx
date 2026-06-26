import { useState } from 'react';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RecruitingAttribution } from '@/types/match-square';
import {
  getRecruitingReasonLabel,
  orderedSignalScores,
  recruitingConfidenceBadgeVariant,
} from '../lib/recruiting-attribution.util';
import { RecruitingSignalScoreBar } from './RecruitingSignalScoreBar';
import { RecruitingAttributionDetailModal } from './RecruitingAttributionDetailModal';

interface RecruitingAttributionSectionProps {
  attribution: RecruitingAttribution;
  compact?: boolean;
  className?: string;
}

export function RecruitingAttributionSection({
  attribution,
  compact = false,
  className,
}: RecruitingAttributionSectionProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const signals = orderedSignalScores(attribution.signalScores);
  const topSignals = compact ? signals.slice(0, 3) : signals;

  return (
    <>
      <div
        className={cn(
          'rounded-lg border border-border/70 bg-muted/30 p-3 space-y-3',
          className
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-foreground">决策归因</span>
          <Badge variant="outline" className="text-[10px]">
            {getRecruitingReasonLabel(attribution.primaryReason)}
          </Badge>
          <Badge variant={recruitingConfidenceBadgeVariant(attribution.confidence)} className="text-[10px]">
            置信度 {attribution.confidence}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setDetailOpen(true)}
          >
            <Info className="mr-1 h-3.5 w-3.5" aria-hidden />
            详情
          </Button>
        </div>

        <div className="space-y-2">
          {topSignals.map((signal) => (
            <RecruitingSignalScoreBar
              key={signal.key}
              label={signal.label}
              score={signal.score}
            />
          ))}
        </div>
      </div>

      <RecruitingAttributionDetailModal
        attribution={attribution}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
