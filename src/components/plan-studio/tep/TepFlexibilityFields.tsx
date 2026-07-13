import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TepFlexFormValues } from '@/lib/tep-item-note.util';
import {
  defaultTepFlexPresetForKind,
  listTepFlexibilityPresetsForKind,
  type TepFlexibilityItemKind,
} from '@/lib/tep-flexibility-item.util';

export interface TepFlexibilityFieldsProps {
  value: TepFlexFormValues;
  onChange: (next: TepFlexFormValues) => void;
  itemKind: TepFlexibilityItemKind;
}

export function TepFlexibilityFields({
  value,
  onChange,
  itemKind,
}: TepFlexibilityFieldsProps) {
  const presetOptions = listTepFlexibilityPresetsForKind(itemKind);
  const defaultPreset = defaultTepFlexPresetForKind(itemKind);

  useEffect(() => {
    if (itemKind !== 'activity' && value.preset === 'none') {
      onChange({ ...value, preset: defaultPreset });
    }
  }, [defaultPreset, itemKind, onChange, value.preset, value.weatherSensitive, value.latestArrival]);

  if (itemKind === 'accommodation') {
    return (
      <div className="space-y-3 rounded-lg border border-border/60 bg-muted/15 p-3">
        <div>
          <Label className="text-xs font-medium">住宿约束</Label>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            当晚住宿通常视为必达节点；可设置最晚到店时间供可执行性诊断使用
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px]">最晚到店（HH:mm）</Label>
          <Input
            className="h-8 text-xs"
            placeholder="22:00"
            value={value.latestArrival ?? ''}
            onChange={(e) => onChange({ ...value, latestArrival: e.target.value, preset: 'mandatory_fixed' })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/15 p-3">
      <div>
        <Label className="text-xs font-medium">行程弹性</Label>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {itemKind === 'meal'
            ? '用餐节点：可标记固定预约或可替换'
            : itemKind === 'rest'
              ? '休息节点：可标记是否可删或可替换'
              : '影响可执行性诊断与调整建议，不会自动改动行程'}
        </p>
      </div>

      <Select
        value={value.preset}
        onValueChange={(preset) =>
          onChange({ ...value, preset: preset as TepFlexFormValues['preset'] })
        }
      >
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="选择弹性类型" />
        </SelectTrigger>
        <SelectContent>
          {itemKind === 'activity' ? (
            <SelectItem value="none">未设置（使用系统默认）</SelectItem>
          ) : null}
          {presetOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {itemKind === 'activity' || itemKind === 'meal' ? (
        <label className="flex items-center gap-2 text-xs">
          <Checkbox
            checked={value.weatherSensitive}
            onCheckedChange={(checked) =>
              onChange({ ...value, weatherSensitive: checked === true })
            }
          />
          天气敏感
        </label>
      ) : null}
    </div>
  );
}
