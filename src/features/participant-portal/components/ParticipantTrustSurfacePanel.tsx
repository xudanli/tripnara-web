import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrustCardList } from '@/components/decision-os';
import { useParticipantTrustSurface } from '@/hooks/useParticipantPortal';
import { filterParticipantTrustCards } from '@/lib/gate1-trust-display';

interface ParticipantTrustSurfacePanelProps {
  token: string;
}

export function ParticipantTrustSurfacePanel({ token }: ParticipantTrustSurfacePanelProps) {
  const { data, isLoading, isError, error } = useParticipantTrustSurface(token);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (isError) {
    const is404 = error instanceof Error && /404|not found/i.test(error.message);
    return (
      <p className="text-sm text-muted-foreground">
        {is404
          ? '方案说明暂不可用，顾问发布后将在此展示。'
          : error instanceof Error
            ? error.message
            : '无法加载方案说明与依据'}
      </p>
    );
  }

  const cards = filterParticipantTrustCards(data?.cards ?? []);

  if (!data || cards.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        暂无方案说明与依据。顾问整理方案后，您将看到简明的置信度与依据说明。
      </p>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">方案说明与依据</CardTitle>
          <CardDescription>
            {summary.totalCards} 项说明 · {summary.highConfidenceCount} 项高置信
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            以下为脱敏后的方案依据摘要，不含内部运营细节或个人私密信息。
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">schema v{data.schemaVersion}</Badge>
          </div>
        </CardContent>
      </Card>

      <TrustCardList cards={cards} variant="participant" />
    </div>
  );
}
