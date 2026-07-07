import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { ConstraintEditorDraft } from './constraint-console-types';
import {
  decimalHoursToTimeString,
  resolveCatalogHardEditorSpec,
  timeStringToDecimalHours,
  type CatalogHardEditorSpec,
} from '@/lib/constraint-catalog-editor.util';
import { isCatalogHardTemplate } from './constraint-templates';
import { apiConstraintIdToUi } from '@/lib/trip-constraints.adapter';

export interface CatalogHardConstraintFieldsProps {
  draft: ConstraintEditorDraft;
  onChange: (patch: Partial<ConstraintEditorDraft>) => void;
  className?: string;
}

function resolveSpec(draft: ConstraintEditorDraft): CatalogHardEditorSpec | null {
  const templateId = isCatalogHardTemplate(draft.id)
    ? draft.id
    : apiConstraintIdToUi(draft.id);
  return resolveCatalogHardEditorSpec(templateId);
}

/** catalog 硬约束 · 模板专用值编辑区 */
export function CatalogHardConstraintFields({
  draft,
  onChange,
  className,
}: CatalogHardConstraintFieldsProps) {
  const spec = resolveSpec(draft);
  if (!spec) return null;

  return (
    <div className={cn('space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4', className)}>
      <div>
        <Label className="text-xs">{spec.valueLabel}</Label>
        {spec.helperText ? (
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{spec.helperText}</p>
        ) : null}
      </div>

      {spec.fieldKind === 'time' ? (
        <Input
          type="time"
          value={decimalHoursToTimeString(draft.targetValue)}
          onChange={(e) => onChange({ targetValue: timeStringToDecimalHours(e.target.value) })}
          className="h-9 w-36 text-sm tabular-nums"
        />
      ) : null}

      {spec.fieldKind === 'hours' ? (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={spec.min}
            max={spec.max}
            step={spec.step ?? 0.5}
            value={draft.targetValue}
            onChange={(e) => onChange({ targetValue: Number(e.target.value) || 0 })}
            className="h-9 w-24 text-sm tabular-nums"
          />
          <span className="text-xs text-muted-foreground">小时</span>
        </div>
      ) : null}

      {spec.fieldKind === 'km' ? (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={spec.min}
            max={spec.max}
            step={spec.step ?? 0.5}
            value={draft.targetValue}
            onChange={(e) => onChange({ targetValue: Number(e.target.value) || 0 })}
            className="h-9 w-24 text-sm tabular-nums"
          />
          <span className="text-xs text-muted-foreground">km</span>
        </div>
      ) : null}

      {spec.fieldKind === 'count' ? (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={spec.min ?? 0}
            max={spec.max}
            step={spec.step ?? 1}
            value={draft.targetValue}
            onChange={(e) => onChange({ targetValue: Number(e.target.value) || 0 })}
            className="h-9 w-24 text-sm tabular-nums"
          />
          <span className="text-xs text-muted-foreground">个</span>
        </div>
      ) : null}

      {spec.fieldKind === 'currency' ? (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={spec.min ?? 0}
            step={spec.step ?? 1}
            value={draft.targetValue}
            onChange={(e) => onChange({ targetValue: Number(e.target.value) || 0 })}
            className="h-9 flex-1 text-sm tabular-nums"
          />
          <span className="shrink-0 text-xs text-muted-foreground">{draft.currency ?? 'CNY'}</span>
        </div>
      ) : null}

      {spec.fieldKind === 'toggle' || spec.fieldKind === 'toggle_with_notes' ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/70 px-3 py-2.5">
          <span className="text-xs text-foreground">启用此约束</span>
          <Switch
            checked={draft.enabled !== false}
            onCheckedChange={(enabled) =>
              onChange({ enabled, targetValue: enabled ? 1 : 0 })
            }
          />
        </div>
      ) : null}

      {spec.fieldKind === 'toggle_with_notes' ? (
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">补充说明（可选）</Label>
          <Textarea
            value={draft.reason}
            onChange={(e) => onChange({ reason: e.target.value })}
            placeholder={spec.notesPlaceholder}
            className="min-h-[64px] resize-none text-xs"
          />
        </div>
      ) : null}
    </div>
  );
}

export function resolveCatalogHardTemplateId(draft: ConstraintEditorDraft): string | null {
  if (isCatalogHardTemplate(draft.id)) return draft.id;
  const ui = apiConstraintIdToUi(draft.id);
  return isCatalogHardTemplate(ui) ? ui : null;
}
