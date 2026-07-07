import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Calendar,
  Compass,
  MapPin,
  Play,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { tripsApi } from '@/api/trips';
import type { TripListItem } from '@/types/trip';
import type { HikePlanRecord, HikePlanStatus } from '@/types/hike-plan';
import { hikePlanRepository } from '@/services/hike-plan-repository';
import { HikePlanStorageSwitch } from '@/components/hiking/HikePlanStorageSwitch';
import { handleHikePlanError } from '@/lib/hike-plan-error';
import { toast } from 'sonner';

type HikeTab = 'planning' | 'active' | 'completed';

function isLikelyHikingTrip(trip: TripListItem): boolean {
  const md = trip.metadata ?? {};
  if (md.hikingProfile === 'embedded' || md.hikingProfile === 'primary') return true;
  const dest = (trip.destination || '').toLowerCase();
  const name = (trip.name || '').toLowerCase();
  return /iceland|冰岛|nepal|尼泊尔|laugavegur|trek|徒步|hike|ebc/i.test(dest + name);
}

function planTab(status: HikePlanStatus): HikeTab {
  if (status === 'completed' || status === 'cancelled') return 'completed';
  if (status === 'in_progress') return 'active';
  return 'planning';
}

function tripTabForStatus(status: string): HikeTab {
  if (status === 'COMPLETED' || status === 'completed') return 'completed';
  if (status === 'IN_PROGRESS' || status === 'in_progress' || status === 'ACTIVE') return 'active';
  return 'planning';
}

const statusLabel: Record<HikePlanStatus, string> = {
  planning: '计划中',
  ready: '已就绪',
  in_progress: '执行中',
  completed: '已完成',
  cancelled: '已取消',
};

type PlansByTab = Record<HikeTab, HikePlanRecord[]>;

function ____bucketPlans(plans: HikePlanRecord[]): PlansByTab {
  const map: PlansByTab = { planning: [], active: [], completed: [] };
  for (const p of plans) {
    map[planTab(p.status)].push(p);
  }
  return map;
}

