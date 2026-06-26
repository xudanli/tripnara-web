import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { agencyCertificationApi } from '@/api/agency-certification';
import { ACCOUNT_CAPABILITIES_QUERY_KEY } from '@/hooks/useAccountCapabilities';
import {
  emptyAgencyCertificationDraft,
  readAgencyCertificationDraft,
  updateAgencyCertificationDraftSections,
} from '@/lib/agency-certification-draft';
import type {
  AgencyCertificationApplicationDraft,
  AgencyCertificationFormStep,
} from '@/types/agency-certification';
import { cn } from '@/lib/utils';

const STEPS: Array<{ id: AgencyCertificationFormStep; label: string }> = [
  { id: 'workspace', label: '空间' },
  { id: 'entity', label: '主体' },
  { id: 'authorization', label: '授权' },
  { id: 'operations', label: '经营' },
  { id: 'financial', label: '资金' },
  { id: 'review', label: '确认' },
];

function stepIndex(step: AgencyCertificationFormStep): number {
  return STEPS.findIndex((s) => s.id === step);
}

interface AgencyCertificationApplicationFormProps {
  onSubmitted?: () => void;
}

export function AgencyCertificationApplicationForm({
  onSubmitted,
}: AgencyCertificationApplicationFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<AgencyCertificationFormStep>('workspace');
  const [draft, setDraft] = useState<AgencyCertificationApplicationDraft>(() =>
    readAgencyCertificationDraft() ?? emptyAgencyCertificationDraft()
  );
  const [submitting, setSubmitting] = useState(false);

  const persist = useCallback((sections: Parameters<typeof updateAgencyCertificationDraftSections>[0]) => {
    const next = updateAgencyCertificationDraftSections(sections);
    setDraft(next);
  }, []);

  useEffect(() => {
    if (draft.status === 'SUBMITTED') setStep('review');
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
      await agencyCertificationApi.submitApplication({
        workspaceName: draft.workspaceName,
        entity: draft.entity,
        authorization: draft.authorization,
        operations: draft.operations,
        financial: draft.financial,
      });
      const updated = readAgencyCertificationDraft();
      if (updated) setDraft(updated);
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_CAPABILITIES_QUERY_KEY });
      toast.success('机构认证申请已提交');
      onSubmitted?.();
      navigate('/dashboard/account/agency');
    } catch {
      toast.error('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const submitted = draft.status === 'SUBMITTED';

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2" aria-label="机构认证步骤">
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

      {step === 'workspace' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspaceName">机构空间名称</Label>
            <Input
              id="workspaceName"
              value={draft.workspaceName}
              onChange={(e) => persist({ workspaceName: e.target.value })}
              placeholder="对外展示的机构名称"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            创建空间后可邀请成员；企业认证通过前不得以机构名义公开发布项目。
          </p>
        </div>
      )}

      {step === 'entity' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="legalName">企业法定名称</Label>
            <Input
              id="legalName"
              value={draft.entity.legalName}
              onChange={(e) => persist({ entity: { legalName: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uscc">统一社会信用代码</Label>
            <Input
              id="uscc"
              value={draft.entity.unifiedSocialCreditCode}
              onChange={(e) => persist({ entity: { unifiedSocialCreditCode: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">注册地址</Label>
            <Input
              id="address"
              value={draft.entity.registeredAddress}
              onChange={(e) => persist({ entity: { registeredAddress: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scope">服务范围摘要</Label>
            <Textarea
              id="scope"
              rows={2}
              value={draft.entity.businessScope}
              onChange={(e) => persist({ entity: { businessScope: e.target.value } })}
            />
          </div>
        </div>
      )}

      {step === 'authorization' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="authName">授权操作人</Label>
              <Input
                id="authName"
                value={draft.authorization.authorizedPersonName}
                onChange={(e) => persist({ authorization: { authorizedPersonName: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authTitle">职务</Label>
              <Input
                id="authTitle"
                value={draft.authorization.authorizedPersonTitle}
                onChange={(e) => persist({ authorization: { authorizedPersonTitle: e.target.value } })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="authEmail">联系邮箱</Label>
              <Input
                id="authEmail"
                type="email"
                value={draft.authorization.contactEmail}
                onChange={(e) => persist({ authorization: { contactEmail: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authPhone">联系电话</Label>
              <Input
                id="authPhone"
                value={draft.authorization.contactPhone}
                onChange={(e) => persist({ authorization: { contactPhone: e.target.value } })}
              />
            </div>
          </div>
        </div>
      )}

      {step === 'operations' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="license">经营资质摘要</Label>
            <Textarea
              id="license"
              rows={2}
              value={draft.operations.travelLicenseSummary}
              onChange={(e) => persist({ operations: { travelLicenseSummary: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="regions">服务目的地/区域</Label>
            <Textarea
              id="regions"
              rows={2}
              value={draft.operations.serviceRegions}
              onChange={(e) => persist({ operations: { serviceRegions: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="complaint">投诉处理机制摘要</Label>
            <Textarea
              id="complaint"
              rows={2}
              value={draft.operations.complaintProcessSummary}
              onChange={(e) => persist({ operations: { complaintProcessSummary: e.target.value } })}
            />
          </div>
        </div>
      )}

      {step === 'financial' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paymentEntity">收款主体</Label>
            <Input
              id="paymentEntity"
              value={draft.financial.paymentEntityName}
              onChange={(e) => persist({ financial: { paymentEntityName: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund">退款与取消政策</Label>
            <Textarea
              id="refund"
              rows={3}
              value={draft.financial.refundPolicySummary}
              onChange={(e) => persist({ financial: { refundPolicySummary: e.target.value } })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.financial.hasLiabilityInsurance}
              onCheckedChange={(checked) =>
                persist({ financial: { hasLiabilityInsurance: checked === true } })
              }
            />
            已购买或可提供机构责任保险证明
          </label>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4 text-sm">
          {submitted ? (
            <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-foreground">
              申请已提交，进入企业认证审核。审核结果将通知授权联系人。
            </p>
          ) : (
            <p className="text-muted-foreground">
              提交后平台将核验主体与授权信息；认证通过后方可申请商业项目发布权限。
            </p>
          )}
          <dl className="space-y-3 rounded-lg border border-border p-4">
            <div>
              <dt className="text-xs text-muted-foreground">机构空间</dt>
              <dd>{draft.workspaceName || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">企业主体</dt>
              <dd>{draft.entity.legalName || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">授权人</dt>
              <dd>{draft.authorization.authorizedPersonName || '—'}</dd>
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
            {submitting ? '提交中…' : '提交认证申请'}
          </Button>
        )}
      </div>
    </div>
  );
}
