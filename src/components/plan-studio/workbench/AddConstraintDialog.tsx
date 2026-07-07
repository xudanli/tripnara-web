import { useEffect, useMemo, useState } from 'react';
import { Check, Leaf, Lock, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  SheetLayerDialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ConstraintPendingKey } from '@/types/planning-constraints';
import type { TripDetail } from '@/types/trip';
import {
  getVisibleConstraintTemplates,
  groupHardConstraintTemplates,
  isBatchAddableConstraintTemplate,
  resolveTemplateSelection,
  splitConstraintTemplates,
  type ConstraintTemplate,
} from './constraint-templates';
import { SOFT_PREFER_SECTION_INTRO, SOFT_PREFER_EXAMPLE_BULLETS } from '@/lib/soft-constraint.util';
import {
  workbenchCard,
  workbenchCustomSoftSurface,
  workbenchNlSurface,
  workbenchPrimaryAction,
  workbenchSegmentIdle,
  workbenchSegmentSelected,
} from './workbench-ui';

export interface AddConstraintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip?: TripDetail | null;
  /** 已启用的软偏好 id（模板 + 自定义） */
  activeSoftIds?: string[];
  configuredHardIds?: string[];
  onSelectTemplate: (constraintId: string, template: ConstraintTemplate) => void;
  onBatchAddTemplates?: (templates: ConstraintTemplate[]) => Promise<number>;
  onAddCustomSoft?: (label: string, options?: { openEditor?: boolean }) => void;
  onOpenLegacyEditor?: (key: ConstraintPendingKey) => void;
  onNaturalLanguageSubmit?: (text: string) => void;
}

type AddConstraintTab = 'hard' | 'soft';

