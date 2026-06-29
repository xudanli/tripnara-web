import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';
import { CollabWidgetCard } from './CollabWidgetCard';

const STATUS_LABELS: Record<CollaborativeTaskView['status'], string> = {
  pending: '待确认',
  confirmed: '已确认',
  rolled_back: '已回滚',
  timed_out: '已超时',
};

interface TaskPreviewWidgetProps {
  tasks: CollaborativeTaskView[];
  onViewAll?: () => void;
}

export function TaskPreviewWidget({ tasks, onViewAll }: TaskPreviewWidgetProps) {
  const preview = tasks.slice(0, 5);

  return (
    <CollabWidgetCard
      title="任务分工预览"
      description={`共 ${tasks.length} 项`}
      action={
        onViewAll ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
            查看全部
          </Button>
        ) : null
      }
    >
      {preview.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无协作任务。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-xs">
            <thead>
              <tr className="border-b border-border/60 text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">任务</th>
                <th className="pb-2 pr-3 font-medium">负责人</th>
                <th className="pb-2 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((task) => (
                <tr key={task.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2 pr-3 font-medium text-foreground">{task.title}</td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {task.assigneeLabel ?? '—'}
                  </td>
                  <td className="py-2">
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {STATUS_LABELS[task.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CollabWidgetCard>
  );
}
