import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoLoading } from '@/components/common/LogoLoading';
import {
  useCreateGate1TravelEvent,
  useGate1AdvisorOutputs,
  useGate1Outcome,
  useSubmitGate1Outcome,
} from '@/hooks/useGate1';
import {
  gate1SecondOrderIntentLabel,
  gate1TravelEventTypeLabel,
  validateGate1OutcomeForm,
} from '@/lib/gate1-display';
import type {
  Gate1PaymentCommitmentType,
  Gate1SecondOrderIntent,
  Gate1TravelEventType,
} from '@/types/gate1';

interface Gate1OutcomePanelProps {
  projectId: string;
}

export function Gate1OutcomePanel({ projectId }: Gate1OutcomePanelProps) {
  const { data: bundle, isLoading, refetch } = useGate1Outcome(projectId);
  const { data: outputs } = useGate1AdvisorOutputs(projectId);
  const submitOutcome = useSubmitGate1Outcome(projectId);
  const createEvent = useCreateGate1TravelEvent(projectId);

  const existing = bundle?.outcome;
  const readOnly = Boolean(existing?.completedAt);

  const [valueRating, setValueRating] = useState(String(existing?.valueRating ?? 4));
  const [valueNotes, setValueNotes] = useState(existing?.valueNotes ?? '');
  const [secondOrderIntent, setSecondOrderIntent] = useState<Gate1SecondOrderIntent>(
    existing?.secondOrderIntent ?? 'CONFIRMED',
  );
  const [secondOrderProvided, setSecondOrderProvided] = useState(
    existing?.secondOrderProvided ?? false,
  );
  const [paymentCentsYuan, setPaymentCentsYuan] = useState(
    existing?.paymentCommitmentCents != null
      ? String(existing.paymentCommitmentCents / 100)
      : '',
  );
  const [paymentType, setPaymentType] = useState<Gate1PaymentCommitmentType>(
    existing?.paymentCommitmentType ?? 'GATE2_DEPOSIT',
  );
  const [revisionRounds, setRevisionRounds] = useState(
    existing?.clientRevisionRounds != null ? String(existing.clientRevisionRounds) : '',
  );
  const [advisorHours, setAdvisorHours] = useState(
    existing?.advisorActualHours != null ? String(existing.advisorActualHours) : '',
  );
  const [exceptionCostYuan, setExceptionCostYuan] = useState(
    existing?.exceptionCostCents != null ? String(existing.exceptionCostCents / 100) : '',
  );
  const [markCompleted, setMarkCompleted] = useState(true);

  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<Gate1TravelEventType>('INCIDENT');
  const [eventResult, setEventResult] = useState('');
  const [eventPlanBId, setEventPlanBId] = useState<string>('none');

  const publishedPlanBs = outputs?.planB?.filter((p) => p.status === 'PUBLISHED') ?? [];

  const handleSubmitOutcome = async () => {
    const validation = validateGate1OutcomeForm({ secondOrderIntent, secondOrderProvided });
    if (validation) {
      toast.error(validation);
      return;
    }
    try {
      await submitOutcome.mutateAsync({
        valueRating: Number(valueRating) || undefined,
        valueNotes: valueNotes.trim() || undefined,
        secondOrderIntent,
        secondOrderProvided,
        paymentCommitmentCents: paymentCentsYuan
          ? Math.round(Number(paymentCentsYuan) * 100)
          : undefined,
        paymentCommitmentType: paymentCentsYuan ? paymentType : undefined,
        clientRevisionRounds: revisionRounds ? Number(revisionRounds) : undefined,
        advisorActualHours: advisorHours ? Number(advisorHours) : undefined,
        exceptionCostCents: exceptionCostYuan
          ? Math.round(Number(exceptionCostYuan) * 100)
          : undefined,
        markCompleted,
      });
      toast.success(markCompleted ? '实验已标记完成' : 'Outcome 已保存');
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '提交失败');
    }
  };

  const handleAddEvent = async () => {
    if (!eventTitle.trim()) {
      toast.error('请填写事件标题');
      return;
    }
    try {
      await createEvent.mutateAsync({
        title: eventTitle.trim(),
        eventType,
        occurredAt: new Date().toISOString(),
        result: eventResult.trim() || undefined,
        planBId: eventPlanBId !== 'none' ? eventPlanBId : undefined,
      });
      toast.success('行中事件已记录');
      setEventTitle('');
      setEventResult('');
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '记录失败');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LogoLoading size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">行中事件</CardTitle>
          <CardDescription>记录异常、变更或 Plan B 触发，形成 Verified Decision Loop</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(bundle?.travelEvents ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">尚无行中事件</p>
          )}
          <ul className="space-y-2">
            {(bundle?.travelEvents ?? []).map((ev) => (
              <li key={ev.id ?? ev.title + ev.occurredAt} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  {ev.title}
                  <span className="text-xs font-normal text-muted-foreground">
                    {gate1TravelEventTypeLabel(ev.eventType)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(ev.occurredAt).toLocaleString()}
                  {ev.planB?.label ? ` · Plan B: ${ev.planB.label}` : ''}
                </p>
                {ev.result && <p className="mt-1">{ev.result}</p>}
              </li>
            ))}
          </ul>

          {!readOnly && (
            <div className="space-y-3 border-t pt-4">
              <Input
                placeholder="事件标题"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  value={eventType}
                  onValueChange={(v) => setEventType(v as Gate1TravelEventType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      ['INCIDENT', 'CHANGE', 'PLAN_B_ACTIVATION', 'OTHER'] as Gate1TravelEventType[]
                    ).map((t) => (
                      <SelectItem key={t} value={t}>
                        {gate1TravelEventTypeLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {publishedPlanBs.length > 0 && (
                  <Select value={eventPlanBId} onValueChange={setEventPlanBId}>
                    <SelectTrigger>
                      <SelectValue placeholder="关联 Plan B" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不关联 Plan B</SelectItem>
                      {publishedPlanBs.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Textarea
                rows={2}
                placeholder="处理结果"
                value={eventResult}
                onChange={(e) => setEventResult(e.target.value)}
              />
              <Button size="sm" onClick={() => void handleAddEvent()}>
                记录事件
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">成员行后反馈</CardTitle>
        </CardHeader>
        <CardContent>
          {(bundle?.participantFeedbacks ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无成员反馈（行程后 3 天内）</p>
          ) : (
            <ul className="space-y-2">
              {bundle!.participantFeedbacks.map((fb, i) => (
                <li key={i} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{fb.participant.displayName}</p>
                  <p className="text-muted-foreground">
                    评分 {fb.rating}/5 · {fb.wouldRecommend ? '愿意推荐' : '不推荐'}
                  </p>
                  {fb.comment && <p className="mt-1">{fb.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">顾问 Outcome 与商业价值</CardTitle>
          <CardDescription>
            区分口头意愿与真实第二单；默认提交后项目进入 COMPLETED。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {readOnly ? (
            <div className="space-y-2 text-sm">
              <p>价值评分：{existing?.valueRating ?? '—'}/5</p>
              {existing?.valueNotes && <p>{existing.valueNotes}</p>}
              {existing?.secondOrderIntent && (
                <p>下一单：{gate1SecondOrderIntentLabel(existing.secondOrderIntent)}</p>
              )}
              {existing?.advisorActualHours != null && (
                <p>实际工时：{existing.advisorActualHours} 小时</p>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>价值评分（1–5）</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={valueRating}
                    onChange={(e) => setValueRating(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>客户修改轮次</Label>
                  <Input
                    type="number"
                    min={0}
                    value={revisionRounds}
                    onChange={(e) => setRevisionRounds(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>顾问实际工时</Label>
                  <Input
                    type="number"
                    min={0}
                    value={advisorHours}
                    onChange={(e) => setAdvisorHours(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>异常成本（元）</Label>
                  <Input
                    type="number"
                    min={0}
                    value={exceptionCostYuan}
                    onChange={(e) => setExceptionCostYuan(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="outcome-notes">价值说明</Label>
                <Textarea
                  id="outcome-notes"
                  rows={3}
                  value={valueNotes}
                  onChange={(e) => setValueNotes(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>下一单意愿</Label>
                  <Select
                    value={secondOrderIntent}
                    onValueChange={(v) => {
                      const intent = v as Gate1SecondOrderIntent;
                      setSecondOrderIntent(intent);
                      if (intent === 'VERBAL') setSecondOrderProvided(false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['VERBAL', 'CONFIRMED', 'PROVIDED'] as Gate1SecondOrderIntent[]).map(
                        (i) => (
                          <SelectItem key={i} value={i}>
                            {gate1SecondOrderIntentLabel(i)}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 pb-2">
                  <Checkbox
                    id="second-order-provided"
                    checked={secondOrderProvided}
                    disabled={secondOrderIntent === 'VERBAL'}
                    onCheckedChange={(v) => setSecondOrderProvided(v === true)}
                  />
                  <Label htmlFor="second-order-provided" className="font-normal">
                    已主动提供第二单
                  </Label>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>付费承诺金额（元）</Label>
                  <Input
                    type="number"
                    min={0}
                    value={paymentCentsYuan}
                    onChange={(e) => setPaymentCentsYuan(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>承诺类型</Label>
                  <Select
                    value={paymentType}
                    onValueChange={(v) => setPaymentType(v as Gate1PaymentCommitmentType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GATE2_DEPOSIT">Gate 2 保证金</SelectItem>
                      <SelectItem value="POC_AGREEMENT">POC 协议</SelectItem>
                      <SelectItem value="MARGIN_DEPOSIT">毛利保证金</SelectItem>
                      <SelectItem value="OTHER">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="mark-completed"
                  checked={markCompleted}
                  onCheckedChange={(v) => setMarkCompleted(v === true)}
                />
                <Label htmlFor="mark-completed" className="font-normal">
                  提交后标记实验完成（COMPLETED）
                </Label>
              </div>

              <Button disabled={submitOutcome.isPending} onClick={() => void handleSubmitOutcome()}>
                提交 Outcome
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
