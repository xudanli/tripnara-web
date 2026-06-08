import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_WIDTH: Record<NonNullable<DashboardSubpageHeaderProps['maxWidth']>, string> = {
  lg: 'max-w-lg',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-none',
};

export interface DashboardSubpageHeaderProps {
  backTo: string;
  backLabel?: string;
  title: string;
  subtitle?: string;
  /** 与下方内容列左缘对齐；默认 true */
  contained?: boolean;
  /** 与下方内容列对齐；start = 左对齐固定安全距，center = 居中窄栏 */
  contentAlign?: 'center' | 'start';
  maxWidth?: 'lg' | '2xl' | '4xl' | 'full';
  className?: string;
}

/**
 * Dashboard 子页顶栏 — 左上角返回 + 标题。
 * contained 时与内容区共用 max-width + px-4 md:px-6，保证返回键与正文左对齐。
 */
export function DashboardSubpageHeader({
  backTo,
  backLabel = '返回',
  title,
  subtitle,
  contained = true,
  contentAlign = 'center',
  maxWidth = '2xl',
  className,
}: DashboardSubpageHeaderProps) {
  const inner = (
    <>
      <Button variant="ghost" size="icon" className="shrink-0" asChild>
        <Link to={backTo} aria-label={backLabel}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </>
  );

  const widthClass = MAX_WIDTH[maxWidth];
  const rowClass = cn(
    'flex w-full items-center gap-3',
    widthClass,
    contentAlign === 'center' && 'mx-auto'
  );

  return (
    <header className={cn('shrink-0 border-b border-border bg-background', className)}>
      {contained ? (
        <div className="px-4 py-3 md:px-6">
          <div className={rowClass}>{inner}</div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3">{inner}</div>
      )}
    </header>
  );
}
