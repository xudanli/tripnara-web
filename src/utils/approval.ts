import type { ApprovalRequest, RiskLevel } from '@/types/approval';
import { ApprovalStatus } from '@/types/approval';

/**
 * 检查审批请求是否已过期
 */
export function isApprovalExpired(approval: ApprovalRequest): boolean {
  if (!approval.expiresAt) return false;
  return new Date(approval.expiresAt) < new Date();
}

/**
 * 获取风险等级的中文名称
 */
export function getRiskLevelLabel(riskLevel: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
    critical: '极高风险',
  };
  return labels[riskLevel];
}

/**
 * 获取风险等级的颜色类名（Tailwind CSS）
 */
export function getRiskLevelColorClass(riskLevel: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[riskLevel];
}

/**
 * 获取审批状态的中文名称
 */
export function getApprovalStatusLabel(status: ApprovalStatus): string {
  const labels: Record<ApprovalStatus, string> = {
    [ApprovalStatus.PENDING]: '待审批',
    [ApprovalStatus.APPROVED]: '已批准',
    [ApprovalStatus.REJECTED]: '已拒绝',
    [ApprovalStatus.EXPIRED]: '已过期',
    [ApprovalStatus.CANCELLED]: '已取消',
  };
  return labels[status];
}

/**
 * 格式化审批请求的过期时间显示
 */
export function formatExpiresAt(expiresAt: string | null): string {
  if (!expiresAt) return '无过期时间';
  const date = new Date(expiresAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 1000 / 60);
  
  if (diffMins < 0) return '已过期';
  if (diffMins < 60) return `${diffMins} 分钟后过期`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} 小时后过期`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} 天后过期`;
}

/**
 * 检查审批请求是否可以被处理（未过期且状态为 PENDING）
 */
export function canHandleApproval(approval: ApprovalRequest): boolean {
  if (approval.status !== ApprovalStatus.PENDING) return false;
  if (isApprovalExpired(approval)) return false;
  return true;
}

/**
 * 获取审批请求的显示优先级（用于排序）
 * 优先级：critical > high > medium > low
 */
export function getApprovalPriority(approval: ApprovalRequest): number {
  const priorities: Record<RiskLevel, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  return priorities[approval.riskLevel];
}

/**
 * 排序审批请求列表（按优先级和创建时间）
 */
export function sortApprovals(approvals: ApprovalRequest[]): ApprovalRequest[] {
  return [...approvals].sort((a, b) => {
    // 首先按优先级排序（critical > high > medium > low）
    const priorityDiff = getApprovalPriority(b) - getApprovalPriority(a);
    if (priorityDiff !== 0) return priorityDiff;
    
    // 如果优先级相同，按创建时间排序（最新的在前）
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * 本地存储相关工具函数
 */
const APPROVAL_STORAGE_KEY = 'pending_approvals';

/**
 * 保存待审批请求到本地存储
 */
export function savePendingApprovalToStorage(approval: ApprovalRequest): void {
  try {
    const pendings = getPendingApprovalsFromStorage();
    const existingIndex = pendings.findIndex(a => a.id === approval.id);
    
    if (existingIndex >= 0) {
      pendings[existingIndex] = approval;
    } else {
      pendings.push(approval);
    }
    
    localStorage.setItem(APPROVAL_STORAGE_KEY, JSON.stringify(pendings));
  } catch (error) {
    console.error('Failed to save approval to storage:', error);
  }
}

/**
 * 从本地存储获取待审批请求列表
 */
export function getPendingApprovalsFromStorage(): ApprovalRequest[] {
  try {
    const stored = localStorage.getItem(APPROVAL_STORAGE_KEY);
    if (!stored) return [];
    
    const approvals = JSON.parse(stored) as ApprovalRequest[];
    // 过滤掉已过期的请求
    return approvals.filter(a => {
      if (a.status !== ApprovalStatus.PENDING) return false;
      if (isApprovalExpired(a)) return false;
      return true;
    });
  } catch (error) {
    console.error('Failed to get approvals from storage:', error);
    return [];
  }
}

/**
 * 从本地存储移除审批请求
 */
export function removePendingApprovalFromStorage(approvalId: string): void {
  try {
    const pendings = getPendingApprovalsFromStorage().filter(a => a.id !== approvalId);
    localStorage.setItem(APPROVAL_STORAGE_KEY, JSON.stringify(pendings));
  } catch (error) {
    console.error('Failed to remove approval from storage:', error);
  }
}

/**
 * 清空本地存储的所有审批请求
 */
export function clearPendingApprovalsFromStorage(): void {
  try {
    localStorage.removeItem(APPROVAL_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear approvals from storage:', error);
  }
}

/**
 * 检查 Agent 响应是否需要审批
 * 根据文档，当 status === 'NEED_CONFIRMATION' 且 payload.suspensionInfo 存在时，需要审批
 */
export function needsApproval(response: {
  result: {
    status: string;
    payload?: {
      suspensionInfo?: {
        approvalId: string;
        skillName: string;
        summary: string;
        payload: any;
      };
      [key: string]: any;
    };
  };
}): boolean {
  return (
    response.result.status === 'NEED_CONFIRMATION' &&
    !!response.result.payload?.suspensionInfo
  );
}

/**
 * 从 Agent 响应中提取审批 ID
 */
export function extractApprovalId(response: {
  result: {
    status: string;
    payload?: {
      suspensionInfo?: {
        approvalId: string;
        skillName: string;
        summary: string;
        payload: any;
      };
      [key: string]: any;
    };
  };
}): string | null {
  if (needsApproval(response)) {
    return response.result.payload?.suspensionInfo?.approvalId || null;
  }
  return null;
}
