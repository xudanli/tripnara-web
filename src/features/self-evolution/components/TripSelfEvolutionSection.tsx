import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoLoading } from '@/components/common/LogoLoading';
import type { TripDetail } from '@/types/trip';
import type { ReviewSummary } from '@/types/trip-review';
import type { TripOutcomeResponse } from '@/types/self-evolution';
import { useTripOutcome } from '../hooks/useSelfEvolution';
import { TripCompletionModal } from './TripCompletionModal';
import { TripOutcomeDashboard } from './TripOutcomeDashboard';

interface TripSelfEvolutionSectionProps {
  trip: TripDetail;
  userId: string;
  reviewSummary?: ReviewSummary | null;
  autoPrompt?: boolean;
  className?: string;
}

export function TripSelfEvolutionSection({
  trip,
  userId,
  reviewSummary,
  autoPrompt = false,
  className,
}: TripSelfEvolutionSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [localOutcome, setLocalOutcome] = useState<TripOutcomeResponse | null>(null);
  const { data: savedOutcome, isLoading, isError } = useTripOutcome(trip.id);

  const outcome = localOutcome ?? savedOutcome ?? null;

  useEffect(() => {
    if (!autoPrompt || outcome || isLoading) return;
    setModalOpen(true);
  }, [autoPrompt, outcome, isLoading]);

  if (isLoading && !outcome) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex justify-center py-10">
            <LogoLoading size={32} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      {outcome ? (
        <TripOutcomeDashboard outcome={outcome} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              旅行满意度评价
            </CardTitle>
            <CardDescription>
              提交评价后将生成 6 维旅行结果评分，并更新记忆与搭子校准数据
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setModalOpen(true)}>填写满意度问卷</Button>
            {isError && (
              <p className="mt-2 text-xs text-muted-foreground">
                尚未提交评价；提交后将同步至后端
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <TripCompletionModal
        tripId={trip.id}
        userIds={[userId]}
        trip={trip}
        reviewSummary={reviewSummary}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onComplete={setLocalOutcome}
        plannedBudget={trip.budgetConfig?.totalBudget ?? trip.totalBudget}
        actualSpent={trip.statistics?.budgetUsed}
      />
    </div>
  );
}
