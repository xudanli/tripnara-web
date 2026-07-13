import { useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PrivateWishlistPanel } from '@/components/wishlist/PrivateWishlistPanel';
import { useAssistantSidebar } from '@/contexts/AssistantSidebarContext';
import { mergeCollabDeepLink } from '@/lib/collab-center-navigation';
import { trackCollabWishSubmit } from '@/utils/collab-center-analytics';
import { CollabWishRightColumn } from '../widgets/CollabWishRightColumn';
import { CollabWishStatusBanner } from '../widgets/CollabWishStatusBanner';

interface CollabCenterWishesTabProps {
  tripId: string;
  destinationLabel?: string;
  userDisplayName?: string;
  onSummaryChange?: () => void;
}

export function CollabCenterWishesTab({
  tripId,
  destinationLabel,
  userDisplayName,
  onSummaryChange,
}: CollabCenterWishesTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightWishId = searchParams.get('wishId');
  const formSectionRef = useRef<HTMLDivElement>(null);
  const { openAssistant, sendAssistantMessage } = useAssistantSidebar();

  const clearWishDeepLink = useCallback(() => {
    const next = mergeCollabDeepLink(searchParams, { wishId: null });
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleAskAssistant = useCallback(() => {
    openAssistant();
    sendAssistantMessage('请根据我们团队的心愿单，分析偏好聚类、潜在冲突，并给出可执行的妥协建议。');
  }, [openAssistant, sendAssistantMessage]);

  const scrollToForm = useCallback(() => {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <PrivateWishlistPanel
      tripId={tripId}
      destinationLabel={destinationLabel}
      userDisplayName={userDisplayName}
      collabCenterLayout
      formSectionRef={formSectionRef}
      highlightWishId={highlightWishId}
      onHighlightWishConsumed={clearWishDeepLink}
      onSummaryChange={onSummaryChange}
      onWishSubmit={({ visibility, category }) => {
        trackCollabWishSubmit({ tripId, visibility, category });
      }}
      renderCollabHeader={(ctx) => (
        <CollabWishStatusBanner
          summary={ctx.summary}
          mine={ctx.mine}
          team={ctx.team}
          onNewWish={scrollToForm}
        />
      )}
      renderCollabSidebar={(ctx) => (
        <CollabWishRightColumn
          summary={ctx.summary}
          mine={ctx.mine}
          team={ctx.team}
          loading={ctx.loading}
          userDisplayName={userDisplayName}
          highlightWishId={highlightWishId}
          onAskAssistant={handleAskAssistant}
          onDeleteMine={ctx.onDeleteMine}
        />
      )}
    />
  );
}
