/** 比较两段 UI 文案是否实质重复（去空白、大小写不敏感） */
export function normalizeComparableText(text: string): string {
  return text.trim().replace(/\s+/g, '').toLowerCase();
}

export function textsSubstantiallyOverlap(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeComparableText(a ?? '');
  const nb = normalizeComparableText(b ?? '');
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length > nb.length ? na : nb;
  if (shorter.length < 8) return false;
  return longer.includes(shorter);
}

/** 过滤与参照文案重复的条目 */
export function dedupeTextsByOverlap(
  items: string[],
  references: Array<string | null | undefined> = [],
): string[] {
  const seen: string[] = [];
  return items.filter((item) => {
    const trimmed = item.trim();
    if (!trimmed) return false;
    if (references.some((ref) => textsSubstantiallyOverlap(trimmed, ref))) return false;
    if (seen.some((prev) => textsSubstantiallyOverlap(trimmed, prev))) return false;
    seen.push(trimmed);
    return true;
  });
}

/** 从 assessment 长文中提取可执行的干预建议（单行） */
export function extractCausalInterventionHint(assessment: string): string | null {
  const trimmed = assessment.trim();
  if (!trimmed) return null;
  const patterns = [
    /最小干预[^。；!?！？]{2,72}[。；]?/u,
    /建议将[^。；!?！？]{2,72}[。；]?/u,
    /建议[^。；!?！？]{2,48}(?:提前|延后|改线|改期|调整)[^。；!?！？]{0,36}[。；]?/u,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[0]) return match[0].replace(/[。；]+$/, '').trim();
  }
  return null;
}

/**
 * PM 规则：chain 已结构化展示因果因子时，assessment 长文视为重复叙述。
 * ≥2 个节点时恒为 true；单节点时检查 assessment 是否已包含该节点事实。
 */
export function assessmentRedundantWithChainNodes(
  assessment: string,
  nodes: Array<{ description?: string; title?: string }>,
): boolean {
  if (!assessment.trim() || nodes.length === 0) return false;
  if (nodes.length >= 2) return true;

  const desc = (nodes[0].description || nodes[0].title || '').trim();
  if (!desc) return true;
  return textsSubstantiallyOverlap(assessment, desc);
}
