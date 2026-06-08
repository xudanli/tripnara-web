import { FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMatchSquareApiMode } from '../lib/match-square-api-mode';
import { plazaBanner } from '../lib/plaza-visual';

export function MockModeBanner() {
  const mode = getMatchSquareApiMode();
  if (mode === 'live') return null;

  const label =
    mode === 'mock'
      ? 'Mock 模式：全部数据来自本地 fixtures'
      : 'Auto 模式：后端 /match-square 未就绪时自动降级 mock';

  return (
    <div className={cn(plazaBanner.base, plazaBanner.muted, 'items-center text-xs')} role="status">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </div>
  );
}
