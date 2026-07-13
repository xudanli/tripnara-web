import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HardConstraintMetadata } from '@/lib/constraint-metadata.util';

export interface HardConstraintMetadataCardProps {
  metadata: HardConstraintMetadata;
  constraintLabel: string;
  compact?: boolean;
  className?: string;
}

/** 硬约束合同元数据：已启用 / 作用范围 / 判定规则 / 违反结果 */
export function HardConstraintMetadataCard({
  metadata,
  constraintLabel,
  compact = false,
  className,
}: HardConstraintMetadataCardProps) {
  const enabled = metadata.enabledLabel.startsWith('已启用');
  const scopeRows = metadata.scopeRows?.length
    ? metadata.scopeRows
    : [{ label: '作用范围', value: metadata.scopeLabel }];
  const ruleRows = [
    ...scopeRows,
    { label: '判定规则', value: metadata.ruleLabel },
    { label: '违反结果', value: metadata.violationLabel, emphasize: true },
  ];

  if (compact) {
    return (
      <div className={cn('space-y-0.5 text-[9px] leading-snug text-muted-foreground', className)}>
        <p className={cn('font-medium', enabled ? 'text-foreground/90' : 'text-muted-foreground')}>
          {metadata.enabledLabel}
        </p>
        {ruleRows.map((row) => (
          <p key={row.label}>
            <span className="text-muted-foreground/80">{row.label}：</span>
            <span
              className={cn(
                row.emphasize && metadata.violationLabel === '阻断执行' && 'text-error',
              )}
            >
              {row.value}
            </span>
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border/60 bg-muted/8 p-4', className)}>
      <div className="mb-2 flex items-start gap-2">
        <ShieldAlert
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0',
            enabled ? 'text-error' : 'text-muted-foreground',
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">不可违反的硬约束</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            任何方案都不能突破的边界 · {constraintLabel}
          </p>
        </div>
      </div>

      <p
        className={cn(
          'mb-2 rounded-lg border px-3 py-1.5 text-sm font-semibold',
          enabled
            ? 'border-border/40 bg-muted/10 text-foreground'
            : 'border-border/60 bg-muted/20 text-muted-foreground',
        )}
      >
        {metadata.enabledLabel}
      </p>

      <dl className="space-y-2">
        {ruleRows.map((row) => (
          <div key={row.label} className="grid grid-cols-[4.5rem_1fr] gap-x-2 text-[11px]">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd
              className={cn(
                'leading-snug text-foreground/90',
                row.emphasize &&
                  metadata.violationLabel === '阻断执行' &&
                  'font-semibold text-error',
              )}
            >
              {row.value}
              {row.label === '判定规则' ? (
                <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
                  系统定义，不可直接编辑
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
