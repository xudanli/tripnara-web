import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  X, 
  RefreshCw, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  Bug
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tripsApi } from '@/api/trips';
import { readinessApi } from '@/api/readiness';
import type { TripDetail } from '@/types/trip';
import type { ReadinessCheckResult, ReadinessFindingItem, Risk } from '@/api/readiness';
import { toast } from 'sonner';
import { 
  inferPackingListParams, 
  isTemplateSupported 
} from '@/utils/packing-list-inference';

interface ReadinessDrawerProps {
  open: boolean;
  onClose: () => void;
  tripId?: string | null;
  highlightFindingId?: string; // 用于定位到特定 finding
}

type GateStatus = 'BLOCK' | 'WARN' | 'PASS';

export default function ReadinessDrawer({
  open,
  onClose,
  tripId,
  highlightFindingId,
}: ReadinessDrawerProps) {
  const { t, i18n } = useTranslation();
  
  // 获取当前语言代码（'zh' 或 'en'）
  const getLangCode = () => {
    const lang = i18n.language || 'en';
    return lang.startsWith('zh') ? 'zh' : 'en';
  };
  // 使用 dashboard.readiness.drawer 路径，因为翻译文件中的结构是 dashboard.readiness.drawer
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [readinessResult, setReadinessResult] = useState<ReadinessCheckResult | null>(null);
  const [checkedMustItems, setCheckedMustItems] = useState<Set<string>>(new Set());
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set());
  const [showShouldOptional, setShowShouldOptional] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [loadingCheckedStatus, setLoadingCheckedStatus] = useState(false); // 用于显示加载状态（将来使用）
  const [savingCheckedStatus, setSavingCheckedStatus] = useState(false);
  const [selectedBlockerId, setSelectedBlockerId] = useState<string | null>(null);
  const [solutions, setSolutions] = useState<any[]>([]); // 用于显示解决方案对话框（将来使用）
  const [loadingSolutions, setLoadingSolutions] = useState(false);
  
  // 暂时引用这些变量以避免 lint 警告（将来会在 UI 中使用）
  if (false) {
    console.log(loadingCheckedStatus, solutions.length);
  }
  const [notApplicableItems, setNotApplicableItems] = useState<Set<string>>(new Set());
  const [laterItems, setLaterItems] = useState<Set<string>>(new Set());
  
  const blockerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const mustRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // 从后端加载已勾选的项
  const loadCheckedStatus = async () => {
    if (!tripId) return;
    try {
      setLoadingCheckedStatus(true);
      const status = await readinessApi.getChecklistStatus(tripId);
      setCheckedMustItems(new Set(status.checkedItems));
    } catch (err) {
      console.error('Failed to load checked status from backend:', err);
      // 降级到 localStorage
      try {
        const stored = localStorage.getItem(`readiness_checked_${tripId}`);
        if (stored) {
          const checked = JSON.parse(stored);
          setCheckedMustItems(new Set(checked));
        }
      } catch (localErr) {
        console.error('Failed to load from localStorage:', localErr);
      }
    } finally {
      setLoadingCheckedStatus(false);
    }
  };

  // 加载不适用项和稍后处理项
  const loadMarkedItems = async () => {
    if (!tripId) return;
    try {
      const [notApplicableResult, laterResult] = await Promise.all([
        readinessApi.getNotApplicableItems(tripId).catch(() => ({ notApplicableItems: [] })),
        readinessApi.getLaterItems(tripId).catch(() => ({ laterItems: [] })),
      ]);
      setNotApplicableItems(new Set(notApplicableResult.notApplicableItems.map(item => item.findingId)));
      setLaterItems(new Set(laterResult.laterItems.map(item => item.findingId)));
    } catch (err) {
      console.error('Failed to load marked items:', err);
    }
  };

  // 加载勾选状态和标记项
  useEffect(() => {
    if (tripId && open) {
      loadCheckedStatus();
      loadMarkedItems();
    }
  }, [tripId, open]);

  // 计算 gate 状态
  const gateStatus: GateStatus = readinessResult
    ? readinessResult.summary.totalBlockers > 0
      ? 'BLOCK'
      : readinessResult.summary.totalMust > 0
      ? 'WARN'
      : 'PASS'
    : 'PASS';

  // 加载数据
  useEffect(() => {
    if (open && tripId) {
      loadData();
    }
  }, [open, tripId]);

  // 定位到特定 finding
  useEffect(() => {
    if (highlightFindingId && readinessResult) {
      setTimeout(() => {
        const element = blockerRefs.current.get(highlightFindingId) || 
                       mustRefs.current.get(highlightFindingId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
          }, 2000);
        }
      }, 300);
    }
  }, [highlightFindingId, readinessResult]);

  const loadData = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const [tripData, readinessData] = await Promise.all([
        tripsApi.getById(tripId),
        readinessApi.getTripReadiness(tripId, getLangCode()).catch(() => null),
      ]);
      
      setTrip(tripData);
      
      if (readinessData) {
        setReadinessResult(readinessData);
      } else {
        // 使用 check API 作为备用
        try {
          const checkDto = {
            destinationId: tripData.destination || '',
            trip: {
              startDate: tripData.startDate,
              endDate: tripData.endDate,
            },
            itinerary: {
              countries: [tripData.destination].filter(Boolean),
            },
          };
          const checkResult = await readinessApi.check(checkDto);
          setReadinessResult(checkResult);
        } catch (checkErr) {
          console.error('Failed to check readiness:', checkErr);
          // 如果所有 API 都失败，保持 readinessResult 为 null，显示空状态
          setReadinessResult(null);
        }
      }
    } catch (err) {
      console.error('Failed to load readiness data:', err);
      setReadinessResult(null);
      // 不在初始加载时显示错误，避免干扰用户体验
      // 只在手动刷新时显示错误（已在 handleRefresh 中处理）
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!tripId) return;
    try {
      setRefreshing(true);
      await Promise.all([
        loadData(),
        loadCheckedStatus(), // 同时刷新勾选状态
        loadMarkedItems(), // 刷新标记项
      ]);
      toast.success(t('dashboard.readiness.page.drawer.actions.refreshSuccess'));
    } catch (err) {
      console.error('Failed to refresh readiness:', err);
      toast.error(t('dashboard.readiness.page.drawer.actions.refreshFailed'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleGeneratePackingList = async () => {
    if (!tripId || !trip) return;
    try {
      // 自动推断参数
      const destination = trip.destination || 'IS';
      const useTemplate = isTemplateSupported(destination);
      const inferredParams = inferPackingListParams(trip);
      
      console.log('🔄 [Readiness] 生成打包清单，推断参数:', {
        useTemplate,
        ...inferredParams,
      });
      
      // 调用生成接口，传递推断的参数
      const packingList = await readinessApi.generatePackingList(tripId, {
        includeOptional: true,
        // 模板模式参数
        useTemplate,
        season: inferredParams.season,
        route: inferredParams.route,
        userType: inferredParams.userType,
        activities: inferredParams.activities,
      });
      
      // TODO: 显示打包清单对话框或导航到打包清单页面
      toast.success(t('dashboard.readiness.page.drawer.actions.generatePackingListSuccess', { 
        count: packingList.items.length 
      }));
      console.log('✅ [Readiness] 打包清单生成成功:', packingList);
    } catch (err: any) {
      console.error('❌ [Readiness] 生成打包清单失败:', err);
      toast.error(t('dashboard.readiness.page.drawer.actions.generatePackingListFailed'));
    }
  };

  const handleViewSolution = async (blockerId: string) => {
    if (!tripId) return;
    try {
      setLoadingSolutions(true);
      setSelectedBlockerId(blockerId);
      const result = await readinessApi.getSolutions(tripId, blockerId);
      setSolutions(result.solutions);
      // TODO: 显示解决方案对话框
      if (result.solutions.length === 0) {
        toast.info(t('dashboard.readiness.page.drawer.actions.noSolutionsAvailable'));
      } else {
        toast.success(t('dashboard.readiness.page.drawer.actions.solutionsLoaded', { 
          count: result.solutions.length 
        }));
      }
    } catch (err) {
      console.error('Failed to load solutions:', err);
      toast.error(t('dashboard.readiness.page.drawer.actions.loadSolutionsFailed'));
      setSolutions([]);
    } finally {
      setLoadingSolutions(false);
    }
  };

  const handleMarkNotApplicable = async (findingId: string, reason?: string) => {
    if (!tripId) return;
    try {
      await readinessApi.markNotApplicable(tripId, findingId, reason);
      toast.success(t('dashboard.readiness.page.drawer.actions.markedNotApplicable'));
      // 更新本地状态
      const newSet = new Set(notApplicableItems);
      newSet.add(findingId);
      setNotApplicableItems(newSet);
      // 重新加载数据以反映标记状态
      await loadData();
    } catch (err: any) {
      console.error('Failed to mark as not applicable:', err);
      const errorMessage = getErrorMessage(err, 'dashboard.readiness.page.drawer.actions.markNotApplicableFailed');
      toast.error(errorMessage);
    }
  };

  const handleUnmarkNotApplicable = async (findingId: string) => {
    if (!tripId) return;
    try {
      await readinessApi.unmarkNotApplicable(tripId, findingId);
      toast.success(t('dashboard.readiness.page.drawer.actions.unmarkedNotApplicable'));
      // 更新本地状态
      const newSet = new Set(notApplicableItems);
      newSet.delete(findingId);
      setNotApplicableItems(newSet);
      // 重新加载数据
      await loadData();
    } catch (err: any) {
      console.error('Failed to unmark:', err);
      const errorMessage = getErrorMessage(err, 'dashboard.readiness.page.drawer.actions.unmarkNotApplicableFailed');
      toast.error(errorMessage);
    }
  };

  const handleAddToLater = async (findingId: string, reminderDate?: string, note?: string) => {
    if (!tripId) return;
    try {
      await readinessApi.addToLater(tripId, findingId, reminderDate, note);
      toast.success(t('dashboard.readiness.page.drawer.actions.addedToLater'));
      // 更新本地状态
      const newSet = new Set(laterItems);
      newSet.add(findingId);
      setLaterItems(newSet);
    } catch (err: any) {
      console.error('Failed to add to later:', err);
      const errorMessage = getErrorMessage(err, 'dashboard.readiness.page.drawer.actions.addToLaterFailed');
      toast.error(errorMessage);
    }
  };

  const handleRemoveFromLater = async (findingId: string) => {
    if (!tripId) return;
    try {
      await readinessApi.removeFromLater(tripId, findingId);
      toast.success(t('dashboard.readiness.page.drawer.actions.removedFromLater'));
      // 更新本地状态
      const newSet = new Set(laterItems);
      newSet.delete(findingId);
      setLaterItems(newSet);
    } catch (err: any) {
      console.error('Failed to remove from later:', err);
      const errorMessage = getErrorMessage(err, 'dashboard.readiness.page.drawer.actions.removeFromLaterFailed');
      toast.error(errorMessage);
    }
  };

  // 错误处理辅助函数
  const getErrorMessage = (err: any, defaultKey: string): string => {
    if (err?.response?.data?.error) {
      const error = err.response.data.error;
      switch (error.code) {
        case 'TRIP_NOT_FOUND':
          return t('dashboard.readiness.page.drawer.errors.tripNotFound');
        case 'FINDING_NOT_FOUND':
          return t('dashboard.readiness.page.drawer.errors.findingNotFound');
        case 'INVALID_FINDING_ID':
          return t('dashboard.readiness.page.drawer.errors.invalidFindingId');
        case 'UNAUTHORIZED':
          return t('dashboard.readiness.page.drawer.errors.unauthorized');
        default:
          return error.message || t(defaultKey);
      }
    }
    return err?.message || t(defaultKey);
  };

  const handleToggleMustItem = async (itemId: string) => {
    const newChecked = new Set(checkedMustItems);
    const wasChecked = newChecked.has(itemId);
    if (wasChecked) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedMustItems(newChecked);
    
    // 保存勾选状态到后端
    if (tripId) {
      try {
        setSavingCheckedStatus(true);
        await readinessApi.updateChecklistStatus(tripId, Array.from(newChecked));
        // 同时保存到 localStorage 作为备份
        localStorage.setItem(`readiness_checked_${tripId}`, JSON.stringify(Array.from(newChecked)));
        // 显示提示
        if (wasChecked) {
          toast.info(t('dashboard.readiness.page.drawer.actions.itemUnchecked'));
        } else {
          toast.success(t('dashboard.readiness.page.drawer.actions.itemChecked'));
        }
      } catch (err) {
        console.error('Failed to save checked items:', err);
        // 降级到 localStorage
        try {
          localStorage.setItem(`readiness_checked_${tripId}`, JSON.stringify(Array.from(newChecked)));
          toast.warning(t('dashboard.readiness.page.drawer.actions.saveToLocalOnly'));
        } catch (localErr) {
          console.error('Failed to save to localStorage:', localErr);
        }
        toast.error(t('dashboard.readiness.page.drawer.actions.saveFailed'));
      } finally {
        setSavingCheckedStatus(false);
      }
    }
  };

  // 计算实际未完成的 must 项数量（用于顶部统计）
  const actualMustCount = readinessResult
    ? readinessResult.summary.totalMust - checkedMustItems.size
    : 0;

  // 合并所有 findings 的数据
  // 根据后端文档，finding 有 category 字段
  const allBlockers: ReadinessFindingItem[] = readinessResult?.findings?.flatMap(f => 
    f.blockers.map(item => ({ ...item, findingId: f.destinationId || f.packId || f.category }))
  ) || [];
  
  const allMust: ReadinessFindingItem[] = readinessResult?.findings?.flatMap(f => 
    f.must.map(item => ({ ...item, findingId: f.destinationId || f.packId || f.category }))
  ) || [];
  
  const allShould: ReadinessFindingItem[] = readinessResult?.findings?.flatMap(f => 
    f.should.map(item => ({ ...item, findingId: f.destinationId || f.packId || f.category }))
  ) || [];
  
  const allOptional: ReadinessFindingItem[] = readinessResult?.findings?.flatMap(f => 
    f.optional.map(item => ({ ...item, findingId: f.destinationId || f.packId || f.category }))
  ) || [];
  
  // 合并风险：从顶层 risks 和每个 finding 的 risks
  const allRisks: Risk[] = readinessResult?.risks || 
    readinessResult?.findings?.flatMap(f => f.risks || []) || [];

  // 按 severity 排序风险（high > medium > low）
  const sortedRisks = [...allRisks].sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed right-0 top-0 h-full w-[480px] bg-white border-l border-gray-200 shadow-xl z-50 transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      <div className="h-full flex flex-col">
        {/* 顶部汇总区（固定置顶） */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white">
          {/* 状态标签 */}
          <div className="px-4 pt-4 pb-3">
            {gateStatus === 'BLOCK' && (
              <Badge className="w-full justify-center bg-red-500 text-white py-2 text-sm font-semibold">
                <AlertCircle className="mr-2 h-4 w-4" />
                {t('dashboard.readiness.page.drawer.status.block')}
              </Badge>
            )}
            {gateStatus === 'WARN' && (
              <Badge className="w-full justify-center bg-yellow-500 text-white py-2 text-sm font-semibold">
                <AlertTriangle className="mr-2 h-4 w-4" />
                {t('dashboard.readiness.page.drawer.status.warn')}
              </Badge>
            )}
            {gateStatus === 'PASS' && (
              <Badge className="w-full justify-center bg-green-500 text-white py-2 text-sm font-semibold">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('dashboard.readiness.page.drawer.status.pass')}
              </Badge>
            )}
          </div>

          {/* 数量统计 */}
          <div className="px-4 pb-3 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>
                {t('dashboard.readiness.page.drawer.stats.blockers', { count: readinessResult?.summary.totalBlockers || 0 })}
              </span>
              <span className="text-gray-300">|</span>
              <span>
                {t('dashboard.readiness.page.drawer.stats.must', { count: Math.max(0, actualMustCount) })}
              </span>
              <span className="text-gray-300">|</span>
              <span>
                {t('dashboard.readiness.page.drawer.stats.suggestions', { 
                  count: (readinessResult?.summary.totalShould || 0) + (readinessResult?.summary.totalOptional || 0)
                })}
              </span>
              <span className="text-gray-300">|</span>
              <span>
                {t('dashboard.readiness.page.drawer.stats.risks', { count: sortedRisks.length })}
              </span>
            </div>
          </div>

          {/* 快捷操作按钮 */}
          <div className="px-4 pb-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-1"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              {t('dashboard.readiness.page.drawer.actions.refresh')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePackingList}
              className="flex-1"
            >
              <Package className="mr-2 h-4 w-4" />
              {t('dashboard.readiness.page.drawer.actions.generatePackingList')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* 核心内容区 */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="w-6 h-6" />
              </div>
            ) : readinessResult ? (
              <>
                {/* 如果没有数据，显示提示 */}
                {allBlockers.length === 0 && allMust.length === 0 && sortedRisks.length === 0 && (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    {t('dashboard.readiness.page.drawer.noItems')}
                  </div>
                )}

                {/* 阻塞项 Blockers 模块 */}
                {(() => {
                  const visibleBlockers = allBlockers.filter(item => {
                    const itemId = item.id;
                    return itemId && !notApplicableItems.has(itemId);
                  });
                  return visibleBlockers.length > 0 ? (
                    <Card className={cn(
                      "border-2",
                      gateStatus === 'BLOCK' ? "border-red-500" : "border-red-200"
                    )}>
                      <CardContent className="p-4">
                        <h3 className="text-base font-semibold mb-3 flex items-center">
                          <AlertCircle className="mr-2 h-5 w-5 text-red-500" />
                          {t('dashboard.readiness.page.drawer.blockers.title')}
                        </h3>
                        <div className="space-y-3">
                          {visibleBlockers.map((item, index) => {
                            const itemId = item.id || `blocker-${index}`;
                            const evidenceExpanded = expandedEvidence.has(itemId);
                            const isMarkedLater = laterItems.has(itemId);
                            return (
                              <div
                                key={itemId}
                                ref={(el) => {
                                  if (el) blockerRefs.current.set(itemId, el);
                                }}
                                className={cn(
                                  "border border-red-200 rounded-lg p-3",
                                  isMarkedLater ? "bg-red-100 opacity-75" : "bg-red-50"
                                )}
                              >
                              {/* 标题 */}
                              <div className="font-medium text-sm mb-2">{item.message}</div>
                              
                              {/* 原因：优先显示 askUser，如果没有则尝试从 message 中提取或显示 severity */}
                              {(item.askUser && item.askUser.length > 0) || item.severity ? (
                                <div className="text-xs text-gray-600 mb-3 italic">
                                  {item.askUser && item.askUser.length > 0 
                                    ? item.askUser[0]
                                    : item.severity 
                                    ? `${t('dashboard.readiness.page.drawer.blockers.severity')}: ${item.severity}`
                                    : item.message
                                  }
                                </div>
                              ) : null}
                              
                              {/* 操作按钮 */}
                              <div className="flex flex-wrap gap-2 mb-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleViewSolution(itemId)}
                                  disabled={loadingSolutions && selectedBlockerId === itemId}
                                >
                                  {loadingSolutions && selectedBlockerId === itemId ? (
                                    <>
                                      <Spinner className="mr-1 h-3 w-3" />
                                      {t('dashboard.readiness.page.drawer.actions.loading')}
                                    </>
                                  ) : (
                                    t('dashboard.readiness.page.drawer.actions.viewSolution')
                                  )}
                                </Button>
                                {notApplicableItems.has(itemId) ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => handleUnmarkNotApplicable(itemId)}
                                  >
                                    {t('dashboard.readiness.page.drawer.actions.unmarkNotApplicable')}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => handleMarkNotApplicable(itemId)}
                                  >
                                    {t('dashboard.readiness.page.drawer.actions.markNotApplicable')}
                                  </Button>
                                )}
                                {laterItems.has(itemId) ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => handleRemoveFromLater(itemId)}
                                  >
                                    {t('dashboard.readiness.page.drawer.actions.removeFromLater')}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => handleAddToLater(itemId)}
                                  >
                                    {t('dashboard.readiness.page.drawer.actions.handleLater')}
                                  </Button>
                                )}
                                {isMarkedLater && (
                                  <Badge variant="outline" className="text-xs">
                                    {t('dashboard.readiness.page.drawer.actions.markedAsLater')}
                                  </Badge>
                                )}
                              </div>
                              
                              {/* 展开项：证据 */}
                              {item.evidence && item.evidence.length > 0 && (
                                <div className="mt-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs p-0"
                                    onClick={() => {
                                      const newExpanded = new Set(expandedEvidence);
                                      if (evidenceExpanded) {
                                        newExpanded.delete(itemId);
                                      } else {
                                        newExpanded.add(itemId);
                                      }
                                      setExpandedEvidence(newExpanded);
                                    }}
                                  >
                                    <Eye className="mr-1 h-3 w-3" />
                                    {t('dashboard.readiness.page.drawer.actions.viewEvidence')}
                                    {evidenceExpanded ? (
                                      <ChevronUp className="ml-1 h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="ml-1 h-3 w-3" />
                                    )}
                                  </Button>
                                  
                                  {evidenceExpanded && (
                                    <div className="mt-2 p-2 bg-white rounded border border-red-100 text-xs">
                                      <div className="font-medium mb-1">{t('dashboard.readiness.page.drawer.debug.ruleId')}: {item.id || t('dashboard.readiness.page.drawer.debug.na')}</div>
                                      {item.evidence.map((ev, evIndex) => (
                                        <div key={evIndex} className="mb-2 last:mb-0">
                                          <div className="text-gray-600">
                                            <strong>{t('dashboard.readiness.page.drawer.debug.sourceId')}:</strong> {ev.sourceId}
                                          </div>
                                          {ev.sectionId && (
                                            <div className="text-gray-600">
                                              <strong>{t('dashboard.readiness.page.drawer.debug.sectionId')}:</strong> {ev.sectionId}
                                            </div>
                                          )}
                                          {ev.quote && (
                                            <div className="text-gray-500 italic mt-1">
                                              "{ev.quote}"
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ) : null;
                })()}

                {/* 必须项 Must 模块 */}
                {(() => {
                  const visibleMust = allMust.filter(item => {
                    const itemId = item.id;
                    return itemId && !notApplicableItems.has(itemId);
                  });
                  return visibleMust.length > 0 ? (
                    <Card className="border-2 border-yellow-200">
                      <CardContent className="p-4">
                        <h3 className="text-base font-semibold mb-3 flex items-center">
                          <CheckCircle2 className="mr-2 h-5 w-5 text-yellow-600" />
                          {t('dashboard.readiness.page.drawer.must.title')}
                        </h3>
                        <div className="space-y-3">
                          {visibleMust.map((item, index) => {
                          const itemId = item.id || `must-${index}`;
                          const isChecked = checkedMustItems.has(itemId);
                          return (
                            <div
                              key={itemId}
                              ref={(el) => {
                                if (el) mustRefs.current.set(itemId, el);
                              }}
                              className="flex items-start gap-3 border border-yellow-200 rounded-lg p-3 bg-yellow-50"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => handleToggleMustItem(itemId)}
                                disabled={savingCheckedStatus}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <div className={cn("text-sm font-medium mb-1", isChecked && "line-through text-gray-400")}>
                                  {item.message}
                                </div>
                                
                                {/* 原因 */}
                                {item.askUser && item.askUser.length > 0 && (
                                  <div className="text-xs text-gray-600 mb-2">
                                    {item.askUser[0]}
                                  </div>
                                )}
                                
                                {/* 任务列表 */}
                                {item.tasks && item.tasks.length > 0 && (
                                  <div className="mb-2">
                                    <div className="text-xs font-medium text-gray-700 mb-1">
                                      {t('dashboard.readiness.page.drawer.must.tasks')}:
                                    </div>
                                    <ul className="space-y-1">
                                      {/* 根据后端文档，tasks 是字符串数组 */}
                                      {(Array.isArray(item.tasks) ? item.tasks : []).map((task, taskIndex) => {
                                        // 兼容处理：如果是字符串，直接显示；如果是对象，显示 title 和 deadline
                                        if (typeof task === 'string') {
                                          return (
                                            <li key={taskIndex} className="text-xs text-gray-600 flex items-center gap-2">
                                              <span>•</span>
                                              <span className="flex-1">{task}</span>
                                            </li>
                                          );
                                        } else {
                                          // 兼容旧格式（对象）
                                          const taskObj = task as any;
                                          const taskText = taskObj.title || String(task);
                                          const deadline = trip && taskObj.dueOffsetDays !== undefined 
                                            ? (() => {
                                                const startDate = new Date(trip.startDate);
                                                const deadlineDate = new Date(startDate);
                                                deadlineDate.setDate(deadlineDate.getDate() + taskObj.dueOffsetDays);
                                                return deadlineDate.toLocaleDateString();
                                              })()
                                            : null;
                                          return (
                                            <li key={taskIndex} className="text-xs text-gray-600 flex items-center gap-2">
                                              <span>•</span>
                                              <span className="flex-1">{taskText}</span>
                                              {deadline && (
                                                <span className="text-gray-500">
                                                  {t('dashboard.readiness.page.drawer.must.deadline')}: {deadline}
                                                </span>
                                              )}
                                            </li>
                                          );
                                        }
                                      })}
                                    </ul>
                                  </div>
                                )}
                                
                                {/* 操作按钮 */}
                                {!isChecked && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs mt-2"
                                    onClick={() => handleToggleMustItem(itemId)}
                                  >
                                    {t('dashboard.readiness.page.drawer.actions.completed')}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Should/Optional 折叠项 */}
                      {(allShould.length > 0 || allOptional.length > 0) && (
                        <div className="mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => setShowShouldOptional(!showShouldOptional)}
                          >
                            {showShouldOptional ? (
                              <>
                                <ChevronUp className="mr-1 h-3 w-3" />
                                {t('dashboard.readiness.page.drawer.must.collapseMore')}
                              </>
                            ) : (
                              <>
                                <ChevronDown className="mr-1 h-3 w-3" />
                                {t('dashboard.readiness.page.drawer.must.expandMore')}
                              </>
                            )}
                          </Button>
                          
                          {showShouldOptional && (
                            <div className="mt-3 space-y-3">
                              {/* Should 项 */}
                              {allShould.length > 0 && (
                                <div>
                                  <div className="text-xs font-medium text-gray-700 mb-2">
                                    {t('dashboard.readiness.page.drawer.must.should')} ({allShould.length})
                                  </div>
                                  {allShould.map((item, index) => {
                                    const itemId = item.id || `should-${index}`;
                                    return (
                                      <div
                                        key={itemId}
                                        className="border border-orange-200 rounded-lg p-2 bg-orange-50 mb-2"
                                      >
                                        <div className="text-xs">{item.message}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              
                              {/* Optional 项 */}
                              {allOptional.length > 0 && (
                                <div>
                                  <div className="text-xs font-medium text-gray-700 mb-2">
                                    {t('dashboard.readiness.page.drawer.must.optional')} ({allOptional.length})
                                  </div>
                                  {allOptional.map((item, index) => {
                                    const itemId = item.id || `optional-${index}`;
                                    return (
                                      <div
                                        key={itemId}
                                        className="border border-blue-200 rounded-lg p-2 bg-blue-50 mb-2"
                                      >
                                        <div className="text-xs">{item.message}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  ) : null;
                })()}

                {/* 风险概览 Hazards 模块 */}
                {sortedRisks.length > 0 && (
                  <Card className="border-2 border-blue-200">
                    <CardContent className="p-4">
                      <h3 className="text-base font-semibold mb-3 flex items-center">
                        <AlertTriangle className="mr-2 h-5 w-5 text-blue-600" />
                        {t('dashboard.readiness.page.drawer.hazards.title')}
                      </h3>
                      <div className="space-y-3">
                        {sortedRisks.map((risk, index) => (
                          <div
                            key={index}
                            className="border border-blue-200 rounded-lg p-3 bg-blue-50"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={risk.severity === 'high' ? 'destructive' : 'secondary'}>
                                {t(`dashboard.readiness.page.drawer.hazards.severity.${risk.severity}`)}
                              </Badge>
                              <span className="font-medium text-sm">{risk.type}</span>
                            </div>
                            {/* 根据后端文档，使用 message 和 mitigation（单数） */}
                            <div className="text-sm text-gray-700 mb-1">{risk.message || risk.summary}</div>
                            {(risk.mitigation || risk.mitigations) && (risk.mitigation || risk.mitigations || []).length > 0 && (
                              <div className="text-xs text-gray-600 mt-2">
                                <strong>{t('dashboard.readiness.page.drawer.hazards.mitigations')}:</strong>
                                <ul className="list-disc list-inside mt-1">
                                  {(risk.mitigation || risk.mitigations || []).map((mit, i) => (
                                    <li key={i}>{mit}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500 text-sm">
                {t('dashboard.readiness.page.drawer.noData')}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 底部调试区（默认隐藏） */}
        {showDebugInfo && readinessResult && (
          <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-4 max-h-64 overflow-y-auto">
            <div className="text-xs font-mono space-y-3">
              <div>
                <strong>{t('dashboard.readiness.page.drawer.debug.summary')}:</strong>
                <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                  {JSON.stringify(readinessResult.summary, null, 2)}
                </pre>
              </div>
              
              <div>
                <strong>{t('dashboard.readiness.page.drawer.debug.findings', { count: readinessResult.findings.length })}:</strong>
                {readinessResult.findings.map((finding, idx) => (
                  <div key={idx} className="mt-2 bg-white p-2 rounded border">
                    <div className="font-semibold mb-1">{t('dashboard.readiness.page.drawer.debug.findingNumber', { number: idx + 1 })}</div>
                    <div>{t('dashboard.readiness.page.drawer.debug.destinationId')}: {finding.destinationId || t('dashboard.readiness.page.drawer.debug.na')}</div>
                    <div>{t('dashboard.readiness.page.drawer.debug.packId')}: {finding.packId || t('dashboard.readiness.page.drawer.debug.na')}</div>
                    <div>{t('dashboard.readiness.page.drawer.debug.packVersion')}: {finding.packVersion || t('dashboard.readiness.page.drawer.debug.na')}</div>
                    <div className="mt-2">
                      <div>{t('dashboard.readiness.page.drawer.debug.blockers')}: {finding.blockers?.length || 0}</div>
                      {finding.blockers?.map((item, itemIdx) => (
                        <div key={itemIdx} className="ml-4 mt-1">
                          <div>{t('dashboard.readiness.page.drawer.debug.id')}: {item.id || t('dashboard.readiness.page.drawer.debug.na')}</div>
                          <div>{t('dashboard.readiness.page.drawer.debug.message')}: {item.message}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2">
                      <div>{t('dashboard.readiness.page.drawer.debug.must')}: {finding.must?.length || 0}</div>
                      {finding.must?.slice(0, 2).map((item, itemIdx) => (
                        <div key={itemIdx} className="ml-4 mt-1">
                          <div>{t('dashboard.readiness.page.drawer.debug.id')}: {item.id || t('dashboard.readiness.page.drawer.debug.na')}</div>
                          <div>{t('dashboard.readiness.page.drawer.debug.message')}: {item.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div>
                <strong>{t('dashboard.readiness.page.drawer.debug.risks', { count: sortedRisks.length })}:</strong>
                <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                  {JSON.stringify(sortedRisks.slice(0, 3), null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* 调试按钮 */}
        <div className="flex-shrink-0 border-t border-gray-200 px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="w-full text-xs text-gray-500"
          >
            <Bug className="mr-2 h-3 w-3" />
            {t('dashboard.readiness.page.drawer.debug.toggle')}
          </Button>
        </div>
      </div>
    </div>
  );
}

