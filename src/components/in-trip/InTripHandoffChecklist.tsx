import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getHandoffMissingMeta,
  parseProfilingCompletionWarning,
} from '@/lib/in-trip-execution';
import type { HandoffVerifyResult } from '@/types/in-trip-execution';

interface InTripHandoffChecklistProps {
  tripId: string;
  verify: HandoffVerifyResult | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  className?: string;
}

export function InTripHandoffChecklist({
  tripId,
  verify,
  loading,
  error,
  onRefresh,
  className,
}: InTripHandoffChecklistProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground py-2', className)}>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        正在检查行前移交条件…
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('rounded-lg border border-red-200 bg-red-50 p-3 space-y-2', className)}>
        <p className="text-sm text-red-800">{error}</p>
        {onRefresh && (
          <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            重试
          </Button>
        )}
      </div>
    );
  }

  if (!verify) return null;

  const profilingWarnings = verify.warnings
    .map(parseProfilingCompletionWarning)
    .filter((n): n is number => n != null);

  return (
    <div className={cn('space-y-3', className)}>
      {verify.ready ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-medium text-emerald-900">行前移交已就绪</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              预算、分摊与行程锚点已齐全，可以开始旅行。
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium">完成以下项目后方可进入行中：</p>
          <ul className="space-y-2">
            {verify.missing.map((code) => {
              const meta = getHandoffMissingMeta(code);
              return (
                <li key={code}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(meta.path(tripId))}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <Circle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{meta.label}</p>
                        <p className="text-xs text-muted-foreground">{meta.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {profilingWarnings.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-amber-800">
            决策画像团队完成率 {profilingWarnings[0]}%，建议全员完成调查（不阻断开始旅行）。
          </p>
        </div>
      )}

      {onRefresh && (
        <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          刷新检查结果
        </Button>
      )}
    </div>
  );
}
