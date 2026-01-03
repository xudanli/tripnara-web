import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import { countriesApi } from '@/api/countries';
import type { 
  TripDetail, 
  ItineraryItem, 
  TripRecapReport,
  EvidenceListResponse,
  PersonaAlert,
  DayMetricsResponse,
  TripMetricsResponse,
  ConflictsResponse
} from '@/types/trip';
import type { Suggestion, SuggestionStats } from '@/types/suggestion';
import { AssistantCenter } from '@/components/trips/AssistantCenter';
import { SuggestionBadge } from '@/components/trips/SuggestionBadge';
import { SuggestionGuardBar } from '@/components/trips/SuggestionGuardBar';
import type { Country } from '@/types/country';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Calendar, Edit, Share2, Users, MapPin, MoreVertical, Trash2, Plus, TrendingUp, Shield, Activity, RefreshCw, History, Play, Compass, BarChart3, Eye, AlertTriangle, Clock, Cloud, AlertCircle, Info } from 'lucide-react';
import HealthBar from '@/components/trips/HealthBar';
import { useDrawer } from '@/components/layout/DashboardLayout';
import { format } from 'date-fns';
import PersonaModeToggle, { type PersonaMode } from '@/components/common/PersonaModeToggle';
import { EditTripDialog } from '@/components/trips/EditTripDialog';
import { ShareTripDialog } from '@/components/trips/ShareTripDialog';
import { CollaboratorsDialog } from '@/components/trips/CollaboratorsDialog';
import { EditItineraryItemDialog } from '@/components/trips/EditItineraryItemDialog';
import { CreateItineraryItemDialog } from '@/components/trips/CreateItineraryItemDialog';
import { ReplaceItineraryItemDialog } from '@/components/trips/ReplaceItineraryItemDialog';
import { itineraryItemsApi } from '@/api/trips';
import { cn } from '@/lib/utils';
import { formatOpeningHoursDescription } from '@/utils/openingHoursFormatter';
import type { DecisionLogEntry, ReplaceItineraryItemResponse } from '@/types/trip';
import { zhCN } from 'date-fns/locale';
import AbuView from '@/components/trips/views/AbuView';
import DrDreView from '@/components/trips/views/DrDreView';
import NeptuneView from '@/components/trips/views/NeptuneView';
import AutoView from '@/components/trips/views/AutoView';

