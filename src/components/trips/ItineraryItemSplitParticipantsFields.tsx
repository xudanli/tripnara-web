import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ItinerarySplitPhase } from '@/lib/itinerary-split-note.util';
import type { TripMemberOption } from '@/lib/itinerary-split-participants.util';
import { cn } from '@/lib/utils';

export interface ItineraryItemSplitParticipantsFieldsProps {
  enabled: boolean;
  phase: ItinerarySplitPhase;
  groupLabel: string;
  letter: string;
  selectedIds: string[];
  memberOptions: TripMemberOption[];
  onEnabledChange: (enabled: boolean) => void;
  onPhaseChange: (phase: ItinerarySplitPhase) => void;
  onGroupLabelChange: (label: string) => void;
  onLetterChange: (letter: string) => void;
  onSelectedIdsChange: (ids: string[]) => void;
  className?: string;
}

export function ItineraryItemSplitParticipantsFields({
  enabled,
  phase,
  groupLabel,
  letter,
  selectedIds,
  memberOptions,
  onEnabledChange,
  onPhaseChange,
  onGroupLabelChange,
  onLetterChange,
  onSelectedIdsChange,
  className,
}: ItineraryItemSplitParticipantsFieldsProps) {
  const toggle = (id: string) => {
    onSelectedIdsChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  const remaining = Math.max(0, memberOptions.length - selectedIds.length);

  return (
    <div className={cn('space-y-3', className)}>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <Checkbox
          checked={enabled}
          onCheckedChange={(checked) => onEnabledChange(checked === true)}
        />
        <span>设置分流 / 参与成员</span>
      </label>

      {enabled ? (
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">阶段</Label>
              <Select value={phase} onValueChange={(v) => onPhaseChange(v as ItinerarySplitPhase)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="branch">分流（部分成员）</SelectItem>
                  <SelectItem value="shared">全员</SelectItem>
                  <SelectItem value="rejoin">汇合</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">分组字母</Label>
              <Select
                value={letter || 'A'}
                onValueChange={onLetterChange}
                disabled={phase === 'shared' || phase === 'rejoin'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="A" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 8 }, (_, i) => String.fromCharCode(65 + i)).map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">分组名称</Label>
            <Input
              value={groupLabel}
              onChange={(e) => onGroupLabelChange(e.target.value)}
              placeholder={letter ? `分组 ${letter}` : '如：年轻组'}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">参与成员</Label>
              {memberOptions.length > 0 ? (
                <span className="text-[10px] text-muted-foreground">
                  已选 {selectedIds.length}/{memberOptions.length}
                  {phase === 'branch' && remaining > 0
                    ? ` · 还可新增并行活动（剩 ${remaining} 人）`
                    : ''}
                </span>
              ) : null}
            </div>
            {memberOptions.length === 0 ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                暂无成员数据。请先在协作中心邀请成员，或确认行程已配置协作者。
              </p>
            ) : (
              <div className="space-y-2 rounded-md border border-border/50 bg-background/70 p-2.5">
                {memberOptions.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-2 text-xs"
                  >
                    <Checkbox
                      checked={selectedIds.includes(option.id)}
                      onCheckedChange={() => toggle(option.id)}
                    />
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.role ? (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {option.role}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
