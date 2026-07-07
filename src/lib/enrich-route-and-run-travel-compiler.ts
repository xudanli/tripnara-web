import type { RouteAndRunRequest } from '@/api/agent';
import { shouldEnableTravelCompilerOnRouteRun } from '@/features/agent/ctre/constants';

/**
 * 为 route_and_run 注入 `options.enable_travel_compiler`（未显式传 false 时）。
 * 前端开关：`VITE_TRAVEL_COMPILER_ENABLED=true`
 */
export function enrichRouteAndRunRequestWithTravelCompiler(
  request: RouteAndRunRequest,
): RouteAndRunRequest {
  const explicit = request.options?.enable_travel_compiler;
  if (explicit === false) return request;
  if (explicit === true) return request;

  if (!shouldEnableTravelCompilerOnRouteRun()) return request;

  return {
    ...request,
    options: {
      ...request.options,
      enable_travel_compiler: true,
    },
  };
}
