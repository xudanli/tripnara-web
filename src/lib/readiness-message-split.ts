/**
 * 将必须项 / 风险 message 拆成「规则正文」+「行程涉及」副文（中英文括号略有差异）。
 * 无法匹配时返回整段 message 作为 lead。
 */
export function splitMustTripInvolvesMessage(message: string): {
  lead: string;
  involves?: string;
} {
  const m = message.trim();
  if (!m) return { lead: '' };

  const tripContextMarkers = [
    '本行程涉及',
    '本行程相关地点',
    'This itinerary involves',
    'Places on this itinerary',
    'Trip-related places',
    'Trip involves',
  ];

  for (const marker of tripContextMarkers) {
    const markerIdx = m.indexOf(marker);
    if (markerIdx === -1) continue;

    const openParenIdx = Math.max(m.lastIndexOf('（', markerIdx), m.lastIndexOf('(', markerIdx));
    if (openParenIdx === -1) continue;

    const closeParenIdx = Math.max(m.lastIndexOf('）'), m.lastIndexOf(')'));
    if (closeParenIdx <= openParenIdx) continue;

    const lead = m.slice(0, openParenIdx).trim();
    let involves = m.slice(openParenIdx + 1, closeParenIdx).trim();
    involves = involves
      .replace(/^本行程涉及[：:]\s*/, '')
      .replace(/^本行程相关地点[：:]\s*/, '')
      .replace(/^(?:This itinerary involves|Places on this itinerary|Trip-related places|Trip involves)[^:]*:\s*/i, '')
      .trim();

    if (lead) {
      return { lead, involves: involves || undefined };
    }
    if (involves) {
      return { lead: '', involves };
    }
  }

  return { lead: m };
}

/** 正文下方已有 affectedPois 时，去掉括号内的 POI 列表 */
export function stripItineraryPlaceSuffix(text: string): string {
  if (!text?.trim()) return '';
  return splitMustTripInvolvesMessage(text).lead;
}

export function isItineraryPlaceOnlyMessage(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  const { lead, involves } = splitMustTripInvolvesMessage(t);
  return !lead && !!involves;
}

/** 行程地点列表过长时截断，便于折叠展示 */
export function truncateTripInvolvesList(
  involves: string,
  maxPlaces = 3,
  isZh = true,
): { preview: string; hasMore: boolean; full: string } {
  const sep = involves.includes('；') ? '；' : '; ';
  const parts = involves
    .split(sep)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= maxPlaces) {
    return { preview: involves, hasMore: false, full: involves };
  }
  const preview =
    parts.slice(0, maxPlaces).join(sep) +
    (isZh ? ` 等 ${parts.length} 处` : ` (+${parts.length - maxPlaces} more)`);
  return { preview, hasMore: true, full: involves };
}

/** 解析 checklist 子任务标题（兼容 string / 多语言对象） */
export function resolveChecklistTaskText(
  task: string | { title?: string | { zh?: string; en?: string } },
  isZh = true,
): string {
  if (typeof task === 'string') return task.trim();
  const title = task.title;
  if (typeof title === 'string') return title.trim();
  if (title && typeof title === 'object') {
    return ((isZh ? title.zh : title.en) || title.zh || title.en || '').trim();
  }
  return '';
}

/** 归一化后比较两段文案是否实质重复 */
export function normalizeChecklistText(text: string): string {
  return text.replace(/\s+/g, '').replace(/[（）()]/g, '').toLowerCase();
}

export function isNearDuplicateChecklistText(a: string, b: string): boolean {
  const na = normalizeChecklistText(a);
  const nb = normalizeChecklistText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length > nb.length ? na : nb;
  return shorter.length >= 12 && longer.includes(shorter);
}

export function dedupeChecklistTasks<T extends string | { title?: string | { zh?: string; en?: string } }>(
  lead: string,
  tasks: T[],
  isZh = true,
): T[] {
  const kept: T[] = [];
  for (const task of tasks) {
    const text = resolveChecklistTaskText(task, isZh);
    if (!normalizeChecklistText(text)) continue;
    if (lead && isNearDuplicateChecklistText(text, lead)) continue;
    if (kept.some((k) => isNearDuplicateChecklistText(text, resolveChecklistTaskText(k, isZh)))) {
      continue;
    }
    kept.push(task);
  }
  return kept;
}
