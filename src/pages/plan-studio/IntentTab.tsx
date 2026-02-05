import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { X, MapPin, Plus, ChevronDown, ChevronUp, Wallet } from 'lucide-react';
import { tripsApi } from '@/api/trips';
import { placesApi } from '@/api/places';
import type { PlaceWithDistance } from '@/types/places-routes';
import type { TripDetail, UpdateTripRequest } from '@/types/trip';
import { useDebounce } from '@/hooks/useDebounce';
// PersonaMode 已移除 - 三人格现在是系统内部工具
import { toast } from 'sonner';
import { orchestrator } from '@/services/orchestrator';
import { useAuth } from '@/hooks/useAuth';
import ApprovalDialog from '@/components/trips/ApprovalDialog';

interface IntentTabProps {
  tripId: string;
}

export default function IntentTab({ tripId }: IntentTabProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 审批相关状态
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  
  const handleApprovalComplete = async (approved: boolean) => {
    if (approved) {
      toast.success('审批已批准，系统正在继续执行...');
      await loadTrip();
    } else {
      toast.info('审批已拒绝，系统将调整策略');
    }
    setApprovalDialogOpen(false);
    setPendingApprovalId(null);
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  
  // Preference options with translation keys
  const preferenceOptions = [
    'nature', 'city', 'photography', 'food', 'history', 'art', 'shopping', 'nightlife'
  ];

  // 意图与约束状态
  const [rhythm, setRhythm] = useState<'relaxed' | 'standard' | 'tight'>('standard');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [dailyWalkLimit, setDailyWalkLimit] = useState<number>(10);
  const [earlyRiser, setEarlyRiser] = useState(false);
  const [nightOwl, setNightOwl] = useState(false);
  const [mustPlaces, setMustPlaces] = useState<string[]>([]); // 存储POI ID
  const [mustPlaceMap, setMustPlaceMap] = useState<Map<number, PlaceWithDistance>>(new Map()); // ID到Place的映射
  const [avoidPlaces, setAvoidPlaces] = useState<string[]>([]); // 存储POI ID
  const [avoidPlaceMap, setAvoidPlaceMap] = useState<Map<number, PlaceWithDistance>>(new Map()); // ID到Place的映射
  const [budget, setBudget] = useState<number | undefined>(undefined);
  const [budgetCurrency, setBudgetCurrency] = useState<string>('CNY');
  const [dailyBudget, setDailyBudget] = useState<number | undefined>(undefined);
  const [categoryLimits, setCategoryLimits] = useState<{
    accommodation?: number;
    transportation?: number;
    food?: number;
    activities?: number;
    other?: number;
  }>({});
  const [alertThreshold, setAlertThreshold] = useState<number>(0.8);
  const [budgetConstraint, setBudgetConstraint] = useState<import('@/api/planning-workbench').BudgetConstraint | null>(null);
  const [loadingBudgetConstraint, setLoadingBudgetConstraint] = useState(false);
  const [planningPolicy, setPlanningPolicy] = useState<'safe' | 'experience' | 'challenge'>('safe');

  // 地点搜索状态
  const [mustPlaceSearchOpen, setMustPlaceSearchOpen] = useState(false);
  const [mustPlaceSearchQuery, setMustPlaceSearchQuery] = useState('');
  const [mustPlaceSearchResults, setMustPlaceSearchResults] = useState<PlaceWithDistance[]>([]);
  const [mustPlaceSearchLoading, setMustPlaceSearchLoading] = useState(false);
  
  const [avoidPlaceSearchOpen, setAvoidPlaceSearchOpen] = useState(false);
  const [avoidPlaceSearchQuery, setAvoidPlaceSearchQuery] = useState('');
  const [avoidPlaceSearchResults, setAvoidPlaceSearchResults] = useState<PlaceWithDistance[]>([]);
  const [avoidPlaceSearchLoading, setAvoidPlaceSearchLoading] = useState(false);

  // 折叠/展开状态
  const [constraintsOpen, setConstraintsOpen] = useState(true);

  const debouncedMustPlaceSearch = useDebounce(mustPlaceSearchQuery, 300);
  const debouncedAvoidPlaceSearch = useDebounce(avoidPlaceSearchQuery, 300);

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  // 搜索必须点
  useEffect(() => {
    if (debouncedMustPlaceSearch.length >= 2 && mustPlaceSearchOpen) {
      searchMustPlaces(debouncedMustPlaceSearch);
    } else {
      setMustPlaceSearchResults([]);
    }
  }, [debouncedMustPlaceSearch, mustPlaceSearchOpen]);

  // 搜索不可点
  useEffect(() => {
    if (debouncedAvoidPlaceSearch.length >= 2 && avoidPlaceSearchOpen) {
      searchAvoidPlaces(debouncedAvoidPlaceSearch);
    } else {
      setAvoidPlaceSearchResults([]);
    }
  }, [debouncedAvoidPlaceSearch, avoidPlaceSearchOpen]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      const data = await tripsApi.getById(tripId);
      setTrip(data);
      
      // 优先从 intent 接口加载配置
      try {
        const intentData = await tripsApi.getIntent(tripId);
        
        // 从 pacingConfig 设置节奏
        if (intentData.pacingConfig) {
          const maxDailyActivities = intentData.pacingConfig.maxDailyActivities;
          if (maxDailyActivities) {
            if (maxDailyActivities <= 3) setRhythm('relaxed');
            else if (maxDailyActivities <= 5) setRhythm('standard');
            else setRhythm('tight');
          }
          if (intentData.pacingConfig.level && ['relaxed', 'standard', 'tight'].includes(intentData.pacingConfig.level)) {
            setRhythm(intentData.pacingConfig.level as 'relaxed' | 'standard' | 'tight');
          }
        }
        
        // 从 budgetConfig 或 totalBudget 加载预算
        if (intentData.budgetConfig) {
          setBudget(intentData.budgetConfig.totalBudget);
        } else if (data.totalBudget) {
          setBudget(data.totalBudget);
        }
        
        // 加载预算约束
        loadBudgetConstraint();
        
        // 从 metadata 加载其他配置
        if (intentData.metadata) {
          if (intentData.metadata.preferences) {
            setPreferences(intentData.metadata.preferences);
          }
          
          if (intentData.metadata.constraints) {
            const constraints = intentData.metadata.constraints;
            if (constraints.dailyWalkLimit) {
              setDailyWalkLimit(constraints.dailyWalkLimit);
            }
            if (constraints.earlyRiser !== undefined) {
              setEarlyRiser(constraints.earlyRiser);
            }
            if (constraints.nightOwl !== undefined) {
              setNightOwl(constraints.nightOwl);
            }
            if (constraints.mustPlaces) {
              setMustPlaces(constraints.mustPlaces.map(id => id.toString()));
              // TODO: 需要根据 placeId 加载 Place 对象到 mustPlaceMap
            }
            if (constraints.avoidPlaces) {
              setAvoidPlaces(constraints.avoidPlaces.map(id => id.toString()));
              // TODO: 需要根据 placeId 加载 Place 对象到 avoidPlaceMap
            }
          }
          
          if (intentData.metadata.planningPolicy) {
            setPlanningPolicy(intentData.metadata.planningPolicy as 'safe' | 'experience' | 'challenge');
          }
        }
      } catch (intentErr) {
        // 如果 intent 接口未实现，回退到从 trip 数据加载
        console.warn('Failed to load intent, falling back to trip data:', intentErr);
        
        if (data.pacingConfig) {
          const maxDailyActivities = data.pacingConfig.maxDailyActivities;
          if (maxDailyActivities) {
            if (maxDailyActivities <= 3) setRhythm('relaxed');
            else if (maxDailyActivities <= 5) setRhythm('standard');
            else setRhythm('tight');
          }
        }
        
        if (data.budgetConfig) {
          setBudget(data.budgetConfig.totalBudget);
        } else if (data.totalBudget) {
          setBudget(data.totalBudget);
        }
        
        // 加载预算约束
        loadBudgetConstraint();
      }
    } catch (err) {
      console.error('Failed to load trip:', err);
      toast.error(t('planStudio.intentTab.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const searchMustPlaces = async (query: string) => {
    try {
      setMustPlaceSearchLoading(true);
      const results = await placesApi.autocompletePlaces({
        q: query,
        limit: 10,
        countryCode: trip?.destination, // 根据行程的国家进行过滤
      });
      setMustPlaceSearchResults(results);
    } catch (err) {
      console.error('Failed to search places:', err);
      setMustPlaceSearchResults([]);
    } finally {
      setMustPlaceSearchLoading(false);
    }
  };

  const searchAvoidPlaces = async (query: string) => {
    try {
      setAvoidPlaceSearchLoading(true);
      const results = await placesApi.autocompletePlaces({
        q: query,
        limit: 10,
        countryCode: trip?.destination, // 根据行程的国家进行过滤
      });
      setAvoidPlaceSearchResults(results);
    } catch (err) {
      console.error('Failed to search places:', err);
      setAvoidPlaceSearchResults([]);
    } finally {
      setAvoidPlaceSearchLoading(false);
    }
  };

  const handleAddMustPlace = (place: PlaceWithDistance) => {
    const placeId = place.id.toString();
    if (!mustPlaces.includes(placeId)) {
      setMustPlaces([...mustPlaces, placeId]);
      setMustPlaceMap(new Map(mustPlaceMap).set(place.id, place));
    }
    setMustPlaceSearchQuery('');
    setMustPlaceSearchOpen(false);
  };

  const handleRemoveMustPlace = (placeId: string) => {
    setMustPlaces(mustPlaces.filter(id => id !== placeId));
    const id = parseInt(placeId);
    const newMap = new Map(mustPlaceMap);
    newMap.delete(id);
    setMustPlaceMap(newMap);
  };

  const handleAddAvoidPlace = (place: PlaceWithDistance) => {
    const placeId = place.id.toString();
    if (!avoidPlaces.includes(placeId)) {
      setAvoidPlaces([...avoidPlaces, placeId]);
      setAvoidPlaceMap(new Map(avoidPlaceMap).set(place.id, place));
    }
    setAvoidPlaceSearchQuery('');
    setAvoidPlaceSearchOpen(false);
  };

  const handleRemoveAvoidPlace = (placeId: string) => {
    setAvoidPlaces(avoidPlaces.filter(id => id !== placeId));
    const id = parseInt(placeId);
    const newMap = new Map(avoidPlaceMap);
    newMap.delete(id);
    setAvoidPlaceMap(newMap);
  };

  // 加载预算约束
  const loadBudgetConstraint = async () => {
    if (!tripId) return;
    try {
      setLoadingBudgetConstraint(true);
      const data = await tripsApi.getBudgetConstraint(tripId);
      const constraint = data.budgetConstraint;
      setBudgetConstraint(constraint);
      
      // 填充表单
      if (constraint.total) {
        setBudget(constraint.total);
      }
      if (constraint.currency) {
        setBudgetCurrency(constraint.currency);
      }
      if (constraint.dailyBudget) {
        setDailyBudget(constraint.dailyBudget);
      }
      if (constraint.categoryLimits) {
        setCategoryLimits(constraint.categoryLimits);
      }
      if (constraint.alertThreshold) {
        setAlertThreshold(constraint.alertThreshold);
      }
    } catch (err: any) {
      // 如果没有预算约束，不显示错误
      if (err.message && !err.message.includes('404')) {
        console.error('Failed to load budget constraint:', err);
      }
      setBudgetConstraint(null);
    } finally {
      setLoadingBudgetConstraint(false);
    }
  };

  const handleSave = async () => {
    if (!trip) {
      toast.error(t('planStudio.intentTab.noTripData'));
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      setSaving(true);
      
      // 设置超时提示（3秒后显示）
      timeoutId = setTimeout(() => {
        toast.info('保存操作可能需要较长时间，请稍候...', {
          duration: 5000,
        });
      }, 3000);

      // 更新预算约束（如果预算有变化或设置了详细约束）
      if (budget !== undefined && (budget !== trip.totalBudget || dailyBudget || Object.values(categoryLimits).some(v => v))) {
        try {
          const constraintData: import('@/api/planning-workbench').BudgetConstraint = {
            total: budget,
            currency: budgetCurrency,
            dailyBudget: dailyBudget,
            categoryLimits: Object.values(categoryLimits).some(v => v) ? categoryLimits : undefined,
            alertThreshold: alertThreshold,
          };
          await tripsApi.setBudgetConstraint(tripId, constraintData);
        } catch (budgetErr: any) {
          console.warn('Failed to update budget constraint:', budgetErr);
          // 如果预算约束接口失败，回退到旧的更新方式
          const updateData: UpdateTripRequest = {
            totalBudget: budget,
          };
          await tripsApi.update(tripId, updateData);
        }
      }
      
      // 更新意图与约束配置
      try {
        await tripsApi.updateIntent(tripId, {
          pacingConfig: {
            level: rhythm,
            maxDailyActivities: 
              rhythm === 'relaxed' ? 3 :
              rhythm === 'standard' ? 5 : 7,
          },
        preferences,
          constraints: {
        dailyWalkLimit,
        earlyRiser,
        nightOwl,
            mustPlaces: mustPlaces.map(id => parseInt(id)).filter(id => !isNaN(id)),
            avoidPlaces: avoidPlaces.map(id => parseInt(id)).filter(id => !isNaN(id)),
          },
        planningPolicy,
          totalBudget: budget,
      });
      } catch (intentErr: any) {
        // 如果 intent 接口未实现，只更新 totalBudget
        console.warn('Failed to update intent, only budget updated:', intentErr);
        if (budget === undefined) {
          // 如果没有预算更新，抛出错误
          throw intentErr;
        } else {
          // 如果有预算更新，显示警告但继续
          toast.warning('部分保存成功：预算已更新，但意图配置更新失败');
        }
      }
      
      // 只有在没有错误或只有部分错误时才显示成功提示
      toast.success(t('planStudio.intentTab.saveSuccess') || '保存成功');
      
      // 自动触发 LangGraph Orchestrator，系统会自动调用三人格进行检查和调整
      if (user) {
        try {
          const result = await orchestrator.modifySchedule(user.id, tripId, [
            {
              type: 'UPDATE_INTENT',
              changes: {
                rhythm,
                preferences,
                dailyWalkLimit,
                earlyRiser,
                nightOwl,
                mustPlaces: mustPlaces.map(id => parseInt(id)).filter(id => !isNaN(id)),
                avoidPlaces: avoidPlaces.map(id => parseInt(id)).filter(id => !isNaN(id)),
                planningPolicy,
                budget,
              },
            },
          ]);
          
          // 检查是否需要审批
          if (result.needsApproval && result.data?.approvalId) {
            const approvalId = result.data.approvalId;
            setPendingApprovalId(approvalId);
            setApprovalDialogOpen(true);
            toast.info('需要您的审批才能继续执行操作');
            return; // 等待审批，不继续执行后续逻辑
          }
          
          if (result.success && result.data) {
            if (result.data.personaAlerts && result.data.personaAlerts.length > 0) {
              toast.info(`系统已自动检查，发现 ${result.data.personaAlerts.length} 条提醒`);
            }
            if (result.data.autoAdjustments && result.data.autoAdjustments.length > 0) {
              toast.success(`系统已自动调整 ${result.data.autoAdjustments.length} 项`);
            }
            if (result.data.explanation) {
              toast.info(result.data.explanation);
            }
          }
        } catch (orchestratorError: any) {
          console.warn('Orchestrator execution failed:', orchestratorError);
          // 显示警告，但不影响保存流程
          toast.warning('保存成功，但系统自动检查失败，请稍后手动检查');
        }
      }
      
      // 重新加载数据
      await loadTrip();
      
      // 清除超时提示
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // 保存成功后，提示用户可以继续下一步
      toast.success('保存成功！您可以继续到"时间轴"标签页添加行程');
    } catch (err: any) {
      // 清除超时提示
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      console.error('Failed to save intent:', err);
      const errorMessage = err.message || t('planStudio.intentTab.saveFailed') || '保存失败，请稍后重试';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card data-tour="hard-constraints">
        <Collapsible open={constraintsOpen} onOpenChange={setConstraintsOpen}>
          <CardHeader className="pb-3 border-b">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity">
                <div className="flex-1">
                  <CardTitle className="text-xl font-semibold">{t('planStudio.intentTab.constraintsTitle')}</CardTitle>
                  <CardDescription className="mt-1">{t('planStudio.intentTab.constraintsDescription')}</CardDescription>
                </div>
                {constraintsOpen ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground ml-4" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground ml-4" />
                )}
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('planStudio.intentTab.dailyWalkLimit')}</Label>
              <Input
                type="number"
                value={dailyWalkLimit}
                onChange={(e) => setDailyWalkLimit(Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('planStudio.intentTab.budget')}</Label>
              <Input
                type="number"
                value={budget || ''}
                onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : undefined)}
                min={0}
                placeholder={t('planStudio.intentTab.noLimit')}
              />
            </div>
          </div>

          {/* 预算约束详细设置 */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">预算约束详细设置</Label>
              {budgetConstraint && (
                <Badge variant="outline" className="text-xs">
                  已设置
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>货币单位</Label>
                <Select value={budgetCurrency} disabled>
                  <SelectTrigger className="bg-muted cursor-not-allowed">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CNY">CNY (人民币)</SelectItem>
                    <SelectItem value="USD">USD (美元)</SelectItem>
                    <SelectItem value="EUR">EUR (欧元)</SelectItem>
                    <SelectItem value="JPY">JPY (日元)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">货币单位在行程创建时确定，不可修改</p>
              </div>
              <div className="space-y-2">
                <Label>日均预算（可选）</Label>
                <Input
                  type="number"
                  value={dailyBudget || ''}
                  onChange={(e) => setDailyBudget(e.target.value ? Number(e.target.value) : undefined)}
                  min={0}
                  placeholder="自动计算"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>分类预算限制（可选）</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">住宿</Label>
                  <Input
                    type="number"
                    value={categoryLimits.accommodation || ''}
                    onChange={(e) => setCategoryLimits({
                      ...categoryLimits,
                      accommodation: e.target.value ? Number(e.target.value) : undefined,
                    })}
                    min={0}
                    placeholder="不限"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">交通</Label>
                  <Input
                    type="number"
                    value={categoryLimits.transportation || ''}
                    onChange={(e) => setCategoryLimits({
                      ...categoryLimits,
                      transportation: e.target.value ? Number(e.target.value) : undefined,
                    })}
                    min={0}
                    placeholder="不限"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">餐饮</Label>
                  <Input
                    type="number"
                    value={categoryLimits.food || ''}
                    onChange={(e) => setCategoryLimits({
                      ...categoryLimits,
                      food: e.target.value ? Number(e.target.value) : undefined,
                    })}
                    min={0}
                    placeholder="不限"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">活动</Label>
                  <Input
                    type="number"
                    value={categoryLimits.activities || ''}
                    onChange={(e) => setCategoryLimits({
                      ...categoryLimits,
                      activities: e.target.value ? Number(e.target.value) : undefined,
                    })}
                    min={0}
                    placeholder="不限"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">其他</Label>
                  <Input
                    type="number"
                    value={categoryLimits.other || ''}
                    onChange={(e) => setCategoryLimits({
                      ...categoryLimits,
                      other: e.target.value ? Number(e.target.value) : undefined,
                    })}
                    min={0}
                    placeholder="不限"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>预警阈值</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(Number(e.target.value))}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  ({Math.round(alertThreshold * 100)}% 时预警)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="earlyRiser"
                checked={earlyRiser}
                onCheckedChange={(checked) => setEarlyRiser(checked === true)}
              />
              <Label htmlFor="earlyRiser">{t('planStudio.intentTab.earlyRiser')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="nightOwl"
                checked={nightOwl}
                onCheckedChange={(checked) => setNightOwl(checked === true)}
              />
              <Label htmlFor="nightOwl">{t('planStudio.intentTab.nightOwl')}</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('planStudio.intentTab.mustPlaces')}</Label>
            <div className="space-y-2">
              {/* 已选择的地点列表 */}
              {mustPlaces.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mustPlaces.map((placeId) => {
                    const place = mustPlaceMap.get(parseInt(placeId));
                    return (
                      <Badge key={placeId} variant="secondary" className="px-2 py-1">
                        {place?.nameCN || place?.nameEN || `POI ${placeId}`}
                        <button
                          type="button"
                          onClick={() => handleRemoveMustPlace(placeId)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              
              {/* 搜索输入框 */}
              <Popover open={mustPlaceSearchOpen} onOpenChange={setMustPlaceSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    搜索并添加地点...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[400px]" align="start">
                  <Command>
                    <CommandInput
                      placeholder={t('planStudio.intentTab.searchPlaceName')}
                      value={mustPlaceSearchQuery}
                      onValueChange={setMustPlaceSearchQuery}
                    />
                    <CommandList>
                      {mustPlaceSearchLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Spinner className="w-4 h-4" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>{t('planStudio.intentTab.noPlaceFound')}</CommandEmpty>
                          <CommandGroup>
                            {mustPlaceSearchResults.map((place) => (
                              <CommandItem
                                key={place.id}
                                value={`${place.nameCN} ${place.nameEN} ${place.id}`}
                                onSelect={() => handleAddMustPlace(place)}
                                disabled={mustPlaces.includes(place.id.toString())}
                              >
                                <MapPin className="w-4 h-4 mr-2" />
                                <div className="flex-1">
                                  <div className="font-medium">{place.nameCN || place.nameEN}</div>
                                  {place.nameEN && place.nameCN && (
                                    <div className="text-xs text-muted-foreground">{place.nameEN}</div>
                                  )}
                                </div>
                                {mustPlaces.includes(place.id.toString()) && (
                                  <Badge variant="outline" className="text-xs">{t('planStudio.intentTab.alreadyAdded')}</Badge>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('planStudio.intentTab.avoidPlaces')}</Label>
            <div className="space-y-2">
              {/* 已选择的地点列表 */}
              {avoidPlaces.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {avoidPlaces.map((placeId) => {
                    const place = avoidPlaceMap.get(parseInt(placeId));
                    return (
                      <Badge key={placeId} variant="secondary" className="px-2 py-1">
                        {place?.nameCN || place?.nameEN || `POI ${placeId}`}
                        <button
                          type="button"
                          onClick={() => handleRemoveAvoidPlace(placeId)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              
              {/* 搜索输入框 */}
              <Popover open={avoidPlaceSearchOpen} onOpenChange={setAvoidPlaceSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('planStudio.intentTab.searchAndAddPlace')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[400px]" align="start">
                  <Command>
                    <CommandInput
                      placeholder={t('planStudio.intentTab.searchPlaceName')}
                      value={avoidPlaceSearchQuery}
                      onValueChange={setAvoidPlaceSearchQuery}
                    />
                    <CommandList>
                      {avoidPlaceSearchLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Spinner className="w-4 h-4" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>{t('planStudio.intentTab.noPlaceFound')}</CommandEmpty>
                          <CommandGroup>
                            {avoidPlaceSearchResults.map((place) => (
                              <CommandItem
                                key={place.id}
                                value={`${place.nameCN} ${place.nameEN} ${place.id}`}
                                onSelect={() => handleAddAvoidPlace(place)}
                                disabled={avoidPlaces.includes(place.id.toString())}
                              >
                                <MapPin className="w-4 h-4 mr-2" />
                                <div className="flex-1">
                                  <div className="font-medium">{place.nameCN || place.nameEN}</div>
                                  {place.nameEN && place.nameCN && (
                                    <div className="text-xs text-muted-foreground">{place.nameEN}</div>
                                  )}
                                </div>
                                {avoidPlaces.includes(place.id.toString()) && (
                                  <Badge variant="outline" className="text-xs">{t('planStudio.intentTab.alreadyAdded')}</Badge>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xl font-semibold">{t('planStudio.intentTab.planningStrategyTitle')}</CardTitle>
          <CardDescription>{t('planStudio.intentTab.planningStrategyDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={planningPolicy} onValueChange={(v) => setPlanningPolicy(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="safe">{t('planStudio.intentTab.strategy.safe')}</SelectItem>
              <SelectItem value="experience">{t('planStudio.intentTab.strategy.experience')}</SelectItem>
              <SelectItem value="challenge">{t('planStudio.intentTab.strategy.challenge')}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex justify-end items-center pt-4 border-t gap-3">
        <Button 
          variant="outline" 
          onClick={() => window.history.back()}
          className="px-6"
        >
          {t('planStudio.intentTab.cancel')}
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="px-6 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saving ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              保存中...
            </>
          ) : (
            t('planStudio.intentTab.saveAndContinue')
          )}
        </Button>
      </div>
      
      {/* 审批对话框 */}
      {pendingApprovalId && (
        <ApprovalDialog
          approvalId={pendingApprovalId}
          open={approvalDialogOpen}
          onOpenChange={(open: boolean) => {
            setApprovalDialogOpen(open);
            if (!open) {
              setPendingApprovalId(null);
            }
          }}
          onDecision={handleApprovalComplete}
        />
      )}
    </div>
  );
}

