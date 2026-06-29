import { useState } from 'react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarIcon, Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/utils/format';
import type { ConstraintEditorDraft, ConstraintEditorScope, ConstraintEditorType } from './constraint-console-types';
import { isSoftConstraintId, hasFixedConstraintName, type MustGoPlaceSummary } from './constraint-console-view.util';
import { MustGoPlacesEditor } from './MustGoPlacesEditor';
import {
  workbenchPrimaryAction,
  workbenchSegmentIdle,
  workbenchSegmentSelected,
  workbenchSliderTrack,
} from './workbench-ui';
import { CONSTRAINT_TRANSPORT_OPTIONS } from '@/lib/planning-constraint-edit-meta';

export interface ConstraintEditorPanelProps {
  draft: ConstraintEditorDraft;
  onChange: (patch: Partial<ConstraintEditorDraft>) => void;
  onCancel: () => void;
  onPreviewImpact: () => void;
  onSave: () => void;
  onRemoveSoft?: () => void;
  mustGoPlaces?: MustGoPlaceSummary[];
  onMustGoPlacesChange?: (places: MustGoPlaceSummary[]) => void;
  tripDestination?: string;
  saving?: boolean;
  budgetUsage?: number | null;
  className?: string;
  /** 嵌入 Dialog 时为右上角关闭按钮预留空间 */
  inDialog?: boolean;
  /** 保存失败时的内联提示（避免被侧栏遮挡） */
  errorMessage?: string | null;
}

