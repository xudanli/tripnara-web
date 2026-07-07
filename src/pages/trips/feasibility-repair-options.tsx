import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { tripsApi } from '@/api/trips';
import { Button } from '@/components/ui/button';
import { LogoLoading } from '@/components/common/LogoLoading';
import { FeasibilityReportPanel } from '@/components/feasibility-report';
import { buildTripTravelStatusPath } from '@/lib/travel-status-navigation.util';
import type { TripDetail } from '@/types/trip';

/**
 * BFF 深链：/dashboard/trips/:tripId/feasibility-report/issues/:issueId/repair-options
 * 打开可执行证明并预选 issue，自动加载 repair-options 工作流。
 */
export default function TripFeasibilityRepairOptionsPage() {
  const { id: tripId = '', issueId = '' } = useParams<{ id: string; issueId: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void tripsApi
      .getById(tripId)
      .then((data) => {
        if (!cancelled) setTrip(data);
      })
      .catch(() => {
        if (!cancelled) setTrip(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  if (!tripId || !issueId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        缺少行程或问题 ID
      </div>
    );
  }

  if (loading) {
    return <LogoLoading />;
  }

  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-muted/20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0"
              onClick={() => navigate(buildTripTravelStatusPath(tripId))}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回概览
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">修复选项</h1>
              <p className="truncate text-xs text-muted-foreground">
                {trip?.destination || trip?.name || tripId}
                {' · '}
                {issueId}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() =>
              navigate(`/dashboard/feasibility?tripId=${encodeURIComponent(tripId)}&issueId=${encodeURIComponent(issueId)}`)
            }
          >
            打开完整可执行证明
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <FeasibilityReportPanel tripId={tripId} initialIssueId={issueId} />
      </div>
    </div>
  );
}
