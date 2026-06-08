/**
 * 可选：将必须项 message 拆成「规则正文」+「行程涉及」灰色副文（中英文括号略有差异）。
 * 无法匹配时返回整段 message 作为 lead。
 */
export function splitMustTripInvolvesMessage(message: string): {
  lead: string;
  involves?: string;
} {
  const m = message.trim();
  if (!m) return { lead: '' };

  const zh = m.match(/^([\s\S]*?)（\s*本行程涉及[：:]\s*([\s\S]*?)）\s*$/);
  if (zh?.[1] != null) {
    return { lead: zh[1].trim(), involves: zh[2]?.trim() };
  }

  const en = m.match(/^([\s\S]*?)\(\s*(?:Trip-related places|Places on this trip|Trip involves)[^:]*:\s*([\s\S]*?)\)\s*$/i);
  if (en?.[1] != null) {
    return { lead: en[1].trim(), involves: en[2]?.trim() };
  }

  return { lead: m };
}
