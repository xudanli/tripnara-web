import { useMemo, useState } from 'react';
import { Leaf, Lock, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ConstraintPendingKey } from '@/types/planning-constraints';
import type { TripDetail } from '@/types/trip';
import {
  getVisibleConstraintTemplates,
  resolveTemplateSelection,
  splitConstraintTemplates,
  type ConstraintTemplate,
} from './constraint-templates';
import {
  workbenchCard,
  workbenchCustomSoftSurface,
  workbenchNlSurface,
  workbenchPrimaryAction,
} from './workbench-ui';

export interface AddConstraintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip?: TripDetail | null;
  /** 已启用的软偏好 id（模板 + 自定义） */
  activeSoftIds?: string[];
  configuredHardIds?: string[];
  onSelectTemplate: (constraintId: string, template: ConstraintTemplate) => void;
  onAddCustomSoft?: (label: string) => void;
  onOpenLegacyEditor?: (key: ConstraintPendingKey) => void;
  onNaturalLanguageSubmit?: (text: string) => void;
}

function TemplateCard({
  template,
  badge,
  onClick,
}: {
  template: ConstraintTemplate;
  badge?: { label: string; tone?: 'neutral' | 'success' };
  onClick: () => void;
}) {
  const Icon = template.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        workbenchCard,
        'p-3 text-left transition-colors hover:border-foreground/15 hover:bg-muted/25',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">{template.label}</span>
            {template.kind === 'hard' ? (
              <Lock className="h-3 w-3 text-muted-foreground/60" aria-hidden />
            ) : (
              <Leaf className="h-3 w-3 text-gate-allow-foreground/80" aria-hidden />
            )}
            {badge ? (
              <Badge
                variant="outline"
                className={cn(
                  'h-4 px-1 text-[9px] font-normal',
                  badge.tone === 'success'
                    ? 'border-gate-allow-border text-gate-allow-foreground'
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

/** 添加约束 · 模板选择（PRD UC-02 快捷模板） */
export function AddConstraintDialog({
  open,
  onOpenChange,
  trip,
  activeSoftIds = [],
  configuredHardIds = [],
  onSelectTemplate,
  onAddCustomSoft,
  onOpenLegacyEditor,
  onNaturalLanguageSubmit,
}: AddConstraintDialogProps) {
  const [nlText, setNlText] = useState('');
  const [customSoftLabel, setCustomSoftLabel] = useState('');

  const templates = useMemo(() => getVisibleConstraintTemplates(trip), [trip]);
  const { hard, soft } = useMemo(() => splitConstraintTemplates(templates), [templates]);
  const activeSoftSet = useMemo(() => new Set(activeSoftIds), [activeSoftIds]);
  const configuredHardSet = useMemo(() => new Set(configuredHardIds), [configuredHardIds]);

  const availableHard = useMemo(
    () => hard.filter((template) => !configuredHardSet.has(template.id)),
    [hard, configuredHardSet],
  );
  const availableSoft = useMemo(
    () => soft.filter((template) => !activeSoftSet.has(template.id)),
    [soft, activeSoftSet],
  );

  const handlePick = (template: ConstraintTemplate) => {
    const resolved = resolveTemplateSelection(template);
    onOpenChange(false);
    setNlText('');
    setCustomSoftLabel('');
    if (resolved.mode === 'legacy') {
      onOpenLegacyEditor?.(resolved.key);
      return;
    }
    onSelectTemplate(resolved.constraintId, template);
  };

  const handleNlSubmit = () => {
    const text = nlText.trim();
    if (!text) return;
    onOpenChange(false);
    setNlText('');
    onNaturalLanguageSubmit?.(text);
  };

  const handleCustomSoftSubmit = () => {
    const label = customSoftLabel.trim();
    if (!label) return;
    onOpenChange(false);
    setCustomSoftLabel('');
    onAddCustomSoft?.(label);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-5 py-4 text-left">
          <DialogTitle className="text-base">添加约束</DialogTitle>
          <DialogDescription className="text-xs">
            添加硬约束或软偏好：软约束可多条叠加，按需从模板选用或自定义
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(70vh,680px)] space-y-5 overflow-y-auto px-5 py-4">
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
              <Plus className="h-3.5 w-3.5 text-gate-allow-foreground" />
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
                  if (e.key === 'Enter') handleCustomSoftSubmit();
                }}
              />
              <Button
                type="button"
                size="sm"
                className={cn('h-9 shrink-0 text-xs', workbenchPrimaryAction)}
                disabled={!customSoftLabel.trim()}
                onClick={handleCustomSoftSubmit}
              >
                添加
              </Button>
            </div>
          </section>

          {availableHard.length > 0 ? (
            <section>
              <p className="mb-2 text-xs font-semibold text-foreground">
                硬约束
                <span className="ml-1.5 font-normal text-muted-foreground">不可违反</span>
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {availableHard.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onClick={() => handlePick(template)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {availableSoft.length > 0 ? (
            <section>
              <p className="mb-2 text-xs font-semibold text-foreground">
                软偏好
                <span className="ml-1.5 font-normal text-muted-foreground">可灵活权衡 · 可多条添加</span>
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {availableSoft.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    badge={{ label: '点击添加' }}
                    onClick={() => handlePick(template)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {availableHard.length === 0 && availableSoft.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-center text-xs text-muted-foreground">
              当前可见的约束模板均已配置。你仍可通过上方自然语言或自定义软偏好继续添加。
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
