import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TeamRequirementProfilePanel } from '@/features/member-onboarding';
import { isAdvisorLedTrip } from '@/lib/trip-collaboration-mode.util';
import type { AttractionExploreContextResponse } from '@/types/attraction-explore';
import type { Collaborator, TripDetail } from '@/types/trip';
import {
  workbenchAttractionExploreChipIdle,
  workbenchAttractionExploreChipSelected,
  workbenchAttractionExploreContextCard,
  workbenchAttractionExploreSectionTitle,
  workbenchLinkClass,
  workbenchPanelTitle,
  workbenchScrollable,
} from '../workbench-ui';

export interface AttractionExploreFiltersPanelProps {
  tripId: string;
  trip?: TripDetail | null;
  collaborators?: Collaborator[] | null;
  context?: AttractionExploreContextResponse | null;
  selectedThemeIds: string[];
  selectedSuitabilityIds: string[];
  onToggleTheme: (id: string) => void;
  onToggleSuitability: (id: string) => void;
  onEditPreferences?: () => void;
  className?: string;
}

function FilterChipGroup({
  options,
  selectedIds,
  onToggle,
}: {
  options: Array<{ id: string; label: string }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = selectedIds.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggle(option.id)}
            className={cn(
              selected ? workbenchAttractionExploreChipSelected : workbenchAttractionExploreChipIdle,
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function AttractionExploreFiltersPanel({
  tripId,
  trip,
  collaborators,
  context,
  selectedThemeIds,
  selectedSuitabilityIds,
  onToggleTheme,
  onToggleSuitability,
  onEditPreferences,
  className,
}: AttractionExploreFiltersPanelProps) {
  const advisorLed = useMemo(() => isAdvisorLedTrip(trip), [trip]);
  const profileCollaborators = useMemo(
    () =>
      collaborators?.map((c) => ({
        userId: c.userId,
        displayName: c.displayName,
        role: c.role,
      })) ?? [],
    [collaborators],
  );

  const teamRequirementsBlock = (
    <>
      <TeamRequirementProfilePanel
        tripId={tripId}
        collaborators={profileCollaborators}
        compact
        sidebar
        includeFriction={!advisorLed}
        className="border-border/70 shadow-none"
      />
      {onEditPreferences ? (
        <button
          type="button"
          className={cn(workbenchLinkClass, 'text-[10px]')}
          onClick={onEditPreferences}
        >
          查看完整团队与需求 →
        </button>
      ) : null}
    </>
  );

  if (!context) {
    return (
      <div className={cn('flex min-h-0 flex-col', className)}>
        <div className="shrink-0 border-b border-border/50 px-3 py-1.5">
          <h2 className={workbenchPanelTitle}>这次想怎么玩</h2>
        </div>
        <div className={cn('min-h-0 flex-1 space-y-4 overflow-y-auto p-3', workbenchScrollable)}>
          <p className="text-xs text-muted-foreground">正在加载筛选条件…</p>
          {teamRequirementsBlock}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="shrink-0 border-b border-border/50 px-3 py-1.5">
        <h2 className={workbenchPanelTitle}>这次想怎么玩</h2>
      </div>

      <div className={cn('min-h-0 flex-1 space-y-4 overflow-y-auto p-3', workbenchScrollable)}>
        <section>
          <p className={workbenchAttractionExploreSectionTitle}>按主题</p>
          <FilterChipGroup
            options={context.themes}
            selectedIds={selectedThemeIds}
            onToggle={onToggleTheme}
          />
        </section>

        <section>
          <p className={workbenchAttractionExploreSectionTitle}>适合谁</p>
          <FilterChipGroup
            options={context.suitability}
            selectedIds={selectedSuitabilityIds}
            onToggle={onToggleSuitability}
          />
        </section>

        <section className={workbenchAttractionExploreContextCard}>
          <p className={workbenchAttractionExploreSectionTitle}>本次旅行条件</p>
          <dl className="mt-2 space-y-1.5 text-[11px]">
            <Row label="出发" value={context.tripContext?.departureLabel} />
            <Row label="交通" value={context.tripContext?.transportLabel} />
            <Row label="节奏" value={context.tripContext?.paceLabel} />
            <Row label="天气" value={context.tripContext?.weatherLabel} />
          </dl>
        </section>

        {teamRequirementsBlock}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="w-8 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground">{value?.trim() || '—'}</dd>
    </div>
  );
}
