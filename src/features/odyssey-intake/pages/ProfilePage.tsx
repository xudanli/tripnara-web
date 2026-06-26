import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOdysseyProfileCard } from '@/hooks/useOdysseyProfileCard';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogoLoading } from '@/components/common/LogoLoading';
import { TravelPersonaCard, TravelPersonaCardEmpty } from '../components/TravelPersonaCard';
import { IdentityHubSection } from '../components/IdentityHubSection';
import {
  MyQualificationsSection,
  TrustProfileSummarySection,
} from '@/components/trust-profile';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    cardView,
    ui,
    isLoading,
    isError,
    completed,
    hasPersonaCard,
    shimmerActive,
    refreshMessage,
    selectedTripIntentTag,
    updateTripIntent,
    dismissShimmer,
    refetch,
  } = useOdysseyProfileCard();

  const initials = (user?.displayName?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase();
  const profile = cardView?.profile;
  const placementOk = ui.placement === 'profile_header_third';
  const showPersonaCard = hasPersonaCard;

  const handleTripIntent = async (tagId: string) => {
    try {
      await updateTripIntent(tagId);
      toast.success('出行状态已更新');
    } catch {
      toast.error('更新失败，请重试');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LogoLoading size={40} />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard"
          title="我的主页"
          subtitle="旅行人格与出行状态"
          maxWidth="4xl"
        />
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <section
          className={
            placementOk
              ? 'grid gap-6 md:grid-cols-3'
              : 'grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]'
          }
        >
          <div
            className={
              placementOk
                ? 'flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center md:col-span-1'
                : 'flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center md:items-start md:text-left'
            }
          >
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.avatarUrl ?? undefined} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold">{user?.displayName ?? '旅行者'}</h1>
              {user?.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
            </div>
            {completed && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => navigate('/dashboard/tripnara/odyssey?retake=1')}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                重新测评
              </Button>
            )}
          </div>

          <div
            className={placementOk ? 'md:col-span-2' : undefined}
            onClick={() => shimmerActive && dismissShimmer()}
          >
            {showPersonaCard && profile?.card ? (
              <TravelPersonaCard
                card={profile.card}
                ui={ui}
                shimmer={shimmerActive}
                refreshMessage={refreshMessage}
                selectedTripIntentTag={selectedTripIntentTag}
                onTripIntentChange={handleTripIntent}
              />
            ) : (
              <div className="space-y-2">
                <TravelPersonaCardEmpty onStart={() => navigate('/dashboard/tripnara/odyssey')} />
                {isError && (
                  <p className="text-center text-xs text-muted-foreground">
                    卡片数据加载失败。
                    <button type="button" className="ml-1 underline" onClick={() => refetch()}>
                      重试
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {shimmerActive && refreshMessage && (
          <p className="mt-3 text-center text-sm text-muted-foreground">{refreshMessage}</p>
        )}

        {completed && (
          <IdentityHubSection completed={completed} className="mt-6" />
        )}

        {user?.id && (
          <div className="mt-6 space-y-6">
            <TrustProfileSummarySection userId={user.id} />
            <MyQualificationsSection userId={user.id} />
          </div>
        )}
      </div>
    </div>
  );
}