// 决策记录标签页组件
function DecisionLogTab({ tripId }: { tripId: string }) {
  const [logs, setLogs] = useState<DecisionLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDecisionLogs();
  }, [tripId]);

  const loadDecisionLogs = async () => {
    try {
      setLoading(true);
      const response = await tripsApi.getDecisionLog(tripId, 50, 0);
      setLogs(response.items || []);
    } catch (err: any) {
      console.error('Failed to load decision log:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getPersonaName = (persona?: string): string => {
    if (!persona) return '';
    switch (persona) {
      case 'ABU':
        return 'Abu';
      case 'DR_DRE':
        return 'Dr.Dre';
      case 'NEPTUNE':
        return 'Neptune';
      default:
        return '';
    }
  };

  const getPersonaIcon = (persona?: string) => {
    switch (persona) {
      case 'ABU':
        return <Shield className="w-4 h-4 text-red-600" />;
      case 'DR_DRE':
        return <Activity className="w-4 h-4 text-orange-600" />;
      case 'NEPTUNE':
        return <RefreshCw className="w-4 h-4 text-green-600" />;
      default:
        return null;
    }
  };

  const getPersonaColor = (persona?: string) => {
    switch (persona) {
      case 'ABU':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'DR_DRE':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'NEPTUNE':
        return 'bg-green-50 border-green-200 text-green-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Spinner className="w-8 h-8" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          System 2 思考日志
        </CardTitle>
        <CardDescription>
          可追溯、可解释的决策轨迹 - 信任来自「决策透明」
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无决策记录</p>
            <p className="text-sm mt-2">当三人格系统做出决策时，记录会显示在这里</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => {
              const personaName = getPersonaName(log.persona);
              return (
                <div
                  key={log.id}
                  className={`p-4 rounded-lg border ${getPersonaColor(log.persona)}`}
                >
                  <div className="flex items-start gap-3">
                    {getPersonaIcon(log.persona)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {personaName && (
                          <span className="font-semibold text-sm">
                            [{personaName}]
                          </span>
                        )}
                        <span className="text-sm">
                          {log.description}
                        </span>
                        <span className="text-xs opacity-70 ml-auto">
                          {format(new Date(log.date), 'yyyy年M月d日 HH:mm', { locale: zhCN })}
                        </span>
                      </div>
                      {log.source && (
                        <div className="text-xs opacity-70 mt-1">
                          来源：{log.source}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PLANNING':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'IN_PROGRESS':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'PLANNING':
      return '规划中';
    case 'IN_PROGRESS':
      return '进行中';
    case 'COMPLETED':
      return '已完成';
    case 'CANCELLED':
      return '已取消';
    default:
      return status;
  }
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setDrawerOpen, setDrawerTab } = useDrawer();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [collaboratorsDialogOpen, setCollaboratorsDialogOpen] = useState(false);
  const [tripState, setTripState] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [createItemDialogOpen, setCreateItemDialogOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [replacingItem, setReplacingItem] = useState<ItineraryItem | null>(null);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [recapReport, setRecapReport] = useState<TripRecapReport | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [isCollected, setIsCollected] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [country, setCountry] = useState<Country | null>(null);
  const [viewMode, setViewMode] = useState<PersonaMode>('auto');
  
  // 新增：证据、风险、指标相关状态
  const [evidence, setEvidence] = useState<EvidenceListResponse | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [personaAlerts, setPersonaAlerts] = useState<PersonaAlert[]>([]);
  const [personaAlertsLoading, setPersonaAlertsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionStats, setSuggestionStats] = useState<SuggestionStats | null>(null);
  const [dayMetricsMap, setDayMetricsMap] = useState<Map<string, DayMetricsResponse>>(new Map());
  const [dayMetricsLoading, setDayMetricsLoading] = useState(false);
  const [tripMetrics, setTripMetrics] = useState<TripMetricsResponse | null>(null);
  const [tripMetricsLoading, setTripMetricsLoading] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictsResponse | null>(null);
  const [conflictsLoading, setConflictsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadTrip();
    }
  }, [id]);

  const loadTrip = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await tripsApi.getById(id);
      if (data) {
        // 确保所有数值字段都有默认值
        setTrip({
          ...data,
          totalBudget: data.totalBudget ?? 0,
          statistics: data.statistics ? {
            ...data.statistics,
            budgetUsed: data.statistics.budgetUsed ?? 0,
            budgetRemaining: data.statistics.budgetRemaining ?? 0,
            totalDays: data.statistics.totalDays ?? 0,
            totalItems: data.statistics.totalItems ?? 0,
            totalActivities: data.statistics.totalActivities ?? 0,
            totalMeals: data.statistics.totalMeals ?? 0,
            totalRest: data.statistics.totalRest ?? 0,
            totalTransit: data.statistics.totalTransit ?? 0,
          } : {
            totalDays: 0,
            totalItems: 0,
            totalActivities: 0,
            totalMeals: 0,
            totalRest: 0,
            totalTransit: 0,
            progress: 'PLANNING',
            budgetUsed: 0,
            budgetRemaining: 0,
          },
        });
        
        // 根据目的地加载国家信息以获取货币代码
        if (data.destination) {
          loadCountryInfo(data.destination);
        }
        
        // 在 trip 设置后加载依赖 trip 的数据
        // 使用 setTimeout 确保 state 已更新
        setTimeout(() => {
          loadTripMetrics();
        }, 0);
        
        // 检查收藏和点赞状态
        // 注意：如果后端在 GET /trips/:id 响应中包含 isCollected、isLiked、likeCount 字段，
        // 可以直接从 data 中获取，无需单独调用接口
        await checkCollectionStatus();
        // 加载行程状态
        await loadTripState();
        // 加载相关数据（先加载不依赖 trip 的数据）
        await Promise.all([
          loadEvidence(),
          loadSuggestions(),
          loadConflicts(),
        ]);
      } else {
        setError('行程数据为空');
      }
    } catch (err: any) {
      setError(err.message || '加载行程详情失败');
      console.error('Failed to load trip:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCountryInfo = async (countryCode: string) => {
    try {
      const countries = await countriesApi.getAll();
      const found = countries.find((c) => c.isoCode === countryCode);
      if (found) {
        setCountry(found);
      }
    } catch (err: any) {
      console.error('Failed to load country info:', err);
      // 加载失败不影响主流程
    }
  };

  // 格式化货币显示
  const formatCurrency = (amount: number): string => {
    const currencyCode = country?.currencyCode || trip?.budgetConfig?.currency || 'CNY';
    const formattedAmount = amount.toLocaleString();
    
    // 常见货币符号映射
    const currencySymbols: Record<string, string> = {
      CNY: '¥',
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      KRW: '₩',
      THB: '฿',
      SGD: 'S$',
      MYR: 'RM',
      IDR: 'Rp',
      PHP: '₱',
      VND: '₫',
      INR: '₹',
      AUD: 'A$',
      NZD: 'NZ$',
      CAD: 'C$',
      CHF: 'CHF',
    };
    
    const symbol = currencySymbols[currencyCode] || currencyCode;
    return `${symbol}${formattedAmount}`;
  };

  const checkCollectionStatus = async () => {
    if (!id) return;
    try {
      // 检查是否已收藏
      // 优化建议：如果后端在 GET /trips/:id 响应中包含 isCollected、isLiked、likeCount 字段，
      // 可以直接从 trip 数据中获取，避免额外的 API 调用
      try {
        const collectedTrips = await tripsApi.getCollected();
        const collected = collectedTrips.find((ct) => ct.trip.id === id);
        setIsCollected(!!collected);
      } catch (collectedErr: any) {
        // 如果获取收藏状态失败，静默处理，不影响主流程
        // 可能是后端路由配置问题或接口未实现
        if (!collectedErr?.message?.includes('collected') || !collectedErr?.message?.includes('不存在')) {
          // 只对非"collected不存在"错误进行日志记录
          console.debug('Failed to load collected status:', collectedErr);
        }
        setIsCollected(false);
      }
      
      // TODO: 如果后端返回点赞状态和点赞数，在这里设置
      // 目前点赞功能已实现，但需要后端提供获取点赞状态的接口
      // 或者从 GET /trips/:id 响应中获取
    } catch (err: any) {
      // 如果检查失败，不影响主流程
      console.error('Failed to load trip details:', err);
    }
  };

  const handleCollect = async () => {
    if (!id || actionLoading) return;
    try {
      setActionLoading('collect');
      if (isCollected) {
        await tripsApi.uncollect(id);
        setIsCollected(false);
      } else {
        await tripsApi.collect(id);
        setIsCollected(true);
      }
    } catch (err: any) {
      console.error('Failed to toggle collection:', err);
      // 可以在这里添加错误提示
    } finally {
      setActionLoading(null);
    }
  };

  const handleLike = async () => {
    if (!id || actionLoading) return;
    try {
      setActionLoading('like');
      if (isLiked) {
        await tripsApi.unlike(id);
        setIsLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        await tripsApi.like(id);
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (err: any) {
      console.error('Failed to toggle like:', err);
      // 可以在这里添加错误提示
    } finally {
      setActionLoading(null);
    }
  };

  const loadTripState = async () => {
    if (!id) return;
    try {
      const state = await tripsApi.getState(id);
      setTripState(state);
    } catch (err) {
      // 状态加载失败不影响主流程
      console.error('Failed to load trip state:', err);
    }
  };

  // 加载关键证据（前3条）
  const loadEvidence = async () => {
    if (!id) return;
    try {
      setEvidenceLoading(true);
      const data = await tripsApi.getEvidence(id, { limit: 3, offset: 0 });
      setEvidence(data);
    } catch (err: any) {
      console.error('Failed to load evidence:', err);
      // 静默处理错误，不影响主流程
    } finally {
      setEvidenceLoading(false);
    }
  };

  // 加载建议列表（使用新的统一接口）
  const loadSuggestions = async () => {
    if (!id) return;
    try {
      setPersonaAlertsLoading(true);
      // 使用新的统一接口获取建议列表
      const result = await tripsApi.getSuggestions(id, { status: 'new' });
      
      // 确保建议 ID 唯一，去重处理
      const uniqueSuggestions = result.items.reduce((acc, suggestion) => {
        const existingIndex = acc.findIndex((s) => s.id === suggestion.id);
        if (existingIndex === -1) {
          acc.push(suggestion);
        } else {
          // 如果 ID 重复，使用更新的数据（或添加索引后缀）
          const existing = acc[existingIndex];
          if (suggestion.updatedAt && existing.updatedAt && 
              new Date(suggestion.updatedAt) > new Date(existing.updatedAt)) {
            acc[existingIndex] = suggestion;
          }
        }
        return acc;
      }, [] as typeof result.items);
      
      setSuggestions(uniqueSuggestions);
      
      // 使用新的统一接口获取统计数据
      const stats = await tripsApi.getSuggestionStats(id);
      setSuggestionStats(stats);
    } catch (err: any) {
      console.error('Failed to load suggestions:', err);
      // 静默处理错误，不影响主流程
      setSuggestions([]);
      setSuggestionStats(null);
    } finally {
      setPersonaAlertsLoading(false);
    }
  };

  // 加载行程指标（用于健康度计算）
  const loadTripMetrics = async () => {
    if (!id || !trip) return;
    try {
      setTripMetricsLoading(true);
      const data = await tripsApi.getMetrics(id);
      setTripMetrics(data);
      
      // 建立每日指标映射
      if (data.days) {
        const metricsMap = new Map<string, DayMetricsResponse>();
        for (const day of data.days) {
          metricsMap.set(day.date, day);
        }
        setDayMetricsMap(metricsMap);
      }
    } catch (err: any) {
      console.error('Failed to load trip metrics:', err);
      // 静默处理错误，不影响主流程
    } finally {
      setTripMetricsLoading(false);
    }
  };

  // 加载每日指标（用于路线骨架图）
  const loadDayMetrics = async (dayId: string, date: string) => {
    if (!id) return;
    try {
      const data = await tripsApi.getDayMetrics(id, dayId);
      setDayMetricsMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(date, data);
        return newMap;
      });
    } catch (err: any) {
      console.error('Failed to load day metrics:', err);
      // 静默处理错误，不影响主流程
    }
  };

  // 加载冲突列表
  const loadConflicts = async () => {
    if (!id) return;
    try {
      setConflictsLoading(true);
      const data = await tripsApi.getConflicts(id);
      setConflicts(data);
    } catch (err: any) {
      console.error('Failed to load conflicts:', err);
      // 静默处理错误，不影响主流程
    } finally {
      setConflictsLoading(false);
    }
  };

  const handleEditItem = (item: ItineraryItem) => {
    setEditingItem(item);
    setEditItemDialogOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('确定要删除这个行程项吗？')) return;

    try {
      await itineraryItemsApi.delete(itemId);
      await loadTrip(); // 重新加载行程
    } catch (err: any) {
      console.error('Failed to delete item:', err);
      alert(err.message || '删除行程项失败');
    }
  };

  const handleReplaceItem = (item: ItineraryItem) => {
    setReplacingItem(item);
    setReplaceDialogOpen(true);
  };

  const handleReplaceSuccess = async (result: ReplaceItineraryItemResponse) => {
    // 替换成功后，更新行程项
    try {
      await itineraryItemsApi.update(replacingItem!.id, {
        placeId: result.newItem.placeId,
        startTime: result.newItem.startTime,
        endTime: result.newItem.endTime,
        note: result.newItem.reason,
      });
      await loadTrip();
      setReplaceDialogOpen(false);
      setReplacingItem(null);
    } catch (err: any) {
      console.error('Failed to update item:', err);
      alert(err.message || '更新行程项失败');
    }
  };

  const handleRegenerate = async () => {
    if (!id || !trip) return;
    
    if (!confirm('确定要重新生成整个行程吗？已锁定的项将保持不变。')) return;

    setRegenerating(true);
    try {
      const result = await tripsApi.regenerate(id, {
        // 可以添加用户偏好
      });
      
      // 显示变更列表
      if (result.changes && result.changes.length > 0) {
        const changesText = result.changes.map(c => 
          `${c.type}: ${c.placeName} (Day ${c.day}, ${c.slot})`
        ).join('\n');
        
        if (confirm(`检测到 ${result.changes.length} 处变更：\n\n${changesText}\n\n是否应用这些变更？`)) {
          // 应用变更：保存新的草案
          await tripsApi.saveDraft({
            draft: result.updatedDraft,
          });
          await loadTrip();
        }
      } else {
        alert('未检测到变更');
      }
    } catch (err: any) {
      console.error('Failed to regenerate trip:', err);
      alert(err.message || '重生成行程失败');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCreateItem = (dayId: string) => {
    setSelectedDayId(dayId);
    setCreateItemDialogOpen(true);
  };

  const handleCreateItemSuccess = () => {
    loadTrip(); // 重新加载行程
    setCreateItemDialogOpen(false);
    setSelectedDayId(null);
  };

  const loadRecapReport = async () => {
    if (!id) return;
    try {
      setRecapLoading(true);
      const report = await tripsApi.getRecap(id);
      setRecapReport(report);
    } catch (err: any) {
      console.error('Failed to load recap report:', err);
    } finally {
      setRecapLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !trip) return;

    // 验证确认文字
    if (confirmText.trim().toUpperCase() !== trip.destination.toUpperCase()) {
      alert(`确认文字不匹配。请输入目的地国家代码"${trip.destination}"来确认删除。`);
      return;
    }

    try {
      setDeleting(true);
      await tripsApi.delete(id, confirmText.trim());
      // 删除成功后跳转到行程列表
      navigate('/dashboard/trips');
    } catch (err: any) {
      console.error('Failed to delete trip:', err);
      const errorMessage = err.response?.data?.error?.message || err.message || '删除行程失败';
      alert(errorMessage);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error || '行程不存在'}</p>
          <Button onClick={() => navigate('/dashboard/trips')} className="mt-4" variant="outline">
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  // 计算健康度指标（从 API 获取真实数据）
  const healthMetrics = (() => {
    // 默认值
    const defaultMetrics = {
      executable: 85,
      buffer: 70,
      risk: 25,
      cost: 80,
    };

    if (!tripMetrics) return defaultMetrics;

    // 基于行程指标计算健康度
    const summary = tripMetrics.summary;
    const totalDays = trip?.statistics?.totalDays || trip?.TripDay?.length || 1;
    
    // 可执行度：基于缓冲时间和疲劳指数
    // 缓冲时间充足且疲劳指数低 = 高可执行度
    const avgBufferPerDay = summary.totalBuffer / totalDays;
    const avgFatigue = summary.totalFatigue / totalDays;
    const executable = Math.min(100, Math.max(0, 
      (avgBufferPerDay / 60) * 20 + // 缓冲时间（小时）* 20，最多20分
      (100 - avgFatigue) * 0.65 // 疲劳指数越低越好，最多65分
    ));

    // 缓冲：基于总缓冲时间
    const buffer = Math.min(100, Math.max(0, (summary.totalBuffer / (totalDays * 120)) * 100)); // 假设每天理想缓冲2小时

    // 风险：基于冲突数量和高风险冲突
    const highRiskConflicts = conflicts?.conflicts?.filter(c => c.severity === 'HIGH').length || 0;
    const totalConflicts = conflicts?.total || 0;
    const risk = Math.min(100, Math.max(0, 
      (highRiskConflicts * 30) + // 高风险冲突每个30分
      (totalConflicts * 5) // 总冲突每个5分
    ));

    // 成本控制：基于预算使用情况
    const budgetUsed = trip?.statistics?.budgetUsed || 0;
    const totalBudget = trip?.totalBudget || 1;
    const budgetRatio = budgetUsed / totalBudget;
    const cost = Math.min(100, Math.max(0, (1 - budgetRatio) * 100)); // 预算使用越少越好

    return {
      executable: Math.round(executable),
      buffer: Math.round(buffer),
      risk: Math.round(risk),
      cost: Math.round(cost),
    };
  })();

  // 根据状态确定主 CTA
  const getMainCTA = () => {
    if (trip.status === 'PLANNING') {
      return {
        label: 'Generate Plan',
        action: () => navigate(`/dashboard/plan-studio?tripId=${id}`),
        icon: Compass,
      };
    } else if (trip.status === 'IN_PROGRESS') {
      return {
        label: 'Go to Next Step',
        action: () => navigate(`/dashboard/execute?tripId=${id}`),
        icon: Play,
      };
    } else {
      return {
        label: 'Start Execute',
        action: () => navigate(`/dashboard/execute?tripId=${id}`),
        icon: Play,
      };
    }
  };

  const mainCTA = getMainCTA();
  const CTAIcon = mainCTA.icon;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 顶部 Header（12/12） */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-start justify-between gap-6">
          {/* 左：Trip Title + 标签 */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/trips')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
              <h1 className="text-2xl font-bold">{trip.destination}</h1>
              <Badge variant="outline">{getStatusText(trip.status)}</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground ml-11">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(trip.startDate), 'yyyy-MM-dd')} -{' '}
                {format(new Date(trip.endDate), 'yyyy-MM-dd')}
              </span>
            </div>
              <Badge variant="secondary">标准节奏</Badge>
              <Badge variant="secondary">自驾</Badge>
            </div>
          </div>

          {/* 中：Health Bar */}
          <div className="w-80" data-tour="health-bar">
            <HealthBar
              executable={healthMetrics.executable}
              buffer={healthMetrics.buffer}
              risk={healthMetrics.risk}
              cost={healthMetrics.cost}
            />
          </div>

          {/* 右：视图模式切换 + 主 CTA */}
          <div className="flex items-center gap-2" data-tour="primary-cta">
            <PersonaModeToggle value={viewMode} onChange={setViewMode} />
            <Button onClick={mainCTA.action} size="lg">
              <CTAIcon className="w-4 h-4 mr-2" />
              {mainCTA.label}
          </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="w-4 h-4" />
          </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />
            编辑
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
            <Share2 className="w-4 h-4 mr-2" />
            分享
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCollaboratorsDialogOpen(true)}>
            <Users className="w-4 h-4 mr-2" />
            协作者
                </DropdownMenuItem>
                <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 护航提示条（仅在有待处理建议时显示） */}
      <SuggestionGuardBar
        stats={suggestionStats}
        onClick={() => {
          // 滚动到助手中心或打开助手中心（如果需要）
        }}
      />
      {/* 删除确认对话框 */}
      <AlertDialog 
        open={deleteDialogOpen} 
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            // 关闭对话框时重置确认文字
            setConfirmText('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除行程</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除行程 <strong>"{trip.destination}"</strong> 吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              此操作将永久删除以下内容：
            </div>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>{trip.statistics?.totalDays || trip.TripDay?.length || 0} 天的行程安排</li>
              <li>{trip.statistics?.totalItems || 0} 个行程项</li>
              <li>所有协作者、收藏、点赞、分享记录</li>
            </ul>
            <div className="text-sm font-medium text-destructive">
              ⚠️ 此操作不可恢复，请谨慎操作！
            </div>
            <div className="space-y-2 pt-2">
              <Label htmlFor="confirm-text" className="text-sm font-medium">
                请输入目的地国家代码 <strong>"{trip.destination}"</strong> 来确认删除：
              </Label>
              <Input
                id="confirm-text"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={trip.destination}
                className="uppercase"
                disabled={deleting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && confirmText.trim().toUpperCase() === trip.destination.toUpperCase() && !deleting) {
                    handleDelete();
                  }
                }}
              />
              {confirmText && confirmText.trim().toUpperCase() !== trip.destination.toUpperCase() && (
                <p className="text-sm text-destructive">
                  确认文字不匹配，请输入 "{trip.destination}"
                </p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || confirmText.trim().toUpperCase() !== trip.destination.toUpperCase()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 主体分区（顶部 Tab 4 个） */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b bg-white px-6">
        <TabsList>
              <TabsTrigger value="overview">
                <Eye className="w-4 h-4 mr-2" />
                总览
              </TabsTrigger>
              <TabsTrigger value="plan">
                <Compass className="w-4 h-4 mr-2" />
                规划
              </TabsTrigger>
              <TabsTrigger value="execute">
                <Play className="w-4 h-4 mr-2" />
                执行
              </TabsTrigger>
              <TabsTrigger value="insights">
                <BarChart3 className="w-4 h-4 mr-2" />
                复盘
              </TabsTrigger>
        </TabsList>
          </div>

        <div className="flex-1 overflow-y-auto p-6">
          <TabsContent value="overview" className="mt-0 space-y-6">
            <div className="grid grid-cols-12 gap-6">
              {/* 左（8/12）：Route Map / Skeleton + Day Summary */}
              <div className="col-span-12 lg:col-span-8 space-y-6">
                {/* Route Map / Skeleton */}
          <Card>
            <CardHeader>
                    <CardTitle>路线骨架图</CardTitle>
                    <CardDescription>Day1~DayN 路线概览</CardDescription>
            </CardHeader>
            <CardContent>
                    <div className="space-y-4">
                      {trip.TripDay.map((day, idx) => {
                        const dayMetrics = dayMetricsMap.get(day.date);
                        const dayConflicts = dayMetrics?.conflicts || [];
                        const hasHighRisk = dayConflicts.some(c => c.severity === 'HIGH');
                        const hasMediumRisk = dayConflicts.some(c => c.severity === 'MEDIUM');
                        
                        // 风险等级
                        const riskLevel = hasHighRisk ? '高' : hasMediumRisk ? '中' : '低';
                        const riskColor = hasHighRisk ? 'bg-red-50 text-red-700' : hasMediumRisk ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700';
                        
                        // 计算该Day的建议统计
                        const daySuggestions = suggestions.filter(
                          (s) => s.scope === 'day' && s.scopeId === day.id
                        );
                        const abuCount = daySuggestions.filter((s) => s.persona === 'abu').length;
                        const drdreCount = daySuggestions.filter((s) => s.persona === 'drdre').length;
                        const neptuneCount = daySuggestions.filter((s) => s.persona === 'neptune').length;
                        
                        return (
                          <Card key={day.id} className="border-l-4 border-l-primary">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="font-semibold">
                                      Day {idx + 1} - {format(new Date(day.date), 'yyyy-MM-dd')}
                                    </div>
                                    {/* 角标行 */}
                                    {(abuCount > 0 || drdreCount > 0 || neptuneCount > 0) && (
                                      <div className="flex gap-1.5">
                                        <SuggestionBadge
                                          persona="abu"
                                          count={abuCount}
                                          onClick={() => {
                                            // 点击角标时，可以滚动到助手中心或高亮对应建议
                                            // 这里可以添加更多交互逻辑，比如设置一个状态来过滤助手中心
                                            const assistantCenterElement = document.querySelector('[data-assistant-center]');
                                            if (assistantCenterElement) {
                                              assistantCenterElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                            }
                                          }}
                                        />
                                        <SuggestionBadge
                                          persona="drdre"
                                          count={drdreCount}
                                          onClick={() => {
                                            const assistantCenterElement = document.querySelector('[data-assistant-center]');
                                            if (assistantCenterElement) {
                                              assistantCenterElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                            }
                                          }}
                                        />
                                        <SuggestionBadge
                                          persona="neptune"
                                          count={neptuneCount}
                                          onClick={() => {
                                            const assistantCenterElement = document.querySelector('[data-assistant-center]');
                                            if (assistantCenterElement) {
                                              assistantCenterElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                            }
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {day.ItineraryItem.length} 个行程项
                                  </div>
                                </div>
                                <div className="flex gap-2 text-xs flex-wrap">
                                  {dayMetrics ? (
                                    <>
                                      <Badge variant="outline">
                                        步行: {dayMetrics.metrics.walk.toFixed(1)} km
                                      </Badge>
                                      <Badge variant="outline">
                                        车程: {Math.round(dayMetrics.metrics.drive)} min
                                      </Badge>
                                      <Badge variant="outline">
                                        缓冲: {Math.round(dayMetrics.metrics.buffer)} min
                                      </Badge>
                                      <Badge variant="outline" className={riskColor}>
                                        风险: {riskLevel}
                                      </Badge>
                                    </>
                                  ) : dayMetricsLoading ? (
                                    <Spinner className="w-4 h-4" />
                                  ) : (
                                    <>
                                      <Badge variant="outline">步行: --</Badge>
                                      <Badge variant="outline">车程: --</Badge>
                                      <Badge variant="outline">缓冲: --</Badge>
                                      <Badge variant="outline">风险: --</Badge>
                                    </>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 右（4/12）：助手中心 + Evidence Quick Peek */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                {/* 助手中心 */}
                <div data-assistant-center>
                  <AssistantCenter
                    suggestions={suggestions}
                    loading={personaAlertsLoading}
                    onSuggestionClick={(suggestion) => {
                      // 点击建议时打开对应的抽屉
                      setDrawerTab('risk');
                      setDrawerOpen(true);
                    }}
                    onActionClick={async (suggestion, actionId) => {
                      if (!id) return;
                      try {
                        // 查看证据操作
                        if (actionId === 'view_evidence') {
                          setDrawerTab('risk');
                          setDrawerOpen(true);
                          return;
                        }
                        
                        // 忽略建议操作
                        if (actionId === 'dismiss') {
                          await tripsApi.dismissSuggestion(id, suggestion.id);
                          // 重新加载建议列表
                          await loadSuggestions();
                          return;
                        }
                        
                        // 应用建议操作
                        if (actionId === 'apply' || actionId.startsWith('apply_')) {
                          const result = await tripsApi.applySuggestion(id, suggestion.id, {
                            actionId: actionId,
                            preview: false,
                          });
                          
                          // 重新加载建议列表
                          await loadSuggestions();
                          
                          // 如果有触发的建议，可以提示用户
                          if (result.triggeredSuggestions && result.triggeredSuggestions.length > 0) {
                            console.log('应用建议后触发了新建议:', result.triggeredSuggestions);
                            // TODO: 可以显示toast提示
                          }
                          return;
                        }
                        
                        // 预览操作
                        if (actionId === 'preview') {
                          const previewResult = await tripsApi.applySuggestion(id, suggestion.id, {
                            actionId: actionId,
                            preview: true,
                          });
                          console.log('预览结果:', previewResult);
                          // TODO: 显示预览对话框
                          return;
                        }
                        
                        // 其他操作类型
                        console.log('处理操作:', actionId, suggestion);
                      } catch (error: any) {
                        console.error('Failed to handle suggestion action:', error);
                        // TODO: 显示错误提示
                      }
                    }}
                  />
                </div>

                {/* Evidence Quick Peek */}
                <Card data-tour="evidence-quick-peek">
                  <CardHeader>
                    <CardTitle>关键证据</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {evidenceLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Spinner className="w-4 h-4" />
                      </div>
                    ) : evidence && evidence.items.length > 0 ? (
                      <>
                        {evidence.items.map((item) => {
                          const typeConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
                            opening_hours: { label: '营业时间', icon: Clock, color: 'text-blue-600' },
                            road_closure: { label: '封路信息', icon: AlertCircle, color: 'text-red-600' },
                            weather: { label: '天气窗口', icon: Cloud, color: 'text-sky-600' },
                            booking: { label: '预订信息', icon: Calendar, color: 'text-purple-600' },
                            other: { label: '其他', icon: Info, color: 'text-gray-600' },
                          };
                          
                          const config = typeConfig[item.type] || { label: item.type, icon: Info, color: 'text-gray-600' };
                          const Icon = config.icon;
                          
                          // 解析营业时间数据
                          let displayContent = item.description || '';
                          if (item.type === 'opening_hours' && item.description) {
                            try {
                              displayContent = formatOpeningHoursDescription(item.description);
                            } catch (e) {
                              // 如果格式化失败，使用原始描述
                              displayContent = item.description;
                            }
                          }
                          
                          // 确定显示的标题：优先使用 item.title，如果没有则使用类型标签
                          const displayTitle = item.title || config.label;
                          
                          return (
                            <div
                              key={item.id}
                              className="p-3 border rounded-lg hover:bg-muted/50 transition-colors space-y-2"
                            >
                              <div className="flex items-start gap-2">
                                <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.color)} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-sm font-medium">{displayTitle}</span>
                                    {item.day && (
                                      <Badge variant="outline" className="text-xs">
                                        Day {item.day}
                                      </Badge>
                                    )}
                                  </div>
                                  {displayContent && (
                                    <div className="text-xs text-muted-foreground break-words">
                                      {displayContent}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {evidence.total > evidence.items.length && (
                          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                            还有 {evidence.total - evidence.items.length} 条证据
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        暂无关键证据
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => {
                        setDrawerTab('evidence');
                        setDrawerOpen(true);
                      }}
                    >
                      View All Evidence
                    </Button>
                  </CardContent>
                </Card>

                <Button
                  className="w-full"
                  onClick={() => navigate(`/dashboard/plan-studio?tripId=${id}`)}
                >
                  <Compass className="w-4 h-4 mr-2" />
                  Open Plan Studio
                </Button>
                    </div>
                      </div>
          </TabsContent>

          {/* Plan Tab */}
          <TabsContent value="plan" className="mt-0 space-y-4">
          {trip.TripDay.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                暂无日程安排
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 视图模式说明（仅在非Auto模式显示） */}
              {viewMode !== 'auto' && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-sm">
                      {viewMode === 'abu' && (
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-600" />
                          <span>
                            <strong>Abu Lens：</strong>聚焦风险与证据
                          </span>
                        </div>
                      )}
                      {viewMode === 'dre' && (
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-orange-600" />
                          <span>
                            <strong>Dr.Dre Lens：</strong>聚焦指标与节奏
                          </span>
                        </div>
                      )}
                      {viewMode === 'neptune' && (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-green-600" />
                          <span>
                            <strong>Neptune Lens：</strong>聚焦修复与替代
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 根据视图模式显示不同的视图组件 */}
              {viewMode === 'auto' && <AutoView trip={trip} />}
              {viewMode === 'abu' && <AbuView trip={trip} />}
              {viewMode === 'dre' && <DrDreView trip={trip} />}
              {viewMode === 'neptune' && <NeptuneView trip={trip} />}
            </>
          )}
          </TabsContent>

          {/* Execute Tab */}
          <TabsContent value="execute" className="mt-0">
            <div className="p-6">
            <Card>
              <CardHeader>
                  <CardTitle>执行模式</CardTitle>
                  <CardDescription>下一步操作和今日时间线</CardDescription>
              </CardHeader>
                <CardContent className="space-y-4">
                  {/* Next Step 卡片 */}
                  {tripState?.nextStop ? (
                    <Card className="border-primary">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold">{tripState.nextStop.placeName}</h3>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          预计到达: {tripState.nextStop.startTime ? new Date(tripState.nextStop.startTime).toLocaleString('zh-CN') : 'N/A'}
                        </div>
              </CardContent>
            </Card>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>暂无下一步操作</p>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/dashboard/execute?tripId=${id}`)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Enter Field Mode
                  </Button>
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="mt-0">
            <div className="p-6">
            <Card>
              <CardHeader>
                  <CardTitle>复盘报告</CardTitle>
                  <CardDescription>查看路线报告和保存为模板</CardDescription>
              </CardHeader>
                <CardContent className="space-y-4">
                  {recapReport ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">稳健度</div>
                          <div className="text-2xl font-bold">{(recapReport as any)?.robustness || 8.5}/10</div>
                </div>
                        <div className="p-4 border rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">节奏</div>
                          <div className="text-2xl font-bold">标准</div>
                </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/dashboard/insights?tripId=${id}`)}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        查看完整报告
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>行程完成后可查看复盘报告</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={loadRecapReport}
                        disabled={recapLoading}
                      >
                        {recapLoading ? '加载中...' : '生成报告'}
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // TODO: 保存为模板
                      alert('保存为模板功能开发中');
                    }}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    保存为模板
                  </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 决策记录页 */}
        <TabsContent value="decision-log" className="space-y-4">
          <DecisionLogTab tripId={id!} />
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>预算详情</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">总预算</div>
                  <div className="text-2xl font-bold">{formatCurrency((trip.totalBudget ?? 0) as number)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">已使用</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency((trip.statistics.budgetUsed ?? 0) as number)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">剩余</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency((trip.statistics.budgetRemaining ?? 0) as number)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </div>
        </Tabs>
      </div>

      {/* 旧的 Tab 内容（保留作为备用，可通过 URL 参数访问） */}
      {false && (
        <>
        <TabsContent value="recap" className="space-y-4">
          {recapLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-8 h-8" />
            </div>
          ) : recapReport ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">行程复盘报告</h2>
                  <p className="text-muted-foreground mt-1">
                    {recapReport.destination} • {recapReport.totalDays} 天
                  </p>
                </div>
                <Button onClick={loadRecapReport} variant="outline">
                  刷新报告
                </Button>
              </div>

              {/* 统计概览 */}
              <Card>
                <CardHeader>
                  <CardTitle>统计概览</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">访问地点</div>
                      <div className="text-2xl font-bold">{recapReport.statistics.totalPlaces}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">徒步路线</div>
                      <div className="text-2xl font-bold">{recapReport.statistics.totalTrails}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">总里程 (km)</div>
                      <div className="text-2xl font-bold">
                        {recapReport.statistics.totalTrailDistanceKm.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">累计爬升 (m)</div>
                      <div className="text-2xl font-bold">
                        {recapReport.statistics.totalElevationGainM.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 时间线 */}
              <Card>
                <CardHeader>
                  <CardTitle>行程时间线</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recapReport.timeline.map((dayTimeline, index) => (
                      <div key={index} className="border-l-2 border-blue-200 pl-4">
                        <div className="font-medium mb-2">
                          {format(new Date(dayTimeline.date), 'yyyy年MM月dd日')}
                        </div>
                        <div className="space-y-2">
                          {dayTimeline.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="text-sm">
                              <span className="text-muted-foreground">
                                {format(new Date(item.time), 'HH:mm')}
                              </span>{' '}
                              <span className="font-medium">{item.name}</span>
                              {item.duration && (
                                <span className="text-muted-foreground ml-2">
                                  ({item.duration} 分钟)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 访问地点列表 */}
              {recapReport.places.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>访问地点 ({recapReport.places.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recapReport.places.map((place) => (
                        <div key={place.id} className="border rounded-lg p-3">
                          <div className="font-medium">{place.nameCN}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {format(new Date(place.visitDate), 'yyyy-MM-dd')} {place.visitTime}
                          </div>
                          {place.category && (
                            <Badge variant="outline" className="mt-2">
                              {place.category}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">尚未生成复盘报告</p>
                <Button onClick={loadRecapReport}>生成复盘报告</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        </>
      )}

      {/* 编辑对话框 */}
      {trip && (
        <EditTripDialog
          trip={trip}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={loadTrip}
        />
      )}

      {/* 分享对话框 */}
      {id && (
        <ShareTripDialog
          tripId={id}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      )}

      {/* 协作者对话框 */}
      {id && (
        <CollaboratorsDialog
          tripId={id}
          open={collaboratorsDialogOpen}
          onOpenChange={setCollaboratorsDialogOpen}
        />
      )}

      {/* 创建行程项对话框 */}
      {selectedDayId && (
        <CreateItineraryItemDialog
          tripDayId={selectedDayId}
          open={createItemDialogOpen}
          onOpenChange={(open) => {
            setCreateItemDialogOpen(open);
            if (!open) {
              setSelectedDayId(null);
            }
          }}
          onSuccess={handleCreateItemSuccess}
        />
      )}

      {/* 编辑行程项对话框 */}
      {editingItem && (
        <EditItineraryItemDialog
          item={editingItem}
          open={editItemDialogOpen}
          onOpenChange={(open) => {
            setEditItemDialogOpen(open);
            if (!open) {
              setEditingItem(null);
            }
          }}
          onSuccess={loadTrip}
        />
      )}

      {/* 替换行程项对话框 */}
      {replacingItem && id && (
        <ReplaceItineraryItemDialog
          tripId={id}
          itemId={replacingItem.id}
          placeName={replacingItem.Place?.nameCN}
          open={replaceDialogOpen}
          onOpenChange={(open) => {
            setReplaceDialogOpen(open);
            if (!open) {
              setReplacingItem(null);
            }
          }}
          onSuccess={handleReplaceSuccess}
        />
      )}
    </div>
  );
}

