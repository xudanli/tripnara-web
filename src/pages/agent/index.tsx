/**
 * /dashboard/agent 已并入 Nara 对话页，本路由仅做重定向。
 */
import { Navigate, useSearchParams } from 'react-router-dom';
import { buildPlanStudioUrlFromAgentSearchParams } from '@/lib/agent-route-query';

export default function AgentPage() {
  const [searchParams] = useSearchParams();
  const to = buildPlanStudioUrlFromAgentSearchParams(searchParams);
  return <Navigate to={to} replace />;
}
