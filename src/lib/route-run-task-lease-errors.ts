/** lease_status === EXHAUSTED — 停止 poll，引导用户重新 POST async */
export class RouteRunTaskLeaseExhaustedError extends Error {
  readonly terminal = true as const;
  readonly leaseExhausted = true as const;

  constructor(message?: string) {
    super(message?.trim() || '任务多次恢复失败，请重新发起规划');
    this.name = 'RouteRunTaskLeaseExhaustedError';
  }
}
