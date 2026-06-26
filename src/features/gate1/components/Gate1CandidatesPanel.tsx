import { LogoLoading } from '@/components/common/LogoLoading';
import { Card, CardContent } from '@/components/ui/card';
import { useGate1AdvisorOutputs } from '@/hooks/useGate1';
import { Gate1CandidateCompareSection } from './Gate1CandidateCompareSection';

interface Gate1CandidatesPanelProps {
  projectId: string;
  baselineReady: boolean;
}

export function Gate1CandidatesPanel({ projectId, baselineReady }: Gate1CandidatesPanelProps) {
  const { data, isLoading, isError, error } = useGate1AdvisorOutputs(projectId);

  if (!baselineReady) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          完成 Baseline 确认后，候选方案将在此展示。
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LogoLoading size={32} />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-destructive">
          {error instanceof Error ? error.message : '加载失败'}
        </CardContent>
      </Card>
    );
  }

  const candidates = data?.candidates?.filter((c) => c.status === 'PUBLISHED') ?? [];

  if (candidates.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          暂无已发布候选方案
        </CardContent>
      </Card>
    );
  }

  return <Gate1CandidateCompareSection projectId={projectId} candidates={candidates} />;
}
