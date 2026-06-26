import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import {
  useParticipantReadiness,
  usePatchReadinessTask,
} from '@/hooks/useParticipantPortal';
import { ProjectHeaderCard } from '../components/ProjectHeaderCard';
import { useParticipantProject } from '../shell/ParticipantProjectProvider';
import { portalPathForPhase } from '../shell/participant-phase';

function taskStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'GREEN' || status === 'COMPLETED') return 'default';
  if (status === 'RED') return 'destructive';
  return 'secondary';
}

export default function ParticipantReadinessPage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { invite, phase } = useParticipantProject();
  const { data, isLoading } = useParticipantReadiness(token);
  const patchTask = usePatchReadinessTask(token);

  if (!invite) return null;

  if (phase !== 'active') {
    navigate(portalPathForPhase(token, phase), { replace: true });
    return null;
  }

  const handleConfirm = async (taskId: string, fieldKey: string, checked: boolean) => {
    try {
      await patchTask.mutateAsync({
        taskId,
        body: { evidence: { [fieldKey]: checked } },
      });
      toast.success('已更新');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新失败');
    }
  };

  return (
    <div className="space-y-4">
      <ProjectHeaderCard invite={invite} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">准备事项</CardTitle>
          <CardDescription>仅展示与您个人相关的准备任务，不暴露他人私密信息。</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : !data?.tasks?.length ? (
            <p className="text-sm text-muted-foreground">暂无个人准备任务，或尚未到准备阶段。</p>
          ) : (
            <ul className="space-y-3">
              {data.tasks.map((task) => (
                <li key={task.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.category}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={taskStatusVariant(task.status)}>{task.status}</Badge>
                      {task.blocking ? (
                        <Badge variant="destructive">阻塞</Badge>
                      ) : null}
                      {task.mandatory ? (
                        <Badge variant="outline">必须</Badge>
                      ) : null}
                    </div>
                  </div>
                  {task.dueAt ? (
                    <p className="text-xs text-muted-foreground">截止：{task.dueAt}</p>
                  ) : null}
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id={`task-${task.id}`}
                      checked={task.status === 'COMPLETED' || task.status === 'GREEN'}
                      disabled={patchTask.isPending}
                      onCheckedChange={(v) =>
                        void handleConfirm(task.id, `${task.category}_confirmed`, v === true)
                      }
                    />
                    <Label htmlFor={`task-${task.id}`} className="text-sm font-normal">
                      我已完成 / 已确认
                    </Label>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
