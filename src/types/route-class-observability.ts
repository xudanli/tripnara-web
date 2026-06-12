/** tripnara.route_class_fork@v1 — 路由类分叉决策观测 */
export type RouteClassForkSchemaId = 'tripnara.route_class_fork@v1';

/** tripnara.route_class_eval@v1 — 路由类漂移 / 评估观测 */
export type RouteClassEvalSchemaId = 'tripnara.route_class_eval@v1';

/** observability.route_class_fork_v1（或 trace 镜像） */
export interface RouteClassForkV1 {
  schemaId?: RouteClassForkSchemaId | string;
  schema_id?: string;
  schema?: string;
  version?: number;
  /** 最终选用的 route class */
  chosen_class?: string;
  /** 自何 class 分叉 */
  fork_from?: string;
  /** 候选 class 列表 */
  candidates?: string[];
  reason?: string;
  [key: string]: unknown;
}

/** observability.route_class_eval_v1（或 trace 镜像） */
export interface RouteClassEvalV1 {
  schemaId?: RouteClassEvalSchemaId | string;
  schema_id?: string;
  schema?: string;
  version?: number;
  /** 是否检测到 route class 漂移 */
  drift_detected?: boolean;
  expected_class?: string;
  actual_class?: string;
  score?: number;
  [key: string]: unknown;
}

export function isRouteClassForkV1(v: unknown): v is RouteClassForkV1 {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

export function isRouteClassEvalV1(v: unknown): v is RouteClassEvalV1 {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}
