import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Eye, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EvidenceItem, EvidenceStatus } from '@/types/readiness';
import { tripsApi } from '@/api/trips';
import { toast } from 'sonner';
import { canEditEvidence } from '@/utils/trip-permissions';
import type { CollaboratorRole } from '@/types/trip';

interface EvidenceBatchActionsProps {
  evidenceList: EvidenceItem[];
  tripId: string;
  userRole?: CollaboratorRole | null; // 🎯 用户角色（用于权限检查）
  onUpdate?: () => void;
}

// 🎯 状态配置
const statusConfig: Record<EvidenceStatus, { label: string; icon: typeof CheckCircle2 }> = {
  new: {
    label: '新证据',
    icon: Clock,
  },
  acknowledged: {
    label: '已确认',
    icon: Eye,
  },
  resolved: {
    label: '已解决',
    icon: CheckCircle2,
  },
  dismissed: {
    label: '已忽略',
    icon: XCircle,
  },
};

export default function EvidenceBatchActions({
  evidenceList,
  tripId,
  userRole = 'OWNER', // 🎯 默认 OWNER（向后兼容）
  onUpdate,
}: EvidenceBatchActionsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [batchStatus, setBatchStatus] = useState<EvidenceStatus | ''>('');

  // 🎯 权限检查
  const canEdit = canEditEvidence(userRole);

  // 🎯 如果没有编辑权限，不显示批量操作组件
  if (!canEdit) {
    return null;
  }

  // 🎯 全选/取消全选
  const handleSelectAll = () => {
    if (selectedIds.size === evidenceList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(evidenceList.map(e => e.id)));
    }
  };

  // 🎯 切换单个选择
  const handleToggleSelect = (evidenceId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(evidenceId)) {
      newSelected.delete(evidenceId);
    } else {
      newSelected.add(evidenceId);
    }
    setSelectedIds(newSelected);
  };

  // 🎯 批量更新状态
  const handleBatchUpdate = async () => {
    if (!batchStatus || selectedIds.size === 0) {
      toast.error('请选择要更新的证据项和目标状态');
      return;
    }

    if (selectedIds.size > 100) {
      toast.error('批量更新最多支持100个证据项');
      return;
    }

    setIsUpdating(true);
    try {
      const updates = Array.from(selectedIds).map(evidenceId => ({
        evidenceId,
        status: batchStatus as EvidenceStatus,
      }));

      const result = await tripsApi.batchUpdateEvidence(tripId, updates);

      if (result.failed > 0) {
        toast.warning(`成功更新 ${result.updated} 个，失败 ${result.failed} 个`);
        if (result.errors) {
          result.errors.forEach(err => {
            console.error(`证据 ${err.evidenceId} 更新失败: ${err.error}`);
          });
        }
      } else {
        toast.success(`成功更新 ${result.updated} 个证据项`);
      }

      // 清空选择
      setSelectedIds(new Set());
      setBatchStatus('');
      onUpdate?.();
    } catch (error: any) {
      console.error('Failed to batch update evidence:', error);
      toast.error(error?.message || '批量更新失败');
    } finally {
      setIsUpdating(false);
    }
  };

  if (evidenceList.length === 0) {
    return null;
  }

  const selectedCount = selectedIds.size;
  const StatusIcon = batchStatus ? statusConfig[batchStatus as EvidenceStatus]?.icon : null;

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      {/* 全选和统计 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === evidenceList.length && evidenceList.length > 0}
              onCheckedChange={handleSelectAll}
              disabled={isUpdating}
            />
            <span className="text-sm font-medium">
              全选 ({selectedCount}/{evidenceList.length})
            </span>
          </div>
          {selectedCount > 0 && (
            <Badge variant="outline" className="text-xs">
              已选择 {selectedCount} 项
            </Badge>
          )}
        </div>

        {/* 批量操作 */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <Select
              value={batchStatus}
              onValueChange={(value) => setBatchStatus(value)}
              disabled={isUpdating}
            >
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                {(['acknowledged', 'resolved', 'dismissed'] as EvidenceStatus[]).map((status) => {
                  const config = statusConfig[status];
                  const Icon = config.icon;
                  return (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-3 w-3" />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              onClick={handleBatchUpdate}
              disabled={!batchStatus || isUpdating}
              className="h-8"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  更新中...
                </>
              ) : (
                <>
                  {StatusIcon && <StatusIcon className="h-3 w-3 mr-2" />}
                  批量更新
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedIds(new Set());
                setBatchStatus('');
              }}
              disabled={isUpdating}
              className="h-8"
            >
              取消
            </Button>
          </div>
        )}
      </div>

      {/* 选择提示 */}
      {selectedCount > 0 && !batchStatus && (
        <div className="text-xs text-muted-foreground">
          请选择要更新的状态
        </div>
      )}
    </div>
  );
}
