import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { plazaToolbar } from '../lib/plaza-visual';

interface PlazaCommandBarProps {
  children: ReactNode;
  actions?: ReactNode;
  hint?: ReactNode;
  className?: string;
}

/** 广场命令面 — 匹配视角 + 意向 + 主操作同一决策条 */
export function PlazaCommandBar({ children, actions, hint, className }: PlazaCommandBarProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {hint && <p className={plazaToolbar.hint}>{hint}</p>}
      <div className={plazaToolbar.shell}>
        <div className={plazaToolbar.row}>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">{children}</div>
          {actions && (
            <>
              <span className={plazaToolbar.divider} aria-hidden />
              <div className="flex shrink-0 items-center gap-1">{actions}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
