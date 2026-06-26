import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateAdvisorStrategy } from '@/hooks/useGate1';
import type { Gate1CandidateStrategy } from '@/types/gate1';

interface Gate1AdvisorStrategyDialogProps {
  projectId: string;
  candidates: Gate1CandidateStrategy[];
  basedOnCandidateId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Gate1AdvisorStrategyDialog({
  projectId,
  candidates,
  basedOnCandidateId,
  open,
  onOpenChange,
}: Gate1AdvisorStrategyDialogProps) {
  const createStrategy = useCreateAdvisorStrategy(projectId);

  const [label, setLabel] = useState('');
  const [basedOn, setBasedOn] = useState<string>('none');
  const [strategySummary, setStrategySummary] = useState('');
  const [budgetSummary, setBudgetSummary] = useState('');
  const [modificationNote, setModificationNote] = useState('');

  useEffect(() => {
    if (!open) return;
    if (basedOnCandidateId) {
      setBasedOn(basedOnCandidateId);
      const base = candidates.find((c) => c.id === basedOnCandidateId);
      if (base) {
        setLabel(`${base.label} · 顾问修订`);
        setStrategySummary(base.strategySummary);
        setBudgetSummary(base.budgetSummary ?? '');
      }
    } else {
      setBasedOn('none');
      setLabel('');
      setStrategySummary('');
      setBudgetSummary('');
      setModificationNote('');
    }
  }, [open, basedOnCandidateId, candidates]);

  const handleSubmit = async () => {
    if (!label.trim() || !strategySummary.trim()) {
      toast.error('请填写方案名称与策略摘要');
      return;
    }
    try {
      await createStrategy.mutateAsync({
        label: label.trim(),
        basedOnCandidateId: basedOn === 'none' ? undefined : basedOn,
        strategySummary: strategySummary.trim(),
        budgetSummary: budgetSummary.trim() || undefined,
        modificationNote: modificationNote.trim() || undefined,
      });
      toast.success('顾问修订版已发布');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建失败');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>创建顾问修订版</DialogTitle>
          <DialogDescription>
            直接发布为 PUBLISHED，sourceType = ADVISOR，不覆盖原方案。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="strategy-label">方案名称 *</Label>
            <Input
              id="strategy-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="稳健优先 · 顾问版"
            />
          </div>

          <div className="space-y-2">
            <Label>基于候选方案</Label>
            <Select value={basedOn} onValueChange={setBasedOn}>
              <SelectTrigger>
                <SelectValue placeholder="可选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">从零创建</SelectItem>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label} (v{c.version})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="strategy-summary">策略摘要 *</Label>
            <Textarea
              id="strategy-summary"
              value={strategySummary}
              onChange={(e) => setStrategySummary(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="strategy-budget">预算摘要</Label>
            <Input
              id="strategy-budget"
              value={budgetSummary}
              onChange={(e) => setBudgetSummary(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="strategy-note">修订说明</Label>
            <Textarea
              id="strategy-note"
              value={modificationNote}
              onChange={(e) => setModificationNote(e.target.value)}
              rows={2}
              placeholder="相对原方案的主要调整与理由"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button disabled={createStrategy.isPending} onClick={() => void handleSubmit()}>
            发布修订版
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
