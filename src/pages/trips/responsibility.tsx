import { useParams } from 'react-router-dom';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { Spinner } from '@/components/ui/spinner';
import { TripResponsibilityOwnersPanel } from '@/features/member-onboarding';
import { useTripResponsibilityOwners } from '@/hooks/useTripResponsibilityOwners';
import { TRIP_RESPONSIBILITY_ROLE_HINTS } from '@/types/trip-responsibility';
import type { TripResponsibilityRoleKey } from '@/types/trip-responsibility';

export default function TripResponsibilityPage() {
  const { id: tripId = '' } = useParams<{ id: string }>();
  const { data: owners, isLoading } = useTripResponsibilityOwners(tripId);

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo={`/dashboard/trips/${tripId}`}
          title="责任分配"
          subtitle="规划负责人、现场领队、付款与确认人 — 异常推送与决策路由依据"
          maxWidth="3xl"
        />
      </div>
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 md:px-6 md:py-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : owners ? (
          <>
            <TripResponsibilityOwnersPanel owners={owners} />
            <ul className="space-y-2 text-xs text-muted-foreground">
              {(Object.entries(TRIP_RESPONSIBILITY_ROLE_HINTS) as Array<
                [TripResponsibilityRoleKey, string]
              >).map(([key, hint]) => (
                <li key={key}>{hint}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">尚未配置责任分配。</p>
        )}
      </div>
    </div>
  );
}
