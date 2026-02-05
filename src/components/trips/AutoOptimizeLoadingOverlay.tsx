/**
 * Auto综合优化加载遮罩
 * 显示全屏加载遮罩和进度提示
 */

import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AutoOptimizeLoadingOverlayProps {
  open: boolean;
  progress?: number; // 0-100，可选
  message?: string;
  estimatedTime?: number; // 预计剩余时间（秒）
}

export function AutoOptimizeLoadingOverlay({
  open,
  progress,
  message = '正在优化中...',
  estimatedTime,
}: AutoOptimizeLoadingOverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          {/* 加载指示器 */}
          <Spinner className="w-12 h-12" />
          
          {/* 消息 */}
          <div className="text-center">
            <p className="text-lg font-semibold mb-1">{message}</p>
            {estimatedTime && (
              <p className="text-sm text-muted-foreground">
                预计还需 {estimatedTime} 秒
              </p>
            )}
          </div>

          {/* 进度条（如果提供） */}
          {progress !== undefined && (
            <div className="w-full space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>优化进度</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
