import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { RouteAndRunResponse } from '@/api/agent';
import { needsApproval, extractApprovalId } from '@/utils/approval';
import ApprovalDialog from '@/components/trips/ApprovalDialog';
import type { ApprovalRequest } from '@/types/approval';

interface UseApprovalReturn {
  /**
   * 检查 Agent 响应是否需要审批，如果需要则显示审批对话框
   * @param response Agent API 响应
   * @returns 如果需要审批返回 true，否则返回 false
   */
  checkAndShowApproval: (response: RouteAndRunResponse) => boolean;
  
  /**
   * 审批对话框组件（需要在组件中渲染）
   */
  ApprovalDialogComponent: JSX.Element | null;
  
  /**
   * 当前待审批的审批 ID
   */
  pendingApprovalId: string | null;
  
  /**
   * 手动设置审批 ID（用于外部触发）
   */
  setPendingApprovalId: (id: string | null) => void;
}

/**
 * 审批处理 Hook
 * 用于在调用 Agent API 后检查是否需要审批，并显示审批对话框
 * 
 * @param onApprovalComplete 审批完成后的回调（可选）
 * @returns 审批处理相关的状态和方法
 */
export function useApproval(
  onApprovalComplete?: (approved: boolean, approval: ApprovalRequest) => void | Promise<void>
): UseApprovalReturn {
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);

  const checkAndShowApproval = useCallback((response: RouteAndRunResponse): boolean => {
    if (needsApproval(response)) {
      const approvalId = extractApprovalId(response);
      if (!approvalId) {
        console.error('审批 ID 不存在，但需要审批');
        toast.error('获取审批信息失败');
        return false;
      }

      setPendingApprovalId(approvalId);
      setApprovalDialogOpen(true);
      toast.info('需要您的审批才能继续执行操作');
      return true;
    }
    return false;
  }, []);

  const handleDecision = useCallback(async (approved: boolean, approval: ApprovalRequest) => {
    if (approved) {
      toast.success('审批已批准，Agent 正在继续执行...');
    } else {
      toast.info('审批已拒绝，Agent 将调整策略');
    }

    // 调用回调
    if (onApprovalComplete) {
      await onApprovalComplete(approved, approval);
    }

    // 关闭对话框
    setApprovalDialogOpen(false);
    setPendingApprovalId(null);
  }, [onApprovalComplete]);

  const ApprovalDialogComponent = pendingApprovalId ? (
    <ApprovalDialog
      approvalId={pendingApprovalId}
      open={approvalDialogOpen}
      onOpenChange={(open) => {
        setApprovalDialogOpen(open);
        if (!open) {
          setPendingApprovalId(null);
        }
      }}
      onDecision={handleDecision}
    />
  ) : null;

  return {
    checkAndShowApproval,
    ApprovalDialogComponent,
    pendingApprovalId,
    setPendingApprovalId,
  };
}
