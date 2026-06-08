import { OrchestrationItineraryPreview, TimelineItineraryPreview } from '@/components/agent/OrchestrationItineraryPreview';
import type { ReactNode } from 'react';
import { SegmentEditorDegradedShell } from '@/components/planning/SegmentEditorDegradedShell';
import type { OrchestrationResult } from '@/api/agent';
import type { ItineraryDayItemsBlock } from '@/lib/agent-itinerary-item-display';
import type { AgentPoiDayBlock } from '@/lib/agent-poi-payload';
import { getSegmentEditorDegradation } from '@/lib/world-model-guards';
import type { SafetySurfacePayloadV1 } from '@/lib/safety-surface-payload';
import { useWorldModelGuardsStore } from '@/store/worldModelGuardsStore';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

type DegradedItineraryPreviewProps = {
  className?: string;
  poiDayBlocks?: AgentPoiDayBlock[];
  showPlaceLink?: boolean;
  safetySurface?: SafetySurfacePayloadV1 | null;
} & (
  | { variant: 'timeline'; days: ItineraryDayItemsBlock[] }
  | { variant: 'orchestration'; orchestrationResult: OrchestrationResult }
);

/**
 * Agent 气泡内行程预览：订阅 store 中的 topology lock，只读降级展示。
 */
export function DegradedItineraryPreview(props: DegradedItineraryPreviewProps) {
  const guards = useWorldModelGuardsStore((s) => s.worldModelGuards);
  const degradation = getSegmentEditorDegradation(guards);

  const inner =
    props.variant === 'timeline' ? (
      <TimelineItineraryPreview
        days={props.days}
        className={props.className}
        poiDayBlocks={props.poiDayBlocks}
        showPlaceLink={props.showPlaceLink}
        safetySurface={props.safetySurface}
      />
    ) : (
      <OrchestrationItineraryPreview
        orchestrationResult={props.orchestrationResult}
        className={props.className}
        poiDayBlocks={props.poiDayBlocks}
        showPlaceLink={props.showPlaceLink}
        safetySurface={props.safetySurface}
      />
    );

  if (!degradation.structureReadOnly && !degradation.isTopologyLocked) {
    return inner;
  }

  return (
    <SegmentEditorDegradedShell degradation={degradation} className={cn('mt-3', props.className)}>
      <ReadOnlyItineraryListOverlay degradation={degradation}>{inner}</ReadOnlyItineraryListOverlay>
    </SegmentEditorDegradedShell>
  );
}

function ReadOnlyItineraryListOverlay({
  degradation,
  children,
}: {
  degradation: ReturnType<typeof getSegmentEditorDegradation>;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      {degradation.structureReadOnly ? (
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-lg bg-background/40 backdrop-blur-[1px]"
          aria-hidden
        />
      ) : null}
      <div
        className={cn(
          degradation.structureReadOnly && '[&_li]:opacity-95 [&_article]:ring-1 [&_article]:ring-amber-200/50'
        )}
      >
        {children}
      </div>
      {degradation.isTopologyLocked ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-800/90">
          <Lock className="h-3 w-3 shrink-0" />
          草案路线段只读；请在规划工作台「日程」中微调各站时间。
        </p>
      ) : null}
    </div>
  );
}