function Segmented<T extends string>({
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
            'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
            value === opt.value ? workbenchSegmentSelected : workbenchSegmentIdle,
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (isoDate: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? parseISO(value) : undefined;

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn('h-9 w-full justify-start text-left text-xs font-normal', !date && 'text-muted-foreground')}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {date ? format(date, 'yyyy-MM-dd (EEE)', { locale: zhCN }) : '选择日期'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(next) => {
              if (next) {
                onChange(format(next, 'yyyy-MM-dd'));
                setOpen(false);
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** 中栏 · 编辑约束 */
export function ConstraintEditorPanel({
  draft,
  onChange,
  onCancel,
  onPreviewImpact,
  onSave,
  onRemoveSoft,
  mustGoPlaces = [],
  onMustGoPlacesChange,
  tripDestination,
  saving,
  budgetUsage,
  className,
  inDialog,
  errorMessage,
}: ConstraintEditorPanelProps) {
  const isSoft =
    (draft.type === 'SOFT' || isSoftConstraintId(draft.id)) &&
    draft.id !== 'travelers' &&
    draft.id !== 'transport';
  const isTimeRange = draft.id === 'time_range';
  const isBudget = draft.id === 'budget';
  const isTravelers = draft.id === 'travelers';
  const isTransport = draft.id === 'transport';
  const isDailyDrive = draft.id === 'daily_drive';
  const isMaxSegmentDistance =
    draft.id === 'max_segment_distance' || draft.id === 'c_max_segment_distance';
  const isMustGo = draft.id === 'must_go';
  const isRoadRestrictions = draft.id === 'road_restrictions';
  const isReadOnlyHard = isRoadRestrictions;
  const showTolerance = isDailyDrive;
  const showKmTarget = isMaxSegmentDistance;

  const handleDateRangeChange = (patch: Partial<Pick<ConstraintEditorDraft, 'startDate' | 'endDate'>>) => {
    const startDate = patch.startDate ?? draft.startDate;
    const endDate = patch.endDate ?? draft.endDate;
    if (startDate && endDate) {
      const days = Math.max(1, differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1);
      onChange({ ...patch, targetValue: days });
      return;
    }
    onChange(patch);
  };

  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-background', className)}>
      <div
        className={cn(
          'border-b border-border/50 px-5 py-3',
          inDialog && 'pr-12',
        )}
      >
        <h2 className="text-sm font-semibold">编辑约束</h2>
      </div>

      {errorMessage ? (
        <div className="whitespace-pre-line border-b border-destructive/30 bg-destructive/5 px-5 py-2.5 text-xs leading-relaxed text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div className="space-y-2">
          <Label className="text-xs">约束名称</Label>
          <Input
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-9 text-sm"
            disabled={hasFixedConstraintName(draft.id)}
          />
        </div>

        {!isReadOnlyHard && !isTravelers && !isTransport ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">约束类型</Label>
            <Segmented<ConstraintEditorType>
              value={draft.type}
              options={[
                { value: 'HARD', label: '硬约束' },
                { value: 'SOFT', label: '软偏好' },
              ]}
              onChange={(type) => onChange({ type })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">作用范围</Label>
            <Segmented<ConstraintEditorScope>
              value={draft.scope}
              options={[
                { value: 'TRIP', label: '全程' },
                { value: 'DAY', label: '特定日' },
                { value: 'MEMBER', label: '特定成员' },
              ]}
              onChange={(scope) => onChange({ scope })}
            />
          </div>
        </div>
        ) : null}

        {isTransport ? (
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <Label className="text-xs">基础交通方式</Label>
            <div className="flex flex-wrap gap-1.5">
              {CONSTRAINT_TRANSPORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange({ transportMode: option.value })}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    draft.transportMode === option.value
                      ? workbenchSegmentSelected
                      : workbenchSegmentIdle,
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              保存后系统将按此方式评估路线与时间轴交通段是否一致。
            </p>
          </div>
        ) : null}

        {isTravelers ? (
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <Label className="text-xs">出行人数</Label>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange({ targetValue: n })}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium tabular-nums transition-colors',
                    draft.targetValue === n ? workbenchSegmentSelected : workbenchSegmentIdle,
                  )}
                >
                  {n} 人
                </button>
              ))}
            </div>
            <Input
              type="number"
              min={1}
              max={20}
              value={draft.targetValue}
              onChange={(e) => onChange({ targetValue: Number(e.target.value) || 1 })}
              className="h-9 w-24 text-sm tabular-nums"
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              单人出行选 1 人即可；有协作者时在「同行者」Tab 对齐名单。
            </p>
          </div>
        ) : null}

        {isMustGo ? (
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <p className="text-xs font-medium text-foreground">必去地点清单</p>
            <MustGoPlacesEditor
              places={mustGoPlaces}
              destination={tripDestination}
              onChange={(places) => onMustGoPlacesChange?.(places)}
            />
          </div>
        ) : null}

        {isRoadRestrictions ? (
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <p className="text-xs font-medium text-foreground">道路开放监测</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{draft.reason || '暂无详情'}</p>
          </div>
        ) : null}

        {isMaxSegmentDistance ? (
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">单段最长行驶距离</Label>
              <span className="text-xs text-muted-foreground">ROUTE_SEGMENT · HARD</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">≤</span>
              <Input
                type="number"
                min={50}
                step={10}
                value={draft.targetValue}
                onChange={(e) => onChange({ targetValue: Number(e.target.value) || 0 })}
                className="h-9 w-24 text-sm tabular-nums"
              />
              <span className="text-xs text-muted-foreground">km</span>
            </div>
            {draft.reason ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground">{draft.reason}</p>
            ) : null}
          </div>
        ) : null}

        {isTimeRange ? (
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs">行程日期</Label>
              <span className="text-xs font-medium text-foreground tabular-nums">{draft.targetValue} 天</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <DateField
                label="出发日期"
                value={draft.startDate}
                onChange={(startDate) => handleDateRangeChange({ startDate })}
              />
              <DateField
                label="返程日期"
                value={draft.endDate}
                onChange={(endDate) => handleDateRangeChange({ endDate })}
              />
            </div>
          </div>
        ) : null}

        {!isTimeRange && !isReadOnlyHard && !isMaxSegmentDistance && !isTravelers && !isTransport ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">{isSoft ? '偏好强度' : '目标设定'}</Label>
              {isBudget ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={draft.targetValue}
                      onChange={(e) => onChange({ targetValue: Number(e.target.value) || 0 })}
                      className="h-9 flex-1 text-sm tabular-nums"
                    />
                    <span className="flex h-9 items-center text-xs text-muted-foreground">
                      {draft.currency ?? 'CNY'}
                    </span>
                  </div>
                  {budgetUsage != null ? (
                    <p className="text-[11px] text-gate-allow-foreground tabular-nums">
                      当前估算 {formatCurrency(budgetUsage, draft.currency ?? 'CNY')}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    step={isDailyDrive ? 0.5 : 1}
                    value={draft.targetValue}
                    onChange={(e) => onChange({ targetValue: Number(e.target.value) || 0 })}
                    className="h-9 w-20 text-sm tabular-nums"
                  />
                  {!isSoft ? (
                    <Select
                      value={draft.targetUnit}
                      onValueChange={(targetUnit) =>
                        onChange({ targetUnit: targetUnit as ConstraintEditorDraft['targetUnit'] })
                      }
                    >
                      <SelectTrigger className="h-9 flex-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hour">小时</SelectItem>
                        <SelectItem value="day">天</SelectItem>
                        <SelectItem value="currency">金额</SelectItem>
                        <SelectItem value="star">星级</SelectItem>
                        <SelectItem value="km">公里</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="flex h-9 flex-1 items-center text-xs text-muted-foreground">
                      / 100 强度
                    </span>
                  )}
                </div>
              )}
            </div>
            {showTolerance ? (
              <div className="space-y-2">
                <Label className="text-xs">容差范围（可选）</Label>
                <div className="flex gap-2">
                  <Select
                    value={draft.toleranceMode}
                    onValueChange={(toleranceMode) =>
                      onChange({
                        toleranceMode: toleranceMode as ConstraintEditorDraft['toleranceMode'],
                      })
                    }
                  >
                    <SelectTrigger className="h-9 flex-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不允许超出</SelectItem>
                      <SelectItem value="allow_over">允许不超出上限</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    value={draft.toleranceMinutes}
                    disabled={draft.toleranceMode === 'none'}
                    onChange={(e) => onChange({ toleranceMinutes: Number(e.target.value) || 0 })}
                    className="h-9 w-20 text-xs tabular-nums"
                  />
                  <span className="flex h-9 items-center text-xs text-muted-foreground">分钟</span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {!isReadOnlyHard ? (
        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-xs">优先级</Label>
            <span className="text-xs font-medium text-foreground">
              {draft.priority >= 7 ? '高' : draft.priority >= 4 ? '中' : '低'}（{draft.priority}/10）
            </span>
          </div>
          <Slider
            value={[draft.priority]}
            min={1}
            max={10}
            step={1}
            className={workbenchSliderTrack}
            onValueChange={(v) => onChange({ priority: v[0] ?? draft.priority })}
          />
          {!isSoft ? (
            <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-3">
              <div>
                <Label className="text-xs">锁定约束</Label>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  锁定后 AI 不可自动放宽或移除此约束
                </p>
              </div>
              <Switch checked={draft.locked} onCheckedChange={(locked) => onChange({ locked })} />
            </div>
          ) : null}
        </div>
        ) : null}

        {!isReadOnlyHard ? (
        <div className="space-y-2">
          <Label className="text-xs">约束原因（可选）</Label>
          <Textarea
            value={draft.reason}
            onChange={(e) => onChange({ reason: e.target.value })}
            placeholder="说明设置此约束的原因，便于团队理解…"
            className="min-h-[72px] resize-none text-sm"
          />
        </div>
        ) : null}

        {!isSoft && !isReadOnlyHard && !isTravelers && !isTransport ? (
          <div className="space-y-2">
            <Label className="text-xs">适用于（可选）</Label>
            <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-4 w-4" />
                默认适用于全部成员
              </div>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]">
                <Plus className="h-3 w-3" />
                添加成员
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border/50 px-5 py-3">
        {isSoft && onRemoveSoft ? (
          <Button
            variant="outline"
            size="sm"
            className="mr-auto h-9 text-xs text-destructive hover:text-destructive"
            onClick={onRemoveSoft}
          >
            移除偏好
          </Button>
        ) : null}
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={onCancel}>
          {isRoadRestrictions ? '关闭' : '取消'}
        </Button>
        {!isRoadRestrictions ? (
          <>
            {!isMustGo ? (
              <Button variant="outline" size="sm" className="h-9 text-xs" onClick={onPreviewImpact}>
                先预览影响
              </Button>
            ) : null}
            <Button
              size="sm"
              className={cn('h-9 text-xs', workbenchPrimaryAction)}
              disabled={saving}
              onClick={onSave}
            >
              保存约束
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
