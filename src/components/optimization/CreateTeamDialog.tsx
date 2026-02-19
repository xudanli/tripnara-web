/**
 * 创建团队对话框
 */

import * as React from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DEFAULT_WEIGHTS } from '@/types/optimization-v2';
import type { CreateTeamRequest, TeamType, DecisionWeightMode } from '@/types/optimization-v2';
import { Users } from 'lucide-react';

const TEAM_TYPES: { value: TeamType; label: string }[] = [
  { value: 'FAMILY', label: '家庭' },
  { value: 'FRIENDS', label: '朋友' },
  { value: 'EXPEDITION', label: '探险队' },
  { value: 'TOUR_GROUP', label: '旅行团' },
  { value: 'CUSTOM', label: '自定义' },
];

const DECISION_MODES: { value: DecisionWeightMode; label: string }[] = [
  { value: 'EQUAL', label: '平等决策' },
  { value: 'LEADER_DOMINANT', label: '领队主导' },
  { value: 'EXPERIENCE_WEIGHTED', label: '经验加权' },
  { value: 'FITNESS_WEIGHTED', label: '体能加权' },
  { value: 'CUSTOM', label: '自定义权重' },
];

export interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: CreateTeamRequest) => Promise<void>;
  currentUserId: string;
  currentUserDisplayName: string;
  isSubmitting?: boolean;
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  onSubmit,
  currentUserId,
  currentUserDisplayName,
  isSubmitting = false,
}: CreateTeamDialogProps) {
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<TeamType>('FAMILY');
  const [decisionWeightMode, setDecisionWeightMode] = React.useState<DecisionWeightMode>('LEADER_DOMINANT');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({
      name: name.trim(),
      type,
      decisionWeightMode,
      members: [
        {
          userId: currentUserId,
          displayName: currentUserDisplayName || '我',
          role: 'LEADER',
          decisionWeight: 1,
          fitnessLevel: 'INTERMEDIATE',
          experienceLevel: 'EXPERIENCED',
          personalWeights: DEFAULT_WEIGHTS,
        },
      ],
    });
    setName('');
    setType('FAMILY');
    setDecisionWeightMode('LEADER_DOMINANT');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            创建团队
          </DialogTitle>
          <DialogDescription>
            创建团队后，您将作为领队，可后续添加成员并使用团队协商功能
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">团队名称</Label>
            <Input
              id="team-name"
              placeholder="例如：冰岛家庭游"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>团队类型</Label>
            <Select value={type} onValueChange={(v) => setType(v as TeamType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>决策模式</Label>
            <Select value={decisionWeightMode} onValueChange={(v) => setDecisionWeightMode(v as DecisionWeightMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DECISION_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
