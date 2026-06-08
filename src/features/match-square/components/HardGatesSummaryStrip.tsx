import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { RecruitmentPostCard } from '@/types/match-square';
import { buildHardGatesSummary } from '../lib/build-hard-gates-summary';
import { plazaChip, plazaReview } from '../lib/plaza-visual';

const DETAIL_VISIBLE_GATES = 3;

interface HardGatesSummaryStripProps {
  post: RecruitmentPostCard;
  embedded?: boolean;
  /** 详情概览：pill 摘要 + 点击展开剩余 */
  compact?: boolean;
  className?: string;
}

/** P0 · HARD GATES 摘要 */
export function HardGatesSummaryStrip({
  post,
  embedded = false,
  compact = false,
  className,
}: HardGatesSummaryStripProps) {
  const rows = buildHardGatesSummary(post);
  if (!rows.length) return null;

  const content = compact ? (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Shield className="h-3.5 w-3.5" aria-hidden />
        Hard Gates
      </span>
      {rows.slice(0, DETAIL_VISIBLE_GATES).map((row) => (
        <span key={row} className={plazaChip.gate}>
          {row}
        </span>
      ))}
      {rows.length > DETAIL_VISIBLE_GATES && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(plazaChip.overflow, 'hover:bg-muted/40')}
            >
              +{rows.length - DETAIL_VISIBLE_GATES} 项门槛
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 space-y-2 p-3 text-xs">
            <p className="font-medium text-foreground">全部硬门槛</p>
            <ul className="space-y-1.5 text-muted-foreground">
              {rows.map((row) => (
                <li key={row} className="leading-relaxed">
                  {row}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </div>
  ) : (
    <p className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90">
      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span>
        <span className="font-medium text-foreground">HARD GATES</span>
        <span className="text-muted-foreground"> · </span>
        {rows.join(' · ')}
      </span>
    </p>
  );

  if (embedded) {
    return <div className={className}>{content}</div>;
  }

  return (
    <section className={cn(plazaReview.card, className)} aria-label="硬性匹配门槛">
      {content}
    </section>
  );
}
