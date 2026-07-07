import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { inTripExperienceApi } from '@/api/in-trip-experience';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  EXPERIENCE_PULSE_FIELD_LABELS,
  EXPERIENCE_PULSE_SCORE_LABELS,
  experienceTriggerTypeLabel,
} from '@/lib/in-trip-experience';
import type {
  ExperiencePulseInput,
  ExperiencePulseTrigger,
  ExperienceTagMatchOption,
} from '@/types/in-trip-experience';

interface InTripExperiencePulseDialogProps {
  tripId: string;
  trigger: ExperiencePulseTrigger | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: ExperiencePulseInput) => Promise<void>;
}

type ScoreField = keyof typeof EXPERIENCE_PULSE_FIELD_LABELS;

const SCORE_FIELDS: ScoreField[] = [
  'expectationConfirmation',
  'emotionalValueScore',
  'senseOfControl',
  'spendWorthIt',
  'teamAtmosphere',
];

function ScoreRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (score: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-5 gap-1.5">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              'rounded-lg border px-1 py-2 text-center transition-colors',
              value === n
                ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                : 'hover:bg-muted/50',
            )}
          >
            <span className="text-sm font-medium">{n}</span>
            <span className="block text-[9px] text-muted-foreground leading-tight mt-0.5">
              {EXPERIENCE_PULSE_SCORE_LABELS[n]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function InTripExperiencePulseDialog({
  tripId,
  trigger,
  open,
  onOpenChange,
  onSubmit,
}: InTripExperiencePulseDialogProps) {
  const [scores, setScores] = useState<Partial<Record<ScoreField, number>>>({});
  const [activityName, setActivityName] = useState('');
  const [freeText, setFreeText] = useState('');
  const [tagMatch, setTagMatch] = useState<string | null>(null);
  const [tagOptions, setTagOptions] = useState<ExperienceTagMatchOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setScores({});
      setActivityName('');
      setFreeText('');
      setTagMatch(null);
      return;
    }
    if (!tripId) return;
    void inTripExperienceApi
      .getTagMatchOptions(tripId)
      .then(setTagOptions)
      .catch(() => setTagOptions([]));
  }, [open, tripId, trigger?.triggerKey]);

  const hasInput =
    Object.keys(scores).length > 0 || freeText.trim().length > 0 || tagMatch != null;

  const handleSubmit = async () => {
    if (!trigger || !hasInput) return;
    try {
      setSubmitting(true);
      await onSubmit({
        triggerType: trigger.triggerType,
        ...(trigger.triggerType === 'post_activity' && activityName.trim()
          ? { activityName: activityName.trim() }
          : {}),
        ...scores,
        ...(tagMatch ? { experienceTagMatch: tagMatch } : {}),
        ...(freeText.trim() ? { freeText: freeText.trim() } : {}),
      });
      toast.success('体验反馈已记录');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{trigger?.title ?? '体验微调查'}</DialogTitle>
          <DialogDescription>
            {trigger?.prompt ?? '花 30 秒帮我们校准明日推荐'}
          </DialogDescription>
          {trigger && (
            <p className="text-[10px] text-muted-foreground pt-1">
              {experienceTriggerTypeLabel(trigger.triggerType)}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {trigger?.triggerType === 'post_activity' && (
            <div className="space-y-1.5">
              <Label htmlFor="activity-name" className="text-xs">
                活动名称（建议填写）
              </Label>
              <Input
                id="activity-name"
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                placeholder="例如：冰川徒步"
              />
            </div>
          )}

          {tagOptions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                今天的感受更接近哪一种？
              </Label>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTagMatch(opt.value)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs transition-colors',
                      tagMatch === opt.value
                        ? 'border-border bg-muted/15 text-muted-foreground ring-2 ring-border'
                        : 'hover:bg-muted/50',
                    )}
                  >
                    {opt.labelZh}
                  </button>
                ))}
              </div>
            </div>
          )}

          {SCORE_FIELDS.map((field) => (
            <ScoreRow
              key={field}
              label={EXPERIENCE_PULSE_FIELD_LABELS[field]}
              value={scores[field] ?? null}
              onChange={(n) => setScores((prev) => ({ ...prev, [field]: n }))}
            />
          ))}

          <div className="space-y-1.5">
            <Label htmlFor="pulse-free-text" className="text-xs text-muted-foreground">
              一句话感受（可选）
            </Label>
            <Textarea
              id="pulse-free-text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="例如：黑沙滩超预期"
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            跳过
          </Button>
          <Button type="button" disabled={!hasInput || submitting} onClick={handleSubmit}>
            {submitting ? '提交中…' : '提交反馈'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
