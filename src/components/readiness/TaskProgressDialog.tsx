/**
 * 异步任务进度对话框组件
 * 
 * 符合 TripNARA 设计哲学：
 * - Clarity over Charm（清晰优先于讨喜）
 * - Evidence is the aesthetic（证据就是美学）
 * - Decision is a UI primitive（决策是 UI 原语）
 * 
 * 视觉原则：
 * - 使用设计 Token（gateStatusTokens、cardVariants、typographyTokens）
 * - 克制使用颜色（主靠层级、描边、icon、标签）
 * - 信息层级清晰（任务状态 → 进度条 → 当前处理项 → 预计剩余时间）
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { gateStatusTokens, typographyTokens } from '@/utils/design-tokens';
import type { FetchEvidenceResponse } from '@/api/planning-workbench';

interface TaskProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | null;
  progress: {
    total: number;
    processed: number;
    current?: string;
    estimatedRemainingTime?: number;
  } | null;
  result?: FetchEvidenceResponse;
  error?: string;
  onCancel?: (taskId: string) => void;
  onClose?: () => void;
  pollingInterval?: number; // 轮询间隔（毫秒），默认 2000
}

export default function TaskProgressDialog({
  open,
  onOpenChange,
  taskId,
  status,
  progress,
  result,
  error,
  onCancel,
  onClose,
  pollingInterval = 2000,
}: TaskProgressDialogProps) {
  const { t } = useTranslation();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 格式化剩余时间
  const formatRemainingTime = (seconds?: number): string => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) return `${minutes}分钟`;
    return `${minutes}分${remainingSeconds}秒`;
  };

  // 计算进度百分比
  const progressPercent = progress
    ? progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : 0
    : 0;

  // 状态配置
  const statusConfig = {
    PENDING: {
      icon: Loader2,
      iconClassName: 'text-blue-600 animate-spin',
      label: t('dashboard.readiness.task.status.pending', { defaultValue: '等待中' }),
      badgeClassName: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    RUNNING: {
      icon: Loader2,
      iconClassName: 'text-blue-600 animate-spin',
      label: t('dashboard.readiness.task.status.running', { defaultValue: '执行中' }),
      badgeClassName: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    COMPLETED: {
      icon: CheckCircle2,
      iconClassName: 'text-green-600',
      label: t('dashboard.readiness.task.status.completed', { defaultValue: '已完成' }),
      badgeClassName: 'bg-green-50 text-green-700 border-green-200',
    },
    FAILED: {
      icon: XCircle,
      iconClassName: 'text-red-600',
      label: t('dashboard.readiness.task.status.failed', { defaultValue: '失败' }),
      badgeClassName: 'bg-red-50 text-red-700 border-red-200',
    },
    CANCELLED: {
      icon: XCircle,
      iconClassName: 'text-gray-600',
      label: t('dashboard.readiness.task.status.cancelled', { defaultValue: '已取消' }),
      badgeClassName: 'bg-gray-50 text-gray-700 border-gray-200',
    },
  };

  const currentStatusConfig = status ? statusConfig[status] : statusConfig.PENDING;
  const StatusIcon = currentStatusConfig.icon;

  // 处理关闭
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      onOpenChange(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    if (taskId && onCancel) {
      onCancel(taskId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className={cn('h-5 w-5', currentStatusConfig.iconClassName)} />
              <DialogTitle className="text-base font-semibold">
                {t('dashboard.readiness.task.title', { defaultValue: '任务进度' })}
              </DialogTitle>
            </div>
            <Badge variant="outline" className={cn('text-xs font-semibold', currentStatusConfig.badgeClassName)}>
              {currentStatusConfig.label}
            </Badge>
          </div>
          <DialogDescription className="text-xs mt-2">
            {t('dashboard.readiness.task.description', {
              defaultValue: '正在获取证据数据，请稍候...',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 进度条 */}
          {progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {t('dashboard.readiness.task.progress', {
                    defaultValue: '进度',
                  })}
                </span>
                <span className="font-semibold text-foreground">
                  {progress.processed} / {progress.total}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <div className="text-xs text-muted-foreground text-center">
                {progressPercent}%
              </div>
            </div>
          )}

          {/* 当前处理项 */}
          {progress?.current && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {t('dashboard.readiness.task.current', {
                  defaultValue: '正在处理',
                })}
                : {progress.current}
              </span>
            </div>
          )}

          {/* 预计剩余时间 */}
          {progress?.estimatedRemainingTime && status === 'RUNNING' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              <span>
                {t('dashboard.readiness.task.estimatedTime', {
                  defaultValue: '预计剩余时间',
                })}
                : {formatRemainingTime(progress.estimatedRemainingTime)}
              </span>
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">
                    {t('dashboard.readiness.task.error', { defaultValue: '任务执行失败' })}
                  </p>
                  <p className="text-xs text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 完成结果 */}
          {result && status === 'COMPLETED' && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-green-900">
                    {t('dashboard.readiness.task.success', { defaultValue: '任务完成' })}
                  </p>
                  <div className="text-xs text-green-700 space-y-0.5">
                    <p>
                      {t('dashboard.readiness.task.processedPlaces', {
                        defaultValue: '已处理地点',
                      })}
                      : {result.processedPlaces} / {result.totalPlaces}
                    </p>
                    <p>
                      {t('dashboard.readiness.task.successCount', {
                        defaultValue: '成功',
                      })}
                      : {result.successCount}
                    </p>
                    {result.partialCount > 0 && (
                      <p>
                        {t('dashboard.readiness.task.partialCount', {
                          defaultValue: '部分成功',
                        })}
                        : {result.partialCount}
                      </p>
                    )}
                    {result.failedCount > 0 && (
                      <p>
                        {t('dashboard.readiness.task.failedCount', {
                          defaultValue: '失败',
                        })}
                        : {result.failedCount}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {status === 'RUNNING' && onCancel && taskId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="h-8 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                {t('dashboard.readiness.task.cancel', { defaultValue: '取消任务' })}
              </Button>
            )}
            {(status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') && (
              <Button
                variant="default"
                size="sm"
                onClick={handleClose}
                className="h-8 text-xs"
              >
                {t('dashboard.readiness.task.close', { defaultValue: '关闭' })}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
