import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useCreateSilentVote } from '@/hooks/useSilentVotes';
import type { CreateSilentVoteOptionInput } from '@/types/silent-votes';

interface OptionDraft {
  id: string;
  label: string;
}

interface SilentVoteCreateDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (voteId: string) => void;
}

function defaultOptions(): OptionDraft[] {
  return [
    { id: 'opt-a', label: '' },
    { id: 'opt-b', label: '' },
  ];
}

export function SilentVoteCreateDialog({
  tripId,
  open,
  onOpenChange,
  onCreated,
}: SilentVoteCreateDialogProps) {
  const { creating, createManual } = useCreateSilentVote(tripId);
  const [title, setTitle] = useState('方案选择');
  const [question, setQuestion] = useState('请匿名选择更倾向的方案');
  const [autoOpen, setAutoOpen] = useState(true);
  const [options, setOptions] = useState<OptionDraft[]>(defaultOptions);

  const resetForm = () => {
    setTitle('方案选择');
    setQuestion('请匿名选择更倾向的方案');
    setAutoOpen(true);
    setOptions(defaultOptions());
  };

  const updateOption = (index: number, label: string) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? { ...opt, label } : opt)));
  };

  const addOption = () => {
    setOptions((prev) => [
      ...prev,
      { id: `opt-${String.fromCharCode(97 + prev.length)}`, label: '' },
    ]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const validOptions: CreateSilentVoteOptionInput[] = options
      .map((opt, index) => ({
        id: opt.id || `opt-${index + 1}`,
        label: opt.label.trim() || `选项 ${index + 1}`,
      }))
      .filter((opt) => opt.label);

    if (validOptions.length < 2) return;

    try {
      const vote = await createManual({
        title: title.trim() || '方案选择',
        question: question.trim() || undefined,
        autoOpen,
        options: validOptions,
      });
      onOpenChange(false);
      resetForm();
      onCreated?.(vote.id);
    } catch {
      // toast in hook
    }
  };

  const canSubmit =
    title.trim().length > 0 &&
    options.filter((opt) => opt.label.trim()).length >= 2 &&
    !creating;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>创建 Silent Vote</DialogTitle>
          <DialogDescription>手动添加选项，发起团队匿名投票</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="silent-vote-title">投票标题</Label>
            <Input
              id="silent-vote-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：Day3 住宿选哪家"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="silent-vote-question">说明文案（可选）</Label>
            <Textarea
              id="silent-vote-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              placeholder="请匿名选择更倾向的方案"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>投票选项（至少 2 项）</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addOption}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                添加
              </Button>
            </div>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <Input
                    value={option.label}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`选项 ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    disabled={options.length <= 2}
                    onClick={() => removeOption(index)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={autoOpen} onCheckedChange={(v) => setAutoOpen(v === true)} />
            创建后立即开放投票
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {creating ? '创建中…' : '创建投票'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
