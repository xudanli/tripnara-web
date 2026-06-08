import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { plazaChip } from '../lib/plaza-visual';

interface VibeChipStreamProps {
  chips: string[];
  /** 超出部分折叠为 +N，点击展开全部 */
  maxVisible?: number;
  /** neutral：决策型中性标签；accent：发布/强调场景 */
  tone?: 'neutral' | 'accent';
  className?: string;
}

/** Vibe 标签流 — TripNARA 中性 pill，+N 可点击展开 */
export function VibeChipStream({
  chips,
  maxVisible,
  tone = 'neutral',
  className,
}: VibeChipStreamProps) {
  const [expanded, setExpanded] = useState(false);

  if (chips.length === 0) return null;

  const hasCap = maxVisible != null && chips.length > maxVisible;
  const showAll = !hasCap || expanded;
  const displayChips = showAll ? chips : chips.slice(0, maxVisible);
  const hiddenCount = hasCap && !expanded ? chips.length - maxVisible! : 0;

  const chipClass = tone === 'accent' ? plazaChip.vibeAccent : plazaChip.vibe;
  const animate = tone === 'accent';

  const renderChip = (chip: string) => {
    if (!animate) {
      return (
        <span className={chipClass} key={chip}>
          {chip}
        </span>
      );
    }
    return (
      <motion.span
        key={chip}
        layout
        initial={{ opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        className={chipClass}
      >
        {chip}
      </motion.span>
    );
  };

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {animate ? (
        <AnimatePresence mode="popLayout">{displayChips.map(renderChip)}</AnimatePresence>
      ) : (
        displayChips.map(renderChip)
      )}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={cn(
            plazaChip.overflow,
            'cursor-pointer transition-colors hover:border-foreground/25 hover:bg-muted/40 hover:text-foreground'
          )}
          aria-label={`还有 ${hiddenCount} 个标签，点击展开`}
        >
          +{hiddenCount}
        </button>
      )}

      {hasCap && expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className={cn(
            plazaChip.overflow,
            'cursor-pointer transition-colors hover:border-foreground/25 hover:bg-muted/40 hover:text-foreground'
          )}
          aria-label="收起标签"
        >
          收起
        </button>
      )}
    </div>
  );
}
