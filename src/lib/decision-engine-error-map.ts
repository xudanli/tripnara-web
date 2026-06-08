/**
 * Decision Engine（/decision-engine/v1）业务错误码 → 用户可读文案
 * 未命中时回退服务端 message。
 */
const DECISION_ENGINE_USER_MESSAGES: Record<string, string> = {
  CONSTRAINT_VIOLATION: '当前方案与约束冲突，请调整行程或放宽约束后再试。',
  CONSTRAINT_CONFLICT: '约束之间存在冲突，无法同时满足，请修改约束条件。',
  SAFETY_CHECK_FAILED: '安全校验未通过，建议更换路线或日期后再生成方案。',
  SAFETY_VIOLATION: '存在安全风险，请根据提示修改计划。',
  VALIDATION_ERROR: '提交数据不完整或格式不正确，请检查后重试。',
  PLAN_NOT_FEASIBLE: '在当前条件下无法生成可行方案，请调整偏好或约束。',
  REPAIR_FAILED: '自动修复计划失败，请尝试缩小变更范围或手动调整。',
  INTERNAL_ERROR: '决策服务暂时不可用，请稍后重试。',
  TIMEOUT: '决策计算超时，请稍后重试或简化请求。',
};

export function mapDecisionEngineUserMessage(code: string | undefined, serverMessage: string): string {
  if (!code) return serverMessage;
  const mapped = DECISION_ENGINE_USER_MESSAGES[code];
  if (mapped) return mapped;
  return serverMessage || '请求失败';
}
