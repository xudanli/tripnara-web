import {
  formatExplorationCheckIssueChips,
  getExplorationCheckStatusHeadline,
  getExplorationCheckStatusSubtitle,
  resolveExplorationCheckUiState,
} from '../api/helpers';
import type { IssuesListResponse } from '../api/types';
import { exploreUi, semanticBadText, semanticGoodText } from '../explore-ui';
import { cn } from '@/lib/utils';

interface ExploreCheckStatusBannerProps {
  blockerIssueCount?: number;
  ontologyIssueCount?: number;
  gatewayOpenCount?: number;
  unresolvedPoiCount?: number;
  diagnosis?: string;
  issues?: IssuesListResponse | null;
  className?: string;
}

/** §5 — check 结果顶栏：按 blockerIssueCount 分支，不用 displayedIssues.length */
export function ExploreCheckStatusBanner({
  blockerIssueCount,
  ontologyIssueCount,
  gatewayOpenCount,
  unresolvedPoiCount,
  diagnosis,
  issues,
  className,
}: ExploreCheckStatusBannerProps) {
  const uiState = resolveExplorationCheckUiState(
    {
      blockerIssueCount,
      ontologyIssueCount,
      gatewayOpenCount,
      unresolvedPoiCount,
      diagnosis,
    },
    issues,
  );

  const chips = formatExplorationCheckIssueChips(
    {
      gatewayOpenCount,
      ontologyIssueCount,
      unresolvedPoiCount,
    },
    issues ?? undefined,
  );

  const isClear = uiState.status === 'clear';

  return (
    <div
      className={cn(
        isClear ? exploreUi.infoBanner : exploreUi.rejectBanner,
        'px-4 py-3 rounded-xl border',
        className,
      )}
    >
      <p
        className={cn(
          'text-sm font-semibold',
          isClear ? semanticGoodText : semanticBadText,
        )}
      >
        {getExplorationCheckStatusHeadline(uiState)}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {getExplorationCheckStatusSubtitle(uiState)}
      </p>
      {chips.length > 0 && !isClear ? (
        <p className="text-[11px] text-muted-foreground mt-2">{chips.join(' · ')}</p>
      ) : null}
    </div>
  );
}
