import { Plus, X, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DECISION_COLLABORATIVE_SUB_TASK_KIND_LABELS,
  DECISION_COLLAB_SUBTASK_STATUS_OPTIONS,
  decisionCollaborativeSubTaskKindLabel,
  isLocalCollaborativeFollowUpId,
  labelForCollaborativeSubTaskStatus,
  type StructuredSuggestedFollowUp,
} from '@/lib/decision-collaborative-sub-task.util';
import type { UseDecisionCollaborativeSubTasksResult } from '@/hooks/useDecisionCollaborativeSubTasks';
import type {
  DecisionCollaborativeSubTaskKind,
  DecisionCollaborativeSubTaskStatus,
} from '@/generated/unified-decision-contracts';
import type { Collaborator } from '@/types/trip';

const SUB_TASK_KINDS = Object.keys(
  DECISION_COLLABORATIVE_SUB_TASK_KIND_LABELS,
) as DecisionCollaborativeSubTaskKind[];

export interface DecisionCollaborativeSubTasksPanelProps {
  model: UseDecisionCollaborativeSubTasksResult;
  resolutionId: string;
  collaborators?: Collaborator[] | null;
  /** apply 响应中自动 seed 的子任务（展示提示） */
  autoSuggestedCount?: number;
  /** apply 后隐藏创建表单，仅展示列表与 PATCH */
  readOnlyCreate?: boolean;
  /** 标注为可选模块（apply 阶段默认折叠创建区） */
  optional?: boolean;
  /** submit resolutions 返回的建议跟进项 */
  suggestedFollowUps?: StructuredSuggestedFollowUp[];
  className?: string;
}

/** submit resolutions 后创建协作跟进子任务；apply 后可 PATCH 状态 / 负责人 */
export function DecisionCollaborativeSubTasksPanel({
  model,
  resolutionId,
  collaborators,
  autoSuggestedCount = 0,
  readOnlyCreate = false,
  optional = false,
  suggestedFollowUps = [],
  className,
}: DecisionCollaborativeSubTasksPanelProps) {
  const {
    items,
    loading,
    creating,
    updatingSubTaskId,
    draftKind,
    draftTitle,
    setDraftKind,
    setDraftTitle,
    createSubTask,
    updateSubTask,
    cancelSubTask,
  } = model;

  const activeItems = items.filter((item) => item.status !== 'cancelled');
  const activeTitles = new Set(activeItems.map((item) => item.title.trim()));
  const pendingSuggestions = suggestedFollowUps.filter(
    (item) => !activeTitles.has(item.title.trim()),
  );
  const hasActiveItems = activeItems.length > 0;
  const defaultOpen = true;

  const panelBody = (
    <>
      <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
        {readOnlyCreate
          ? '应用到行程后可在下方更新跟进状态；已有手动子任务时不会重复自动创建。'
          : optional
            ? '如需团队分工（查取消政策、联系预订等），可在此添加跟进任务；跳过不影响应用到行程。'
            : '提交结论后可创建跟进任务；应用到行程前可先安排查住宿、取消政策等事项。'}
      </p>

      {autoSuggestedCount > 0 ? (
        <p className="mb-3 rounded-lg border border-gate-allow-border/60 bg-gate-allow/8 px-2 py-1.5 text-[11px] text-foreground">
          已自动建议 {autoSuggestedCount} 项跟进子任务（按 semanticKey 规则 seed）
        </p>
      ) : null}

      {pendingSuggestions.length > 0 ? (
        <div className="mb-3 space-y-2 rounded-lg border border-border/60 bg-muted/15 px-2 py-2">
          <p className="text-[11px] font-medium text-foreground">系统建议跟进</p>
          {pendingSuggestions.map((item) => (
            <div key={`${item.kind}-${item.title}`} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-foreground">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 px-2 text-[11px]"
                disabled={creating}
                onClick={() =>
                  void createSubTask({
                    kind: item.kind,
                    title: item.title,
                    description: item.description,
                  })
                }
              >
                添加
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {loading ? (
        <p className="mb-3 text-[11px] text-muted-foreground">加载子任务…</p>
      ) : activeItems.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {activeItems.map((item) => {
            const status = item.status ?? 'pending';
            const assigneeValue = item.assigneeUserId ?? '__unassigned__';
            return (
              <li
                key={item.id}
                className="space-y-1.5 rounded-lg border border-border/50 bg-background px-2 py-2"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground">{item.title}</span>
                  <Badge variant="secondary" className="h-5 text-[10px] font-normal">
                    {decisionCollaborativeSubTaskKindLabel(item.kind)}
                  </Badge>
                  {isLocalCollaborativeFollowUpId(item.id) ? (
                    <Badge variant="outline" className="h-5 text-[10px] font-normal">
                      本地记录
                    </Badge>
                  ) : null}
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <Select
                    value={status}
                    disabled={updatingSubTaskId === item.id}
                    onValueChange={(value) =>
                      void updateSubTask(item.id, {
                        status: value as DecisionCollaborativeSubTaskStatus,
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-[11px]">
                      <SelectValue>{labelForCollaborativeSubTaskStatus(status)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DECISION_COLLAB_SUBTASK_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-xs">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {collaborators?.length ? (
                    <Select
                      value={assigneeValue}
                      disabled={updatingSubTaskId === item.id}
                      onValueChange={(value) =>
                        void updateSubTask(item.id, {
                          assigneeUserId: value === '__unassigned__' ? null : value,
                        })
                      }
                    >
                      <SelectTrigger className="h-7 text-[11px]">
                        <SelectValue placeholder="负责人" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unassigned__" className="text-xs">
                          未分配
                        </SelectItem>
                        {collaborators.map((member) => (
                          <SelectItem key={member.userId} value={member.userId} className="text-xs">
                            {member.displayName ?? member.userId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
                {!readOnlyCreate && status !== 'cancelled' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                    disabled={updatingSubTaskId === item.id}
                    onClick={() => void cancelSubTask(item.id)}
                  >
                    <X className="mr-1 h-3 w-3" />
                    取消子任务
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {!readOnlyCreate ? (
        <div className="space-y-2">
          <Select
            value={draftKind}
            onValueChange={(value) => setDraftKind(value as DecisionCollaborativeSubTaskKind)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="子任务类型" />
            </SelectTrigger>
            <SelectContent>
              {SUB_TASK_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind} className="text-xs">
                  {DECISION_COLLABORATIVE_SUB_TASK_KIND_LABELS[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            placeholder={`标题（默认：${decisionCollaborativeSubTaskKindLabel(draftKind)}）`}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full text-xs"
            disabled={creating}
            onClick={() => void createSubTask()}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {creating ? '创建中…' : '创建跟进子任务'}
          </Button>
        </div>
      ) : null}
    </>
  );

  if (optional && !readOnlyCreate) {
    return (
      <Collapsible defaultOpen={defaultOpen} className={className}>
        <div className={cn('rounded-xl border border-border/60 bg-muted/10 px-3 py-3')}>
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left">
            <p className="text-xs font-medium text-foreground">可选 · 团队跟进事项</p>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">{panelBody}</CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border/60 bg-muted/10 px-3 py-3', className)}>
      <div className="mb-2">
        <p className="text-xs font-medium text-foreground">
          {optional ? '可选 · 团队跟进事项' : '协作跟进子任务'}
        </p>
      </div>
      {panelBody}
    </div>
  );
}
