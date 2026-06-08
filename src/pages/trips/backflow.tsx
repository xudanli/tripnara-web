import { Link, useParams } from 'react-router-dom';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Button } from '@/components/ui/button';
import {
  useActiveTripDashboard,
  useTemplateBackflowPreview,
} from '@/features/active-trip/hooks/useActiveTripDashboard';
import { TemplateBackflowPreviewPanel } from '@/features/active-trip/components/TemplateBackflowPreviewPanel';

/** GET/POST template-backflow · 行后模板回流 */
export default function ActiveTripBackflowPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const { data: dashboard } = useActiveTripDashboard(tripId);
  const { data: preview, isLoading, isError, refetch } = useTemplateBackflowPreview(tripId);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LogoLoading size={40} />
      </div>
    );
  }

  if (isError || !preview) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">模板回流预览不可用（可能未绑定模板）</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          重试
        </Button>
        {tripId && (
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/dashboard/trips/${tripId}/active`}>返回 Active Trip</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-full w-full max-w-3xl px-4 py-6 sm:px-6">
      <DashboardSubpageHeader
        backTo={tripId ? `/dashboard/trips/${tripId}/active` : '/dashboard/trips'}
        title="模板回流"
        subtitle="行后范例预览 · 队长可 commit"
        maxWidth="3xl"
      />
      <div className="mt-4">
        <TemplateBackflowPreviewPanel
          preview={preview}
          tripId={tripId!}
          viewerRole={dashboard?.viewer.role ?? 'member'}
        />
      </div>
    </div>
  );
}
