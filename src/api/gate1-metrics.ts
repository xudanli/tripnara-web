/**
 * Gate 1 · 实验看板 Metrics
 * @see docs/api/gate1-frontend-integration.md §6
 */

import { gate1Get } from './gate1-common';
import type { Gate1Cohort, Gate1MetricsExportResponse, Gate1MetricsResponse } from '@/types/gate1';

export const gate1MetricsApi = {
  /** GET /gate1/metrics?cohort= — cohort 可选，不传默认 PLANNING 分母 */
  getMetrics: (cohort?: Gate1Cohort): Promise<Gate1MetricsResponse> =>
    gate1Get<Gate1MetricsResponse>('/gate1/metrics', cohort ? { cohort } : undefined),

  /** GET /gate1/metrics/export?cohort= — 去标识化 Gate 决策数据包 */
  exportMetrics: (cohort?: Gate1Cohort): Promise<Gate1MetricsExportResponse> =>
    gate1Get<Gate1MetricsExportResponse>(
      '/gate1/metrics/export',
      cohort ? { cohort } : undefined,
    ),
};
