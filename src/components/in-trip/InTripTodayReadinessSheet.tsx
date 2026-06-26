import { ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  TODAY_READINESS_DIMENSION_LABELS,
  todayReadinessScoreClasses,
  todayReadinessStatusClasses,
  todayReadinessStatusLabel,
} from '@/lib/in-trip-today-readiness';
import type { InTripTodayReadinessDetail } from '@/types/in-trip-execution';

interface InTripTodayReadinessSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: InTripTodayReadinessDetail | null;
  loading?: boolean;
  error?: string | null;
  notFound?: boolean;
  onOpenFullReadiness?: () => void;
}

export function InTripTodayReadinessSheet({
  open,
  onOpenChange,
  data,
  loading,
  error,
  notFound,
  onOpenFullReadiness,
}: InTripTodayReadinessSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-sky-600" />
            今日就绪
          </SheetTitle>
          <SheetDescription>
            评估今日计划是否可执行（证据、密度、路段风险），非整趟行前清单。
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {loading && (
            <div className="flex justify-center py-12">
              <LogoLoading size={40} />
            </div>
          )}

          {notFound && !loading && (
            <p className="text-sm text-muted-foreground py-4">
              今日就绪不可用（行程已结束或未在行中窗口内）。
            </p>
          )}

          {error && !loading && (
            <p className="text-sm text-red-600 py-4">{error}</p>
          )}

          {data && !loading && (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    第 {data.dayNumber} 天 · {data.date}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn('mt-1 text-[10px]', todayReadinessStatusClasses(data.status))}
                  >
                    {todayReadinessStatusLabel(data.status)}
                  </Badge>
                </div>
                <div className={cn('text-3xl font-bold tabular-nums', todayReadinessScoreClasses(data.score))}>
                  {data.score}
                  <span className="text-sm font-normal text-muted-foreground">/100</span>
                </div>
              </div>

              {data.scopeNote?.zh && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                  {data.scopeNote.zh}
                </p>
              )}

              {data.dimensions && (
                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">维度得分</p>
                  {Object.entries(data.dimensions).map(([key, value]) => {
                    if (typeof value !== 'number') return null;
                    const label = TODAY_READINESS_DIMENSION_LABELS[key] ?? key;
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{label}</span>
                          <span className="tabular-nums font-medium">{value}</span>
                        </div>
                        <Progress value={value} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              )}

              {data.topFindings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">主要发现</p>
                  <ul className="space-y-2">
                    {data.topFindings.map((f) => (
                      <li
                        key={f.id}
                        className="rounded-lg border px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px]">
                            {f.type}
                          </Badge>
                          {f.category && (
                            <span className="text-[10px] text-muted-foreground">{f.category}</span>
                          )}
                        </div>
                        <p>{f.message}</p>
                        {f.actionRequired && (
                          <p className="text-xs text-amber-700 mt-1">{f.actionRequired}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {onOpenFullReadiness && (
                <button
                  type="button"
                  className="text-sm text-primary underline-offset-2 hover:underline"
                  onClick={onOpenFullReadiness}
                >
                  查看整趟准备度（归档 / 二级页）
                </button>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
