import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  SILENT_VOTE_INTENSITY_LABEL,
  SILENT_VOTE_INTENSITY_QUESTION,
} from '@/lib/silent-vote-labels';
import { WishImportanceDots } from '@/components/wishlist/WishImportanceDots';
import type { SilentVoteDetail, SilentVoteIntensity } from '@/types/silent-votes';

interface SilentVoteBallotFormProps {
  detail: SilentVoteDetail;
  optionId: string;
  intensity: SilentVoteIntensity;
  submitting?: boolean;
  onOptionChange: (optionId: string) => void;
  onIntensityChange: (intensity: SilentVoteIntensity) => void;
  onSubmit: () => void;
  className?: string;
}

export function SilentVoteBallotForm({
  detail,
  optionId,
  intensity,
  submitting,
  onOptionChange,
  onIntensityChange,
  onSubmit,
  className,
}: SilentVoteBallotFormProps) {
  const disabled = detail.status !== 'open';

  return (
    <div className={cn('space-y-4', className)}>
      {detail.question ? (
        <p className="text-sm text-muted-foreground">{detail.question}</p>
      ) : null}

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">选择倾向方案</Label>
        <RadioGroup
          value={optionId}
          onValueChange={onOptionChange}
          className="space-y-1.5"
          disabled={disabled}
        >
          {detail.options.map((option) => (
            <label
              key={option.id}
              htmlFor={`silent-vote-${detail.id}-${option.id}`}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition-colors',
                optionId === option.id
                  ? 'border-primary/40 bg-primary/[0.04]'
                  : 'border-border hover:bg-muted/40',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <RadioGroupItem
                id={`silent-vote-${detail.id}-${option.id}`}
                value={option.id}
              />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">{SILENT_VOTE_INTENSITY_QUESTION}</Label>
          <WishImportanceDots value={intensity} />
        </div>
        <Slider
          value={[intensity]}
          min={1}
          max={5}
          step={1}
          disabled={disabled}
          onValueChange={([v]) => onIntensityChange(v as SilentVoteIntensity)}
        />
        <p className="text-[11px] text-muted-foreground">
          {SILENT_VOTE_INTENSITY_LABEL[intensity]}
        </p>
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={disabled || !optionId || submitting}
        onClick={onSubmit}
      >
        {submitting ? '提交中…' : detail.myBallotSubmitted ? '更新选票' : '匿名提交'}
      </Button>

      {detail.status !== 'open' ? (
        <p className="text-center text-xs text-muted-foreground">
          {detail.status === 'draft' ? '投票尚未开放' : '投票已关闭，结果已锁定'}
        </p>
      ) : null}
    </div>
  );
}
