import type { GatewayDecisionPreviewResult } from '@/lib/unified-gateway-response.util';

const inflightByKey = new Map<string, Promise<GatewayDecisionPreviewResult>>();

export function decisionPreviewRequestKey(
  tripId: string,
  problemId: string,
  optionId: string,
): string {
  return `${tripId}:${problemId}:${optionId}`;
}

/** 同一 trip+problem+option 并发 preview 共享 in-flight Promise */
export function dedupeDecisionPreviewRequest(
  key: string,
  factory: () => Promise<GatewayDecisionPreviewResult>,
): Promise<GatewayDecisionPreviewResult> {
  const existing = inflightByKey.get(key);
  if (existing) return existing;

  const promise = factory().finally(() => {
    if (inflightByKey.get(key) === promise) {
      inflightByKey.delete(key);
    }
  });
  inflightByKey.set(key, promise);
  return promise;
}
