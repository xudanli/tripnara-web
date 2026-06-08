/**
 * Agent API 最后一次携带的 X-Request-Id（用于排障 toast / 复制上下文）。
 * 并发请求会覆盖为「最近一次 Agent 请求」；精确关联请使用错误对象上的 requestId。
 */
let lastAgentRequestId: string | undefined;

export function setLastAgentRequestId(id: string | undefined): void {
  lastAgentRequestId = id?.trim() || undefined;
}

export function getLastAgentRequestId(): string | undefined {
  return lastAgentRequestId;
}
