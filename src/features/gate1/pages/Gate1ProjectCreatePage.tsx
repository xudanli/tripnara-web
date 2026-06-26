import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { useCreateGate1Project } from '@/hooks/useGate1';
import { advisorRoutes } from '@/lib/advisor-routes';
import { gate1CohortLabel } from '@/lib/gate1-display';
import { trackGate1ProjectCreated } from '@/utils/gate1-analytics';
import type { Gate1Cohort } from '@/types/gate1';

export default function Gate1ProjectCreatePage() {
  const navigate = useNavigate();
  const createProject = useCreateGate1Project();

  const [title, setTitle] = useState('');
  const [cohort, setCohort] = useState<Gate1Cohort>('PLANNING');
  const [destination, setDestination] = useState('IS');
  const [participantCount, setParticipantCount] = useState('6');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('请输入项目标题');
      return;
    }
    try {
      const project = await createProject.mutateAsync({
        title: title.trim(),
        cohort,
        destination: destination.trim(),
        participantCount: Number(participantCount) || 1,
      });
      trackGate1ProjectCreated({
        projectId: project.id,
        cohort: project.cohort,
        organizationId: project.organizationId,
      });
      toast.success('项目已创建');
      navigate(advisorRoutes.project(project.id, 'overview'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败');
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo={advisorRoutes.home}
          title="创建 Gate 1 项目"
          subtitle="真实订单验证 · 透明人机协作"
          maxWidth="2xl"
        />
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">项目信息</CardTitle>
            <CardDescription>
              Cohort 确认后不可由顾问修改。Baseline 须在 Intervention 前完成。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
              <div className="space-y-2">
                <Label htmlFor="gate1-title">项目标题 *</Label>
                <Input
                  id="gate1-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="冰岛南部 6 人精品团"
                />
              </div>

              <div className="space-y-2">
                <Label>Cohort *</Label>
                <Select value={cohort} onValueChange={(v) => setCohort(v as Gate1Cohort)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['PLANNING', 'NEAR_DEPARTURE', 'IN_TRIP_RECENT'] as Gate1Cohort[]).map(
                      (c) => (
                        <SelectItem key={c} value={c}>
                          {gate1CohortLabel(c)}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gate1-dest">目的地</Label>
                  <Input
                    id="gate1-dest"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gate1-count">人数</Label>
                  <Input
                    id="gate1-count"
                    type="number"
                    min={1}
                    value={participantCount}
                    onChange={(e) => setParticipantCount(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" disabled={createProject.isPending}>
                创建项目
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
