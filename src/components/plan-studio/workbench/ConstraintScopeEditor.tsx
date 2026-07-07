import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ConstraintScopeBinding, ConstraintTemporalScope } from '@/types/constraint-scope';
import {
  DEFAULT_CONSTRAINT_SCOPE_BINDING,
  normalizeScopeBinding,
  temporalKindOptions,
} from '@/lib/constraint-scope.util';
import type {
  ConstraintMemberOption,
  ConstraintRouteSegmentOption,
} from '@/lib/constraint-scope-options.util';
import { workbenchSegmentIdle, workbenchSegmentSelected } from './workbench-ui';

export interface ConstraintScopeEditorProps {
  value?: ConstraintScopeBinding | null;
  onChange: (binding: ConstraintScopeBinding) => void;
  tripDayCount?: number;
  showActivityScope?: boolean;
  memberOptions?: ConstraintMemberOption[];
  routeSegmentOptions?: ConstraintRouteSegmentOption[];
  className?: string;
}

function SegmentedKind<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors',
            value === opt.value ? workbenchSegmentSelected : workbenchSegmentIdle,
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MemberMultiSelect({
  options,
  selectedIds,
  onChange,
}: {
  options: ConstraintMemberOption[];
  selectedIds: string[];
  onChange: (memberIds: string[], labels: string[]) => void;
}) {
  if (!options.length) {
    return (
      <p className="text-[11px] text-muted-foreground">
        暂无成员数据。请在协作中心配置团队成员，或先在行程中设置出行人数。
      </p>
    );
  }

  const toggle = (option: ConstraintMemberOption) => {
    const nextIds = selectedIds.includes(option.id)
      ? selectedIds.filter((id) => id !== option.id)
      : [...selectedIds, option.id];
    const labels = options.filter((o) => nextIds.includes(o.id)).map((o) => o.label);
    onChange(nextIds, labels);
  };

  return (
    <div className="space-y-2 rounded-lg border border-border/50 bg-background/60 p-2.5">
      {options.map((option) => (
        <label key={option.id} className="flex cursor-pointer items-center gap-2 text-xs">
          <Checkbox
            checked={selectedIds.includes(option.id)}
            onCheckedChange={() => toggle(option)}
          />
          <span>{option.label}</span>
          {option.role ? (
            <span className="text-[10px] text-muted-foreground">({option.role})</span>
          ) : null}
        </label>
      ))}
    </div>
  );
}

