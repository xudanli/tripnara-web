/**
 * 编辑决策步骤对话框组件
 * 用于Expert/Studio模式编辑决策步骤
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { GateStatusBanner } from '@/components/ui/gate-status-banner';
import { normalizeGateStatus } from '@/lib/gate-status';
import type { DecisionStep, UpdateDecisionStepRequest, UserMode, GateStatus } from '@/types/decision-draft';
import { toast } from 'sonner';

export interface EditStepDialogProps {
  step: DecisionStep | null;
  open: boolean;
  onClose: () => void;
  onSave: (stepId: string, updates: UpdateDecisionStepRequest) => Promise<void>;
  onPreviewImpact?: (stepId: string, newValue: any) => Promise<void>;
  userMode?: UserMode;
}

export default function EditStepDialog({
  step,
  open,
  onClose,
  onSave,
  onPreviewImpact,
  userMode = 'expert',
}: EditStepDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<GateStatus>('ALLOW');
  const [confidence, setConfidence] = useState(0.5);
  const [outputs, setOutputs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (step && open) {
      setTitle(step.title || '');
      setDescription(step.description || '');
      setStatus(normalizeGateStatus(step.status));
      setConfidence(step.confidence || 0.5);
      setOutputs(step.outputs || []);
    }
  }, [step, open]);

  // 重置表单
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus('ALLOW');
    setConfidence(0.5);
    setOutputs([]);
    setSaving(false);
    setPreviewing(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePreviewImpact = async () => {
    if (!step || !onPreviewImpact) return;

    try {
      setPreviewing(true);
      const newValue = outputs.length > 0 ? outputs[0] : { status, confidence };
      await onPreviewImpact(step.id, newValue);
    } catch (err: any) {
      toast.error(err.message || '预览影响失败');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSave = async () => {
    if (!step) return;

    try {
      setSaving(true);
      const updates: UpdateDecisionStepRequest = {
        title: title !== step.title ? title : undefined,
        description: description !== step.description ? description : undefined,
        status: status !== normalizeGateStatus(step.status) ? status : undefined,
        confidence: confidence !== step.confidence ? confidence : undefined,
        outputs: outputs.length > 0 ? outputs : undefined,
      };

      // 移除undefined字段
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      ) as UpdateDecisionStepRequest;

      await onSave(step.id, cleanUpdates);
      handleClose();
    } catch (err: any) {
      toast.error(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!step) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑决策步骤</DialogTitle>
          <DialogDescription>
            修改决策步骤的属性和值
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* 当前状态 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">当前状态</Label>
            <GateStatusBanner status={normalizeGateStatus(step.status)} size="sm" />
          </div>

          {/* 标题 */}
          <div>
            <Label htmlFor="title">决策标题</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入决策标题"
              className="mt-1"
            />
          </div>

          {/* 描述 */}
          <div>
            <Label htmlFor="description">决策描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入决策描述"
              className="mt-1 min-h-[100px]"
            />
          </div>

          {/* 状态选择 */}
          <div>
            <Label htmlFor="status">决策状态</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as GateStatus)}>
              <SelectTrigger id="status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALLOW">通过</SelectItem>
                <SelectItem value="NEED_CONFIRM">需确认</SelectItem>
                <SelectItem value="SUGGEST_REPLACE">建议替换</SelectItem>
                <SelectItem value="REJECT">拒绝</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 置信度（Expert/Studio模式） */}
          {userMode !== 'toc' && (
            <div>
              <Label htmlFor="confidence">
                置信度：{Math.round(confidence * 100)}%
              </Label>
              <Slider
                id="confidence"
                value={[confidence]}
                onValueChange={([value]) => setConfidence(value)}
                min={0}
                max={1}
                step={0.01}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* 输出值（Expert/Studio模式） */}
          {userMode !== 'toc' && outputs.length > 0 && (
            <div>
              <Label>输出值</Label>
              <div className="mt-2 space-y-2">
                {outputs.map((output, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="text-sm font-medium mb-1">
                      {typeof output === 'object' && output.name ? output.name : `输出 ${index + 1}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {typeof output === 'object' && output.value !== undefined
                        ? JSON.stringify(output.value, null, 2)
                        : String(output)}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                输出值编辑功能开发中，当前仅支持查看
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            取消
          </Button>
          {onPreviewImpact && (
            <Button
              variant="outline"
              onClick={handlePreviewImpact}
              disabled={saving || previewing}
            >
              {previewing && <Spinner className="w-4 h-4 mr-2" />}
              预览影响
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || previewing}>
            {saving && <Spinner className="w-4 h-4 mr-2" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
