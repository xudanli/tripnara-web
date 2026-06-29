import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import { Button } from '@/components/ui/button';
import { LogoLoading } from '@/components/common/LogoLoading';
import { FeasibilityReportPanel } from '@/components/feasibility-report';
import type { TripDetail } from '@/types/trip';
import { ArrowLeft } from 'lucide-react';

/**
 * 可执行证明 / 行程可执行性全页
 */
export default function FeasibilityReportPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tripId = searchParams.get('tripId');
  const issueId = searchParams.get('issueId');
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

  if (!tripId) {
    return (
      <div className="max-w-lg mx-auto py-16 px-6 text-center space-y-4">
        <p className="text-muted-foreground">请从规划工作台选择行程后查看可执行证明。</p>
        <Button onClick={() => navigate('/dashboard/plan-studio')}>前往规划工作台</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LogoLoading />
      </div>
    );
  }

  const backToPlanStudio = () => {
    navigate(`/dashboard/plan-studio?tripId=${tripId}`);
  };

  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" className="h-8 shrink-0" onClick={backToPlanStudio}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              规划工作台
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight truncate">可执行证明</h1>
              <p className="text-xs text-muted-foreground truncate">
                {trip?.destination || trip?.name || tripId}
                {' · 行程可执行性报告'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <FeasibilityReportPanel tripId={tripId} initialIssueId={issueId} />
      </div>
    </div>
  );
}
