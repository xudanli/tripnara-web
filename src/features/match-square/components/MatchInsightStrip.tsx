import { AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchInsightStripProps {
  highlights?: string[];
  warnings?: string[];
  className?: string;
  compact?: boolean;
}

/** PRD 3.5.2 — 亮点与留意 · 卡片内结构化决策翻译 */
export function MatchInsightStrip({
  highlights = [],
  warnings = [],
  className,
  compact = true,
}: MatchInsightStripProps) {
  if (!highlights.length && !warnings.length) return null;

  const highlightText = highlights.join(' · ');
  const warningText = warnings.join(' · ');

  return (
    <div className={cn('space-y-1.5 text-xs leading-relaxed', className)}>
      {highlights.length > 0 && (
        <p className="flex gap-1.5 text-foreground/90">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gate-allow-foreground)]" aria-hidden />
          <span>
            {!compact && <span className="font-medium">同频亮点：</span>}
            {highlightText}
          </span>
        </p>
      )}
      {warnings.length > 0 && (
        <p className="flex gap-1.5 text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gate-confirm-foreground)]" aria-hidden />
          <span>
            {!compact && <span className="font-medium">需留意：</span>}
            {warningText}
          </span>
        </p>
      )}
    </div>
  );
}
