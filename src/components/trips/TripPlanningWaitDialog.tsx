import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { tripsApi } from '@/api/trips';
import { SEMANTIC_RED_HEX } from '@/lib/semantic-colors';
import type { TripDetail, GenerationProgress } from '@/types/trip';
import { shouldShowNlItemsGeneratingPlaceholder } from '@/lib/trip-planning-complete';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface TripPlanningWaitDialogProps {
  tripId: string;
  open: boolean;
  onPlanningComplete: (trip: TripDetail) => void;
  onClose?: () => void;
}

/** Dialog 内使用：NL 生成结束或 completed 才算完成 */
function isDialogPlanningComplete(trip: TripDetail | null): boolean {
  if (!trip) return false;
  const progress = trip.metadata?.generationProgress;
  if (progress?.status === 'completed') return true;
  if (progress?.status === 'failed') return false;
  return !shouldShowNlItemsGeneratingPlaceholder(trip);
}

export default function TripPlanningWaitDialog({
  tripId,
  open,
  onPlanningComplete,
  onClose,
}: TripPlanningWaitDialogProps) {
  const [, setChecking] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const maxPollTime = 60000; // 最多轮询 60 秒
  const pollInterval = 2000; // 每 2 秒轮询一次

  useEffect(() => {
    if (!open || !tripId) return;

    let pollTimer: NodeJS.Timeout | null = null;
    let isMounted = true;
    const startTime = Date.now();

    const checkTripStatus = async () => {
      if (!isMounted) return;

      // 检查是否超时
      if (Date.now() - startTime >= maxPollTime) {
        console.warn('Trip planning check timeout after', maxPollTime, 'ms');
        if (pollTimer) {
          clearTimeout(pollTimer);
        }
        return;
      }

      try {
        setChecking(true);
        const trip = await tripsApi.getById(tripId);
        
        // 更新进度信息
        const newProgress = trip.metadata?.generationProgress;
        if (newProgress) {
          setProgress(newProgress);
        }
        
        // 检查是否完成（仅 completed 触发回调，failed 不触发）
        if (isDialogPlanningComplete(trip)) {
          // 规划完成，关闭弹窗并通知父组件
          if (pollTimer) {
            clearTimeout(pollTimer);
          }
          onPlanningComplete(trip);
          return;
        }

        // 如果进度状态是失败，停止轮询
        if (newProgress?.status === 'failed') {
          if (pollTimer) {
            clearTimeout(pollTimer);
          }
          console.error('Trip planning failed:', newProgress.message);
          return;
        }

        // 继续轮询
        pollTimer = setTimeout(checkTripStatus, pollInterval);
      } catch (err) {
        console.error('Failed to check trip status:', err);
        // 出错时也继续轮询
        pollTimer = setTimeout(checkTripStatus, pollInterval);
      } finally {
        setChecking(false);
      }
    };

    // 立即检查一次
    checkTripStatus();

    return () => {
      isMounted = false;
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
    };
  }, [open, tripId, maxPollTime, pollInterval, onPlanningComplete]);

  // 重置进度当弹窗关闭
  useEffect(() => {
    if (!open) {
      setProgress(null);
    }
  }, [open]);

  // 获取进度百分比
  const getProgressPercentage = (): number => {
    if (!progress) return 0;
    if (progress.status === 'completed') return 100;
    if (progress.status === 'failed') return 0;
    
    switch (progress.stage) {
      case 'retrieving_candidates':
        return 20;
      case 'llm_completed':
        return 70;
      case 'saving_items':
        return 90;
      default:
        return 30;
    }
  };

  // 获取阶段显示文本
  const getStageText = (): string => {
    if (!progress) return '正在初始化...';
    
    switch (progress.stage) {
      case 'retrieving_candidates':
        return '正在检索候选地点...';
      case 'llm_completed':
        return '✅ LLM 编排完成，正在保存行程项...';
      case 'saving_items':
        return '正在保存行程项...';
      case 'completed':
        return '规划完成！';
      case 'error':
      case 'llm_error':
        return `错误: ${progress.message}`;
      default:
        return progress.message || '正在规划中...';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>行程规划中</DialogTitle>
          <DialogDescription>
            系统正在为您生成详细的行程安排，请稍候...
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          {/* 插画：等待中的行程规划 */}
          <div className="relative w-64 h-64">
            <svg
              width="256"
              height="256"
              viewBox="0 0 256 256"
              fill="none"
              stroke="#1F2937"
              strokeWidth="2"
              className="absolute inset-0"
            >
              {/* 地图轮廓 */}
              <path
                d="M 50 80 Q 60 60 80 70 Q 100 80 120 60 Q 140 50 160 70 Q 180 90 200 80 Q 210 100 190 120 Q 170 140 150 130 Q 130 120 110 140 Q 90 160 70 150 Q 50 140 50 120 Q 50 100 50 80"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* 路线轨迹（动画效果） */}
              <path
                d="M 60 90 Q 80 85 100 95 Q 120 105 140 90 Q 160 85 180 95"
                stroke={SEMANTIC_RED_HEX}
                strokeWidth="3"
                strokeDasharray="8 4"
                fill="none"
                className="animate-pulse"
              />
              
              {/* 关键节点（酒红色） */}
              <circle cx="60" cy="90" r="6" fill={SEMANTIC_RED_HEX} />
              <circle cx="100" cy="95" r="6" fill={SEMANTIC_RED_HEX} />
              <circle cx="140" cy="90" r="6" fill={SEMANTIC_RED_HEX} />
              <circle cx="180" cy="95" r="6" fill={SEMANTIC_RED_HEX} />
              
              {/* 指南针 */}
              <g transform="translate(200, 50)">
                <circle cx="0" cy="0" r="20" stroke="#1F2937" fill="none" />
                <line x1="0" y1="-20" x2="0" y2="20" stroke="#1F2937" />
                <line x1="-20" y1="0" x2="20" y2="0" stroke="#1F2937" />
                <path d="M 0 -15 L -5 -5 L 0 0 L 5 -5 Z" fill={SEMANTIC_RED_HEX} />
                <text x="0" y="35" textAnchor="middle" fontSize="10" fill="#1F2937">N</text>
              </g>
              
              {/* 加载动画圆圈 */}
              <circle
                cx="128"
                cy="200"
                r="20"
                stroke={SEMANTIC_RED_HEX}
                strokeWidth="2"
                fill="none"
                strokeDasharray="40 20"
                className="animate-spin"
                style={{ animationDuration: '2s' }}
              />
            </svg>
          </div>

          {/* 进度信息 */}
          <div className="w-full space-y-4">
            {/* 进度条 */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>

            {/* 状态和消息 */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                {progress?.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-gate-allow-foreground" />
                ) : progress?.status === 'failed' ? (
                  <AlertCircle className="w-5 h-5 text-gate-reject-foreground" />
                ) : (
                  <Spinner className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">
                  {progress?.status === 'completed' 
                    ? '规划完成！' 
                    : progress?.status === 'failed'
                    ? '规划失败'
                    : '正在规划行程...'}
                </span>
              </div>
              
              {/* 阶段信息 */}
              <p className="text-sm text-muted-foreground">
                {getStageText()}
              </p>

              {/* LLM 编排完成特别提示 */}
              {progress?.stage === 'llm_completed' && (
                <Badge variant="default" className="bg-gate-allow text-gate-allow-foreground border-gate-allow-border">
                  ✨ LLM 编排已完成
                </Badge>
              )}

              {/* 已生成行程项数量 */}
              {progress?.itemsCount !== undefined && progress.itemsCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  已生成 {progress.itemsCount} 个行程项
                </p>
              )}

              {/* 失败信息 */}
              {progress?.status === 'failed' && (
                <div className="mt-2 p-2 bg-gate-reject border border-gate-reject-border rounded text-xs text-gate-reject-foreground">
                  {progress.message || '生成失败，请稍后重试'}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

