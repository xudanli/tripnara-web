import { useState, type ReactNode } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QUALIFICATION_TYPE_OPTIONS } from '@/lib/qualification-display';
import { useSubmitQualification } from '@/hooks/useQualifications';
import type { QualificationType } from '@/types/identity-governance';

interface QualificationSubmitDialogProps {
  userId: string;
  trigger?: ReactNode;
}

export function QualificationSubmitDialog({ userId, trigger }: QualificationSubmitDialogProps) {
  const [open, setOpen] = useState(false);
  const [qualificationType, setQualificationType] = useState<QualificationType>('OUTDOOR_GUIDE');
  const [issuer, setIssuer] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');

  const submit = useSubmitQualification();

  const handleSubmit = async () => {
    if (!issuer.trim() || !certificateNumber.trim()) {
      toast.error('请填写发证机构与证书编号');
      return;
    }
    try {
      await submit.mutateAsync({
        subjectType: 'USER',
        subjectId: userId,
        qualificationType,
        issuer: issuer.trim(),
        certificateNumber: certificateNumber.trim(),
        validFrom: validFrom || undefined,
        validUntil: validUntil || undefined,
      });
      toast.success('资质已提交，等待平台审核');
      setOpen(false);
      setIssuer('');
      setCertificateNumber('');
      setValidFrom('');
      setValidUntil('');
    } catch {
      toast.error('提交失败，请稍后重试');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            提交资质
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>提交专业资质</DialogTitle>
          <DialogDescription>
            资质经审核后展示在公开信任档案；不参与信用评分。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>资质类型</Label>
            <Select
              value={qualificationType}
              onValueChange={(v) => setQualificationType(v as QualificationType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUALIFICATION_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qual-issuer">发证机构</Label>
            <Input
              id="qual-issuer"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="例如：中国登山协会"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qual-number">证书编号</Label>
            <Input
              id="qual-number"
              value={certificateNumber}
              onChange={(e) => setCertificateNumber(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qual-from">生效日期</Label>
              <Input
                id="qual-from"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qual-until">有效期至</Label>
              <Input
                id="qual-until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submit.isPending}>
            {submit.isPending ? '提交中…' : '提交审核'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
