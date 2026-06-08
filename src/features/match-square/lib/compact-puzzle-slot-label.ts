/** 剥掉 open 位重复的「虚位以待 / 建议补位 / 🧩」装饰，保留核心角色文案 */
export function peelPuzzleOpenSlotDecorations(label: string): string {
  let text = label.trim().replace(/^虚位以待\s·\s*/, '');
  let changed = true;

  while (changed) {
    changed = false;
    if (/^建议补位\s·\s*/.test(text)) {
      text = text.replace(/^建议补位\s·\s*/, '');
      changed = true;
    }
    if (/^🧩\s*/.test(text)) {
      text = text.replace(/^🧩\s*/, '');
      changed = true;
    }
  }

  return text.trim();
}

/** 拼图 AI 缺位角色文案 — 不可当作真实队员姓名 */
export function isPuzzleDeficitPersonaLabel(label: string | null | undefined): boolean {
  if (!label?.trim()) return false;
  const text = label.trim();
  if (/^建议补位|^虚位以待|^🧩|^旅伴拼图位/.test(text)) return true;
  if (/质感旅者|秩序维护的|高能社牛的|深度共学的/.test(text)) return true;
  return false;
}

/** 已通过队员格：姓名 · 角色（去掉 targetSlot 里的建议补位前缀） */
export function formatFilledPuzzleSlotLabel(displayName: string, roleOrTarget: string): string {
  const role = peelPuzzleOpenSlotDecorations(roleOrTarget);
  if (!role || role === displayName) return displayName;
  return `${displayName} · ${role}`;
}

/** 队员 / 队长真实身份 — 姓名 · 人格标题 · 相处模式（不含拼图缺位 AI 文案） */
export function formatMemberIdentityLabel(parts: {
  displayName: string;
  cardTitle?: string | null;
  interactionModeLabel?: string | null;
  /** 队长格前缀「队长 ·」 */
  asCaptain?: boolean;
}): string {
  const name = parts.displayName.trim() || '旅伴';
  const segments: string[] = [name];

  const cardTitle = parts.cardTitle?.trim();
  if (cardTitle && cardTitle !== name && !segments.includes(cardTitle)) {
    segments.push(cardTitle);
  }

  const mode = parts.interactionModeLabel?.trim();
  if (mode && mode !== name && mode !== cardTitle && !segments.includes(mode)) {
    segments.push(mode);
  }

  const identity = segments.join(' · ');
  return parts.asCaptain && !identity.startsWith('队长') ? `队长 · ${identity}` : identity;
}

function parseFilledLabelParts(label: string): { displayName: string; role: string } {
  const trimmed = label.trim();
  const match = trimmed.match(/^(.+?)\s·\s*(.+)$/);
  if (
    match &&
    !/^建议补位|^虚位以待|^🧩|^旅伴拼图位|^队长/.test(match[1].trim())
  ) {
    return {
      displayName: match[1].trim(),
      role: peelPuzzleOpenSlotDecorations(match[2]),
    };
  }
  return { displayName: peelPuzzleOpenSlotDecorations(trimmed) || trimmed, role: '' };
}

/** 按 slot 类型展示 — filled/captain 优先真实身份，open 位带「建议补位 ·」 */
export function displayPuzzleSlotLabel(
  slot: {
    kind: 'captain' | 'filled' | 'open';
    label: string;
    occupantLabel?: string;
    roleLabel?: string;
    filledBy?: string | null;
  },
  identity?: {
    displayName: string;
    cardTitle?: string | null;
    interactionModeLabel?: string | null;
    asCaptain?: boolean;
  }
): string {
  if (identity) {
    return formatMemberIdentityLabel(identity);
  }

  if (slot.kind === 'captain') {
    if (slot.label.startsWith('队长')) return slot.label;
    const name = slot.occupantLabel ?? slot.label;
    return name.startsWith('队长') ? name : `队长 · ${name}`;
  }

  if (slot.kind === 'filled') {
    const name =
      slot.occupantLabel ?? parseFilledLabelParts(slot.label).displayName;
    const role = slot.roleLabel
      ? peelPuzzleOpenSlotDecorations(slot.roleLabel)
      : slot.filledBy
        ? peelPuzzleOpenSlotDecorations(slot.filledBy)
        : parseFilledLabelParts(slot.label).role;
    return formatFilledPuzzleSlotLabel(name, role);
  }

  return compactPuzzleSlotLabel(slot.label);
}

/** 拼图 slot 展示文案 — open 位只保留一层「建议补位 ·」 */
export function compactPuzzleSlotLabel(label: string): string {
  const original = label.trim();
  if (!original) return original;

  if (original.startsWith('队长')) return original;

  const memberMatch = original.match(/^(.+?)\s·\s*(.+)$/);
  if (
    memberMatch &&
    !/^建议补位|^虚位以待|^🧩|^旅伴拼图位|^队长/.test(memberMatch[1].trim())
  ) {
    return formatFilledPuzzleSlotLabel(memberMatch[1].trim(), memberMatch[2]);
  }

  const core = peelPuzzleOpenSlotDecorations(original);
  if (!core) return original;
  if (core.startsWith('建议补位 ·')) return core;
  return `建议补位 · ${core}`;
}
