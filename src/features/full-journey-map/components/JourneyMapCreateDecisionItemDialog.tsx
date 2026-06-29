import { useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  journeyMapApi,
  type JourneyMapDecisionItem,
} from '@/api/journey-map';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { JourneyActivity } from '../types';
import type { JourneyInspectorEvidenceConclusion, JourneyInspectorRiskView } from '../types-inspector-view';
import { resolveInspectorActivityApiId } from '../lib/resolve-inspector-activity-context';
import { journeyMapFocusRing } from '../journey-map-ui';

export interface JourneyMapCreateDecisionItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  activity: JourneyActivity;
  riskView: JourneyInspectorRiskView;
  evidenceConclusion?: JourneyInspectorEvidenceConclusion;
  constraintsVersion?: number;
  onCreated?: (item: JourneyMapDecisionItem, constraintsVersion?: number) => void;
}

export function JourneyMapCreateDecisionItemDialog({
  open,
  onOpenChange,
  tripId,
  activity,
  riskView,
  evidenceConclusion,
  constraintsVersion,
  onCreated,
}: JourneyMapCreateDecisionItemDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'high' | 'medium' | 'low'>(riskView.level);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const day = activity.dayIndex + 1;
    setTitle(`确认 Day ${day} ${activity.title} 风险与执行条件`);
    setDescription(
      riskView.keyRisks.length > 0
        ? `关键风险：${riskView.keyRisks.join('、')}`
        : '',
    );
    setSeverity(riskView.level);
  }, [open, activity, riskView]);

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error('请填写事项标题');
      return;
    }

    setSubmitting(true);
    try {
      const result = await journeyMapApi.createDecisionItem(tripId, {
        activityId: resolveInspectorActivityApiId(activity),
        title: trimmedTitle,
        description: description.trim() || undefined,
        severity,
        verdict: evidenceConclusion?.verdict,
        riskLabels: riskView.keyRisks.length > 0 ? riskView.keyRisks : undefined,
        constraintsVersion,
      });
      toast.success('决策事项已创建');
      onOpenChange(false);
      onCreated?.(result.item, result.constraintsVersion);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建决策事项失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>创建决策事项</DialogTitle>
          <DialogDescription>基于当前风险视图写入行程决策清单</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          <Field label="标题" id="decision-title">
            <Input
              id="decision-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="说明" id="decision-desc">
            <Textarea
              id="decision-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </Field>
          <Field label="严重程度" id="decision-severity">
            <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
              <SelectTrigger id="decision-severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            type="button"
            className={journeyMapFocusRing}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {children}
    </div>
  );
}
