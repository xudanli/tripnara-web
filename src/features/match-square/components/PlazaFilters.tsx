import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { InteractionMode, PlanningStyle, PostListFilters } from '@/types/match-square';
import type { MbtiQuadrant } from '@/types/odyssey-travel-persona';
import { useMatchSquareFilterOptions } from '../hooks/useMatchSquare';
import { plazaFilter, plazaToolbar } from '../lib/plaza-visual';

interface PlazaFiltersBarProps {
  filters: PostListFilters;
  onChange: (filters: PostListFilters) => void;
}

function FilterChipGroup<T extends string>({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: Array<{ id: T; label: string }>;
  selected: T[] | undefined;
  onToggle: (id: T) => void;
}) {
  if (!items.length) return null;

  return (
    <div className={plazaFilter.popoverGroup}>
      <p className={plazaFilter.label}>{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <Badge
            key={item.id}
            variant="outline"
            className={cn(
              plazaFilter.chip,
              'h-6 px-2 py-0 text-[11px]',
              selected?.includes(item.id) && plazaFilter.chipActive
            )}
            onClick={() => onToggle(item.id)}
          >
            {item.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function PlazaFiltersBar({ filters, onChange }: PlazaFiltersBarProps) {
  const { data: options } = useMatchSquareFilterOptions();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filters.dateFrom ? new Date(filters.dateFrom) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filters.dateTo ? new Date(filters.dateTo) : undefined
  );

  const quadrants = options?.personaQuadrants ?? [];
  const modes = options?.interactionModes ?? [];
  const teamworkStyles = options?.teamworkStyles ?? [];
  const hasChipFilters = quadrants.length > 0 || modes.length > 0 || teamworkStyles.length > 0;

  const toggleQuadrant = (q: MbtiQuadrant) => {
    const current = filters.personaQuadrants ?? [];
    const next = current.includes(q) ? current.filter((x) => x !== q) : [...current, q];
    onChange({ ...filters, personaQuadrants: next.length ? next : undefined });
  };

  const toggleMode = (m: InteractionMode) => {
    const current = filters.interactionModes ?? [];
    const next = current.includes(m) ? current.filter((x) => x !== m) : [...current, m];
    onChange({ ...filters, interactionModes: next.length ? next : undefined });
  };

  const togglePlanningStyle = (s: PlanningStyle) => {
    const current = filters.planningStyles ?? [];
    const next = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
    onChange({ ...filters, planningStyles: next.length ? next : undefined });
  };

  const clearAll = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    onChange({});
  };

  const chipFilterCount =
    (filters.personaQuadrants?.length ?? 0) +
    (filters.interactionModes?.length ?? 0) +
    (filters.planningStyles?.length ?? 0);

  const hasFilters =
    Boolean(filters.destination) ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo) ||
    chipFilterCount > 0;

  return (
    <div className={plazaToolbar.shell}>
      <div className={cn(plazaToolbar.row, 'flex-nowrap sm:flex-wrap')}>
        <span className={plazaToolbar.segmentLabel}>检索</span>
        <Input
          placeholder="目的地"
          value={filters.destination ?? ''}
          onChange={(e) => onChange({ ...filters, destination: e.target.value || undefined })}
          className="h-7 min-w-0 flex-1 border-border/60 bg-background/90 text-xs sm:max-w-[9rem]"
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-7 shrink-0 px-2 text-[11px]',
                (dateFrom || dateTo) && 'border-foreground/20 bg-muted/60'
              )}
            >
              <CalendarIcon className="mr-1 h-3 w-3" />
              {dateFrom && dateTo
                ? `${format(dateFrom, 'M/d')}–${format(dateTo, 'M/d')}`
                : '出发时间'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateFrom, to: dateTo }}
              onSelect={(range) => {
                setDateFrom(range?.from);
                setDateTo(range?.to);
                onChange({
                  ...filters,
                  dateFrom: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
                  dateTo: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
                });
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {hasChipFilters && (
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'h-7 shrink-0 gap-1 px-2 text-[11px]',
                  chipFilterCount > 0 && 'border-foreground/20 bg-muted/60'
                )}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal className="h-3 w-3" aria-hidden />
                筛选
                {chipFilterCount > 0 && (
                  <span className="rounded-sm bg-foreground/90 px-1 py-px text-[9px] font-medium tabular-nums text-background">
                    {chipFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className={plazaFilter.popover}>
              <FilterChipGroup
                label="旅行人格"
                items={quadrants}
                selected={filters.personaQuadrants}
                onToggle={toggleQuadrant}
              />
              <FilterChipGroup
                label="相处模式"
                items={modes}
                selected={filters.interactionModes}
                onToggle={toggleMode}
              />
              <FilterChipGroup
                label="组队风格"
                items={teamworkStyles}
                selected={filters.planningStyles}
                onToggle={togglePlanningStyle}
              />
            </PopoverContent>
          </Popover>
        )}

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 shrink-0 px-1.5 text-[11px] text-muted-foreground"
            onClick={clearAll}
          >
            <X className="mr-0.5 h-3 w-3" />
            清除
          </Button>
        )}
      </div>
    </div>
  );
}
