/** 将引擎 action id 转为用户可读摘要 */
export function humanizeTravelActivitySummary(summary: string): string {
  const trimmed = summary.trim();
  if (!trimmed) return 'AI 已更新行程';

  // 去掉括号内的 technical id
  const withoutParen = trimmed.replace(/\s*[(\[][\w:-]+[\])]\s*/g, ' ').trim();

  const idLike = /^[\w-]+$/;
  if (idLike.test(withoutParen)) {
    return withoutParen
      .replace(/-/g, ' ')
      .replace(/\brepair\b/i, '修复')
      .replace(/\bdelay\b/i, '调整时间')
      .replace(/\bstart\b/i, '出发');
  }

  return withoutParen || trimmed;
}

export function resolveSuggestedConfirmCount(input: {
  issueCount?: number;
  pendingVerificationCount: number;
  executabilityHeadline?: string;
}): number {
  if (input.pendingVerificationCount > 0) return input.pendingVerificationCount;
  if (typeof input.issueCount === 'number' && input.issueCount > 0) return input.issueCount;
  const match = input.executabilityHeadline?.match(/(\d+)\s*个/);
  if (match) return Number.parseInt(match[1], 10);
  return 0;
}
