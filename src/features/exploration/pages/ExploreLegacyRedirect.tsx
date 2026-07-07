import { Navigate, useParams } from 'react-router-dom';
import { toApiRouteId } from '@/features/exploration/lib/route-id.util';

/** 旧路径兼容 — conditions/style/recommend/issues → 新骨架 */
export function ExploreLegacyRedirect({ to }: { to: string }) {
  const { scenarioId = '' } = useParams<{ scenarioId: string }>();
  return <Navigate to={`/dashboard/explore/${scenarioId}/${to}`} replace />;
}

export function ExploreLegacyIssuesRedirect() {
  const { scenarioId = '', routeId = 'highland-south' } = useParams<{
    scenarioId: string;
    routeId: string;
  }>();
  return (
    <Navigate
      to={`/dashboard/explore/${scenarioId}/routes/${encodeURIComponent(toApiRouteId(routeId))}/check`}
      replace
    />
  );
}
