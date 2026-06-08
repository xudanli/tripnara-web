import { Puzzle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamSlot, TeamStatus } from '@/types/match-square';
import { compactPuzzleSlotLabel } from '../lib/compact-puzzle-slot-label';
import { formatTeamRosterLabel } from '../lib/team-roster-label';
import { plazaChip, plazaOverview } from '../lib/plaza-visual';

interface TeamPuzzleListHintProps {
  slots: TeamSlot[];
  slotsRemaining?: number | null;
  teamStatus?: TeamStatus | null;
  postStatus?: 'active' | 'closed' | 'hidden';
  /** 列表 Card 只展示缺员数，不展示 open slot 角色 pill */
  hideOpenSlot?: boolean;
  className?: string;
}

/** 列表 Card · 缺员 + 首个缺位 pill（一行） */
export function TeamPuzzleListHint({
  slots,
  slotsRemaining,
  teamStatus,
  postStatus = 'active',
  hideOpenSlot = false,
  className,
}: TeamPuzzleListHintProps) {
  const openSlots = slots.filter((s) => s.kind === 'open');
  const highlight =
    openSlots.find((s) => s.highlightForViewer) ?? openSlots[0] ?? null;
  const rosterLabel = formatTeamRosterLabel({ teamStatus: teamStatus ?? undefined, status: postStatus }, slots);
  const remaining =
    typeof slotsRemaining === 'number' && slotsRemaining > 0 ? slotsRemaining : openSlots.length;

  if (!rosterLabel && !remaining && (!highlight || hideOpenSlot)) return null;

  return (
    <p className={cn('inline-flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px]', className)}>
      <Puzzle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      {rosterLabel ? (
        <span className={plazaOverview.metaEmphasis}>{rosterLabel}</span>
      ) : remaining > 0 ? (
        <span className={plazaOverview.metaEmphasis}>缺 {remaining} 人</span>
      ) : null}
      {highlight && !hideOpenSlot && (
        <>
          {(rosterLabel || remaining > 0) && (
            <span className={plazaOverview.metaSep} aria-hidden>
              ·
            </span>
          )}
          <span className={cn('border px-2 py-0.5 rounded-md text-[11px]', plazaChip.puzzleOpen)}>
            +{compactPuzzleSlotLabel(highlight.label)}
          </span>
        </>
      )}
    </p>
  );
}
