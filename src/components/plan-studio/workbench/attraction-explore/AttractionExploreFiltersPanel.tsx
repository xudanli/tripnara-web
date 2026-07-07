import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AttractionExploreContextResponse } from '@/types/attraction-explore';
import {
  workbenchAttractionExploreChipIdle,
  workbenchAttractionExploreChipSelected,
  workbenchAttractionExploreContextCard,
  workbenchAttractionExploreSectionTitle,
  workbenchPanelTitle,
  workbenchScrollable,
} from '../workbench-ui';

export interface AttractionExploreFiltersPanelProps {
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
  context,
  selectedThemeIds,
  selectedSuitabilityIds,
  onToggleTheme,
  onToggleSuitability,
  onEditPreferences,
  className,
}: AttractionExploreFiltersPanelProps) {
  if (!context) {
    return (
      <div className={cn('p-4 text-xs text-muted-foreground', className)}>正在加载筛选条件…</div>
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

        <section className={workbenchAttractionExploreContextCard}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className={workbenchAttractionExploreSectionTitle}>出行成员与偏好</p>
            {onEditPreferences ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[10px] text-muted-foreground"
                onClick={onEditPreferences}
              >
                <Pencil className="mr-1 h-3 w-3" />
                编辑
              </Button>
            ) : null}
          </div>
          <div className="mb-2 flex -space-x-1">
            {(context.memberPreferences?.memberInitials ?? []).map((initial, index) => (
              <span
                key={`${initial}-${index}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-[10px] font-medium text-foreground"
              >
                {initial}
              </span>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {context.memberPreferences?.summary ?? '暂无成员偏好信息'}
          </p>
        </section>
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
