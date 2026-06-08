/**
 * 行程项生成中占位页
 *
 * 遵循 TripNARA 视觉原则：Clarity over Charm, Evidence is the aesthetic
 * - 生成中：清晰进度反馈，动效仅解释状态
 * - 失败态：REJECT 裁决呈现，证据式错误展示 + 替代动作
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import type { TripDetail, GenerationProgress } from '@/types/trip';
import { shouldShowNlItemsGeneratingPlaceholder } from '@/lib/trip-planning-complete';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { PlannerThinkingLoading } from '@/components/common/PlannerThinkingLoading';
import {
  getGateStatusIcon,
  getGateStatusClasses,
} from '@/lib/gate-status';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TripGeneratingPlaceholderProps {
  tripId: string;
  onReady?: (trip: TripDetail) => void;
  compact?: boolean;
}

const pollInterval = 2000;
const maxPollTime = 120000;

function getProgressPercentage(progress: GenerationProgress | null): number {
  if (!progress) return 0;
  if (progress.status === 'completed') return 100;
  if (progress.status === 'failed') return 0;
  switch (progress.stage) {
    case 'retrieving_candidates': return 20;
    case 'llm_completed': return 70;
    case 'saving_items': return 90;
    default: return 30;
  }
}

function getStageLabel(progress: GenerationProgress | null): string {
  if (!progress) return '正在初始化...';
  switch (progress.stage) {
    case 'retrieving_candidates': return '正在检索候选地点';
    case 'llm_completed': return '编排完成，正在保存';
    case 'saving_items': return '正在保存行程项';
    case 'completed': return '规划完成';
    case 'error':
    case 'llm_error': return progress.message || '发生错误';
    default: return progress.message || '正在规划中';
  }
}

export function TripGeneratingPlaceholder({
  tripId,
  onReady,
  compact = false,
}: TripGeneratingPlaceholderProps) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;
    const startTime = Date.now();

    const checkTripStatus = async () => {
      if (!isMounted || Date.now() - startTime >= maxPollTime) return;
      try {
        const trip = await tripsApi.getById(tripId);
        const newProgress = trip.metadata?.generationProgress;
        if (newProgress) setProgress(newProgress);

        if (!shouldShowNlItemsGeneratingPlaceholder(trip)) {
          if (pollTimer) clearTimeout(pollTimer);
          if (newProgress?.status === 'failed') {
            setFailedMessage(newProgress.message || '生成失败，请稍后重试');
          } else {
            onReady?.(trip);
          }
          return;
        }
        if (newProgress?.status === 'failed') {
          if (pollTimer) clearTimeout(pollTimer);
          setFailedMessage(newProgress.message || '生成失败，请稍后重试');
          return;
        }
        pollTimer = setTimeout(checkTripStatus, pollInterval);
      } catch (err) {
        console.error('TripGeneratingPlaceholder check failed:', err);
        pollTimer = setTimeout(checkTripStatus, pollInterval);
      }
    };
    checkTripStatus();
    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [tripId, onReady]);

  const handleRetry = async () => {
    setRetrying(true);
    setFailedMessage(null);
    try {
      const trip = await tripsApi.getById(tripId);
      setProgress(trip.metadata?.generationProgress || null);
      if (!shouldShowNlItemsGeneratingPlaceholder(trip)) {
        onReady?.(trip);
      } else if (trip.metadata?.generationProgress?.status === 'failed') {
        setFailedMessage(trip.metadata.generationProgress.message || '生成失败，请稍后重试');
      } else {
        const checkAgain = async () => {
          const t = await tripsApi.getById(tripId);
          if (!shouldShowNlItemsGeneratingPlaceholder(t)) onReady?.(t);
          else if (t.metadata?.generationProgress?.status === 'failed') {
            setFailedMessage(t.metadata.generationProgress.message || '生成失败');
          } else setTimeout(checkAgain, pollInterval);
        };
        setTimeout(checkAgain, pollInterval);
      }
    } catch {
      setFailedMessage('加载失败，请重试');
    } finally {
      setRetrying(false);
    }
  };

  const handleBack = () => navigate('/dashboard/trips');

  const isFailed = !!failedMessage;
  const RejectIcon = getGateStatusIcon('REJECT');
  const errorDetail = failedMessage?.replace(/^生成失败[：:]\s*/i, '') || failedMessage;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[60vh] px-4',
        compact ? 'py-8' : 'py-16'
      )}
    >
      {/* 生成中：与 NL 创建行程 / Agent 入口一致的「规划师思考」插画加载 */}
      <div
        className={cn(
          'flex w-full max-w-md items-center justify-center px-2',
          isFailed && (compact ? 'min-h-[5rem]' : 'min-h-[6rem]')
        )}
      >
        {isFailed ? (
          <div
            className={cn(
              'rounded-full border-2 flex items-center justify-center',
              compact ? 'h-20 w-20' : 'h-24 w-24',
              getGateStatusClasses('REJECT')
            )}
          >
            <RejectIcon className="w-10 h-10 shrink-0" strokeWidth={2} />
          </div>
        ) : (
          <PlannerThinkingLoading
            compact
            size={compact ? 48 : 56}
            label={getStageLabel(progress)}
            strokeColor="#64748b"
            className="justify-center px-2 py-2"
            textClassName="text-sm font-medium text-slate-600"
          />
        )}
      </div>

      {/* 标题 */}
      <h2 className="mt-6 text-base font-semibold text-slate-800">
        {isFailed ? '生成失败' : '行程项生成中'}
      </h2>

      {/* 描述 */}
      <p className="mt-1.5 text-sm text-slate-500 text-center max-w-xs">
        {isFailed
          ? '未能完成行程项生成，请查看下方原因'
          : '系统正在生成详细行程安排，预计需要 2-5 分钟'}
      </p>

      {/* 主内容区 */}
      <div className="w-full max-w-sm mt-8 space-y-4">
        {isFailed ? (
          <>
            {/* 失败态：证据式错误块，使用 REJECT Token */}
            <div
              className={cn(
                'rounded-lg border p-4 text-sm',
                getGateStatusClasses('REJECT')
              )}
            >
              <div className="flex gap-3">
                <RejectIcon className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorDetail}</p>
              </div>
            </div>
            <Button
              onClick={handleRetry}
              disabled={retrying}
              className="w-full"
            >
              {retrying ? (
                <Spinner className="w-4 h-4" />
              ) : (
                '重试'
              )}
            </Button>
          </>
        ) : (
          <>
            {/* 生成中：进度条 + 阶段标签 */}
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-600 transition-all duration-300 ease-out"
                style={{ width: `${getProgressPercentage(progress)}%` }}
              />
            </div>
            {progress?.itemsCount != null && progress.itemsCount > 0 && (
              <p className="text-xs text-slate-500 text-center">
                已生成 {progress.itemsCount} 个行程项
              </p>
            )}
          </>
        )}
      </div>

      {/* 次要动作：返回 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="mt-8 gap-2 text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        返回行程列表
      </Button>
    </div>
  );
}
