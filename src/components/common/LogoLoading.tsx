/**
 * TripNARA Logo 加载动画
 *
 * 设计原则（视觉设计师规范）：
 * - Clarity over Charm：清晰、可信、可执行
 * - Quiet confidence：比例、留白、层级、细节一致性
 * - 动效是状态解释，非炫技：圆环旋转传达「系统在处理中」
 *
 * 圆环旋转、Logo 静态：动在边界，静在中心，层次清晰。
 */

import { cn } from '@/lib/utils';
import Logo from './Logo';

interface LogoLoadingProps {
  /** 尺寸（px） */
  size?: number;
  /** 额外类名 */
  className?: string;
  /** 是否全屏居中（用于页面级加载） */
  fullScreen?: boolean;
  /** 是否显示旋转圆环，默认 true */
  showRing?: boolean;
}

export function LogoLoading({
  size = 48,
  className,
  fullScreen = false,
  showRing = true,
}: LogoLoadingProps) {
  const ringSize = size + 24; // logo + padding
  return (
    <div
      role="status"
      aria-label="加载中"
      className={cn(
        fullScreen && 'flex items-center justify-center h-full min-h-[200px]',
        className
      )}
    >
      <div
        className="relative inline-flex items-center justify-center"
        style={{ width: ringSize, height: ringSize }}
      >
        {showRing && (
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-black animate-spin dark:border-t-white"
            aria-hidden
          />
        )}
        <div className="relative z-10">
          <Logo variant="icon" size={size} />
        </div>
      </div>
    </div>
  );
}
