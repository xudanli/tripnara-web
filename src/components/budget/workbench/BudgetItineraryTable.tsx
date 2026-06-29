import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { workbenchInsetSection } from '@/components/plan-studio/workbench/workbench-ui';
import { formatLedgerCategoryLabel } from '@/lib/trip-budget-expense';
import { formatCurrency } from '@/utils/format';
import type { BudgetLineRow } from './budget-planning.util';
import { Pencil, Star, Trash2 } from 'lucide-react';

export interface BudgetItineraryTableProps {
  rows: BudgetLineRow[];
  currency: string;
  isZh: boolean;
  onEditRow?: (row: BudgetLineRow) => void;
}

function statusBadge(row: BudgetLineRow, isZh: boolean) {
  switch (row.status) {
    case 'fluctuation':
      return { label: isZh ? '价格波动' : 'Fluctuation', className: 'border-gate-confirm-border bg-gate-confirm/15 text-gate-confirm-foreground' };
    case 'unpaid':
      return { label: isZh ? '待支付' : 'Unpaid', className: 'border-border bg-muted text-muted-foreground' };
    case 'actual':
      return { label: isZh ? '已记账' : 'Recorded', className: 'border-gate-allow-border bg-gate-allow/15 text-gate-allow-foreground' };
    default:
      return { label: isZh ? '已估算' : 'Estimated', className: 'border-border bg-muted/40 text-foreground' };
  }
}

export function BudgetItineraryTable({ rows, currency, isZh, onEditRow }: BudgetItineraryTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-xs text-muted-foreground">
        {isZh ? '暂无行程预算明细，请在时间轴或钱包中录入费用' : 'No itinerary budget lines yet.'}
      </div>
    );
  }

  return (
    <section className={cn(workbenchInsetSection, 'overflow-hidden p-0')}>
      <div className="border-b border-border/60 px-3 py-2.5">
        <p className="text-sm font-semibold tracking-tight">{isZh ? '行程预算明细' : 'Itinerary budget details'}</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8 text-[11px]">{isZh ? '日期' : 'Date'}</TableHead>
              <TableHead className="h-8 text-[11px]">{isZh ? '项目' : 'Item'}</TableHead>
              <TableHead className="h-8 text-[11px]">{isZh ? '类别' : 'Category'}</TableHead>
              <TableHead className="h-8 text-[11px]">{isZh ? '计划金额' : 'Planned'}</TableHead>
              <TableHead className="h-8 text-[11px]">{isZh ? '置信度' : 'Confidence'}</TableHead>
              <TableHead className="h-8 text-[11px]">{isZh ? '状态' : 'Status'}</TableHead>
              <TableHead className="h-8 w-16 text-[11px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const badge = statusBadge(row, isZh);
              const catLabel =
                row.category != null ? formatLedgerCategoryLabel(row.category, isZh) : '—';
              return (
                <TableRow key={`${row.source}-${row.id}`} className="text-xs">
                  <TableCell className="py-2 tabular-nums text-muted-foreground">
                    {row.date?.slice(5) ?? '—'}
                  </TableCell>
                  <TableCell className="max-w-[140px] truncate py-2 font-medium">{row.name}</TableCell>
                  <TableCell className="py-2 text-muted-foreground">{catLabel}</TableCell>
                  <TableCell className="py-2 tabular-nums">
                    {formatCurrency(row.plannedAmount, currency)}
                  </TableCell>
                  <TableCell className="py-2">
                    {row.confidence != null ? (
                      <span className="inline-flex items-center gap-0.5 tabular-nums text-muted-foreground">
                        {Math.round(row.confidence * 100)}%
                        <Star className="h-3 w-3 fill-muted-foreground/40 text-muted-foreground/40" />
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className={cn('text-[10px] font-normal', badge.className)}>
                      {badge.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    {row.editable && onEditRow ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEditRow(row)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled>
                        <Trash2 className="h-3.5 w-3.5 opacity-30" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
