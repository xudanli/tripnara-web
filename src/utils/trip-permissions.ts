/**
 * 行程权限检查工具
 * 
 * 根据用户角色检查是否可以编辑行程相关数据
 */

import type { CollaboratorRole } from '@/types/trip';

/**
 * 检查用户是否可以编辑证据
 * 
 * 根据 API 文档：
 * - OWNER 和 EDITOR 可以修改证据
 * - VIEWER 只能查看，不能修改
 */
export function canEditEvidence(userRole: CollaboratorRole | undefined | null): boolean {
  if (!userRole) {
    // 如果没有角色信息，默认允许编辑（向后兼容）
    // 实际应用中应该从后端获取权限信息
    return true;
  }
  return userRole === 'OWNER' || userRole === 'EDITOR';
}

/**
 * 检查用户是否可以查看证据
 * 
 * 所有角色都可以查看证据
 */
export function canViewEvidence(userRole: CollaboratorRole | undefined | null): boolean {
  return true; // 所有角色都可以查看
}

/**
 * 获取用户角色显示名称
 */
export function getRoleLabel(role: CollaboratorRole | undefined | null): string {
  const labels: Record<CollaboratorRole, string> = {
    OWNER: '所有者',
    EDITOR: '编辑者',
    VIEWER: '查看者',
  };
  return role ? labels[role] : '未知';
}
