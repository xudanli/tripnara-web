import { LegEvidenceCardsPanel } from '@/components/agent/LegEvidenceCardsPanel';
import { PoiPitfallCardsPanel } from '@/components/agent/PoiPitfallCardsPanel';
import { useWorldModelGuardsStore } from '@/store/worldModelGuardsStore';

export interface ScheduleRouteRunEvidenceSectionProps {
  className?: string;
}

/** Plan Studio 日程侧栏：route_and_run 投影的物理证据卡 */
export function ScheduleRouteRunEvidenceSection({ className }: ScheduleRouteRunEvidenceSectionProps) {
  const legEvidenceCards = useWorldModelGuardsStore((s) => s.legEvidenceCards);
  const legEvidenceHeadlineZh = useWorldModelGuardsStore((s) => s.legEvidenceHeadlineZh);
  const poiPitfallCards = useWorldModelGuardsStore((s) => s.poiPitfallCards);
  const poiPitfallHeadlineZh = useWorldModelGuardsStore((s) => s.poiPitfallHeadlineZh);

  if (!legEvidenceCards.length && !poiPitfallCards.length) return null;

  return (
    <div className={className} data-testid="schedule-route-run-evidence">
      {legEvidenceCards.length > 0 ? (
        <LegEvidenceCardsPanel
          cards={legEvidenceCards}
          headlineZh={legEvidenceHeadlineZh}
          className="shadow-sm"
        />
      ) : null}
      {poiPitfallCards.length > 0 ? (
        <PoiPitfallCardsPanel
          cards={poiPitfallCards}
          headlineZh={poiPitfallHeadlineZh}
          className="shadow-sm"
        />
      ) : null}
    </div>
  );
}
