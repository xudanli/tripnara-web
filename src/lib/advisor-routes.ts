/**
 * Advisor Workspace 前端路由（挂载于 /dashboard）
 * @see docs/api/advisor-workspace-frontend-integration.md §2
 */

const BASE = '/dashboard/advisor';

/** @deprecated 兼容旧链，与 advisor 路由等价 */
export const GATE1_LEGACY_BASE = '/dashboard/gate1';

export const advisorRoutes = {
  home: BASE,
  projects: `${BASE}/projects`,
  projectNew: `${BASE}/projects/new`,
  metrics: `${BASE}/metrics`,
  opsQueue: '/dashboard/ops/gate1',
  project: (projectId: string, tab?: string) => {
    const path = `${BASE}/projects/${projectId}`;
    return tab ? `${path}?tab=${tab}` : path;
  },
  projectOutcome: (projectId: string) => `${BASE}/projects/${projectId}/outcome`,
  projectTrustSurface: (projectId: string) => `${BASE}/projects/${projectId}/trust-surface`,
  opsProject: (projectId: string) => `/dashboard/ops/gate1/projects/${projectId}`,
  opsSlo: '/dashboard/ops/gate1/slo',
} as const;

/** 解析 API nextAction.path 或 tab 到前端路由 */
export function resolveAdvisorProjectHref(
  projectId: string,
  options?: { tab?: string; path?: string },
): string {
  const path = options?.path;
  if (path?.startsWith('/')) {
    if (path.includes('/trust-surface')) {
      return advisorRoutes.project(projectId, 'trust-surface');
    }
    if (path.includes('/outcome')) {
      return advisorRoutes.projectOutcome(projectId);
    }
    const webPath = path.replace(/^\/advisor/, BASE);
    return webPath;
  }
  return advisorRoutes.project(projectId, options?.tab);
}

export function projectDetailHref(projectId: string, tab?: string): string {
  return advisorRoutes.project(projectId, tab);
}
