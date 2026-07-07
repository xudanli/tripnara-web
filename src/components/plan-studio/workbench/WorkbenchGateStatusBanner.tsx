import { GateStatusBanner, type GateStatusBannerProps } from '@/components/ui/gate-status-banner';
import { cn } from '@/lib/utils';

export interface WorkbenchGateStatusBannerProps extends Omit<GateStatusBannerProps, 'variant'> {
  /** 工作台默认克制描边 + 浅底 */
  variant?: 'subtle' | 'solid';
}

/** 规划工作台 · 裁决状态条（克制 variant 为默认） */
export function WorkbenchGateStatusBanner({
  variant = 'subtle',
  className,
  size = 'sm',
  ...props
}: WorkbenchGateStatusBannerProps) {
  return (
    <GateStatusBanner
      variant={variant}
      size={size}
      className={cn('w-full', className)}
      {...props}
    />
  );
}
