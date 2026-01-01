import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import { countriesApi } from '@/api/countries';
import type { TripDetail, ItineraryItem, TripRecapReport } from '@/types/trip';
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
import { ArrowLeft, Calendar, Edit, Share2, Users, MapPin, MoreVertical, Trash2, Plus, TrendingUp, Shield, Activity, RefreshCw, History, Play, Compass, BarChart3, Eye, AlertTriangle } from 'lucide-react';
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
import type { DecisionLogEntry, ReplaceItineraryItemResponse } from '@/types/trip';
import { zhCN } from 'date-fns/locale';
import AbuView from '@/components/trips/views/AbuView';
import DrDreView from '@/components/trips/views/DrDreView';
import NeptuneView from '@/components/trips/views/NeptuneView';

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
  const [viewMode, setViewMode] = useState<PersonaMode>('abu');

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
        
        // TODO: 如果后端返回收藏和点赞状态，在这里设置
        // 目前需要单独检查收藏状态
        await checkCollectionStatus();
        // 加载行程状态
        await loadTripState();
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
      const collectedTrips = await tripsApi.getCollected();
      const collected = collectedTrips.find((ct) => ct.trip.id === id);
      setIsCollected(!!collected);
    } catch (err: any) {
      // 如果检查失败，不影响主流程
      // 静默处理错误，不显示在控制台（可能是后端路由问题导致的误报）
      // 如果错误消息包含"collected"且是"不存在"错误，很可能是后端路由配置问题
      if (err?.message?.includes('collected') && err?.message?.includes('不存在')) {
        // 这是后端路由配置问题，静默忽略
        return;
      }
      // 其他错误才记录
      console.error('Failed to check collection status:', err);
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

  // 计算健康度指标（TODO: 从 API 获取真实数据）
  const healthMetrics = {
    executable: 85, // 可执行度
    buffer: 70, // 缓冲
    risk: 25, // 风险（越低越好）
    cost: 80, // 成本控制
  };

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

      {/* 三人格守护文案 */}
      <div className="bg-blue-50/50 border border-blue-200/60 rounded-lg p-4">
        <p className="text-sm text-blue-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <span>本行程由 <strong>Abu（安全）</strong>、<strong>Dr.Dre（节奏）</strong>、<strong>Neptune（修复）</strong> 实时守护</span>
        </p>
      </div>

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
            <AlertDialogDescription className="space-y-4">
              <div>
                您确定要删除行程 <strong>"{trip.destination}"</strong> 吗？
              </div>
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
            </AlertDialogDescription>
          </AlertDialogHeader>
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
                      {trip.TripDay.map((day, idx) => (
                        <Card key={day.id} className="border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                      <div>
                                <div className="font-semibold">
                                  Day {idx + 1} - {format(new Date(day.date), 'yyyy-MM-dd')}
                        </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {day.ItineraryItem.length} 个行程项
                      </div>
                    </div>
                              <div className="flex gap-2 text-xs">
                                <Badge variant="outline">步行: 8.5 km</Badge>
                                <Badge variant="outline">车程: 30 min</Badge>
                                <Badge variant="outline">缓冲: 45 min</Badge>
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  风险: 低
                                </Badge>
                  </div>
              </div>
            </CardContent>
          </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 右（4/12）：Top Risks + Evidence Quick Peek */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                {/* Top Risks */}
          <Card>
            <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      Top Risks
                    </CardTitle>
            </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                      <div className="font-medium text-red-800">时间窗冲突</div>
                      <div className="text-xs text-red-600 mt-1">
                        Abu: 缺少缓冲可能导致延误连锁反应
                    </div>
                      </div>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                      <div className="font-medium text-yellow-800">道路封闭风险</div>
                      <div className="text-xs text-yellow-600 mt-1">
                        Day 2 计划路线经过封闭路段
                    </div>
                  </div>
                <Button
                  variant="outline"
                      className="w-full"
                      onClick={() => {
                        setDrawerTab('risk');
                        setDrawerOpen(true);
                      }}
                    >
                      Open Risk Drawer
                    </Button>
                  </CardContent>
                </Card>

                {/* Evidence Quick Peek */}
                <Card data-tour="evidence-quick-peek">
                  <CardHeader>
                    <CardTitle>关键证据</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <div className="font-medium">营业时间</div>
                      <div className="text-xs text-muted-foreground">09:00-18:00</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">封路信息</div>
                      <div className="text-xs text-muted-foreground">Route X 在 2024-01-20 封闭</div>
                      </div>
                    <div className="text-sm">
                      <div className="font-medium">天气窗口</div>
                      <div className="text-xs text-muted-foreground">Day 2 预计有雨</div>
                    </div>
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
              {/* 视图模式说明 */}
              <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                  <div className="text-sm">
                    {viewMode === 'abu' && (
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-600" />
                        <span>
                          <strong>Abu 视图：</strong>先保证你不会被路线坑到。查看安全门控、红线列表和证据链。
                        </span>
                        </div>
                    )}
                    {viewMode === 'dre' && (
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-orange-600" />
                        <span>
                          <strong>Dr.Dre 视图：</strong>把计划算清楚，效率/体力/成本一眼看懂。使用 What-if 调参和方案对比。
                        </span>
                    </div>
              )}
                    {viewMode === 'neptune' && (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-green-600" />
                        <span>
                          <strong>Neptune 视图：</strong>出问题我来修，给你能立刻执行的替代方案。查看修复队列和替代候选。
                        </span>
                        </div>
                              )}
                            </div>
                  </CardContent>
                </Card>

              {/* 根据视图模式显示不同的视图组件 */}
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

