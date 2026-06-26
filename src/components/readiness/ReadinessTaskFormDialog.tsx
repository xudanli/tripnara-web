import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
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
import type {
  ReadinessPreparationTask,
  ReadinessTaskCategory,
  ReadinessTaskMember,
  ReadinessTaskScope,
} from '@/lib/readiness-preparation-tasks';

export type TaskFormValues = {
  title: string;
  scope: ReadinessTaskScope;
  priority: ReadinessPreparationTask['priority'];
  category: ReadinessTaskCategory;
  assigneeUserId: string | null;
  assigneeLabel: string | null;
};

interface ReadinessTaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isZh: boolean;
  members: ReadinessTaskMember[];
  initial?: ReadinessPreparationTask | null;
  onSubmit: (values: TaskFormValues) => void;
}

const emptyForm = (members: ReadinessTaskMember[]): TaskFormValues => ({
  title: '',
  scope: 'team',
  priority: 'medium',
  category: 'other',
  assigneeUserId: null,
  assigneeLabel: null,
});

export default function ReadinessTaskFormDialog({
  open,
  onOpenChange,
  isZh,
  members,
  initial,
  onSubmit,
}: ReadinessTaskFormDialogProps) {
  const [form, setForm] = useState<TaskFormValues>(() => emptyForm(members));

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        title: initial.title,
        scope: initial.scope,
        priority: initial.priority,
        category: initial.category ?? 'other',
        assigneeUserId: initial.assigneeUserId ?? null,
        assigneeLabel: initial.assigneeLabel ?? null,
      });
    } else {
      setForm(emptyForm(members));
    }
  }, [open, initial, members]);

  const handleSubmit = () => {
    const title = form.title.trim();
    if (!title) return;
    onSubmit({ ...form, title });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? (isZh ? '编辑任务' : 'Edit task') : isZh ? '新增任务' : 'Add task'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">{isZh ? '任务名称' : 'Title'}</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={isZh ? '例如：订冰岛往返机票' : 'e.g. Book round-trip flights'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isZh ? '类型' : 'Category'}</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as ReadinessTaskCategory }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="booking_flight">{isZh ? '机票' : 'Flight'}</SelectItem>
                  <SelectItem value="booking_hotel">{isZh ? '酒店' : 'Hotel'}</SelectItem>
                  <SelectItem value="booking_transport">{isZh ? '交通' : 'Transport'}</SelectItem>
                  <SelectItem value="booking_activity">{isZh ? '活动/门票' : 'Activity'}</SelectItem>
                  <SelectItem value="document">{isZh ? '签证/保险' : 'Documents'}</SelectItem>
                  <SelectItem value="prep">{isZh ? '行前准备' : 'Prep'}</SelectItem>
                  <SelectItem value="other">{isZh ? '其他' : 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isZh ? '优先级' : 'Priority'}</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, priority: v as ReadinessPreparationTask['priority'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">{isZh ? '高' : 'High'}</SelectItem>
                  <SelectItem value="medium">{isZh ? '中' : 'Medium'}</SelectItem>
                  <SelectItem value="low">{isZh ? '低' : 'Low'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isZh ? '归属' : 'Scope'}</Label>
              <Select
                value={form.scope}
                onValueChange={(v) => {
                  const scope = v as ReadinessTaskScope;
                  setForm((f) => ({
                    ...f,
                    scope,
                    assigneeUserId: scope === 'personal' ? members[0]?.userId ?? null : null,
                    assigneeLabel: scope === 'personal' ? members[0]?.displayName ?? null : null,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">{isZh ? '团队任务' : 'Team'}</SelectItem>
                  <SelectItem value="personal">{isZh ? '个人任务' : 'Personal'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.scope === 'team' && members.length > 0 ? (
              <div className="space-y-1.5">
                <Label>{isZh ? '负责人' : 'Assignee'}</Label>
                <Select
                  value={form.assigneeUserId ?? '__unassigned__'}
                  onValueChange={(v) => {
                    if (v === '__unassigned__') {
                      setForm((f) => ({ ...f, assigneeUserId: null, assigneeLabel: null }));
                      return;
                    }
                    const member = members.find((m) => m.userId === v);
                    setForm((f) => ({
                      ...f,
                      assigneeUserId: v,
                      assigneeLabel: member?.displayName ?? null,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isZh ? '未分配' : 'Unassigned'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unassigned__">{isZh ? '未分配' : 'Unassigned'}</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {isZh ? '取消' : 'Cancel'}
          </Button>
          <Button
            type="button"
            className="bg-foreground hover:bg-foreground/90 text-background"
            onClick={handleSubmit}
            disabled={!form.title.trim()}
          >
            {initial ? (isZh ? '保存' : 'Save') : isZh ? '添加' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
