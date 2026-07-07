import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, ExternalLink, Clock, CheckCircle2, XCircle, Eye, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { EvidenceItem, EvidenceStatus } from '@/types/readiness';
import { tripsApi } from '@/api/trips';
import { toast } from 'sonner';
import { canEditEvidence } from '@/utils/trip-permissions';
import type { CollaboratorRole } from '@/types/trip';

type TripsApiWithEvidence = typeof tripsApi & {
  updateEvidence: (
    tripId: string,
    evidenceId: string,
    data: { status?: EvidenceStatus; userNote?: string }
  ) => Promise<{ evidenceId: string; status: string; updatedAt: string; userNote?: string }>;
};

const tripsApiWithEvidence = tripsApi as TripsApiWithEvidence;

interface EvidenceListItemProps {
  evidence: EvidenceItem;
  tripId: string;
  userRole?: CollaboratorRole | null; // 🎯 用户角色（用于权限检查）
  onRefresh?: (evidenceId: string) => void;
  onOpen?: (evidenceId: string) => void;
  onStatusChange?: (evidenceId: string, status: EvidenceStatus, userNote?: string) => void;
}

// 🎯 状态转换规则验证
function canTransitionTo(currentStatus: EvidenceStatus | undefined, targetStatus: EvidenceStatus): boolean {
  if (!currentStatus || currentStatus === 'new') {
    return ['acknowledged', 'resolved', 'dismissed'].includes(targetStatus);
  }
  if (currentStatus === 'acknowledged') {
    return ['resolved', 'dismissed'].includes(targetStatus);
  }
  if (currentStatus === 'resolved') {
    return false; // 已解决不能回退
  }
  if (currentStatus === 'dismissed') {
    return targetStatus === 'acknowledged'; // 忽略的可以重新关注
  }
  return false;
}

// 🎯 状态配置（符合 TripNARA 克制原则）
const statusConfig: Record<EvidenceStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  new: {
    label: '新证据',
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-border',
  },
  acknowledged: {
    label: '已确认',
    icon: Eye,
    className: 'bg-muted text-warning border-border',
  },
  resolved: {
    label: '已解决',
    icon: CheckCircle2,
    className: 'bg-muted text-success border-border',
  },
  dismissed: {
    label: '已忽略',
    icon: XCircle,
    className: 'bg-gray-50 text-gray-700 border-gray-200',
  },
};

