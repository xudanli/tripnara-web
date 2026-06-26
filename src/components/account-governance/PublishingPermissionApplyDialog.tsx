import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { identityGovernanceApi } from '@/api/identity-governance';
import { ACCOUNT_CAPABILITIES_QUERY_KEY } from '@/hooks/useAccountCapabilities';
import type { AccountCapabilities } from '@/types/account-governance';
import type { PublishingApplicationLevel } from '@/types/identity-governance';

interface PublishingPermissionApplyDialogProps {
  capabilities?: AccountCapabilities | null;
  trigger?: ReactNode;
}

export function PublishingPermissionApplyDialog({
  capabilities,
  trigger,
}: PublishingPermissionApplyDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<PublishingApplicationLevel>('PUBLIC_NON_COMMERCIAL');
  const [reason, setReason] = useState('');

  const subjectType = capabilities?.agencyVerified ? 'ORGANIZATION' : 'USER';
  const orgId = capabilities?.organizationRoles?.[0]?.organizationId;

  const mutation = useMutation({
    mutationFn: () =>
      identityGovernanceApi.submitPublishingApplication({
        requestedLevel: level,
        reason: reason.trim(),
        subjectType,
        subjectId: subjectType === 'ORGANIZATION' ? orgId : capabilities?.userId,
      }),
    onSuccess: () => {
      toast.success('发布权限申请已提交');
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_CAPABILITIES_QUERY_KEY });
      setOpen(false);
      setReason('');
    },
    onError: () => {
      toast.error('提交失败，请确认已完成联系方式验证与专业/机构认证');
    },
  });

  const canSubmit = reason.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            申请发布权限
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>申请发布权限</DialogTitle>
          <DialogDescription>
            公开发布需邮箱或手机验证；商业发布另需专业领队或机构认证。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>申请级别</Label>
            <RadioGroup
              value={level}
              onValueChange={(v) => setLevel(v as PublishingApplicationLevel)}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="PUBLIC_NON_COMMERCIAL" id="pub-nc" />
                <Label htmlFor="pub-nc" className="font-normal">
                  公开非商业（分摊成本、非盈利招募）
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="PUBLIC_COMMERCIAL" id="pub-c" />
                <Label htmlFor="pub-c" className="font-normal">
                  公开商业（收费带队 / 机构产品）
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pub-reason">申请理由</Label>
            <Textarea
              id="pub-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="说明计划发布的项目类型、目的地与合规安排（至少 10 字）"
              rows={4}
            />
          </div>

          {subjectType === 'ORGANIZATION' && orgId && (
            <p className="text-xs text-muted-foreground">申请主体：机构 {orgId}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending ? '提交中…' : '提交申请'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
