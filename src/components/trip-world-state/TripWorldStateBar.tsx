import { useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { TripStatusBarContainer, type TripStatusBarSection } from '@/components/trip-world-state';

function sectionToTab(section: TripStatusBarSection): { tab: string } {
  if (section === 'monitor') return { tab: 'timeline' };
  return { tab: 'decision-log' };
}

/** 行程壳层世界状态条 — 全 /trips/:id/* 子路由共享 */
export function TripWorldStateBar() {
  const { id: tripId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  const handleNavigateSection = useCallback(
    (section: TripStatusBarSection) => {
      if (!tripId) return;
      const { tab } = sectionToTab(section);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', tab);
          next.delete('statusSection');
          return next;
        },
        { replace: true },
      );
      navigate(`/dashboard/trips/${tripId}?tab=${tab}`);
    },
    [navigate, setSearchParams, tripId],
  );

  if (!tripId) return null;

  return <TripStatusBarContainer tripId={tripId} onNavigateSection={handleNavigateSection} />;
}
