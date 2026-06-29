import { CloudSun, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ConstraintListEntry } from './constraint-console-types';
import {
  isOfficialReadonlyConstraint,
  OFFICIAL_RULE_READONLY_HINT,
} from '@/lib/constraint-console-partition.util';
import { workbenchCard, workbenchEmptySurface, workbenchZoneIcon } from './workbench-ui';

export interface ConstraintExternalDetailPanelProps {
  entry: ConstraintListEntry;
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
}

/** 中栏 · 目的地规则只读详情（业务说明来自 API description） */
export function ConstraintExternalDetailPanel({
  entry,
  onRefresh,
  refreshing,
  className,
}: ConstraintExternalDetailPanelProps) {
  const Icon = entry.icon;
  const description = entry.description?.trim();
  const showOfficialReadonlyHint = isOfficialReadonlyConstraint(entry);

  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-background', className)}>
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
        <h2 className="text-sm font-semibold tracking-tight">目的地规则</h2>
        <Badge variant="outline" className="h-5 text-[10px] font-normal text-muted-foreground">
          只读
        </Badge>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div className={cn(workbenchCard, 'flex items-start gap-3 p-4')}>
          <span
            className={cn(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
              workbenchZoneIcon.external,
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{entry.label}</p>
            {entry.value ? (
              <p className="mt-1 text-xs text-muted-foreground">{entry.value}</p>
            ) : null}
            {entry.statusLabel ? (
              <p
                className={cn(
                  'mt-1 text-xs',
                  entry.statusTone === 'warning'
                    ? 'text-gate-confirm-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {entry.statusLabel}
              </p>
            ) : null}
          </div>
        </div>

        {description ? (
          <section className="space-y-2">
            <p className="text-xs font-medium text-foreground">规则说明</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </section>
        ) : null}

        {showOfficialReadonlyHint ? (
          <section className="space-y-2">
            <p className="text-xs font-medium text-foreground">系统提示</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {OFFICIAL_RULE_READONLY_HINT}
            </p>
          </section>
        ) : null}

        <div className={cn(workbenchEmptySurface, 'p-4 text-xs leading-relaxed text-muted-foreground')}>
          <CloudSun className="mb-2 h-4 w-4 text-gate-suggest-foreground" />
          官方规则由目的地数据自动同步。冲突项请通过「查看修复」或可行性报告处理，不提供「忽略此规则」。
        </div>
      </div>

      <div className="flex shrink-0 justify-end border-t border-border/50 px-5 py-3">
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-xs"
          disabled={refreshing}
          onClick={onRefresh}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          重新验证
        </Button>
      </div>
    </div>
  );
}
