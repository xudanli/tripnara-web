import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VerifiedCredentials } from '@/types/match-square';
import { plazaToolbar } from '../lib/plaza-visual';
import { PlazaSelfStateBar } from './PlazaSelfStateBar';
import { TravelIntentBanner } from './TravelIntentBanner';
import { Button } from '@/components/ui/button';

interface PlazaViewerContextStripProps {
  personaLabel?: string;
  tripIntent?: string;
  viewerCredentials?: VerifiedCredentials | null;
  credentialsLoading?: boolean;
  showTravelIntent?: boolean;
  /** 嵌入 PlazaCommandBar，不再单独包边框 */
  embedded?: boolean;
  className?: string;
}

/** 广场顶部 · 匹配视角 + 旅行意向（单行紧凑，详情默认收起） */
export function PlazaViewerContextStrip({
  personaLabel,
  tripIntent,
  viewerCredentials,
  credentialsLoading,
  showTravelIntent = false,
  embedded = false,
  className,
}: PlazaViewerContextStripProps) {
  const [expanded, setExpanded] = useState(false);

  const identityLine = viewerCredentials?.headline?.identityHeadline;
  const hasSelfState = Boolean(personaLabel || tripIntent || identityLine || credentialsLoading);
  const hasExpandable =
    Boolean(tripIntent) ||
    credentialsLoading ||
    Boolean(identityLine) ||
    (!identityLine && !credentialsLoading && hasSelfState);

  if (!hasSelfState && !showTravelIntent) return null;

  const row = (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
      {hasSelfState && (
        <>
          <span className={plazaToolbar.segmentLabel}>视角</span>
          <PlazaSelfStateBar
            compact
            expanded={expanded}
            personaLabel={personaLabel}
            tripIntent={tripIntent}
            viewerCredentials={viewerCredentials}
            credentialsLoading={credentialsLoading}
          />
        </>
      )}

      {hasSelfState && showTravelIntent && (
        <span className="hidden h-3 w-px shrink-0 bg-border/60 sm:inline" aria-hidden />
      )}

      {showTravelIntent && (
        <>
          <span className={cn(plazaToolbar.segmentLabel, !hasSelfState && 'sr-only')}>意向</span>
          <TravelIntentBanner compact />
        </>
      )}

      {hasExpandable && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 shrink-0 p-0 text-muted-foreground/70"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? '收起匹配详情' : '展开匹配详情'}
        >
          <ChevronDown
            className={cn('h-3 w-3 transition-transform duration-200', expanded && 'rotate-180')}
          />
        </Button>
      )}
    </div>
  );

  const expandedPanel =
    expanded ? (
      <div className="w-full border-t border-border/50 pt-1.5 text-[10px] leading-relaxed text-muted-foreground">
        {showTravelIntent && (
          <p>挂起意向后，高契合队长可在雷达中发现你 · 匹配度 ≥85% 可收橄榄枝</p>
        )}
      </div>
    ) : null;

  if (embedded) {
    return (
      <div className={cn('flex min-w-0 flex-1 flex-col gap-1', className)}>
        {row}
        {expandedPanel}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border/70 bg-muted/15 px-2.5 py-1.5',
        className
      )}
    >
      {row}
      {expandedPanel}
    </div>
  );
}
