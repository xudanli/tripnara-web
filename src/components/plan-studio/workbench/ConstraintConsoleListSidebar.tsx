import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  workbenchColumnSurface,
  workbenchPanelHeader,
  workbenchPanelTitle,
  workbenchSliderTrack,
} from './workbench-ui';
import type { ConstraintListEntry } from './constraint-console-types';
import type { ConstraintConsolePartition } from '@/lib/constraint-console-partition.util';
import { canShowConstraintDelete, canShowConstraintEdit } from '@/lib/constraint-console-partition.util';
import { ConstraintListItemRow } from './ConstraintListItemRow';
import { ConstraintListEditButton } from './ConstraintListEditButton';
import { sliderToSoftPriority, softPriorityLabelClass } from './constraint-console-view.util';

function ListSection({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle?: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="mb-3">
      <div className="mb-1 px-1">
        <p className="text-[10px] font-semibold text-foreground">
          {title} {count}
        </p>
        {subtitle ? (
          <p className="text-[9px] leading-tight text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <ul className="space-y-1">{children}</ul>
    </section>
  );
}

export interface ConstraintConsoleListSidebarProps {
  partition: ConstraintConsolePartition;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEditItem?: (id: string) => void;
  onAddConstraint?: () => void;
  onSoftSliderChange?: (id: string, value: number) => void;
  onRemoveSoftPreference?: (id: string) => void;
  onViewRepair?: (issueId: string) => void;
  onOpenFeasibilityReport?: () => void;
  repairing?: boolean;
  className?: string;
}

export function ConstraintConsoleListSidebar({
  partition,
  selectedId,
  onSelect,
  onEditItem,
  onAddConstraint,
  onSoftSliderChange,
  onRemoveSoftPreference,
  onViewRepair,
  onOpenFeasibilityReport,
  repairing,
  className,
}: ConstraintConsoleListSidebarProps) {
  const { userHardItems, userSoftItems, officialRuleItems, worldFeasibilityItem } = partition;

  return (
    <aside className={cn('flex h-full flex-col border-r border-border/60', workbenchColumnSurface, className)}>
      <div className={cn(workbenchPanelHeader, 'flex items-center justify-between')}>
        <h2 className={workbenchPanelTitle}>约束与偏好</h2>
        <Button
          variant="outline"
          size="sm"
          className="h-6 gap-0.5 rounded-md px-2 text-[10px]"
          onClick={onAddConstraint}
        >
          <Plus className="h-3 w-3" />
          添加
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        <ListSection title="你的约束" subtitle="HARD / SOFT · 可编辑" count={userHardItems.length + userSoftItems.length}>
          {userHardItems.map((item) => (
            <li key={item.id}>
              <ConstraintListItemRow
                item={item}
                selected={selectedId === item.id}
                onSelect={() => onSelect(item.id)}
                onEdit={onEditItem ? () => onEditItem(item.id) : undefined}
                onViewRepair={onViewRepair}
                repairing={repairing}
              />
            </li>
          ))}
          {userSoftItems.length === 0 && userHardItems.length === 0 ? (
            <li className="px-1 py-2 text-[11px] text-muted-foreground">暂无约束，点击「添加」从模板启用。</li>
          ) : null}
          {userSoftItems.map((item) => {
            const selected = selectedId === item.id;
            const priority = item.sliderValue != null ? sliderToSoftPriority(item.sliderValue) : '中';
            return (
              <li key={item.id}>
                <div
                  className={cn(
                    'group rounded-lg border px-2.5 py-2',
                    selected ? 'border-foreground/15 bg-muted/50 ring-1 ring-foreground/8' : 'border-transparent bg-transparent',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelect(item.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs"
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <Badge
                        variant="outline"
                        className={cn('h-4 px-1 text-[9px] font-normal', softPriorityLabelClass(priority))}
                      >
                        {priority}
                      </Badge>
                    </button>
                    {onEditItem && canShowConstraintEdit(item) ? (
                      <ConstraintListEditButton label={item.label} onClick={() => onEditItem(item.id)} />
                    ) : null}
                    {onRemoveSoftPreference && canShowConstraintDelete(item) ? (
                      <button
                        type="button"
                        className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={`移除 ${item.label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveSoftPreference(item.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                  {item.sliderValue != null && onSoftSliderChange ? (
                    <div className="mt-2 pl-5">
                      <Slider
                        value={[item.sliderValue]}
                        max={100}
                        step={1}
                        className={workbenchSliderTrack}
                        onValueChange={(v) => onSoftSliderChange(item.id, v[0] ?? 0)}
                      />
                      {item.value ? (
                        <p className="mt-1 text-[10px] tabular-nums text-gate-allow-foreground">{item.value}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ListSection>

        {officialRuleItems.length > 0 ? (
          <ListSection title="目的地规则" subtitle="EXTERNAL · OFFICIAL_RULE · 只读" count={officialRuleItems.length}>
            {officialRuleItems.map((item) => (
              <li key={item.id}>
                <ConstraintListItemRow
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={() => onSelect(item.id)}
                  onViewRepair={onViewRepair}
                  repairing={repairing}
                />
              </li>
            ))}
          </ListSection>
        ) : null}

        {worldFeasibilityItem ? (
          <ListSection title="实时验证" subtitle="c_world_feasibility" count={1}>
            <li>
              <ConstraintListItemRow
                item={worldFeasibilityItem}
                selected={selectedId === worldFeasibilityItem.id}
                onSelect={() => onSelect(worldFeasibilityItem.id)}
                layout="stacked"
              />
              <div className="mt-1 px-1">
                {worldFeasibilityItem.lastVerifiedAt ? (
                  <p className="text-[9px] text-muted-foreground">
                    上次验证：{new Date(worldFeasibilityItem.lastVerifiedAt).toLocaleString('zh-CN')}
                  </p>
                ) : null}
                {worldFeasibilityItem.verificationStatus === 'OUTDATED' ? (
                  <p className="text-[9px] text-gate-confirm-foreground">验证结果已过期，建议重新检查</p>
                ) : null}
                {onOpenFeasibilityReport ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1.5 h-6 w-full text-[10px]"
                    onClick={onOpenFeasibilityReport}
                  >
                    查看可行性报告
                  </Button>
                ) : null}
              </div>
            </li>
          </ListSection>
        ) : null}
      </div>
    </aside>
  );
}