/** 作用范围 · 时间/成员/阶段/活动 */
export function ConstraintScopeEditor({
  value,
  onChange,
  tripDayCount = 7,
  showActivityScope = false,
  memberOptions = [],
  routeSegmentOptions = [],
  className,
}: ConstraintScopeEditorProps) {
  const binding = normalizeScopeBinding(value ?? DEFAULT_CONSTRAINT_SCOPE_BINDING);

  const patch = (partial: Partial<ConstraintScopeBinding>) => {
    onChange(normalizeScopeBinding({ ...binding, ...partial }));
  };

  const setTemporal = (kind: ConstraintTemporalScope['kind']) => {
    switch (kind) {
      case 'trip':
        patch({ temporal: { kind: 'trip' } });
        break;
      case 'day':
        patch({ temporal: { kind: 'day', dayNumber: 1 } });
        break;
      case 'day_range':
        patch({ temporal: { kind: 'day_range', dayFrom: 1, dayTo: Math.min(2, tripDayCount) } });
        break;
      case 'route_segment':
        if (routeSegmentOptions.length) {
          const first = routeSegmentOptions[0]!;
          patch({
            temporal: {
              kind: 'route_segment',
              segmentId: first.segmentId,
              label: first.label,
              dayNumber: first.dayNumber,
              fromItemId: first.fromItemId,
              toItemId: first.toItemId,
            },
          });
        } else {
          patch({ temporal: { kind: 'route_segment', label: '' } });
        }
        break;
      case 'destination':
        patch({ temporal: { kind: 'destination', label: '' } });
        break;
    }
  };

  const selectedMemberIds =
    binding.member.kind === 'members' ? binding.member.memberIds : [];

  const routeSegmentValue =
    binding.temporal.kind === 'route_segment' ? binding.temporal.segmentId ?? '' : '';

  return (
    <div className={cn('space-y-4 rounded-xl border border-border/60 bg-muted/8 p-4', className)}>
      <div>
        <p className="text-xs font-semibold text-foreground">作用范围</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          明确约束影响哪里，避免被系统错误地全局应用。
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">影响哪里</Label>
        <SegmentedKind
          value={binding.temporal.kind}
          options={temporalKindOptions()}
          onChange={setTemporal}
        />
        {binding.temporal.kind === 'day' ? (
          <div className="flex items-center gap-2">
            <Label className="shrink-0 text-[11px] text-muted-foreground">第</Label>
            <Input
              type="number"
              min={1}
              max={tripDayCount}
              value={binding.temporal.dayNumber}
              onChange={(e) =>
                patch({
                  temporal: {
                    kind: 'day',
                    dayNumber: Number(e.target.value) || 1,
                  },
                })
              }
              className="h-8 w-20 text-xs"
            />
            <span className="text-[11px] text-muted-foreground">天</span>
          </div>
        ) : null}
        {binding.temporal.kind === 'day_range' ? (
          <div className="flex flex-wrap items-center gap-2">
            <Label className="shrink-0 text-[11px] text-muted-foreground">第</Label>
            <Input
              type="number"
              min={1}
              max={tripDayCount}
              value={binding.temporal.dayFrom}
              onChange={(e) =>
                patch({
                  temporal: {
                    kind: 'day_range',
                    dayFrom: Number(e.target.value) || 1,
                    dayTo: binding.temporal.kind === 'day_range' ? binding.temporal.dayTo : 1,
                  },
                })
              }
              className="h-8 w-16 text-xs"
            />
            <span className="text-[11px] text-muted-foreground">—</span>
            <Input
              type="number"
              min={1}
              max={tripDayCount}
              value={binding.temporal.kind === 'day_range' ? binding.temporal.dayTo : 1}
              onChange={(e) =>
                patch({
                  temporal: {
                    kind: 'day_range',
                    dayFrom: binding.temporal.kind === 'day_range' ? binding.temporal.dayFrom : 1,
                    dayTo: Number(e.target.value) || 1,
                  },
                })
              }
              className="h-8 w-16 text-xs"
            />
            <span className="text-[11px] text-muted-foreground">天</span>
          </div>
        ) : null}
        {binding.temporal.kind === 'route_segment' ? (
          routeSegmentOptions.length ? (
            <Select
              value={routeSegmentValue || undefined}
              onValueChange={(segmentId) => {
                const option = routeSegmentOptions.find((o) => o.segmentId === segmentId);
                if (!option) return;
                patch({
                  temporal: {
                    kind: 'route_segment',
                    segmentId: option.segmentId,
                    label: option.label,
                    dayNumber: option.dayNumber,
                    fromItemId: option.fromItemId,
                    toItemId: option.toItemId,
                  },
                });
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="选择行程中的路段" />
              </SelectTrigger>
              <SelectContent>
                {routeSegmentOptions.map((option) => (
                  <SelectItem key={option.segmentId} value={option.segmentId} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={binding.temporal.label ?? ''}
              onChange={(e) =>
                patch({
                  temporal: { kind: 'route_segment', label: e.target.value },
                })
              }
              placeholder="暂无日程路段，可手动输入（例如：D2 高地 F 路）"
              className="h-8 text-xs"
            />
          )
        ) : null}
        {binding.temporal.kind === 'destination' ? (
          <Input
            value={binding.temporal.label ?? ''}
            onChange={(e) =>
              patch({
                temporal: { kind: 'destination', label: e.target.value },
              })
            }
            placeholder="例如：南岸 · 维克"
            className="h-8 text-xs"
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">成员</Label>
        <SegmentedKind
          value={binding.member.kind}
          options={[
            { value: 'all', label: '全体成员' },
            { value: 'primary_driver', label: '主驾驶人' },
            { value: 'members', label: '指定成员' },
          ]}
          onChange={(kind) => {
            if (kind === 'primary_driver') {
              patch({ member: { kind: 'primary_driver', label: '主驾驶人' } });
            } else if (kind === 'members') {
              patch({ member: { kind: 'members', memberIds: [], labels: [] } });
            } else {
              patch({ member: { kind: 'all' } });
            }
          }}
        />
        {binding.member.kind === 'members' ? (
          <MemberMultiSelect
            options={memberOptions}
            selectedIds={selectedMemberIds}
            onChange={(memberIds, labels) =>
              patch({
                member: {
                  kind: 'members',
                  memberIds,
                  labels: labels.length ? labels : undefined,
                },
              })
            }
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">生效阶段</Label>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={binding.phase.planning}
              onCheckedChange={(checked) =>
                patch({ phase: { ...binding.phase, planning: checked === true } })
              }
            />
            规划阶段
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={binding.phase.execution}
              onCheckedChange={(checked) =>
                patch({ phase: { ...binding.phase, execution: checked === true } })
              }
            />
            执行阶段
          </label>
        </div>
      </div>

      {showActivityScope ? (
        <div className="space-y-2">
          <Label className="text-xs">活动类型（可选）</Label>
          <Input
            value={binding.activity?.label ?? ''}
            onChange={(e) =>
              patch({
                activity: e.target.value.trim()
                  ? { kind: 'activity_type', label: e.target.value.trim() }
                  : { kind: 'all' },
              })
            }
            placeholder="例如：驾驶 · 徒步 · 观鸟"
            className="h-8 text-xs"
          />
        </div>
      ) : null}
    </div>
  );
}
