import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { isSameDecisionNarrativeText } from '@/lib/decision-closure-card.util';
import {
  dedupeAffectedScopeDisplay,
  groupAffectedScopeDisplayByDay,
} from '@/lib/decision-problem-display.util';
import type { AffectedScopeDisplay } from '@/types/decision-problem';

export interface ScopeChipProps {
  title: string;
  subtitle?: string;
  dayIndex?: number;
  places?: string[];
  className?: string;
  onDayClick?: (dayIndex: number) => void;
}

function ScopeDayLabel({
  dayIndex,
  onDayClick,
}: {
  dayIndex: number;
  onDayClick?: (dayIndex: number) => void;
}) {
  if (onDayClick) {
    return (
      <button
        type="button"
        className="shrink-0 text-[10px] font-medium text-primary hover:underline"
        onClick={() => onDayClick(dayIndex)}
      >
        第 {dayIndex} 天
      </button>
    );
  }

  return (
    <span className="shrink-0 rounded bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      第 {dayIndex} 天
    </span>
  );
}

/** 单条影响范围 — 只读 BFF label / secondaryLabel */
export function ScopeChip({
  title,
  subtitle,
  dayIndex,
  places,
  className,
  onDayClick,
  showDayLabel = true,
  compact = false,
}: ScopeChipProps & { showDayLabel?: boolean; compact?: boolean }) {
  const displayTitle = title?.trim() || subtitle?.trim() || '—';
  const displaySubtitle = subtitle && subtitle !== displayTitle ? subtitle : undefined;
  const displayPlaces = places?.filter(
    (name) => name.trim() && name.trim() !== displayTitle && !displayTitle.includes(name.trim()),
  );

  return (
    <div
      className={cn(
        compact
          ? 'rounded-md border border-border/60 bg-muted/12 px-2 py-1 dark:bg-muted/20'
          : 'rounded-md border border-border/60 bg-muted/12 px-2.5 py-1.5',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {showDayLabel && dayIndex != null ? (
          <ScopeDayLabel dayIndex={dayIndex} onDayClick={onDayClick} />
        ) : null}
        <p
          className={cn(
            'min-w-0 flex-1 font-medium leading-snug text-foreground',
            compact ? 'text-[11px]' : 'text-xs',
          )}
        >
          {displayTitle}
        </p>
      </div>
      {displaySubtitle ? (
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{displaySubtitle}</p>
      ) : null}
      {displayPlaces?.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {displayPlaces.map((name) => (
            <Badge key={name} variant="secondary" className="text-[10px] font-normal">
              {name}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export interface AffectedScopeDisplayListProps {
  /** GET .../decision-problems/:id → affectedScopeDisplay（列表接口无此字段） */
  items: AffectedScopeDisplay[];
  onDayClick?: (dayIndex: number) => void;
  compact?: boolean;
  /** 与 conflictTitle 相同时隐藏 chip 主标题，只留 secondary */
  conflictTitle?: string;
  maxVisible?: number;
}

function resolveScopeChipTitle(
  scope: AffectedScopeDisplay,
  conflictTitle?: string,
): { title: string; subtitle?: string; skip?: boolean } {
  const label = scope.label?.trim() ?? '';
  const secondary = scope.secondaryLabel?.trim();
  const conflict = conflictTitle?.trim();

  if (conflict && label && (conflict === label || isSameDecisionNarrativeText(conflict, label))) {
    const fromPlaces = scope.placeNames?.map((name) => name.trim()).filter(Boolean);
    const resolved = secondary || (fromPlaces?.length ? fromPlaces.join('、') : undefined);
    if (resolved && !isSameDecisionNarrativeText(conflict, resolved)) {
      return { title: resolved, subtitle: undefined };
    }
    return { title: '', subtitle: undefined, skip: true };
  }

  if (conflict && label && conflict.includes(label) && label.length < 12) {
    const fromPlaces = scope.placeNames?.map((name) => name.trim()).filter(Boolean);
    const resolved = secondary || (fromPlaces?.length ? fromPlaces.join('、') : undefined);
    if (resolved) return { title: resolved, subtitle: undefined };
  }

  return { title: label, subtitle: secondary };
}

/** 影响范围 — 只读 affectedScopeDisplay[]，不拼 affectedScope */
export function AffectedScopeDisplayList({
  items,
  onDayClick,
  compact = false,
  conflictTitle,
  maxVisible,
}: AffectedScopeDisplayListProps) {
  const displayItems = dedupeAffectedScopeDisplay(items).filter((scope) => {
    const resolved = resolveScopeChipTitle(scope, conflictTitle);
    return !resolved.skip && Boolean(resolved.title.trim() || resolved.subtitle?.trim());
  });
  if (displayItems.length === 0) return null;

  const visibleItems =
    maxVisible != null && maxVisible > 0
      ? displayItems.slice(0, maxVisible)
      : displayItems;

  const renderChip = (scope: AffectedScopeDisplay) => {
    const resolved = resolveScopeChipTitle(scope, conflictTitle);
    return (
      <ScopeChip
        key={`${scope.scopeType}:${scope.scopeId}`}
        title={resolved.title}
        subtitle={resolved.subtitle}
        dayIndex={scope.dayIndex}
        places={scope.placeNames}
        onDayClick={onDayClick}
        compact={compact}
      />
    );
  };

  const hasDayIndex = visibleItems.some((item) => item.dayIndex != null);
  if (!hasDayIndex) {
    return (
      <div className={cn(compact ? 'space-y-1' : 'space-y-1.5')}>
        {visibleItems.map(renderChip)}
      </div>
    );
  }

  const groups = groupAffectedScopeDisplayByDay(visibleItems);
  return (
    <div className={cn(compact ? 'space-y-1' : 'space-y-2')}>
      {groups.map((group) => (
        <div key={group.label}>
          {group.items.length > 1 && !compact ? (
            <p className="mb-1 text-[10px] font-medium text-muted-foreground">{group.label}</p>
          ) : null}
          <div className={cn(compact ? 'space-y-1' : 'space-y-1.5')}>
            {group.items.map((scope) => {
              const resolved = resolveScopeChipTitle(scope, conflictTitle);
              return (
                <ScopeChip
                  key={`${scope.scopeType}:${scope.scopeId}`}
                  title={resolved.title}
                  subtitle={resolved.subtitle}
                  dayIndex={scope.dayIndex}
                  places={scope.placeNames}
                  onDayClick={onDayClick}
                  showDayLabel={group.items.length === 1}
                  compact={compact}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
