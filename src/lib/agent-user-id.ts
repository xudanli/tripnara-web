import type { User } from '@/hooks/useAuth';

/** route_and_run 必填 user_id；兼容 localStorage 中仅 session 恢复的场景 */
export function resolveAgentUserId(user: User | null | undefined): string | null {
  if (user?.id?.trim()) return user.id.trim();
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string; userId?: string };
    const id = parsed.id ?? parsed.userId;
    return typeof id === 'string' && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}