function TabSwitch({
  value,
  onChange,
  hardCount,
  softCount,
}: {
  value: AddConstraintTab;
  onChange: (tab: AddConstraintTab) => void;
  hardCount: number;
  softCount: number;
}) {
  const tabs: Array<{ id: AddConstraintTab; label: string; icon: typeof Lock; count: number }> = [
    { id: 'hard', label: '硬约束', icon: Lock, count: hardCount },
    { id: 'soft', label: '软偏好', icon: Leaf, count: softCount },
  ];
  return (
    <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/20 p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors',
              selected ? workbenchSegmentSelected : workbenchSegmentIdle,
            )}
          >
            <Icon className={cn('h-3.5 w-3.5', tab.id === 'soft' && 'text-success/90')} />
            {tab.label}
            {tab.count > 0 ? (
              <span className="tabular-nums text-[10px] text-muted-foreground">({tab.count})</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function TemplateCard({
  template,
  badge,
  selected = false,
  batchSelectable = false,
  onClick,
}: {
  template: ConstraintTemplate;
  badge?: { label: string; tone?: 'neutral' | 'success' };
  selected?: boolean;
  batchSelectable?: boolean;
  onClick: () => void;
}) {
  const Icon = template.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={batchSelectable ? selected : undefined}
      className={cn(
        workbenchCard,
        'relative p-3 text-left transition-colors hover:border-foreground/15 hover:bg-muted/25',
        batchSelectable && selected && 'border-border bg-muted/10 ring-1 ring-gate-suggest-border/50',
      )}
    >
      {batchSelectable ? (
        <span
          className={cn(
            'absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded border',
            selected
              ? 'border-border bg-muted text-foreground'
              : 'border-border/70 bg-background',
          )}
          aria-hidden
        >
          {selected ? <Check className="h-2.5 w-2.5" /> : null}
        </span>
      ) : null}
      <div className="flex items-start gap-2.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </span>
        <span className="min-w-0 flex-1 pr-4">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">{template.label}</span>
            {badge ? (
              <Badge
                variant="outline"
                className={cn(
                  'h-4 px-1 text-[9px] font-normal',
                  badge.tone === 'success'
                    ? 'border-border text-success'
                    : 'border-border text-muted-foreground',
                )}
              >
                {badge.label}
              </Badge>
            ) : null}
          </span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
            {template.description}
          </span>
        </span>
      </div>
    </button>
  );
}

/** 添加约束 · 硬约束 / 软偏好分栏 · 支持模板多选批量添加 */
export function AddConstraintDialog({
  open,
  onOpenChange,
  trip,
  activeSoftIds = [],
  configuredHardIds = [],
  onSelectTemplate,
  onBatchAddTemplates,
  onAddCustomSoft,
  onOpenLegacyEditor,
  onNaturalLanguageSubmit,
}: AddConstraintDialogProps) {
  const [tab, setTab] = useState<AddConstraintTab>('hard');
  const [nlText, setNlText] = useState('');
  const [customSoftLabel, setCustomSoftLabel] = useState('');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [batchAdding, setBatchAdding] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedTemplateIds(new Set());
      setNlText('');
      setCustomSoftLabel('');
      setBatchAdding(false);
    }
  }, [open]);

  const templates = useMemo(() => getVisibleConstraintTemplates(trip), [trip]);
  const { soft } = useMemo(() => splitConstraintTemplates(templates), [templates]);
  const activeSoftSet = useMemo(() => new Set(activeSoftIds), [activeSoftIds]);
  const configuredHardSet = useMemo(() => new Set(configuredHardIds), [configuredHardIds]);
  const hardGroups = useMemo(
    () =>
      groupHardConstraintTemplates(templates)
        .map((group) => ({
          ...group,
          items: group.items.filter((template) => !configuredHardSet.has(template.id)),
        }))
        .filter((group) => group.items.length > 0),
    [templates, configuredHardSet],
  );
  const hardTemplateCount = useMemo(
    () => hardGroups.reduce((sum, group) => sum + group.items.length, 0),
    [hardGroups],
  );

  const availableSoft = useMemo(
    () => soft.filter((template) => !activeSoftSet.has(template.id)),
    [soft, activeSoftSet],
  );

  const visibleTemplates = tab === 'hard'
    ? hardGroups.flatMap((group) => group.items)
    : availableSoft;

  const batchableVisibleCount = useMemo(
    () => visibleTemplates.filter(isBatchAddableConstraintTemplate).length,
    [visibleTemplates],
  );

  const selectedTemplates = useMemo(
    () => visibleTemplates.filter((template) => selectedTemplateIds.has(template.id)),
    [visibleTemplates, selectedTemplateIds],
  );

  const toggleTemplateSelection = (template: ConstraintTemplate) => {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      if (next.has(template.id)) next.delete(template.id);
      else next.add(template.id);
      return next;
    });
  };

  const handlePick = (template: ConstraintTemplate) => {
    if (isBatchAddableConstraintTemplate(template)) {
      toggleTemplateSelection(template);
      return;
    }

    const resolved = resolveTemplateSelection(template);
    onOpenChange(false);
    setNlText('');
    setCustomSoftLabel('');
    setSelectedTemplateIds(new Set());
    if (resolved.mode === 'legacy') {
      onOpenLegacyEditor?.(resolved.key);
      return;
    }
    onSelectTemplate(resolved.constraintId, template);
  };

  const handleBatchAdd = async (finish: boolean) => {
    if (!onBatchAddTemplates || selectedTemplates.length === 0 || batchAdding) return;
    setBatchAdding(true);
    try {
      const added = await onBatchAddTemplates(selectedTemplates);
      if (added > 0) {
        setSelectedTemplateIds(new Set());
      }
      if (finish) {
        onOpenChange(false);
      }
    } finally {
      setBatchAdding(false);
    }
  };

  const handleNlSubmit = () => {
    const text = nlText.trim();
    if (!text) return;
    onOpenChange(false);
    setNlText('');
    onNaturalLanguageSubmit?.(text);
  };

  const handleCustomSoftSubmit = (finish: boolean) => {
    const label = customSoftLabel.trim();
    if (!label) return;
    onAddCustomSoft?.(label, { openEditor: finish });
    setCustomSoftLabel('');
    if (finish) {
      onOpenChange(false);
    }
  };

  const tabDescription =
    tab === 'hard'
      ? '不可违反的边界条件，违反将阻断或需确认调整。'
      : SOFT_PREFER_SECTION_INTRO;

  const showBatchFooter = batchableVisibleCount > 0 && onBatchAddTemplates != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetLayerDialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-5 py-4 text-left">
          <DialogTitle className="text-base">添加约束</DialogTitle>
          <DialogDescription className="text-xs">{tabDescription}</DialogDescription>
        </DialogHeader>

        <div className="border-b border-border/60 px-5 py-3">
          <TabSwitch
            value={tab}
            onChange={(nextTab) => {
              setTab(nextTab);
              setSelectedTemplateIds(new Set());
            }}
            hardCount={hardTemplateCount}
            softCount={availableSoft.length}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === 'hard' ? (
            <div className="space-y-4">
              <p className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                {showBatchFooter
                  ? '点击模板可多选；需单独配置的项点击后直接打开编辑器。已配置的硬约束不会重复出现。'
                  : '硬约束按时间、预算、人员、风险等分类选用；已配置的项不会重复出现在列表中。'}
              </p>
              {hardGroups.length > 0 ? (
                hardGroups.map((group) => (
                  <section key={group.category}>
                    <p className="mb-2 text-xs font-semibold text-foreground">{group.label}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.items.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          batchSelectable={isBatchAddableConstraintTemplate(template)}
                          selected={selectedTemplateIds.has(template.id)}
                          onClick={() => handlePick(template)}
                        />
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-center text-xs text-muted-foreground">
                  当前可用的硬约束模板均已配置。如需修改，请在约束控制台中选中对应项编辑。
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-border/40 bg-muted/5 px-3 py-2.5">
                <p className="text-[11px] leading-relaxed text-muted-foreground">{SOFT_PREFER_SECTION_INTRO}</p>
                <ul className="mt-2 space-y-0.5">
                  {SOFT_PREFER_EXAMPLE_BULLETS.slice(0, 4).map((line) => (
                    <li key={line} className="text-[10px] text-muted-foreground">
                      · {line}
                    </li>
                  ))}
                </ul>
              </div>
              <section className={workbenchNlSurface}>
                <Label htmlFor="constraint-nl" className="flex items-center gap-1.5 text-xs font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                  自然语言描述（可选）
                </Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    id="constraint-nl"
                    value={nlText}
                    onChange={(e) => setNlText(e.target.value)}
                    placeholder="例如：尽量安排温泉，但不要连续两天早起…"
                    className="h-9 flex-1 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNlSubmit();
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 text-xs"
                    disabled={!nlText.trim()}
                    onClick={handleNlSubmit}
                  >
                    解析
                  </Button>
                </div>
              </section>

              <section className={workbenchCustomSoftSurface}>
                <Label htmlFor="custom-soft" className="flex items-center gap-1.5 text-xs font-medium">
                  <Plus className="h-3.5 w-3.5 text-success" />
                  自定义软偏好
                </Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    id="custom-soft"
                    value={customSoftLabel}
                    onChange={(e) => setCustomSoftLabel(e.target.value)}
                    placeholder="例如：尽量安排亲子友好活动"
                    className="h-9 flex-1 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCustomSoftSubmit(false);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 text-xs"
                    disabled={!customSoftLabel.trim()}
                    onClick={() => handleCustomSoftSubmit(false)}
                  >
                    添加并继续
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className={cn('h-9 shrink-0 text-xs', workbenchPrimaryAction)}
                    disabled={!customSoftLabel.trim()}
                    onClick={() => handleCustomSoftSubmit(true)}
                  >
                    添加并完成
                  </Button>
                </div>
              </section>

              {availableSoft.length > 0 ? (
                <section>
                  <p className="mb-2 text-xs font-semibold text-foreground">
                    软偏好模板
                    {showBatchFooter ? (
                      <span className="ml-1.5 font-normal text-muted-foreground">· 点击多选</span>
                    ) : null}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {availableSoft.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        batchSelectable={isBatchAddableConstraintTemplate(template)}
                        selected={selectedTemplateIds.has(template.id)}
                        badge={{
                          label: template.defaultPriority
                            ? `默认${template.defaultPriority}`
                            : '点击添加',
                        }}
                        onClick={() => handlePick(template)}
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <p className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-center text-xs text-muted-foreground">
                  可见的软偏好模板均已添加。你仍可通过上方自然语言或自定义软偏好继续添加。
                </p>
              )}
            </div>
          )}
        </div>

        {showBatchFooter ? (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/60 bg-muted/10 px-5 py-3">
            <p className="text-[11px] text-muted-foreground">
              {selectedTemplates.length > 0 ? (
                <>
                  已选 <span className="font-medium text-foreground">{selectedTemplates.length}</span> 项
                </>
              ) : (
                '选择模板后可批量添加'
              )}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={selectedTemplates.length === 0 || batchAdding}
                onClick={() => void handleBatchAdd(false)}
              >
                添加并继续
              </Button>
              <Button
                type="button"
                size="sm"
                className={cn('h-8 text-xs', workbenchPrimaryAction)}
                disabled={selectedTemplates.length === 0 || batchAdding}
                onClick={() => void handleBatchAdd(true)}
              >
                添加并完成
              </Button>
            </div>
          </div>
        ) : null}
      </SheetLayerDialogContent>
    </Dialog>
  );
}
