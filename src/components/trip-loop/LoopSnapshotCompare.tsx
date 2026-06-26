import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PLAN_VALIDATION_SCORE_LABEL,
  readinessSnapshotsEqual,
} from '@/lib/trip-loop-display';
import type { ReadinessSnapshot } from '@/types/trip-loop';

interface LoopSnapshotCompareProps {
  before: ReadinessSnapshot;
  after: ReadinessSnapshot;
  className?: string;
}

function SnapshotColumn({
  label,
  snapshot,
}: {
  label: string;
  snapshot: ReadinessSnapshot;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{snapshot.readinessScore}</span>
        <span className="text-xs text-muted-foreground">{PLAN_VALIDATION_SCORE_LABEL}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div>
          <dt className="text-muted-foreground">硬阻断</dt>
          <dd className="font-medium">{snapshot.hardBlockers}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">必处理</dt>
          <dd className="font-medium">{snapshot.mustHandleCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">建议调整</dt>
          <dd className="font-medium">{snapshot.suggestAdjustCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">可出发</dt>
          <dd className="font-medium">{snapshot.canStartExecute ? '是' : '否'}</dd>
        </div>
      </dl>
    </div>
  );
}

export function LoopSnapshotCompare({ before, after, className }: LoopSnapshotCompareProps) {
  const hasDelta = !readinessSnapshotsEqual(before, after);

  if (!hasDelta) {
    return (
      <div className={cn('space-y-2', className)}>
        <p className="text-xs font-medium text-muted-foreground">当前可执行性</p>
        <SnapshotColumn label="当前方案" snapshot={before} />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          本次验证未生成可预览的调整方案，指标反映当前行程状态。可在右侧详细报告中查看建议优化项。
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-medium text-muted-foreground">可执行性对比</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] items-center">
        <SnapshotColumn label="调整前" snapshot={before} />
        <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto hidden sm:block" aria-hidden />
        <SnapshotColumn label="调整后（预览）" snapshot={after} />
      </div>
    </div>
  );
}
