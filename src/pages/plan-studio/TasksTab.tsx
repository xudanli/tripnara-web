import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Luggage, ListChecks } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReadinessTasksTab from '@/components/readiness/ReadinessTasksTab';
import PackingListTab from '@/components/readiness/PackingListTab';
import { tripsApi } from '@/api/trips';
import type { TripDetail } from '@/types/trip';
import { useAuth } from '@/hooks/useAuth';
import { useReadinessPreparationTasks } from '@/hooks/useReadinessPreparationTasks';

interface TasksTabProps {
  tripId: string;
  /** ``tasks`` | ``packing`` — URL hash or parent tab state */
  initialSubTab?: 'tasks' | 'packing';
}

export default function TasksTab({ tripId, initialSubTab = 'tasks' }: TasksTabProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const { user } = useAuth();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [subTab, setSubTab] = useState<'tasks' | 'packing'>(initialSubTab);

  const viewer = useMemo(
    () => (user ? { id: user.id, name: user.displayName } : null),
    [user?.id, user?.displayName],
  );

  const {
    loading: loadingTasks,
    preparationTasks,
    taskMembers,
    handleToggleTask,
    handleAssignTask,
    handleChangeTaskScope,
    handleCreateTask,
    handleUpdateTask,
    handleDeleteTask,
  } = useReadinessPreparationTasks(tripId, {
    enabled: !!tripId,
    viewer,
    isZh,
  });

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    let cancelled = false;
    const loadTrip = async () => {
      if (!tripId) return;
      try {
        setLoadingTrip(true);
        const data = await tripsApi.getById(tripId);
        if (!cancelled) setTrip(data);
      } catch (err) {
        console.error('[TasksTab] failed to load trip:', err);
        if (!cancelled) setTrip(null);
      } finally {
        if (!cancelled) setLoadingTrip(false);
      }
    };
    void loadTrip();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  if (loadingTrip || loadingTasks) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as 'tasks' | 'packing')}>
        <TabsList>
          <TabsTrigger value="tasks" className="gap-1.5">
            <ListChecks className="h-4 w-4" />
            行前任务
          </TabsTrigger>
          <TabsTrigger value="packing" className="gap-1.5">
            <Luggage className="h-4 w-4" />
            打包清单
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <ReadinessTasksTab
            tasks={preparationTasks}
            members={taskMembers}
            onToggleComplete={handleToggleTask}
            onAssign={handleAssignTask}
            onChangeScope={handleChangeTaskScope}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        </TabsContent>

        <TabsContent value="packing" className="mt-4">
          <PackingListTab tripId={tripId} trip={trip} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
