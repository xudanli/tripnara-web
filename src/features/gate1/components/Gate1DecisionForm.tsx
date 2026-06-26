import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGate1AdvisorOutputs, useGate1Decision, useSubmitGate1Decision } from '@/hooks/useGate1';
import {
  GATE1_MATERIAL_CHANGE_TYPES,
  gate1MaterialChangeTypeLabel,
  validateGate1DecisionForm,
} from '@/lib/gate1-display';
import { trackGate1AdvisorDecisionSubmitted } from '@/utils/gate1-analytics';
import type { Gate1MaterialChangeType } from '@/types/gate1';

interface Gate1DecisionFormProps {
  projectId: string;
}

export function Gate1DecisionForm({ projectId }: Gate1DecisionFormProps) {
  const { data: outputs } = useGate1AdvisorOutputs(projectId);
  const { data: existing } = useGate1Decision(projectId);
  const submitDecision = useSubmitGate1Decision(projectId);

  const publishedConflictVersion = useMemo(() => {
    const published = outputs?.conflicts?.filter((c) => c.status === 'PUBLISHED') ?? [];
    return published.sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0]?.version ?? 1;
  }, [outputs?.conflicts]);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | 'none'>('none');
  const [adoptedNone, setAdoptedNone] = useState(false);
  const [materialChange, setMaterialChange] = useState(false);
  const [changeTypes, setChangeTypes] = useState<Gate1MaterialChangeType[]>([]);
  const [changeEvidence, setChangeEvidence] = useState('');
  const [modificationSummary, setModificationSummary] = useState('');
  const [reasonText, setReasonText] = useState('');

  const candidates = outputs?.candidates?.filter((c) => c.status === 'PUBLISHED') ?? [];
  const readOnly = Boolean(existing?.submittedAt);

  const toggleChangeType = (type: Gate1MaterialChangeType, checked: boolean) => {
    setChangeTypes((prev) =>
      checked ? [...prev, type] : prev.filter((t) => t !== type),
    );
  };

  const handleSubmit = async () => {
    const validationError = validateGate1DecisionForm({
      materialChange,
      changeTypes,
      changeEvidence,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!adoptedNone && selectedCandidateId === 'none' && candidates.length > 0) {
      toast.error('请选择采用的方案，或勾选「均未采用」');
      return;
    }

    try {
      await submitDecision.mutateAsync({
        selectedCandidateId: adoptedNone || selectedCandidateId === 'none' ? undefined : selectedCandidateId,
        conflictReportVersion: publishedConflictVersion,
        adoptedNone,
        materialChange,
        changeTypes: materialChange ? changeTypes : undefined,
        changeEvidence: materialChange ? changeEvidence.trim() : undefined,
        modificationSummary: modificationSummary.trim() || undefined,
        reasonText: reasonText.trim() || undefined,
      });
      trackGate1AdvisorDecisionSubmitted({
        projectId,
        materialChange,
        changeTypes: materialChange ? changeTypes : undefined,
      });
      toast.success('决策记录已提交');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '提交失败');
    }
  };

  if (readOnly && existing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">决策记录（已提交）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            重要决策改变：
            {existing.materialChange ? '是' : '否'}
          </p>
          {existing.changeTypes?.length ? (
            <p>改变类型：{existing.changeTypes.join('、')}</p>
          ) : null}
          {existing.changeEvidence && <p>证据：{existing.changeEvidence}</p>}
          {existing.reasonText && <p>原因：{existing.reasonText}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">顾问决策记录</CardTitle>
        <CardDescription>
          关联冲突报告 v{publishedConflictVersion}。仅文案润色不计入「重要决策改变」。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="decision-none"
            checked={adoptedNone}
            onCheckedChange={(v) => setAdoptedNone(v === true)}
          />
          <Label htmlFor="decision-none">均未采用 TripNARA 候选方案</Label>
        </div>

        {!adoptedNone && candidates.length > 0 && (
          <div className="space-y-2">
            <Label>采用方案</Label>
            <Select
              value={selectedCandidateId}
              onValueChange={setSelectedCandidateId}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择方案" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— 请选择 —</SelectItem>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Checkbox
            id="decision-material"
            checked={materialChange}
            onCheckedChange={(v) => setMaterialChange(v === true)}
          />
          <Label htmlFor="decision-material">TripNARA 改变了重要决策</Label>
        </div>

        {materialChange && (
          <div className="space-y-3 rounded-lg border p-3">
            <Label>改变类型</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {GATE1_MATERIAL_CHANGE_TYPES.map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <Checkbox
                    id={`change-${type}`}
                    checked={changeTypes.includes(type)}
                    onCheckedChange={(v) => toggleChangeType(type, v === true)}
                  />
                  <Label htmlFor={`change-${type}`} className="font-normal">
                    {gate1MaterialChangeTypeLabel(type)}
                  </Label>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="change-evidence">改变证据 *</Label>
              <Textarea
                id="change-evidence"
                rows={2}
                value={changeEvidence}
                onChange={(e) => setChangeEvidence(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="decision-mod">修改摘要</Label>
          <Textarea
            id="decision-mod"
            rows={2}
            value={modificationSummary}
            onChange={(e) => setModificationSummary(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="decision-reason">决策原因</Label>
          <Textarea
            id="decision-reason"
            rows={2}
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
          />
        </div>

        <Button disabled={submitDecision.isPending} onClick={() => void handleSubmit()}>
          提交决策记录
        </Button>
      </CardContent>
    </Card>
  );
}
