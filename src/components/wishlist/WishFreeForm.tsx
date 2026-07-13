import { useCallback, useState } from 'react';
import { Mic, MicOff, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import type { WishCategory, WishVisibility } from '@/types/trip-wishes';
import { WishImportanceDots } from './WishImportanceDots';
import { WishVisibilityCards } from './WishVisibilityCards';
import { WishVisibilityToggle } from './WishVisibilityToggle';
import { WishCategorySelect } from './WishCategorySelect';
import type { WishDraft } from '@/lib/wish-draft';
import { toast } from 'sonner';
import { useWishVoiceInput } from '@/lib/wish-voice-input';
import { cn } from '@/lib/utils';
import { wishLabel } from './wishlist-ui';
import { useAuth } from '@/hooks/useAuth';
import { optimizeWishWithJourneyAgent } from '@/lib/wish-agent-optimize';

interface WishFreeFormProps {
  tripId: string;
  onSubmit: (draft: WishDraft) => void | Promise<void>;
  submitting?: boolean;
  /** 协作中心布局：卡片可见模式 + 点状重要程度 */
  collabMode?: boolean;
}

export function WishFreeForm({ tripId, onSubmit, submitting, collabMode = false }: WishFreeFormProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState<WishCategory>('activities');
  const [text, setText] = useState('');
  const [importance, setImportance] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [visibility, setVisibility] = useState<WishVisibility>('private');
  const [voiceTranscriptId, setVoiceTranscriptId] = useState<string | undefined>();
  const [optimizing, setOptimizing] = useState(false);

  const onTranscribed = useCallback(
    (draft: {
      voiceTranscriptId: string;
      text: string;
      category: WishCategory;
      importance: 1 | 2 | 3 | 4 | 5;
    }) => {
      setText(draft.text);
      setCategory(draft.category);
      setImportance(draft.importance);
      setVoiceTranscriptId(draft.voiceTranscriptId);
      toast.message('转写完成，可编辑后提交');
    },
    [],
  );

  const { recording, transcribing, startRecording, stopRecording } = useWishVoiceInput({
    tripId,
    onTranscribed,
  });

  const handleOptimize = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.message('先写几句想法，再让 AI 优化');
      return;
    }
    const userId = user?.id;
    if (!userId) {
      toast.error('请先登录后再使用 AI 优化');
      return;
    }

    setOptimizing(true);
    try {
      const result = await optimizeWishWithJourneyAgent({
        tripId,
        userId,
        rawText: trimmed,
        fallbackCategory: category,
      });
      setText(result.text);
      setCategory(result.category);
      setImportance(result.importance);
      toast.success(
        result.partial ? '已优化文案，请确认分类与在意程度' : 'AI 已优化，请确认后提交',
      );
    } catch (e) {
      toast.error((e as Error).message ?? 'AI 优化失败，请稍后重试');
    } finally {
      setOptimizing(false);
    }
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.message('先写几句你想说的话吧');
      return;
    }
    await onSubmit({
      category,
      text: trimmed,
      importance,
      visibility,
      voiceTranscriptId,
    });
    setText('');
    setImportance(3);
    setVisibility('private');
    setVoiceTranscriptId(undefined);
  };

  const busy = submitting || optimizing || transcribing;

  return (
    <div className={cn(collabMode ? 'flex h-full min-h-0 flex-col gap-2' : 'space-y-4')}>
      <WishCategorySelect
        tripId={tripId}
        value={category}
        onChange={setCategory}
        disabled={busy}
        label={collabMode ? '心愿领域' : undefined}
        compact={collabMode}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          {!collabMode ? <Label className={wishLabel}>我希望</Label> : <span className={wishLabel} />}
          <div className="flex items-center gap-1">
            {collabMode ? (
              <span className="text-[10px] text-muted-foreground">{text.length}/300</span>
            ) : null}
            <Button
              type="button"
              variant={collabMode ? 'outline' : 'ghost'}
              size="sm"
              className="h-8 gap-1 text-xs text-muted-foreground"
              disabled={busy || recording}
              onClick={() => void handleOptimize()}
            >
              <Sparkles className={cn('h-3.5 w-3.5', optimizing && 'animate-pulse text-primary')} />
              {optimizing ? '优化中…' : collabMode ? 'AI 优化建议' : 'AI 优化'}
            </Button>
            {!collabMode ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs text-muted-foreground select-none touch-none"
                disabled={busy}
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (!recording && !transcribing) void startRecording();
                }}
                onPointerUp={() => {
                  if (recording) stopRecording();
                }}
                onPointerLeave={() => {
                  if (recording) stopRecording();
                }}
              >
                {recording || transcribing ? (
                  <MicOff className="h-3.5 w-3.5 animate-pulse text-primary" />
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
                {transcribing ? '转写中…' : recording ? '松开结束' : '按住说话'}
              </Button>
            ) : null}
          </div>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 300))}
          placeholder="例如：想在雷克雅未克吃一次网红热狗…"
          className={cn('resize-none', collabMode ? 'min-h-[56px]' : 'min-h-[100px]')}
          rows={collabMode ? 2 : undefined}
          disabled={busy}
          maxLength={300}
        />
        {!collabMode ? (
          <p className="text-[11px] text-muted-foreground">
            AI 优化会改写表述并建议分类与在意程度，提交前可继续编辑
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className={cn('flex items-center justify-between', wishLabel)}>
          <span>{collabMode ? '重要程度' : '在意程度'}</span>
          {!collabMode ? (
            <span className="font-medium text-foreground">
              {importance}/5 <WishImportanceDots value={importance} className="ml-1 inline-flex" />
            </span>
          ) : null}
        </div>
        {collabMode ? (
          <div className="flex items-center gap-2">
            {([1, 2, 3, 4, 5] as const).map((level) => (
              <button
                key={level}
                type="button"
                disabled={busy}
                aria-label={`重要程度 ${level}`}
                onClick={() => setImportance(level)}
                className={cn(
                  'h-3 w-3 rounded-full transition-colors',
                  level <= importance ? 'bg-primary' : 'bg-muted-foreground/25',
                )}
              />
            ))}
            <span className="ml-auto text-[10px] text-muted-foreground">
              {importance === 1 ? '不重要' : importance === 5 ? '非常重要' : `${importance}/5`}
            </span>
          </div>
        ) : (
          <Slider
            value={[importance]}
            min={1}
            max={5}
            step={1}
            onValueChange={([v]) => setImportance(v as 1 | 2 | 3 | 4 | 5)}
            disabled={busy}
          />
        )}
      </div>

      <div className={cn(collabMode ? 'space-y-1' : 'space-y-2')}>
        <Label className={wishLabel}>{collabMode ? '可见模式' : '可见范围'}</Label>
        {collabMode ? (
          <WishVisibilityCards value={visibility} onChange={setVisibility} disabled={busy} compact />
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <WishVisibilityToggle value={visibility} onChange={setVisibility} />
          </div>
        )}
      </div>

      <Button
        type="button"
        className={cn('w-full gap-1.5', collabMode && 'mt-auto h-8 shrink-0 text-xs')}
        size={collabMode ? 'sm' : 'default'}
        onClick={() => void handleSubmit()}
        disabled={busy}
      >
        {submitting ? '提交中…' : '提交心愿'}
      </Button>
    </div>
  );
}
