import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { professionalCertificationApi } from '@/api/professional-certification';
import { ACCOUNT_CAPABILITIES_QUERY_KEY } from '@/hooks/useAccountCapabilities';
import {
  emptyProfessionalCertificationDraft,
  readProfessionalCertificationDraft,
  updateProfessionalCertificationDraftSections,
} from '@/lib/professional-certification-draft';
import type {
  ProfessionalCertificationApplicationDraft,
  ProfessionalCertificationFormStep,
} from '@/types/professional-certification';
import { cn } from '@/lib/utils';

const STEPS: Array<{ id: ProfessionalCertificationFormStep; label: string }> = [
  { id: 'identity', label: '身份' },
  { id: 'experience', label: '经历' },
  { id: 'qualification', label: '资质' },
  { id: 'compliance', label: '合规' },
  { id: 'review', label: '确认' },
];

function stepIndex(step: ProfessionalCertificationFormStep): number {
  return STEPS.findIndex((s) => s.id === step);
}

interface ProfessionalCertificationApplicationFormProps {
  onSubmitted?: () => void;
}

export function ProfessionalCertificationApplicationForm({
  onSubmitted,
}: ProfessionalCertificationApplicationFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ProfessionalCertificationFormStep>('identity');
  const [draft, setDraft] = useState<ProfessionalCertificationApplicationDraft>(() =>
    readProfessionalCertificationDraft() ?? emptyProfessionalCertificationDraft()
  );
  const [submitting, setSubmitting] = useState(false);

  const persist = useCallback((sections: Parameters<typeof updateProfessionalCertificationDraftSections>[0]) => {
    const next = updateProfessionalCertificationDraftSections(sections);
    setDraft(next);
  }, []);

  useEffect(() => {
    if (draft.status === 'SUBMITTED') {
      setStep('review');
    }
  }, [draft.status]);

  const goNext = () => {
    const idx = stepIndex(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].id);
  };

  const goBack = () => {
    const idx = stepIndex(step);
    if (idx > 0) setStep(STEPS[idx - 1].id);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await professionalCertificationApi.submitApplication({
        identity: draft.identity,
        experience: draft.experience,
        qualification: draft.qualification,
        compliance: draft.compliance,
      });
      const updated = readProfessionalCertificationDraft();
      if (updated) setDraft(updated);
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_CAPABILITIES_QUERY_KEY });
      toast.success('申请已提交，进入平台审核');
      onSubmitted?.();
      navigate('/dashboard/account/professional');
    } catch {
      toast.error('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const submitted = draft.status === 'SUBMITTED';

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2" aria-label="申请步骤">
        {STEPS.map((s, index) => {
          const current = stepIndex(step);
          const done = index < current || submitted;
          const active = s.id === step;
          return (
            <span
              key={s.id}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                active && 'bg-primary text-primary-foreground',
                done && !active && 'bg-muted text-muted-foreground',
                !done && !active && 'border border-border text-muted-foreground'
              )}
            >
              {index + 1}. {s.label}
            </span>
          );
        })}
      </nav>

      {step === 'identity' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="legalName">法定姓名</Label>
            <Input
              id="legalName"
              value={draft.identity.legalName}
              onChange={(e) => persist({ identity: { legalName: e.target.value } })}
              placeholder="与证件一致"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyName">紧急联系人</Label>
            <Input
              id="emergencyName"
              value={draft.identity.emergencyContactName}
              onChange={(e) => persist({ identity: { emergencyContactName: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyPhone">紧急联系电话</Label>
            <Input
              id="emergencyPhone"
              value={draft.identity.emergencyContactPhone}
              onChange={(e) => persist({ identity: { emergencyContactPhone: e.target.value } })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            实名与证件核验将在后续步骤由平台或第三方服务完成。
          </p>
        </div>
      )}

      {step === 'experience' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="years">从业年限</Label>
              <Input
                id="years"
                type="number"
                min={0}
                value={draft.experience.yearsOfExperience}
                onChange={(e) => persist({ experience: { yearsOfExperience: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trips">已完成带团次数</Label>
              <Input
                id="trips"
                type="number"
                min={0}
                value={draft.experience.completedTripCount}
                onChange={(e) => persist({ experience: { completedTripCount: e.target.value } })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="destinations">目的地经验</Label>
            <Textarea
              id="destinations"
              rows={3}
              value={draft.experience.destinationExperience}
              onChange={(e) => persist({ experience: { destinationExperience: e.target.value } })}
              placeholder="例如：冰岛 ×12、川西高原 ×8"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="activities">擅长活动类型</Label>
            <Textarea
              id="activities"
              rows={2}
              value={draft.experience.activityTypes}
              onChange={(e) => persist({ experience: { activityTypes: e.target.value } })}
              placeholder="徒步、自驾、滑雪、潜水等"
            />
          </div>
        </div>
      )}

      {step === 'qualification' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="certType">证书类型</Label>
            <Input
              id="certType"
              value={draft.qualification.certificateType}
              onChange={(e) => persist({ qualification: { certificateType: e.target.value } })}
              placeholder="如：野外急救、登山向导"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issuer">发证机构</Label>
            <Input
              id="issuer"
              value={draft.qualification.issuer}
              onChange={(e) => persist({ qualification: { issuer: e.target.value } })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="certId">证书编号</Label>
              <Input
                id="certId"
                value={draft.qualification.certificateId}
                onChange={(e) => persist({ qualification: { certificateId: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">有效期至</Label>
              <Input
                id="validUntil"
                type="date"
                value={draft.qualification.validUntil}
                onChange={(e) => persist({ qualification: { validUntil: e.target.value } })}
              />
            </div>
          </div>
        </div>
      )}

      {step === 'compliance' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serviceEntity">服务主体名称</Label>
            <Input
              id="serviceEntity"
              value={draft.compliance.serviceEntityName}
              onChange={(e) => persist({ compliance: { serviceEntityName: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentEntity">收款主体名称</Label>
            <Input
              id="paymentEntity"
              value={draft.compliance.paymentEntityName}
              onChange={(e) => persist({ compliance: { paymentEntityName: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund">退款与取消政策摘要</Label>
            <Textarea
              id="refund"
              rows={3}
              value={draft.compliance.refundPolicySummary}
              onChange={(e) => persist({ compliance: { refundPolicySummary: e.target.value } })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.compliance.hasLiabilityInsurance}
              onCheckedChange={(checked) =>
                persist({ compliance: { hasLiabilityInsurance: checked === true } })
              }
            />
            已购买或可提供责任保险证明
          </label>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4 text-sm">
          {submitted ? (
            <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-foreground">
              申请已提交，状态：审核中。补件通知将发送至你的注册邮箱。
            </p>
          ) : (
            <p className="text-muted-foreground">
              请确认材料真实有效。提交后进入人工初审，必要时平台会要求补件。
            </p>
          )}
          <dl className="space-y-3 rounded-lg border border-border p-4">
            <div>
              <dt className="text-xs text-muted-foreground">身份</dt>
              <dd>{draft.identity.legalName || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">经历</dt>
              <dd>
                {draft.experience.yearsOfExperience || '0'} 年 ·{' '}
                {draft.experience.completedTripCount || '0'} 次带团
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">资质</dt>
              <dd>
                {draft.qualification.certificateType || '—'} · {draft.qualification.issuer || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">服务主体</dt>
              <dd>{draft.compliance.serviceEntityName || '—'}</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        {stepIndex(step) > 0 && !submitted && (
          <Button type="button" variant="outline" onClick={goBack}>
            上一步
          </Button>
        )}
        {step !== 'review' && (
          <Button type="button" onClick={goNext}>
            下一步
          </Button>
        )}
        {step === 'review' && !submitted && (
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中…' : '提交申请'}
          </Button>
        )}
      </div>
    </div>
  );
}
