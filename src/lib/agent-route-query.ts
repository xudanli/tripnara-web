import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AgentPageMode } from '@/components/agent/AgentChat';

/** 从 URL 解析 Agent / 规划工作台智能体共用的 query（原 /dashboard/agent 页） */
export function parseAgentRouteSearchParams(params: URLSearchParams) {
  const pageMode: AgentPageMode =
    params.get('mode')?.toLowerCase() === 'debug' ? 'debug' : 'user';

  const routeContextType =
    params.get('contextType')?.trim() || params.get('context_type')?.trim() || undefined;

  let enableLiveTools: boolean | string[] | undefined;
  const csv = params.get('liveTools')?.trim();
  if (csv) {
    if (csv === '1' || csv === 'true' || csv === 'yes') {
      enableLiveTools = true;
    } else {
      const parts = csv.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (parts.length) enableLiveTools = parts;
    }
  } else {
    const v = params.get('enableLiveTools')?.trim();
    if (v === '1' || v === 'true' || v === 'yes') enableLiveTools = true;
  }

  let intentFlags: Record<string, boolean | string | number> | string[] | undefined;
  const rawFlags = params.get('intentFlags')?.trim();
  if (rawFlags) {
    try {
      const parsed = JSON.parse(rawFlags) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        intentFlags = parsed as Record<string, boolean | string | number>;
      } else if (Array.isArray(parsed)) {
        intentFlags = parsed as string[];
      }
    } catch {
      intentFlags = undefined;
    }
  }

  const shouldOpenAgentPanel = params.get('agentOpen') === '1';

  return {
    pageMode,
    routeContextType,
    enableLiveTools,
    intentFlags,
    shouldOpenAgentPanel,
  };
}

export function useAgentRouteQueryOptions() {
  const [searchParams] = useSearchParams();
  return useMemo(() => parseAgentRouteSearchParams(searchParams), [searchParams]);
}

/** /dashboard/agent → /dashboard/plan-studio，保留 tripId 与调试/传感器参数 */
export function buildPlanStudioUrlFromAgentSearchParams(params: URLSearchParams): string {
  const next = new URLSearchParams();
  const tripId = params.get('tripId');
  if (tripId) next.set('tripId', tripId);

  for (const key of ['mode', 'liveTools', 'enableLiveTools', 'intentFlags', 'tab'] as const) {
    const v = params.get(key);
    if (v) next.set(key, v);
  }
  const ctx = params.get('contextType') ?? params.get('context_type');
  if (ctx) next.set('contextType', ctx);

  next.set('agentOpen', '1');
  const qs = next.toString();
  return `/dashboard/plan-studio${qs ? `?${qs}` : ''}`;
}
