import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
  ReadinessPreparationTask,
  ReadinessTaskCategory,
  ReadinessTaskMember,
  ReadinessTaskScope,
} from '@/lib/readiness-preparation-tasks';
import {
  TASK_QUICK_TEMPLATES,
  categoryLabel,
  isManualTask,
  tasksByScope,
} from '@/lib/readiness-preparation-tasks';
import ReadinessTaskFormDialog, { type TaskFormValues } from '@/components/readiness/ReadinessTaskFormDialog';
import {
  Users,
  UserRound,
  Plus,
  Pencil,
  Trash2,
  Plane,
  Building2,
  Car,
  Ticket,
  FileText,
  Luggage,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ReadinessTasksTabProps {
  tasks: ReadinessPreparationTask[];
  members: ReadinessTaskMember[];
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onAssign: (taskId: string, userId: string | null, label: string | null) => void;
  onChangeScope: (taskId: string, scope: ReadinessTaskScope) => void;
  onCreateTask: (values: TaskFormValues) => void;
  onUpdateTask: (taskId: string, values: TaskFormValues) => void;
  onDeleteTask: (taskId: string) => void;
}

/** 克制优先级：靠字重与描边，不用情绪化大色块 */
const PRIORITY_STYLE: Record<
  ReadinessPreparationTask['priority'],
  { labelZh: string; labelEn: string; className: string }
> = {
  high: {
    labelZh: '高',
    labelEn: 'High',
    className: 'border-slate-400 text-slate-900 font-medium',
  },
  medium: {
    labelZh: '中',
    labelEn: 'Med',
    className: 'border-slate-200 text-slate-600',
  },
  low: {
    labelZh: '低',
    labelEn: 'Low',
    className: 'border-slate-100 text-slate-400',
  },
};

const CATEGORY_ICON: Partial<Record<ReadinessTaskCategory, LucideIcon>> = {
  booking_flight: Plane,
  booking_hotel: Building2,
  booking_transport: Car,
  booking_activity: Ticket,
  document: FileText,
  prep: Luggage,
};

function TaskRow({
  task,
  members,
  allowAssign,
  isZh,
  onToggleComplete,
  onAssign,
  onChangeScope,
  onEdit,
  onDelete,
}: {
  task: ReadinessPreparationTask;
  members: ReadinessTaskMember[];
  allowAssign: boolean;
  isZh: boolean;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onAssign: (taskId: string, userId: string | null, label: string | null) => void;
  onChangeScope: (taskId: string, scope: ReadinessTaskScope) => void;
  onEdit: (task: ReadinessPreparationTask) => void;
  onDelete: (taskId: string) => void;
}) {
  const priority = PRIORITY_STYLE[task.priority];
  const CatIcon = task.category ? CATEGORY_ICON[task.category] : undefined;
  const catLabel = categoryLabel(task.category, isZh);

  return (
    <li
      className={cn(
        'group rounded-lg border px-3 py-3 transition-colors',
        task.completed
          ? 'border-slate-200/80 bg-muted/20'
          : 'border-slate-200 bg-white hover:border-slate-300',
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.completed}
          onCheckedChange={(value) => onToggleComplete(task.id, value === true)}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {CatIcon ? (
                  <CatIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                ) : null}
                <p
                  className={cn(
                    'text-sm font-medium leading-snug',
                    task.completed ? 'text-muted-foreground line-through' : 'text-foreground',
                  )}
                >
                  {task.title}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                {catLabel ? (
                  <span className="text-[11px] text-muted-foreground">{catLabel}</span>
                ) : null}
                {task.sourceRiskLabel ? (
                  <span className="text-[11px] text-muted-foreground/80">
                    {isZh ? '风险' : 'Risk'} · {task.sourceRiskLabel}
                  </span>
                ) : isManualTask(task) ? (
                  <span className="text-[11px] text-muted-foreground/80">
                    {isZh ? '手动' : 'Manual'}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <Badge variant="outline" className={cn('text-[10px] mr-1', priority.className)}>
                {isZh ? priority.labelZh : priority.labelEn}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => onEdit(task)}
                aria-label={isZh ? '编辑' : 'Edit'}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              {isManualTask(task) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(task.id)}
                  aria-label={isZh ? '删除' : 'Delete'}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {allowAssign && members.length > 0 ? (
              <Select
                value={task.assigneeUserId ?? '__unassigned__'}
                onValueChange={(value) => {
                  if (value === '__unassigned__') {
                    onAssign(task.id, null, null);
                    return;
                  }
                  const member = members.find((m) => m.userId === value);
                  onAssign(task.id, value, member?.displayName ?? null);
                }}
              >
                <SelectTrigger className="h-7 w-[132px] text-xs border-slate-200 bg-transparent">
                  <SelectValue placeholder={isZh ? '负责人' : 'Assignee'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">{isZh ? '未分配' : 'Unassigned'}</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                {isZh ? '负责人' : 'Owner'} · {task.assigneeLabel || (isZh ? '我' : 'Me')}
              </span>
            )}
            <button
              type="button"
              className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={() => onChangeScope(task.id, task.scope === 'team' ? 'personal' : 'team')}
            >
              {task.scope === 'team'
                ? isZh
                  ? '改为个人任务'
                  : 'Make personal'
                : isZh
                  ? '改为团队任务'
                  : 'Make team'}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function TaskSectionCard({
  title,
  icon: Icon,
  description,
  tasks,
  members,
  allowAssign,
  isZh,
  onToggleComplete,
  onAssign,
  onChangeScope,
  onEdit,
  onDelete,
}: {
  title: string;
  icon: typeof Users;
  description: string;
  tasks: ReadinessPreparationTask[];
  members: ReadinessTaskMember[];
  allowAssign: boolean;
  isZh: boolean;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onAssign: (taskId: string, userId: string | null, label: string | null) => void;
  onChangeScope: (taskId: string, scope: ReadinessTaskScope) => void;
  onEdit: (task: ReadinessPreparationTask) => void;
  onDelete: (taskId: string) => void;
}) {
  if (tasks.length === 0) return null;

  const done = tasks.filter((t) => t.completed).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
            {title}
          </CardTitle>
          <span className="text-xs text-muted-foreground tabular-nums">
            {done}/{tasks.length}
          </span>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              members={members}
              allowAssign={allowAssign}
              isZh={isZh}
              onToggleComplete={onToggleComplete}
              onAssign={onAssign}
              onChangeScope={onChangeScope}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function ReadinessTasksTab({
  tasks,
  members,
  onToggleComplete,
  onAssign,
  onChangeScope,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
}: ReadinessTasksTabProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const grouped = useMemo(() => tasksByScope(tasks), [tasks]);
  const done = tasks.filter((t) => t.completed).length;
  const progressPct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ReadinessPreparationTask | null>(null);

  const openCreate = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const openEdit = (task: ReadinessPreparationTask) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleFormSubmit = (values: TaskFormValues) => {
    if (editingTask) onUpdateTask(editingTask.id, values);
    else onCreateTask(values);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 pb-1">
        <div className="flex items-center gap-3">
          {tasks.length > 0 ? (
            <div className="flex items-center gap-2 min-w-0 flex-1 max-w-[200px]">
              <Progress value={progressPct} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {done}/{tasks.length}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground flex-1">
              {isZh ? '快捷添加或新建任务' : 'Quick-add or create a task'}
            </span>
          )}
          <Button
            type="button"
            size="sm"
            className="shrink-0 h-7 text-xs bg-foreground hover:bg-foreground/90 text-background"
            onClick={openCreate}
          >
            <Plus className="h-3 w-3 mr-1" />
            {isZh ? '新增任务' : 'Add'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {TASK_QUICK_TEMPLATES.map((tpl) => {
            const TplIcon = CATEGORY_ICON[tpl.category];
            return (
              <Button
                key={tpl.category + tpl.titleZh}
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[11px] border-slate-200 text-slate-600 hover:bg-muted/50"
                onClick={() =>
                  onCreateTask({
                    title: isZh ? tpl.titleZh : tpl.titleEn,
                    scope: tpl.scope,
                    priority: tpl.priority,
                    category: tpl.category,
                    assigneeUserId: tpl.scope === 'personal' ? members[0]?.userId ?? null : null,
                    assigneeLabel: tpl.scope === 'personal' ? members[0]?.displayName ?? null : null,
                  })
                }
              >
                {TplIcon ? <TplIcon className="h-3 w-3 mr-0.5 opacity-50" /> : null}
                {isZh ? tpl.titleZh : tpl.titleEn}
              </Button>
            );
          })}
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {isZh ? '暂无任务' : 'No tasks yet'}
        </p>
      ) : (
        <>
          <TaskSectionCard
            title={isZh ? '团队任务' : 'Team tasks'}
            icon={Users}
            description={isZh ? '分工协作、共同预订' : 'Shared bookings and coordination'}
            tasks={grouped.team}
            members={members}
            allowAssign
            isZh={isZh}
            onToggleComplete={onToggleComplete}
            onAssign={onAssign}
            onChangeScope={onChangeScope}
            onEdit={openEdit}
            onDelete={onDeleteTask}
          />
          <TaskSectionCard
            title={isZh ? '个人任务' : 'Personal tasks'}
            icon={UserRound}
            description={isZh ? '签证、保险、个人携带' : 'Visa, insurance, personal prep'}
            tasks={grouped.personal}
            members={members}
            allowAssign={false}
            isZh={isZh}
            onToggleComplete={onToggleComplete}
            onAssign={onAssign}
            onChangeScope={onChangeScope}
            onEdit={openEdit}
            onDelete={onDeleteTask}
          />
        </>
      )}

      <ReadinessTaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isZh={isZh}
        members={members}
        initial={editingTask}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
