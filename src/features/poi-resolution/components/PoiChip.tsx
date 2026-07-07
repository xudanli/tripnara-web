import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
import {
  semanticGoodSurface,
  semanticGoodText,
  semanticWarnSurface,
  semanticWarnText,
} from '@/lib/semantic-ui-classes';
import type { PoiChipViewModel } from '@/features/poi-resolution/types';

interface PoiChipProps {
  chip: PoiChipViewModel;
  onConfirmClick?: (chip: PoiChipViewModel) => void;
  onEvidenceClick?: (chip: PoiChipViewModel) => void;
  readOnly?: boolean;
}

function badgeToneClass(tone: PoiChipViewModel['badge']['tone']): string {
  if (tone === 'success') return cn(semanticGoodSurface, semanticGoodText);
  if (tone === 'warning') return cn(semanticWarnSurface, semanticWarnText);
  return 'border-border bg-muted/40 text-muted-foreground';
}

export function PoiChip({ chip, onConfirmClick, onEvidenceClick, readOnly = false }: PoiChipProps) {
  const isVerified = chip.badge.tone === 'success';
  const isActionable = chip.needsAction && !readOnly;

  const content = (
    <>
      <span className="truncate font-medium">{chip.label}</span>
      {isActionable ? (
        <>
          {chip.badge.tone !== 'warning' ? (
            <span className="shrink-0 opacity-80">{chip.badge.label}</span>
          ) : null}
          <span className="shrink-0 underline underline-offset-2">
            {chip.badge.tone === 'warning' ? chip.badge.label : (chip.badge.actionLabel ?? '手动选择')}
          </span>
        </>
      ) : (
        <span className="shrink-0 opacity-80">{chip.badge.label}</span>
      )}
      {isVerified && !readOnly ? (
        <button
          type="button"
          className="shrink-0 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-foreground/10"
          aria-label="查看解析依据"
          onClick={(e) => {
            e.stopPropagation();
            onEvidenceClick?.(chip);
          }}
        >
          <Info className="w-2.5 h-2.5" />
        </button>
      ) : null}
      {isVerified && readOnly && chip.poiId ? (
        <span className="shrink-0 font-mono text-[9px] opacity-70">{chip.poiId}</span>
      ) : null}
    </>
  );

  if (isActionable) {
    return (
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] leading-tight max-w-full hover:opacity-90',
          badgeToneClass(chip.badge.tone),
        )}
        onClick={() => onConfirmClick?.(chip)}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] leading-tight max-w-full',
        badgeToneClass(chip.badge.tone),
      )}
    >
      {content}
    </div>
  );
}

interface PoiChipListProps {
  chips: PoiChipViewModel[];
  onConfirmClick?: (chip: PoiChipViewModel) => void;
  onEvidenceClick?: (chip: PoiChipViewModel) => void;
  readOnly?: boolean;
  className?: string;
}

export function PoiChipList({
  chips,
  onConfirmClick,
  onEvidenceClick,
  readOnly = false,
  className,
}: PoiChipListProps) {
  if (!chips.length) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {chips.map((chip) => (
        <PoiChip
          key={chip.key}
          chip={chip}
          onConfirmClick={onConfirmClick}
          onEvidenceClick={onEvidenceClick}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}
