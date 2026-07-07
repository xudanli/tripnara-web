import { useState } from 'react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import type { ConstraintEditorScope, ConstraintEditorType } from './constraint-console-types';
import { isSoftConstraintId, hasFixedConstraintName, type MustGoPlaceSummary } from './constraint-console-view.util';
import { HardConstraintMetadataCard } from './HardConstraintMetadataCard';
import type { HardConstraintMetadata } from '@/lib/constraint-metadata.util';
import { MustGoPlacesEditor } from './MustGoPlacesEditor';
import { ConstraintScopeEditor } from './ConstraintScopeEditor';
import {
  CatalogHardConstraintFields,
  resolveCatalogHardTemplateId,
} from './CatalogHardConstraintFields';
import { resolveCatalogHardEditorSpec } from '@/lib/constraint-catalog-editor.util';
import {
  workbenchPrimaryAction,
  workbenchSegmentIdle,
  workbenchSegmentSelected,
  workbenchSliderTrack,
} from './workbench-ui';
import { CONSTRAINT_TRANSPORT_OPTIONS } from '@/lib/planning-constraint-edit-meta';
import type {
  ConstraintMemberOption,
  ConstraintRouteSegmentOption,
} from '@/lib/constraint-scope-options.util';

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
  /** 硬约束合同元数据（已启用 / 作用范围 / 判定规则 / 违反结果） */
  hardMetadata?: HardConstraintMetadata | null;
  /** 行程天数 · 作用范围 day 选择上限 */
  tripDayCount?: number;
  /** 协作中心成员 · 指定成员多选 */
  memberOptions?: ConstraintMemberOption[];
  /** 日程相邻 POI 路段 · 路线段选择 */
  routeSegmentOptions?: ConstraintRouteSegmentOption[];
  /** 覆盖主保存按钮文案（会话延迟保存时为「确认修改」） */
  saveLabel?: string;
  /** drawer 中栏：精简布局，影响预览在独立右栏 */
  layoutMode?: 'default' | 'drawer-column';
  /** drawer 中栏顶部 · 当前已保存的硬约束元数据 */
  savedHardMetadata?: HardConstraintMetadata | null;
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

