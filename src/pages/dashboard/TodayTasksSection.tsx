import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TripDetail, Task } from '@/types/trip';
import { tripsApi } from '@/api/trips';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { ArrowRight, AlertCircle, Calendar, Shield, DollarSign, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TodayTasksSectionProps {
  activeTrip: TripDetail | null;
}

export default function TodayTasksSection({ activeTrip }: TodayTasksSectionProps) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTrip) {
      loadTasks();
    } else {
      setTasks([]);
    }
  }, [activeTrip]);

  const loadTasks = async () => {
    if (!activeTrip) return;

    try {
      setLoading(true);
      const data = await tripsApi.getTasks(activeTrip.id);
      setTasks(data || []);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskToggle = async (task: Task) => {
    if (!activeTrip) return;

    const newCompleted = !task.completed;
    setUpdatingTaskId(task.id);

    try {
      // 乐观更新
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: newCompleted } : t))
      );

      await tripsApi.updateTaskStatus(activeTrip.id, task.id, newCompleted);
    } catch (err: any) {
      console.error('Failed to update task:', err);
      // 回滚
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: task.completed } : t))
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PREFERENCE':
        return <Settings className="w-4 h-4" />;
      case 'SCHEDULE':
        return <Calendar className="w-4 h-4" />;
      case 'SAFETY':
        return <Shield className="w-4 h-4" />;
      case 'BUDGET':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (!activeTrip) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>今日重点任务</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-6 h-6 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // 按优先级排序：high > medium > low，未完成在前
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const incompleteTasks = sortedTasks.filter((t) => !t.completed);
  const completedTasks = sortedTasks.filter((t) => t.completed);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>今日重点任务</CardTitle>
        <CardDescription>
          系统建议先完成这些任务
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {incompleteTasks.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-amber-600 mb-4">
                <span className="text-lg">🔥</span>
                <span>建议先完成这些：</span>
              </div>

              {incompleteTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                    getPriorityColor(task.priority),
                    task.route && 'cursor-pointer hover:shadow-sm'
                  )}
                  onClick={() => {
                    if (task.route) {
                      const route = task.route.replace('{tripId}', activeTrip.id);
                      navigate(route);
                    }
                  }}
                >
                  <Checkbox
                    checked={task.completed}
                    disabled={updatingTaskId === task.id}
                    onCheckedChange={(checked) => {
                      handleTaskToggle(task);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 flex items-start gap-2">
                    <div className={cn('mt-0.5', task.completed && 'opacity-50')}>
                      {getCategoryIcon(task.category)}
                    </div>
                    <span
                      className={cn(
                        'flex-1',
                        task.completed ? 'line-through text-gray-500' : 'text-gray-900'
                      )}
                    >
                      {task.text}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}

          {completedTasks.length > 0 && (
            <>
              <div className="text-sm text-gray-500 mt-6 mb-2">已完成：</div>
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 opacity-60"
                >
                  <Checkbox
                    checked={task.completed}
                    disabled={updatingTaskId === task.id}
                    onCheckedChange={() => {
                      handleTaskToggle(task);
                    }}
                  />
                  <div className="flex-1 flex items-start gap-2">
                    <div className="mt-0.5 opacity-50">
                      {getCategoryIcon(task.category)}
                    </div>
                    <span className="flex-1 line-through text-gray-500">{task.text}</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {incompleteTasks.length > 0 && incompleteTasks[0]?.route && (
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => {
                const route = incompleteTasks[0].route?.replace('{tripId}', activeTrip.id);
                if (route) navigate(route);
              }}
            >
              去处理 <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
