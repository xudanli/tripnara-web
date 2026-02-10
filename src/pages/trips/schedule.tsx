import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import type { ScheduleResponse, ActionHistory } from '@/types/trip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, MapPin, Save, Undo2, Redo2, History } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/format';

export default function TripSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(searchParams.get('date') || format(new Date(), 'yyyy-MM-dd'));
  const [actionHistory, setActionHistory] = useState<ActionHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [redoing, setRedoing] = useState(false);
  const [currency, setCurrency] = useState<string>('CNY'); // 🆕 货币状态
  
  // 🆕 加载货币信息：优先使用预算约束中的货币，其次使用目的地货币
  useEffect(() => {
    const loadCurrency = async () => {
      if (!id) return;
      try {
        // 优先从预算约束获取货币
        const constraint = await tripsApi.getBudgetConstraint(id);
        if (constraint.budgetConstraint.currency) {
          setCurrency(constraint.budgetConstraint.currency);
          return;
        }
      } catch {
        // 如果获取预算约束失败，尝试从目的地获取
      }
      
      // 其次从目的地获取货币策略
      try {
        const trip = await tripsApi.getById(id);
        if (trip.destination) {
          const { countriesApi } = await import('@/api/countries');
          const currencyStrategy = await countriesApi.getCurrencyStrategy(trip.destination);
          if (currencyStrategy?.currencyCode) {
            setCurrency(currencyStrategy.currencyCode);
            return;
          }
        }
      } catch {
        // 如果获取失败，保持默认值 CNY
      }
      
      setCurrency('CNY');
    };
    
    loadCurrency();
  }, [id]);

  useEffect(() => {
    if (id) {
      loadSchedule();
      loadActionHistory();
    }
  }, [id, date]);

  const loadSchedule = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await tripsApi.getSchedule(id, date);
      setSchedule(data);
      setSearchParams({ date });
    } catch (err: any) {
      setError(err.message || '加载日程失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id || !schedule?.schedule) return;
    try {
      setSaving(true);
      await tripsApi.saveSchedule(id, date, schedule.schedule);
      await loadSchedule();
      await loadActionHistory(); // 重新加载操作历史
    } catch (err: any) {
      setError(err.message || '保存日程失败');
    } finally {
      setSaving(false);
    }
  };

  const loadActionHistory = async () => {
    if (!id) return;
    try {
      setHistoryLoading(true);
      const history = await tripsApi.getActions(id, date);
      setActionHistory(history);
    } catch (err) {
      console.error('Failed to load action history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!id || undoing) return;
    try {
      setUndoing(true);
      setError(null);
      const result = await tripsApi.undo(id, { date });
      // 更新日程显示
      if (result.schedule) {
        setSchedule({
          date,
          schedule: result.schedule,
          persisted: false, // 撤销后需要重新保存
        });
      }
      await loadActionHistory();
    } catch (err: any) {
      setError(err.message || '撤销操作失败');
    } finally {
      setUndoing(false);
    }
  };

  const handleRedo = async () => {
    if (!id || redoing) return;
    try {
      setRedoing(true);
      setError(null);
      const result = await tripsApi.redo(id, { date });
      // 更新日程显示
      if (result.schedule) {
        setSchedule({
          date,
          schedule: result.schedule,
          persisted: false, // 重做后需要重新保存
        });
      }
      await loadActionHistory();
    } catch (err: any) {
      setError(err.message || '重做操作失败');
    } finally {
      setRedoing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error}</p>
          <Button onClick={loadSchedule} className="mt-4" variant="outline">
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">日程管理</h1>
          <p className="text-muted-foreground mt-1">查看和编辑指定日期的行程安排</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">选择日期</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-48"
            />
          </div>
          {schedule?.schedule && (
            <>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={undoing || actionHistory.length === 0}
                  title="撤销"
                >
                  {undoing ? (
                    <Spinner className="w-4 h-4" />
                  ) : (
                    <Undo2 className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={redoing}
                  title="重做"
                >
                  {redoing ? (
                    <Spinner className="w-4 h-4" />
                  ) : (
                    <Redo2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Spinner className="w-4 h-4 mr-2" />}
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </>
          )}
        </div>
      </div>

      {!schedule?.schedule ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            该日期暂无安排
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {format(new Date(schedule.date), 'yyyy年MM月dd日')} 的行程安排
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {schedule.schedule.items.map((item, index) => (
                <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{item.placeName}</span>
                      <span className="text-sm text-muted-foreground">({item.type})</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {/^\d{2}:\d{2}$/.test(item.startTime) ? item.startTime : format(new Date(item.startTime), 'HH:mm')} - {/^\d{2}:\d{2}$/.test(item.endTime) ? item.endTime : format(new Date(item.endTime), 'HH:mm')}
                        </span>
                      </div>
                      {item.metadata?.cost && (
                        <div className="flex items-center gap-1">
                          <span>{formatCurrency(item.metadata.cost, currency)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">总时长</span>
                  <span>{schedule.schedule.totalDuration} 分钟</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">总费用</span>
                  <span>{formatCurrency(schedule.schedule.totalCost ?? 0, currency)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作历史 */}
      {schedule?.schedule && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              操作历史
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="w-6 h-6" />
              </div>
            ) : actionHistory.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                暂无操作历史
              </div>
            ) : (
              <div className="space-y-3">
                {actionHistory.slice(0, 10).map((action) => (
                  <div
                    key={action.id}
                    className="flex items-start justify-between p-3 border rounded-lg text-sm"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{action.actionType}</div>
                      <div className="text-muted-foreground mt-1">
                        {new Date(action.timestamp).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {action.action.type}
                    </div>
                  </div>
                ))}
                {actionHistory.length > 10 && (
                  <div className="text-center text-sm text-muted-foreground">
                    显示最近 10 条记录，共 {actionHistory.length} 条
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

