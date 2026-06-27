/**
 * RAG 业务错误码 → 用户可读文案
 */
const RAG_USER_MESSAGES: Record<string, string> = {
  rag_requires_decision_context_when_enforcement_on:
    '合规规则需要先完成方案决策上下文。请确认行程约束与方案生成结果后再试。',
  DECISION_CONTEXT_REQUIRED:
    '需要先完成方案决策上下文，才能加载合规规则。',
  NOT_FOUND: '暂未找到相关合规规则。',
  TIMEOUT: '合规规则加载超时，请稍后重试。',
};

export function mapRagUserMessage(code: string | undefined, serverMessage: string): string {
  if (code && RAG_USER_MESSAGES[code]) return RAG_USER_MESSAGES[code];
  if (RAG_USER_MESSAGES[serverMessage]) return RAG_USER_MESSAGES[serverMessage];
  if (!code) return serverMessage || '加载失败，请稍后重试';
  const mapped = RAG_USER_MESSAGES[code];
  if (mapped) return mapped;
  return serverMessage || '加载失败，请稍后重试';
}

export function isRagDecisionContextError(code: string | undefined, message: string): boolean {
  if (code === 'rag_requires_decision_context_when_enforcement_on') return true;
  if (code === 'DECISION_CONTEXT_REQUIRED') return true;
  return message.includes('decision_context');
}
