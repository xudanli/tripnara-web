import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  TRAVEL_MOTIVATION_LABELS,
} from '@/lib/narrative-engine-display.util';
import type { NarrativeIntakeInput, TravelMotivation } from '@/types/narrative-engine';

const MOTIVATIONS = Object.keys(TRAVEL_MOTIVATION_LABELS) as TravelMotivation[];

const MOOD_SUGGESTIONS = [
  '风',
  '孤独',
  '开阔',
  '慢',
  '海',
  '安静',
  '冒险',
  '温暖',
  '自由',
  '治愈',
];

const MAX_RECENT_STATE = 200;
const MAX_FREE_TEXT = 500;
const MAX_MOOD_KEYWORDS = 3;

interface NarrativeThemeIntakeFormProps {
  onSubmit: (intake: NarrativeIntakeInput) => void;
  isSubmitting?: boolean;
  className?: string;
}

export function NarrativeThemeIntakeForm({
  onSubmit,
  isSubmitting = false,
  className,
}: NarrativeThemeIntakeFormProps) {
  const [recentState, setRecentState] = useState('');
  const [motivations, setMotivations] = useState<TravelMotivation[]>([]);
  const [moodKeywords, setMoodKeywords] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [customMood, setCustomMood] = useState('');

  const toggleMotivation = (value: TravelMotivation) => {
    setMotivations((prev) =>
      prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value]
    );
  };

  const addMoodKeyword = (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed || moodKeywords.includes(trimmed) || moodKeywords.length >= MAX_MOOD_KEYWORDS) {
      return;
    }
    setMoodKeywords((prev) => [...prev, trimmed]);
    setCustomMood('');
  };

  const removeMoodKeyword = (keyword: string) => {
    setMoodKeywords((prev) => prev.filter((k) => k !== keyword));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      recentState: recentState.trim() || undefined,
      motivations: motivations.length ? motivations : undefined,
      moodKeywords: moodKeywords.length ? moodKeywords : undefined,
      freeText: freeText.trim() || undefined,
    });
  };

  const canSubmit =
    recentState.trim().length > 0 ||
    motivations.length > 0 ||
    moodKeywords.length > 0 ||
    freeText.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-5', className)}>
      <div className="space-y-2">
        <Label htmlFor="narrative-recent-state">
          最近的状态或感受
          <span className="text-muted-foreground font-normal">（选填）</span>
        </Label>
        <Textarea
          id="narrative-recent-state"
          placeholder="例如：工作三年，感觉被日常磨平了棱角"
          value={recentState}
          onChange={(e) => setRecentState(e.target.value.slice(0, MAX_RECENT_STATE))}
          rows={2}
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">{recentState.length}/{MAX_RECENT_STATE}</p>
      </div>

      <div className="space-y-2">
        <Label>这次旅行，你更想……</Label>
        <div className="flex flex-wrap gap-2">
          {MOTIVATIONS.map((m) => {
            const selected = motivations.includes(m);
            return (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={selected ? 'default' : 'outline'}
                className="h-8 text-xs"
                disabled={isSubmitting}
                onClick={() => toggleMotivation(m)}
              >
                {TRAVEL_MOTIVATION_LABELS[m]}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          期待的气质标签
          <span className="text-muted-foreground font-normal">（最多 {MAX_MOOD_KEYWORDS} 个）</span>
        </Label>
        {moodKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {moodKeywords.map((kw) => (
              <Badge
                key={kw}
                variant="secondary"
                className="cursor-pointer hover:bg-muted"
                onClick={() => !isSubmitting && removeMoodKeyword(kw)}
              >
                {kw} ×
              </Badge>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {MOOD_SUGGESTIONS.filter((s) => !moodKeywords.includes(s)).map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
              disabled={isSubmitting || moodKeywords.length >= MAX_MOOD_KEYWORDS}
              onClick={() => addMoodKeyword(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customMood}
            onChange={(e) => setCustomMood(e.target.value)}
            placeholder="自定义标签"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            disabled={isSubmitting || moodKeywords.length >= MAX_MOOD_KEYWORDS}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addMoodKeyword(customMood);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              isSubmitting ||
              !customMood.trim() ||
              moodKeywords.length >= MAX_MOOD_KEYWORDS
            }
            onClick={() => addMoodKeyword(customMood)}
          >
            添加
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="narrative-free-text">
          自由补充
          <span className="text-muted-foreground font-normal">（选填）</span>
        </Label>
        <Textarea
          id="narrative-free-text"
          placeholder="任何想补充的上下文"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value.slice(0, MAX_FREE_TEXT))}
          rows={2}
          disabled={isSubmitting}
        />
      </div>

      <Button type="submit" disabled={!canSubmit || isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? '生成主题候选…' : '生成旅行主题'}
      </Button>
    </form>
  );
}
