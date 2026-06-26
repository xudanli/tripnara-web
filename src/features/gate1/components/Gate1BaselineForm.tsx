import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubmitGate1Baseline } from '@/hooks/useGate1';
import { trackGate1BaselineSubmitted } from '@/utils/gate1-analytics';
import type { Gate1Baseline, Gate1MightRejectWithoutTripnara } from '@/types/gate1';

interface Gate1BaselineFormProps {
  projectId: string;
  initial?: Gate1Baseline | null;
  readOnly?: boolean;
}

export function Gate1BaselineForm({ projectId, initial, readOnly }: Gate1BaselineFormProps) {
  const submitBaseline = useSubmitGate1Baseline(projectId);
  const locked = readOnly || Boolean(initial?.confirmedAt);

  const [mightReject, setMightReject] = useState<Gate1MightRejectWithoutTripnara>(
    initial?.mightRejectWithoutTripnara ?? 'UNCERTAIN',
  );
  const [rejectReason, setRejectReason] = useState(initial?.rejectReason ?? '');
  const [expectedTotalHours, setExpectedTotalHours] = useState(
    initial?.expectedTotalHours != null ? String(initial.expectedTotalHours) : '',
  );
  const [revisionRounds, setRevisionRounds] = useState(
    initial?.revisionRounds != null ? String(initial.revisionRounds) : '',
  );
  const [difficulty, setDifficulty] = useState(
    initial?.difficulty != null ? String(initial.difficulty) : '3',
  );
  const [knownConflicts, setKnownConflicts] = useState(
    initial?.knownConflicts?.map((c) => c.note ?? c.type).join('\n') ?? '',
  );
  const [knownRisks, setKnownRisks] = useState(
    initial?.knownRisks?.map((c) => c.note ?? c.type).join('\n') ?? '',
  );
  const [originalPlanSummary, setOriginalPlanSummary] = useState(
    initial?.originalPlanSummary ?? '',
  );

  const handleSubmit = async (confirm: boolean) => {
    if (!originalPlanSummary.trim()) {
      toast.error('请填写原方案说明');
      return;
    }
    try {
      await submitBaseline.mutateAsync({
        mightRejectWithoutTripnara: mightReject,
        rejectReason: rejectReason.trim() || undefined,
        expectedTotalHours: expectedTotalHours ? Number(expectedTotalHours) : undefined,
        revisionRounds: revisionRounds ? Number(revisionRounds) : undefined,
        difficulty: difficulty ? Number(difficulty) : undefined,
        knownConflicts: knownConflicts
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((note) => ({ type: 'other', note })),
        knownRisks: knownRisks
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((note) => ({ type: 'risk', note })),
        originalPlanSummary: originalPlanSummary.trim(),
        confirm,
      });
      trackGate1BaselineSubmitted({
        projectId,
        expectedHours: expectedTotalHours ? Number(expectedTotalHours) : undefined,
      });
      toast.success(confirm ? 'Baseline 已确认' : 'Baseline 已保存');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '提交失败');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Baseline 记录</CardTitle>
        <CardDescription>
          在查看任何 TripNARA 输出前完成。提交并确认后项目进入成员收集阶段。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {locked && (
          <p className="text-sm text-muted-foreground">
            已于 {initial?.confirmedAt ? new Date(initial.confirmedAt).toLocaleString() : '—'} 确认
            {initial?.version != null ? ` · 版本 v${initial.version}` : ''}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>若无 TripNARA 是否可能拒单</Label>
            <Select
              value={mightReject}
              onValueChange={(v) => setMightReject(v as Gate1MightRejectWithoutTripnara)}
              disabled={locked}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="YES">是</SelectItem>
                <SelectItem value="NO">否</SelectItem>
                <SelectItem value="UNCERTAIN">不确定</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseline-hours">预计总工时（小时）</Label>
            <Input
              id="baseline-hours"
              type="number"
              min={0}
              value={expectedTotalHours}
              onChange={(e) => setExpectedTotalHours(e.target.value)}
              disabled={locked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseline-rounds">预计修改轮次</Label>
            <Input
              id="baseline-rounds"
              type="number"
              min={0}
              value={revisionRounds}
              onChange={(e) => setRevisionRounds(e.target.value)}
              disabled={locked}
            />
          </div>
          <div className="space-y-2">
            <Label>难度（1–5）</Label>
            <Select value={difficulty} onValueChange={setDifficulty} disabled={locked}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="baseline-reject-reason">拒单原因（如适用）</Label>
          <Input
            id="baseline-reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            disabled={locked}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="baseline-plan">原方案说明 *</Label>
          <Textarea
            id="baseline-plan"
            rows={4}
            placeholder="顾问当前方案、处理方式摘要（尚未受 TripNARA 影响）"
            value={originalPlanSummary}
            onChange={(e) => setOriginalPlanSummary(e.target.value)}
            disabled={locked}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="baseline-conflicts">已知冲突（每行一条）</Label>
          <Textarea
            id="baseline-conflicts"
            rows={3}
            value={knownConflicts}
            onChange={(e) => setKnownConflicts(e.target.value)}
            disabled={locked}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="baseline-risks">已知风险（每行一条）</Label>
          <Textarea
            id="baseline-risks"
            rows={3}
            value={knownRisks}
            onChange={(e) => setKnownRisks(e.target.value)}
            disabled={locked}
          />
        </div>

        {!locked && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={submitBaseline.isPending}
              onClick={() => void handleSubmit(false)}
            >
              保存草稿
            </Button>
            <Button disabled={submitBaseline.isPending} onClick={() => void handleSubmit(true)}>
              确认 Baseline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
