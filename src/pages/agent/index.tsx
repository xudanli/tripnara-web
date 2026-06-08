/**
 * /dashboard/agent 已并入规划工作台右侧全局智能体，本路由仅做重定向。
 */
import { Navigate, useSearchParams } from 'react-router-dom';
import { buildPlanStudioUrlFromAgentSearchParams } from '@/lib/agent-route-query';

export default function AgentPage() {
  const [searchParams] = useSearchParams();
  const to = buildPlanStudioUrlFromAgentSearchParams(searchParams);
  return <Navigate to={to} replace />;
}
