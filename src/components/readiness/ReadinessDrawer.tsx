import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import ChecklistSection from '@/components/readiness/ChecklistSection';
import RiskCard from '@/components/readiness/RiskCard';
import { 
  X, 
  RefreshCw, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  Bug,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tripsApi } from '@/api/trips';
import { readinessApi } from '@/api/readiness';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import type { TripDetail } from '@/types/trip';
import type { ReadinessCheckResult, ReadinessFindingItem, Risk, ScoreBreakdownResponse, CoverageMapResponse, EvidenceType } from '@/api/readiness';
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
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdownResponse | null>(null);
  const [coverageMapData, setCoverageMapData] = useState<CoverageMapResponse | null>(null);
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
  const [generatingPackingList, setGeneratingPackingList] = useState(false);
  const [fetchingEvidence, setFetchingEvidence] = useState(false);
  
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

  // 计算 gate 状态 - 优先使用 scoreBreakdown 的数据
  const gateStatus: GateStatus = (() => {
    // 优先使用 scoreBreakdown 的分数判断
    if (scoreBreakdown?.score?.overall !== undefined) {
      const score = scoreBreakdown.score.overall;
      const blockers = scoreBreakdown.summary?.blockers ?? 0;
      const warnings = scoreBreakdown.summary?.warnings ?? 0;
      
      // 有阻塞项时，无论分数如何都显示 BLOCK
      if (blockers > 0) return 'BLOCK';
      
      // 没有阻塞项，但分数低或有警告项时，显示 WARN
      if (score < 60 || warnings > 0) return 'WARN';
      
      // 分数 >= 60 且没有警告项时，显示 PASS
      return 'PASS';
    }
    // 回退到 readinessResult
    if (readinessResult) {
      if (readinessResult.summary.totalBlockers > 0) return 'BLOCK';
      if (readinessResult.summary.totalMust > 0) return 'WARN';
      return 'PASS';
    }
    return 'PASS';
  })();

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
      const [tripData, readinessData, scoreData, coverageData] = await Promise.all([
        tripsApi.getById(tripId),
        readinessApi.getTripReadiness(tripId, getLangCode()).catch((err) => {
          console.error('❌ [ReadinessDrawer] getTripReadiness API 调用失败:', {
            tripId,
            error: err,
            message: err?.message,
            response: err?.response?.data,
            status: err?.response?.status,
            url: err?.config?.url,
          });
          return null;
        }),
        // 同时加载 scoreBreakdown 获取准确的统计数据
        readinessApi.getScoreBreakdown(tripId).catch(() => null),
        // 加载覆盖地图数据以获取缺失证据详情
        readinessApi.getCoverageMapData(tripId).catch(() => null),
      ]);
      
      setTrip(tripData);
      setScoreBreakdown(scoreData);
      setCoverageMapData(coverageData);
      
      if (readinessData) {
        console.log('✅ [ReadinessDrawer] 数据加载成功:', {
          findingsCount: readinessData.findings?.length || 0,
          risksCount: readinessData.risks?.length || 0,
          summary: readinessData.summary,
        });
        console.log('📊 [ReadinessDrawer] findings 详情:', readinessData.findings);
        console.log('📊 [ReadinessDrawer] 完整数据:', JSON.stringify(readinessData, null, 2));
        
        // 检查 findings 是否为空
        if (!readinessData.findings || readinessData.findings.length === 0) {
          console.warn('⚠️ [ReadinessDrawer] findings 为空，但 summary 显示有数据:', readinessData.summary);
          // 如果 findings 为空但 summary 有数据，尝试使用 check API 作为备用
          if (readinessData.summary && (readinessData.summary.totalBlockers > 0 || readinessData.summary.totalMust > 0)) {
            console.log('🔄 [ReadinessDrawer] findings 为空但 summary 有数据，尝试使用 check API');
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
              console.log('✅ [ReadinessDrawer] check API 返回数据:', checkResult);
              if (checkResult.findings && checkResult.findings.length > 0) {
                setReadinessResult(checkResult);
                return;
              }
            } catch (checkErr) {
              console.error('❌ [ReadinessDrawer] check API 也失败:', checkErr);
            }
          }
        }
        
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
      setScoreBreakdown(null);
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
    if (!tripId || !trip) {
      toast.error('行程信息缺失，无法生成打包清单');
      return;
    }
    
    if (generatingPackingList) return; // 防止重复点击
    
    try {
      setGeneratingPackingList(true);
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
      
      // 跳转到打包清单页面
      if (packingList?.items && packingList.items.length > 0) {
        toast.success(t('dashboard.readiness.page.drawer.actions.generatePackingListSuccess', { 
          count: packingList.items.length 
        }));
        // 跳转到打包清单标签页
        window.location.href = `/dashboard/readiness?tripId=${tripId}&tab=packing-list`;
      } else {
        toast.warning('打包清单为空，请检查行程信息');
      }
      console.log('✅ [Readiness] 打包清单生成成功:', packingList);
    } catch (err: any) {
      console.error('❌ [Readiness] 生成打包清单失败:', err);
      const errorMessage = err?.response?.data?.error?.message || err?.message || '未知错误';
      toast.error(`生成打包清单失败: ${errorMessage}`);
    } finally {
      setGeneratingPackingList(false);
    }
  };

  const handleFetchEvidence = async () => {
    if (!tripId) {
      toast.error('行程ID缺失，无法获取证据数据');
      return;
    }
    
    if (fetchingEvidence) return; // 防止重复点击
    
    try {
      setFetchingEvidence(true);
      console.log('🔄 [Readiness] 开始获取证据数据，tripId:', tripId);
      
      // 调用综合证据获取接口，获取所有类型的证据数据
      const result = await planningWorkbenchApi.fetchEvidence(tripId);
      
      console.log('✅ [Readiness] 证据数据获取完成:', result);
      
      // 显示结果摘要
      if (result.successCount > 0) {
        toast.success(`成功获取 ${result.successCount} 个地点的证据数据`);
      }
      if (result.partialCount > 0) {
        toast.warning(`${result.partialCount} 个地点部分证据获取成功`);
      }
      if (result.failedCount > 0) {
        toast.error(`${result.failedCount} 个地点证据获取失败`);
      }
      if (result.processedPlaces === 0) {
        toast.info('所有地点已有证据数据，无需更新');
      }
      
      // 刷新准备度数据
      await loadData();
    } catch (err: any) {
      console.error('❌ [Readiness] 获取证据数据失败:', err);
      const errorMessage = err?.response?.data?.error?.message || err?.message || '未知错误';
      toast.error(`获取证据数据失败: ${errorMessage}`);
    } finally {
      setFetchingEvidence(false);
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

  // 与准备度页面保持一致：直接使用 readinessResult.findings，按 finding 分组显示

  // 辅助函数：根据地点名称获取缺失的证据类型
  const getMissingEvidenceForPlace = (placeName: string): EvidenceType[] => {
    if (!coverageMapData?.pois) return [];
    // 尝试匹配 POI 名称（支持部分匹配）
    const poi = coverageMapData.pois.find(p => 
      placeName.includes(p.name) || p.name.includes(placeName)
    );
    return poi?.missingEvidence || [];
  };

  // 证据类型中文映射（扩展映射，包含所有可能的证据类型）
  const evidenceTypeLabels: Record<string, string> = {
    opening_hours: '开放时间',
    address: '地址信息',
    phone: '联系电话',
    website: '官方网站',
    rating: '评分信息',
    reviews: '评价信息',
    price: '价格信息',
    weather: '天气数据',
    road_closure: '道路封闭信息',
    booking_confirmation: '预订确认',
    permit: '许可证',
    other: '其他',
  };

  // 维度分类映射
  const categoryLabels: Record<string, string> = {
    evidence: '证据覆盖',
    schedule: '行程可行性',
    transport: '交通确定性',
    safety: '安全风险',
    buffer: '缓冲时间',
  };

  // 增强消息显示：如果消息包含地点名称且coverageMapData有数据，显示具体的缺失证据类型
  const enhanceMessage = (message: string, item: ReadinessFindingItem): string => {
    // 如果消息包含"缺少证据覆盖"，尝试从coverageMapData获取具体信息
    if (message.includes('缺少证据覆盖') && coverageMapData?.pois) {
      // 尝试从消息中提取地点名称（通常在"缺少证据覆盖"之前）
      const placeMatch = message.match(/(.+?)缺少证据覆盖/);
      if (placeMatch && placeMatch[1]) {
        const placeName = placeMatch[1].trim();
        const missingEvidence = getMissingEvidenceForPlace(placeName);
        if (missingEvidence.length > 0) {
          const evidenceLabels = missingEvidence.map(e => evidenceTypeLabels[e] || e).join('、');
          return `${placeName}缺少以下证据覆盖：${evidenceLabels}`;
        }
      }
    }
    return message;
  };
  
  // 与准备度页面保持一致：直接使用 readinessResult.risks（与页面的 rawReadinessResult.risks 对应）
  // 不需要排序，页面也不排序

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
          {/* 状态标签和分数 */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-3">
              {/* 分数显示 */}
              {scoreBreakdown?.score?.overall !== undefined && (
                <div className={cn(
                  'flex-shrink-0 w-16 h-16 rounded-full flex flex-col items-center justify-center border-4',
                  scoreBreakdown.score.overall < 60 
                    ? 'border-red-500 text-red-600'
                    : scoreBreakdown.score.overall < 80
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-green-500 text-green-600'
                )}>
                  <span className="text-xl font-bold">{scoreBreakdown.score.overall}</span>
                  <span className="text-xs text-gray-400">/100</span>
                </div>
              )}
              
              {/* 状态标签 */}
              <div className="flex-1">
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
            </div>
          </div>

          {/* 统计信息 */}
          {scoreBreakdown?.summary && (
            <div className="px-4 pb-3">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="text-xs">
                  <div className="font-semibold text-red-600">{scoreBreakdown.summary.blockers || 0}</div>
                  <div className="text-gray-500">{t('dashboard.readiness.page.drawer.stats.blockers', { count: 0 }).replace(/\d+/, '')}</div>
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-amber-600">{scoreBreakdown.summary.warnings || 0}</div>
                  <div className="text-gray-500">{t('dashboard.readiness.page.drawer.stats.must', { count: 0 }).replace(/\d+/, '')}</div>
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-blue-600">{(scoreBreakdown.summary.suggestions || 0)}</div>
                  <div className="text-gray-500">{t('dashboard.readiness.page.drawer.stats.suggestions', { count: 0 }).replace(/\d+/, '')}</div>
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-orange-600">{readinessResult?.risks?.length || 0}</div>
                  <div className="text-gray-500">{t('dashboard.readiness.page.drawer.stats.risks', { count: 0 }).replace(/\d+/, '')}</div>
                </div>
              </div>
            </div>
          )}

          {/* 证据状态摘要 */}
          {coverageMapData?.evidenceStatusSummary && (
            <div className="px-4 pb-3 border-t border-gray-100">
              <div className="text-xs text-gray-600 mb-2">证据状态</div>
              <div className="grid grid-cols-5 gap-1 text-center">
                <div className="text-xs">
                  <div className="font-semibold text-gray-700">{coverageMapData.evidenceStatusSummary.total}</div>
                  <div className="text-gray-400">总计</div>
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-green-600">{coverageMapData.evidenceStatusSummary.fetched}</div>
                  <div className="text-gray-400">已获取</div>
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-yellow-600">{coverageMapData.evidenceStatusSummary.fetching}</div>
                  <div className="text-gray-400">获取中</div>
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-gray-600">{coverageMapData.evidenceStatusSummary.missing}</div>
                  <div className="text-gray-400">缺失</div>
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-red-600">{coverageMapData.evidenceStatusSummary.failed}</div>
                  <div className="text-gray-400">失败</div>
                </div>
              </div>
            </div>
          )}

          {/* 数据新鲜度 */}
          {coverageMapData?.dataFreshness && (
            <div className="px-4 pb-2 border-t border-gray-100">
              <div className="text-xs text-gray-500 space-y-1">
                {coverageMapData.dataFreshness.weather && (
                  <div>天气: {new Date(coverageMapData.dataFreshness.weather).toLocaleString('zh-CN')}</div>
                )}
                {coverageMapData.dataFreshness.roadClosure && (
                  <div>路况: {new Date(coverageMapData.dataFreshness.roadClosure).toLocaleString('zh-CN')}</div>
                )}
                {coverageMapData.dataFreshness.openingHours && (
                  <div>开放时间: {new Date(coverageMapData.dataFreshness.openingHours).toLocaleString('zh-CN')}</div>
                )}
              </div>
            </div>
          )}

          {/* 快捷操作按钮 */}
          <div className="px-4 pb-4 space-y-2">
            <div className="flex items-center gap-2">
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
                onClick={handleFetchEvidence}
                disabled={fetchingEvidence}
                className="flex-1"
                title="获取天气、道路封闭、开放时间等证据数据"
              >
                {fetchingEvidence ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    获取中...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    获取证据
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeneratePackingList}
                disabled={generatingPackingList}
                className="flex-1"
              >
                {generatingPackingList ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    {t('dashboard.readiness.page.drawer.actions.generating')}
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    {t('dashboard.readiness.page.drawer.actions.generatePackingList')}
                  </>
                )}
              </Button>
            </div>
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
                {/* 按 finding 分组显示，与准备度页面保持一致 */}
                {(() => {
                  // 检查 readinessResult.findings 是否有数据
                  const hasFindingsData = readinessResult.findings && readinessResult.findings.length > 0 && 
                    readinessResult.findings.some(f => 
                      (f.blockers && f.blockers.length > 0) ||
                      (f.must && f.must.length > 0) ||
                      (f.should && f.should.length > 0) ||
                      (f.optional && f.optional.length > 0)
                    );
                  
                  // 按维度（category）分类显示，与准备度页面保持一致
                  // 收集所有findings并按category分组
                  const allItems: Array<{item: ReadinessFindingItem, category: string, level: 'blocker' | 'must' | 'should' | 'optional'}> = [];
                  
                  // 从 readinessResult.findings 收集
                  if (readinessResult.findings && readinessResult.findings.length > 0) {
                    readinessResult.findings.forEach(finding => {
                      finding.blockers?.forEach(item => allItems.push({item, category: item.category || 'other', level: 'blocker'}));
                      finding.must?.forEach(item => allItems.push({item, category: item.category || 'other', level: 'must'}));
                      finding.should?.forEach(item => allItems.push({item, category: item.category || 'other', level: 'should'}));
                      finding.optional?.forEach(item => allItems.push({item, category: item.category || 'other', level: 'optional'}));
                    });
                  }
                  
                  // 如果没有findings数据，但scoreBreakdown有数据，从scoreBreakdown构建
                  if (allItems.length === 0 && scoreBreakdown?.findings && scoreBreakdown.findings.length > 0) {
                    console.log('⚠️ [ReadinessDrawer] readinessResult.findings 为空，尝试使用 scoreBreakdown.findings');
                    scoreBreakdown.findings.forEach(f => {
                      const level = f.type === 'blocker' ? 'blocker' : f.type === 'warning' ? 'must' : 'should';
                      allItems.push({
                        item: {
                          message: enhanceMessage(f.message, {message: f.message, category: f.category} as ReadinessFindingItem),
                          id: f.id,
                          category: f.category,
                          severity: f.severity,
                          actionRequired: f.actionRequired,
                          // 保留关联信息
                          affectedDays: f.affectedDays,
                        } as ReadinessFindingItem & { affectedDays?: number[] },
                        category: f.category,
                        level,
                      });
                    });
                  }
                  
                  if (allItems.length === 0) {
                    return null;
                  }
                  
                  // 按category分组
                  const itemsByCategory: Record<string, {
                    blockers: ReadinessFindingItem[],
                    must: ReadinessFindingItem[],
                    should: ReadinessFindingItem[],
                    optional: ReadinessFindingItem[],
                  }> = {};
                  
                  allItems.forEach(({item, category, level}) => {
                    if (!itemsByCategory[category]) {
                      itemsByCategory[category] = { blockers: [], must: [], should: [], optional: [] };
                    }
                    // 增强消息显示
                    const enhancedItem = {
                      ...item,
                      message: enhanceMessage(item.message, item),
                    };
                    // 将 'blocker' 映射到 'blockers'
                    const targetLevel = level === 'blocker' ? 'blockers' : level;
                    if (targetLevel in itemsByCategory[category]) {
                      itemsByCategory[category][targetLevel as keyof typeof itemsByCategory[string]].push(enhancedItem);
                    }
                  });
                  
                  const tripStartDate = trip?.startDate;
                  
                  return (
                    <div className="space-y-4">
                      {Object.entries(itemsByCategory).map(([category, items]) => {
                        const hasItems = items.blockers.length > 0 || items.must.length > 0 || 
                                        items.should.length > 0 || items.optional.length > 0;
                        if (!hasItems) return null;
                        
                        return (
                          <div key={category} className="space-y-3">
                            <h4 className="text-xs font-medium text-muted-foreground uppercase">
                              {categoryLabels[category] || category}
                            </h4>
                            <div className="space-y-3">
                              {items.blockers.length > 0 && (
                                <ChecklistSection
                                  title={t('dashboard.readiness.page.blockers')}
                                  items={items.blockers}
                                  level="must"
                                  tripStartDate={tripStartDate}
                                  trip={trip}
                                />
                              )}
                              {items.must.length > 0 && (
                                <ChecklistSection
                                  title={t('dashboard.readiness.page.must')}
                                  items={items.must}
                                  level="must"
                                  tripStartDate={tripStartDate}
                                  trip={trip}
                                />
                              )}
                              {items.should.length > 0 && (
                                <ChecklistSection
                                  title={t('dashboard.readiness.page.should')}
                                  items={items.should}
                                  level="should"
                                  tripStartDate={tripStartDate}
                                  trip={trip}
                                />
                              )}
                              {items.optional.length > 0 && (
                                <ChecklistSection
                                  title={t('dashboard.readiness.page.optional')}
                                  items={items.optional}
                                  level="optional"
                                  tripStartDate={tripStartDate}
                                  trip={trip}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* 风险概览 - 与准备度页面保持一致，使用 RiskCard 组件 */}
                {readinessResult.risks && readinessResult.risks.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <h3 className="text-sm font-semibold">{t('dashboard.readiness.page.risks')}</h3>
                    <div className="space-y-3">
                      {readinessResult.risks.map((risk, index) => (
                        <RiskCard key={index} risk={risk} />
                      ))}
                    </div>
                  </div>
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
                <strong>{t('dashboard.readiness.page.drawer.debug.risks', { count: readinessResult?.risks?.length || 0 })}:</strong>
                <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                  {JSON.stringify((readinessResult?.risks || []).slice(0, 3), null, 2)}
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