export default function EvidenceListItem({
  evidence,
  tripId,
  userRole = 'OWNER', // 🎯 默认 OWNER（向后兼容）
  onRefresh,
  onOpen,
  onStatusChange,
}: EvidenceListItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [userNote, setUserNote] = useState(evidence.userNote || '');
  const [currentStatus, setCurrentStatus] = useState<EvidenceStatus>(evidence.status || 'new');

  // 🎯 权限检查
  const canEdit = canEditEvidence(userRole);

  // 🎨 统一颜色 Token（符合 TripNARA 克制原则）
  const confidenceConfig = {
    high: {
      label: 'High',
      className: 'bg-muted text-success border-border',
    },
    medium: {
      label: 'Medium',
      className: 'bg-muted text-warning border-border',
    },
    low: {
      label: 'Low',
      className: 'bg-muted text-error border-border',
    },
  };

  const categoryLabels = {
    road: 'Road',
    weather: 'Weather',
    poi: 'POI',
    ticket: 'Ticket',
    lodging: 'Lodging',
  };

  // 🎯 处理 confidence 字段（可能是字符串或对象）
  const confidenceLevel = typeof evidence.confidence === 'string' 
    ? evidence.confidence 
    : (evidence.confidence as any)?.level?.toLowerCase() || 'medium';
  const confidenceInfo = confidenceConfig[confidenceLevel as keyof typeof confidenceConfig] || confidenceConfig.medium;
  const { label, className } = confidenceInfo;
  const statusInfo = statusConfig[currentStatus];

  // 🎯 处理状态更新
  const handleStatusChange = async (newStatus: EvidenceStatus) => {
    // 验证状态转换
    if (!canTransitionTo(currentStatus, newStatus)) {
      toast.error('不允许的状态转换');
      return;
    }

    setIsUpdating(true);
    try {
      await tripsApiWithEvidence.updateEvidence(tripId, evidence.id, {
        status: newStatus,
        userNote: userNote || undefined,
      });

      setCurrentStatus(newStatus);
      toast.success('状态已更新');
      onStatusChange?.(evidence.id, newStatus, userNote || undefined);
    } catch (error: any) {
      console.error('Failed to update evidence status:', error);
      toast.error(error?.message || '更新状态失败');
    } finally {
      setIsUpdating(false);
    }
  };

  // 🎯 处理备注更新
  const handleNoteSave = async () => {
    setIsUpdating(true);
    try {
      await tripsApiWithEvidence.updateEvidence(tripId, evidence.id, {
        userNote: userNote || undefined,
      });

      toast.success('备注已保存');
      setShowNoteInput(false);
      onStatusChange?.(evidence.id, currentStatus, userNote || undefined);
    } catch (error: any) {
      console.error('Failed to update evidence note:', error);
      toast.error(error?.message || '保存备注失败');
    } finally {
      setIsUpdating(false);
    }
  };

  // 🎯 获取可用的状态选项
  const getAvailableStatuses = (): EvidenceStatus[] => {
    const allStatuses: EvidenceStatus[] = ['new', 'acknowledged', 'resolved', 'dismissed'];
    return allStatuses.filter(status => 
      status === currentStatus || canTransitionTo(currentStatus, status)
    );
  };

  return (
    <div className="flex items-start justify-between gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{categoryLabels[evidence.category]}</span>
          <Badge variant="outline" className={cn('text-xs', className)}>
            {label}
          </Badge>
          {/* 🎯 状态 Badge */}
          <Badge variant="outline" className={cn('text-xs', statusInfo.className)}>
            <statusInfo.icon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
        {/* 🆕 证据标题和描述（用于区分不同的证据项） */}
        {evidence.title && (
          <div className="text-sm font-medium text-foreground">
            {evidence.title}
          </div>
        )}
        {evidence.description && (
          <div className="text-xs text-muted-foreground">
            {evidence.description}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-3 w-3" />
            <span>{evidence.source}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>{format(new Date(evidence.timestamp), 'MM-dd HH:mm')}</span>
            <span>•</span>
            <span>适用范围: {evidence.scope}</span>
            {evidence.updatedAt && (
              <>
                <span>•</span>
                <span>更新: {format(new Date(evidence.updatedAt), 'MM-dd HH:mm')}</span>
              </>
            )}
          </div>
          
          {/* 🆕 P0修复：显示证据增强信息 */}
          {(evidence.freshness || evidence.qualityScore) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              {/* 时效性状态 */}
              {evidence.freshness && (
                <div className="flex items-center gap-1">
                  <span className={cn(
                    'w-2 h-2 rounded-full',
                    evidence.freshness.freshnessStatus === 'FRESH' && 'bg-muted-foreground',
                    evidence.freshness.freshnessStatus === 'STALE' && 'bg-muted0',
                    evidence.freshness.freshnessStatus === 'EXPIRED' && 'bg-muted-foreground'
                  )} />
                  <span>
                    {evidence.freshness.freshnessStatus === 'FRESH' && '数据新鲜'}
                    {evidence.freshness.freshnessStatus === 'STALE' && '数据已过期'}
                    {evidence.freshness.freshnessStatus === 'EXPIRED' && '数据已失效'}
                  </span>
                </div>
              )}
              
              {/* 质量评分 */}
              {evidence.qualityScore && (
                <div className="flex items-center gap-1">
                  <span className={cn(
                    'text-xs font-medium',
                    evidence.qualityScore.level === 'HIGH' && 'text-success',
                    evidence.qualityScore.level === 'MEDIUM' && 'text-warning',
                    evidence.qualityScore.level === 'LOW' && 'text-error'
                  )}>
                    质量: {Math.round(evidence.qualityScore.overallScore * 100)}%
                  </span>
                </div>
              )}
              
              {/* 置信度（如果有） */}
              {evidence.confidence && typeof evidence.confidence === 'object' && 'score' in evidence.confidence && (
                <div className="flex items-center gap-1">
                  <span className="text-xs">
                    置信度: {Math.round((evidence.confidence as any).score * 100)}%
                  </span>
                </div>
              )}
            </div>
          )}
          {/* 🎯 用户备注显示 */}
          {evidence.userNote && !showNoteInput && (
            <div className="flex items-start gap-2 mt-1 p-2 bg-muted/50 rounded text-xs">
              <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span className="flex-1">{evidence.userNote}</span>
            </div>
          )}
          {/* 🎯 备注输入框 */}
          {showNoteInput && (
            <div className="mt-2 space-y-2">
              <Textarea
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder="添加备注（最大500字符）"
                maxLength={500}
                className="text-xs min-h-[60px]"
                disabled={isUpdating}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {userNote.length}/500
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowNoteInput(false);
                      setUserNote(evidence.userNote || '');
                    }}
                    disabled={isUpdating}
                  >
                    取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleNoteSave}
                    disabled={isUpdating}
                  >
                    保存
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* 🎯 状态选择器（仅当有编辑权限时显示） */}
        {canEdit && (
          <Select
            value={currentStatus}
            onValueChange={(value) => handleStatusChange(value as EvidenceStatus)}
            disabled={isUpdating}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getAvailableStatuses().map((status) => {
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
        )}

        {/* 🎯 备注按钮（仅当有编辑权限时显示） */}
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowNoteInput(!showNoteInput)}
            title="添加备注"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        )}

        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onRefresh(evidence.id)}
            title="Refresh"
            disabled={isUpdating}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        {onOpen && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => onOpen(evidence.id)}
            disabled={isUpdating}
          >
            Open
          </Button>
        )}
      </div>
    </div>
  );
}

