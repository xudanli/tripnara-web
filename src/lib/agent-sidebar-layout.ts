/** 规划工作台 / 执行页右侧智能体栏宽度（可拖拽，px） */

export const AGENT_SIDEBAR_WIDTH = {
  MIN: 300,
  MAX: 800,
  DEFAULT: 440,
  COLLAPSED: 56,
} as const;

const STORAGE_KEY = 'agent-sidebar-width';

export function clampAgentSidebarWidth(px: number): number {
  return Math.min(
    AGENT_SIDEBAR_WIDTH.MAX,
    Math.max(AGENT_SIDEBAR_WIDTH.MIN, Math.round(px))
  );
}

export function readAgentSidebarWidth(): number {
  if (typeof window === 'undefined') return AGENT_SIDEBAR_WIDTH.DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return AGENT_SIDEBAR_WIDTH.DEFAULT;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return AGENT_SIDEBAR_WIDTH.DEFAULT;
    return clampAgentSidebarWidth(n);
  } catch {
    return AGENT_SIDEBAR_WIDTH.DEFAULT;
  }
}

export function writeAgentSidebarWidth(px: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, String(clampAgentSidebarWidth(px)));
  } catch {
    /* ignore quota */
  }
}
