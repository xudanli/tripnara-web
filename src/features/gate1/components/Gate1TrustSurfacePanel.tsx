import { LogoLoading } from '@/components/common/LogoLoading';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrustCardList } from '@/components/decision-os';
import { useGate1TrustSurface } from '@/hooks/useGate1';

interface Gate1TrustSurfacePanelProps {
  projectId: string;
}

export function Gate1TrustSurfacePanel({ projectId }: Gate1TrustSurfacePanelProps) {
  const { data, isLoading, isError, error } = useGate1TrustSurface(projectId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LogoLoading size={32} />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : '无法加载信任说明'}
      </p>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">暂无信任说明卡片</p>;
  }

  const { summary, cards } = data;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">信任说明汇总</CardTitle>
          <CardDescription>
            {summary.totalCards} 张卡片 · {summary.highConfidenceCount} 高置信 ·{' '}
            {summary.humanAssistedCount} 含人工协助
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">schema v{data.schemaVersion}</Badge>
          <Badge variant="outline">{cards.length} 张可展示</Badge>
        </CardContent>
      </Card>

      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">当前项目尚无标准信任卡片</p>
      ) : (
        <TrustCardList cards={cards} variant="advisor" projectId={projectId} />
      )}
    </div>
  );
}