export default function MyHikesPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<HikePlanRecord[]>([]);
  const [hikingTrips, setHikingTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<HikeTab>('planning');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [planList, trips] = await Promise.all([
          hikePlanRepository.list(),
          tripsApi.getAll(),
        ]);
        setPlans(planList);
        setHikingTrips((trips ?? []).filter(isLikelyHikingTrip));
      } catch (e) {
        if (handleHikePlanError(e, navigate)) return;
        toast.error((e as Error).message || '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const tripById = useMemo(() => {
    const m = new Map<string, TripListItem>();
    for (const t of hikingTrips) m.set(t.id, t);
    return m;
  }, [hikingTrips]);

  const { standaloneByTab, groupedByTab } = useMemo(() => {
    const standalone: PlansByTab = { planning: [], active: [], completed: [] };
    const grouped: Record<HikeTab, Map<string, HikePlanRecord[]>> = {
      planning: new Map(),
      active: new Map(),
      completed: new Map(),
    };

    for (const p of plans) {
      const bucket = planTab(p.status);
      if (p.tripId) {
        const map = grouped[bucket];
        const list = map.get(p.tripId) ?? [];
        list.push(p);
        map.set(p.tripId, list);
      } else {
        standalone[bucket].push(p);
      }
    }
    return { standaloneByTab: standalone, groupedByTab: grouped };
  }, [plans]);

  const tripsByTab = useMemo(() => {
    const map: Record<HikeTab, TripListItem[]> = {
      planning: [],
      active: [],
      completed: [],
    };
    const tripIdsWithPlans = new Set(plans.map((p) => p.tripId).filter(Boolean));
    for (const t of hikingTrips) {
      if (tripIdsWithPlans.has(t.id)) continue;
      map[tripTabForStatus(t.status)].push(t);
    }
    return map;
  }, [hikingTrips, plans]);

  const showEmpty =
    !loading &&
    standaloneByTab[tab].length === 0 &&
    groupedByTab[tab].size === 0 &&
    tripsByTab[tab].length === 0;

  const renderTabContent = (currentTab: HikeTab) => (
    <>
      {Array.from(groupedByTab[currentTab].entries()).map(([tripId, tripPlans]) => {
        const trip = tripById.get(tripId);
        return (
          <Card key={tripId} className="border-gate-allow-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gate-allow-foreground" />
                {trip?.name || trip?.destination || '关联行程'}
              </CardTitle>
              <CardDescription>
                {tripPlans.length} 个徒步片段 ·{' '}
                <button
                  type="button"
                  className="underline text-primary"
                  onClick={() => navigate(`/dashboard/trips/${tripId}`)}
                >
                  打开行程
                </button>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {tripPlans.map((plan) => (
                <HikePlanCard key={plan.id} plan={plan} nested />
              ))}
            </CardContent>
          </Card>
        );
      })}
      {standaloneByTab[currentTab].map((plan) => (
        <HikePlanCard key={plan.id} plan={plan} />
      ))}
      {tripsByTab[currentTab].map((trip) => (
        <TripHikeCard key={trip.id} trip={trip} />
      ))}
    </>
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/dashboard/trails')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回徒步中心
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">我的徒步</h1>
          <p className="text-muted-foreground">
            HikePlan 全生命周期：准备 → 执行（GPS）→ 复盘；已关联行程的片段按行程分组
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/trails/explore')}>
          <Plus className="h-4 w-4 mr-2" />
          发现路线
        </Button>
      </div>

      <HikePlanStorageSwitch className="mb-4" />

      <Tabs value={tab} onValueChange={(v) => setTab(v as HikeTab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="planning">
            计划中
            {standaloneByTab.planning.length + groupedByTab.planning.size > 0 && (
              <Badge variant="secondary" className="ml-2">
                {standaloneByTab.planning.length +
                  [...groupedByTab.planning.values()].reduce((n, a) => n + a.length, 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">
            执行中
            {standaloneByTab.active.length + groupedByTab.active.size > 0 && (
              <Badge variant="secondary" className="ml-2">
                {standaloneByTab.active.length +
                  [...groupedByTab.active.values()].reduce((n, a) => n + a.length, 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            已完成
            {standaloneByTab.completed.length + groupedByTab.completed.size > 0 && (
              <Badge variant="secondary" className="ml-2">
                {standaloneByTab.completed.length +
                  [...groupedByTab.completed.values()].reduce((n, a) => n + a.length, 0)}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <p className="text-center text-muted-foreground py-12">加载中…</p>
        ) : showEmpty ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Compass className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">暂无此类徒步记录</p>
              <Button onClick={() => navigate('/dashboard/trails/explore')}>
                去发现路线
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <TabsContent value="planning" className="space-y-4 mt-0">
              {renderTabContent('planning')}
            </TabsContent>
            <TabsContent value="active" className="space-y-4 mt-0">
              {renderTabContent('active')}
            </TabsContent>
            <TabsContent value="completed" className="space-y-4 mt-0">
              {renderTabContent('completed')}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function HikePlanCard({ plan, nested }: { plan: HikePlanRecord; nested?: boolean }) {
  const navigate = useNavigate();
  const title = plan.nameCN ?? `路线 #${plan.routeDirectionId}`;

  return (
    <Card className={nested ? 'border-dashed shadow-none' : undefined}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardTitle className={nested ? 'text-base' : 'text-lg'}>{title}</CardTitle>
            <CardDescription>
              <Calendar className="inline h-3 w-3 mr-1" />
              {plan.plannedDate}
              {plan.plannedStartTime ? ` · ${plan.plannedStartTime}` : ''}
              {plan.tripId && !nested ? (
                <span className="block mt-1">
                  <button
                    type="button"
                    className="underline"
                    onClick={() => navigate(`/dashboard/trips/${plan.tripId}`)}
                  >
                    所属行程
                  </button>
                </span>
              ) : null}
            </CardDescription>
          </div>
          <Badge>{statusLabel[plan.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {(plan.status === 'planning' || plan.status === 'ready') && (
          <Button size="sm" onClick={() => navigate(`/dashboard/trails/prep/${plan.id}`)}>
            准备
          </Button>
        )}
        {plan.status === 'in_progress' && (
          <Button size="sm" onClick={() => navigate(`/dashboard/trails/on-trail/${plan.id}`)}>
            <Play className="h-3 w-3 mr-1" />
            继续执行
          </Button>
        )}
        {plan.status === 'completed' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/dashboard/trails/review/${plan.id}`)}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            复盘
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/dashboard/trails/${plan.routeDirectionId}`)}
        >
          路线详情
        </Button>
      </CardContent>
    </Card>
  );
}

function TripHikeCard({ trip }: { trip: TripListItem }) {
  const navigate = useNavigate();
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{trip.name || trip.destination}</CardTitle>
        <CardDescription>关联行程 · 尚未创建 HikePlan</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/trips/${trip.id}`)}>
          行程详情
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/dashboard/readiness?tripId=${trip.id}`)}
        >
          Readiness
        </Button>
      </CardContent>
    </Card>
  );
}