function SavedHardConstraintSection({
  metadata,
  constraintLabel,
}: {
  metadata: HardConstraintMetadata;
  constraintLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-left transition-colors hover:bg-muted/20"
        >
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            当前已保存
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-foreground/90">{metadata.ruleLabel}</span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <HardConstraintMetadataCard
          metadata={metadata}
          constraintLabel={constraintLabel}
          className="p-3"
        />
      </CollapsibleContent>
    </Collapsible>
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
  hardMetadata,
  tripDayCount = 7,
  memberOptions = [],
  routeSegmentOptions = [],
  saveLabel = '保存约束',
  layoutMode = 'default',
  savedHardMetadata,
}: ConstraintEditorPanelProps) {
  const isDrawerColumn = layoutMode === 'drawer-column';
  const isSoft =
    (draft.type === 'SOFT' || isSoftConstraintId(draft.id)) &&
    draft.id !== 'travelers' &&
    draft.id !== 'transport';
  const isTimeRange = draft.id === 'time_range';
  const isBudget = draft.id === 'budget';
  const isTravelers = draft.id === 'travelers';
  const isTransport = draft.id === 'transport';
  const isDailyDrive = draft.id === 'daily_drive';
  const isAccommodation = draft.id === 'accommodation';
  const isMaxSegmentDistance =
    draft.id === 'max_segment_distance' || draft.id === 'c_max_segment_distance';
  const isMustGo = draft.id === 'must_go';
  const isRoadRestrictions = draft.id === 'road_restrictions';
  const isReadOnlyHard = isRoadRestrictions;
  const catalogTemplateId = resolveCatalogHardTemplateId(draft);
  const isCatalogHard = Boolean(catalogTemplateId);
  const catalogSpec = catalogTemplateId ? resolveCatalogHardEditorSpec(catalogTemplateId) : null;
  const showDedicatedValueEditor =
    isTimeRange ||
    isBudget ||
    isDailyDrive ||
    isMaxSegmentDistance ||
    isMustGo ||
    isRoadRestrictions ||
    isTravelers ||
    isTransport ||
    isAccommodation ||
    isCatalogHard;

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
          isDrawerColumn && 'py-2.5',
        )}
      >
        <h2 className="text-sm font-semibold">编辑约束</h2>
        {isDrawerColumn ? (
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            修改下方字段，点击「确认修改」后查看影响
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="whitespace-pre-line border-b border-destructive/30 bg-destructive/5 px-5 py-2.5 text-xs leading-relaxed text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto',
          isDrawerColumn ? 'space-y-3 px-4 py-3' : 'space-y-5 px-5 py-4',
        )}
      >
        {isDrawerColumn && !isSoft && savedHardMetadata ? (
          <SavedHardConstraintSection
            key={draft.id}
            metadata={savedHardMetadata}
            constraintLabel={draft.name}
          />
        ) : null}

        {!isDrawerColumn && !isSoft && hardMetadata ? (
          <HardConstraintMetadataCard
            metadata={hardMetadata}
            constraintLabel={draft.name}
          />
        ) : null}

        {isCatalogHard ? (
          <CatalogHardConstraintFields
            draft={draft}
            onChange={onChange}
            className={isDrawerColumn ? 'space-y-2 p-3' : undefined}
          />
        ) : null}

        {!isDrawerColumn ? (
        <div className="space-y-2">
          <Label className="text-xs">约束名称</Label>
          <Input
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-9 text-sm"
            disabled={hasFixedConstraintName(draft.id)}
          />
        </div>
        ) : null}

        {!isDrawerColumn && !isReadOnlyHard && !isTravelers && !isTransport && !isCatalogHard ? (
        <div className="space-y-4">
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
          <ConstraintScopeEditor
            value={draft.scopeBinding}
            onChange={(scopeBinding) => onChange({ scopeBinding })}
            tripDayCount={tripDayCount}
            showActivityScope={
              draft.id === 'max_daily_activity' ||
              draft.id === 'daily_drive' ||
              catalogTemplateId === 'max_daily_activity'
            }
            memberOptions={memberOptions}
            routeSegmentOptions={routeSegmentOptions}
          />
        </div>
        ) : isCatalogHard ? (
          <ConstraintScopeEditor
            value={draft.scopeBinding}
            onChange={(scopeBinding) => onChange({ scopeBinding })}
            tripDayCount={tripDayCount}
            showActivityScope={catalogTemplateId === 'max_daily_activity'}
            memberOptions={memberOptions}
            routeSegmentOptions={routeSegmentOptions}
            className={isDrawerColumn ? 'space-y-3 p-3' : undefined}
          />
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

        {isAccommodation ? (
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <Label className="text-xs">住宿标准（星级）</Label>
            <div className="flex flex-wrap gap-1.5">
              {[2, 3, 4, 5].map((stars) => (
                <button
                  key={stars}
                  type="button"
                  onClick={() => onChange({ targetValue: stars, targetUnit: 'star' })}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium tabular-nums transition-colors',
                    draft.targetValue === stars ? workbenchSegmentSelected : workbenchSegmentIdle,
                  )}
                >
                  {stars} 星
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {isDailyDrive ? (
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <Label className="text-xs">每日最大驾驶时长</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={12}
                step={0.5}
                value={draft.targetValue}
                onChange={(e) => onChange({ targetValue: Number(e.target.value) || 0 })}
                className="h-9 w-24 text-sm tabular-nums"
              />
              <span className="text-xs text-muted-foreground">小时</span>
            </div>
            <div className="space-y-2 border-t border-border/40 pt-3">
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

        {isBudget ? (
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <Label className="text-xs">总预算上限</Label>
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
              <p className="text-[11px] text-success tabular-nums">
                当前估算 {formatCurrency(budgetUsage, draft.currency ?? 'CNY')}
              </p>
            ) : null}
          </div>
        ) : null}

        {isSoft && !showDedicatedValueEditor ? (
          <div className="space-y-2">
            <Label className="text-xs">偏好强度</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                value={draft.targetValue}
                onChange={(e) => onChange({ targetValue: Number(e.target.value) || 0 })}
                className="h-9 w-20 text-sm tabular-nums"
              />
              <span className="flex h-9 flex-1 items-center text-xs text-muted-foreground">/ 100 强度</span>
            </div>
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

        {!isReadOnlyHard && catalogSpec?.fieldKind !== 'toggle_with_notes' ? (
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
      </div>

      <div
        className={cn(
          'flex shrink-0 flex-wrap justify-end gap-2 border-t border-border/50',
          isDrawerColumn ? 'px-4 py-2.5' : 'px-5 py-3',
        )}
      >
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
            {!isMustGo && !isDrawerColumn ? (
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
              {saveLabel}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
