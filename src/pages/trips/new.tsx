import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import { countriesApi } from '@/api/countries';
import { citiesApi } from '@/api/cities';
import { placesApi } from '@/api/places';
import { agentApi } from '@/api/agent';
import type { RouteAndRunResponse, UIStatus, OrchestrationStep, DecisionLogEntry, GateResult, SuspensionInfo } from '@/api/agent';
import { useAuth } from '@/hooks/useAuth';
import type { CreateTripRequest, Traveler, TripDetail, TripPace, TripPreference } from '@/types/trip';
import type { Country, CurrencyStrategy } from '@/types/country';
import type { City } from '@/api/cities';
import type { PlaceWithDistance } from '@/types/places-routes';
import { useDebounce } from '@/hooks/useDebounce';
import TripPlanningWaitDialog from '@/components/trips/TripPlanningWaitDialog';
import { ClarificationQuestionsPanel } from '@/components/trips/ClarificationQuestionsPanel';
import { StatusIndicator } from '@/components/trips/StatusIndicator';
import ApprovalDialog from '@/components/trips/ApprovalDialog';
import ConsentDialog from '@/components/trips/ConsentDialog';
import { mockClarificationQuestions } from '@/mocks/clarification-questions';
import type { ClarificationAnswer, ClarificationQuestion } from '@/types/clarification';
import { formatClarificationAnswers, parseClarificationMessage } from '@/utils/clarification';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Plus, X, Globe, CreditCard, ExternalLink, TrendingUp, CheckCircle2, ArrowRight, AlertCircle, Check, ChevronsUpDown, History, Shield, Activity, RefreshCw, Calendar, MapPin, Clock, ChevronDown, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CASH_HEAVY: '现金为主',
  BALANCED: '混合支付',
  DIGITAL: '数字化支付',
};

export default function NewTripPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'nl'>('form');

  // DEV-only: enable structured clarification preview with:
  // /dashboard/trips/new?mockClarification=1
  const showStructuredClarificationMock =
    import.meta.env.DEV && new URLSearchParams(location.search).get('mockClarification') === '1';

  // 国家列表
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [selectedCountryInfo, setSelectedCountryInfo] = useState<CurrencyStrategy | null>(null);
  const [countryInfoLoading, setCountryInfoLoading] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  // 国家搜索和分页相关状态
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [countriesHasMore, setCountriesHasMore] = useState(false);
  const [countriesTotal, setCountriesTotal] = useState(0);
  const [countriesOffset, setCountriesOffset] = useState(0);

  // 表单模式
  const [formData, setFormData] = useState<CreateTripRequest>({
    destination: '',
    startDate: '',
    endDate: '',
    totalBudget: 0,
    travelers: [{ type: 'ADULT', mobilityTag: 'CITY_POTATO' }],
    pace: 'standard',  // 默认标准节奏
    preferences: [],   // 兴趣偏好
  });
  
  // 多选目的地（城市/国家）
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  // 新增城市输入框
  // const [newCityInput, setNewCityInput] = useState(''); // 未使用
  
  // 城市选择相关状态
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [selectedCities, setSelectedCities] = useState<City[]>([]);
  const [citySelectOpen, setCitySelectOpen] = useState(false);
  // 分页相关状态
  const [citiesHasMore, setCitiesHasMore] = useState(false);
  const [citiesTotal, setCitiesTotal] = useState(0);
  const [citiesOffset, setCitiesOffset] = useState(0);

  // ========== 更多设置：必须点/不去点 ==========
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  
  // 必须点状态
  const [mustPlaces, setMustPlaces] = useState<number[]>([]);
  const [mustPlaceMap, setMustPlaceMap] = useState<Map<number, PlaceWithDistance>>(new Map());
  const [mustPlaceSearchOpen, setMustPlaceSearchOpen] = useState(false);
  const [mustPlaceSearchQuery, setMustPlaceSearchQuery] = useState('');
  const [mustPlaceSearchResults, setMustPlaceSearchResults] = useState<PlaceWithDistance[]>([]);
  const [mustPlaceSearchLoading, setMustPlaceSearchLoading] = useState(false);
  
  // 不去点状态
  const [avoidPlaces, setAvoidPlaces] = useState<number[]>([]);
  const [avoidPlaceMap, setAvoidPlaceMap] = useState<Map<number, PlaceWithDistance>>(new Map());
  const [avoidPlaceSearchOpen, setAvoidPlaceSearchOpen] = useState(false);
  const [avoidPlaceSearchQuery, setAvoidPlaceSearchQuery] = useState('');
  const [avoidPlaceSearchResults, setAvoidPlaceSearchResults] = useState<PlaceWithDistance[]>([]);
  const [avoidPlaceSearchLoading, setAvoidPlaceSearchLoading] = useState(false);
  
  // 防抖搜索
  const debouncedMustPlaceSearch = useDebounce(mustPlaceSearchQuery, 300);
  const debouncedAvoidPlaceSearch = useDebounce(avoidPlaceSearchQuery, 300);

  // 加载国家列表（初始加载）
  useEffect(() => {
    loadCountries(0, false);
  }, []);

  // 处理国家搜索输入变化（使用防抖，触发API搜索所有数据）
  useEffect(() => {
    // 只有在 Popover 打开时才进行搜索，避免不必要的API调用
    if (!destinationOpen) {
      return;
    }

    const debounceTimer = setTimeout(() => {
      if (countrySearchQuery.trim()) {
        console.log('[NewTripPage] 国家搜索输入变化，准备搜索:', countrySearchQuery);
        loadCountries(0, false, countrySearchQuery.trim());
      } else {
        // 如果清空搜索，重新加载所有国家
        console.log('[NewTripPage] 搜索框清空，重新加载所有国家');
        loadCountries(0, false);
      }
    }, 150); // 缩短防抖时间从300ms到150ms，提高响应速度
    
    return () => clearTimeout(debounceTimer);
    // 注意：不包含 loadCountries 在依赖项中，避免无限循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countrySearchQuery, destinationOpen]);

  // ========== 搜索必须点 ==========
  useEffect(() => {
    if (debouncedMustPlaceSearch.length >= 2 && mustPlaceSearchOpen && selectedCountry) {
      searchMustPlaces(debouncedMustPlaceSearch);
    } else {
      setMustPlaceSearchResults([]);
    }
  }, [debouncedMustPlaceSearch, mustPlaceSearchOpen, selectedCountry]);

  // ========== 搜索不去点 ==========
  useEffect(() => {
    if (debouncedAvoidPlaceSearch.length >= 2 && avoidPlaceSearchOpen && selectedCountry) {
      searchAvoidPlaces(debouncedAvoidPlaceSearch);
    } else {
      setAvoidPlaceSearchResults([]);
    }
  }, [debouncedAvoidPlaceSearch, avoidPlaceSearchOpen, selectedCountry]);

  // 搜索必须点
  const searchMustPlaces = async (query: string) => {
    try {
      setMustPlaceSearchLoading(true);
      const results = await placesApi.autocompletePlaces({
        q: query,
        limit: 10,
        countryCode: selectedCountry,
      });
      setMustPlaceSearchResults(results);
    } catch (err) {
      console.error('Failed to search must places:', err);
      setMustPlaceSearchResults([]);
    } finally {
      setMustPlaceSearchLoading(false);
    }
  };

  // 搜索不去点
  const searchAvoidPlaces = async (query: string) => {
    try {
      setAvoidPlaceSearchLoading(true);
      const results = await placesApi.autocompletePlaces({
        q: query,
        limit: 10,
        countryCode: selectedCountry,
      });
      setAvoidPlaceSearchResults(results);
    } catch (err) {
      console.error('Failed to search avoid places:', err);
      setAvoidPlaceSearchResults([]);
    } finally {
      setAvoidPlaceSearchLoading(false);
    }
  };

  // 添加必须点
  const handleAddMustPlace = (place: PlaceWithDistance) => {
    if (!mustPlaces.includes(place.id)) {
      setMustPlaces([...mustPlaces, place.id]);
      setMustPlaceMap(new Map(mustPlaceMap).set(place.id, place));
    }
    setMustPlaceSearchQuery('');
    setMustPlaceSearchOpen(false);
  };

  // 移除必须点
  const handleRemoveMustPlace = (placeId: number) => {
    setMustPlaces(mustPlaces.filter(id => id !== placeId));
    const newMap = new Map(mustPlaceMap);
    newMap.delete(placeId);
    setMustPlaceMap(newMap);
  };

  // 添加不去点
  const handleAddAvoidPlace = (place: PlaceWithDistance) => {
    if (!avoidPlaces.includes(place.id)) {
      setAvoidPlaces([...avoidPlaces, place.id]);
      setAvoidPlaceMap(new Map(avoidPlaceMap).set(place.id, place));
    }
    setAvoidPlaceSearchQuery('');
    setAvoidPlaceSearchOpen(false);
  };

  // 移除不去点
  const handleRemoveAvoidPlace = (placeId: number) => {
    setAvoidPlaces(avoidPlaces.filter(id => id !== placeId));
    const newMap = new Map(avoidPlaceMap);
    newMap.delete(placeId);
    setAvoidPlaceMap(newMap);
  };
  
  // 当选择国家时，加载该国家的城市列表
  useEffect(() => {
    // ✅ 国家切换时，先清空已选城市和相关的目的地（避免显示上一个国家的城市）
    setSelectedCities([]);
    // 清空与新国家选择方式相关的目的地标识
    if (selectedCountry) {
      // 只清空通过城市选择添加的目的地（格式：countryCode-cityId）
      setSelectedDestinations(prev => prev.filter(dest => {
        // 保留不是城市标识格式的目的地（旧方式）
        return !dest.includes('-');
      }));
    } else {
      // 如果国家被清空，清空所有相关数据
      setCities([]);
      setSelectedDestinations([]);
    }
    
    if (selectedCountry) {
      console.log('[NewTripPage] 国家已选择，加载城市列表:', selectedCountry);
      loadCitiesByCountry(selectedCountry);
    }
  }, [selectedCountry]);

  // 当选择国家时，立即加载国家信息
  useEffect(() => {
    if (selectedCountry) {
      console.log('[NewTripPage] 国家已选择，加载国家信息:', selectedCountry);
      loadCountryInfo(selectedCountry);
    }
  }, [selectedCountry]);

  // 当选择目的地时，加载国家信息（使用第一个目的地，兼容旧的方式）
  useEffect(() => {
    // 如果已经通过新方式选择了国家，使用它
    if (selectedCountry) {
      loadCountryInfo(selectedCountry);
      return;
    }
    
    // 从 selectedDestinations 或 formData.destination 中提取国家代码
    const primaryDestination = selectedDestinations.length > 0 ? selectedDestinations[0] : formData.destination;
    if (primaryDestination) {
      // ✅ 如果是城市标识符格式（如 "IS-7338"），提取国家代码
      const countryCode = primaryDestination.includes('-') 
        ? primaryDestination.split('-')[0] 
        : primaryDestination;
      
      // 验证国家代码格式
      if (/^[A-Z]{2}$/.test(countryCode)) {
        loadCountryInfo(countryCode);
      } else {
        setSelectedCountryInfo(null);
      }
    } else {
      setSelectedCountryInfo(null);
    }
  }, [formData.destination, selectedDestinations, selectedCountry]);

  // 加载国家列表（支持搜索和分页）
  const loadCountries = async (offset = 0, append = false, searchQuery?: string) => {
    // ✅ 如果不是追加模式，重置分页信息（但保留现有数据，避免UI闪烁和Popover关闭）
    if (!append) {
      setCountriesOffset(0);
    }
    setCountriesLoading(true);
    
    try {
      const limit = 100; // 使用较大的limit，减少请求次数
      console.log('[NewTripPage] 调用 countriesApi.getAll，offset:', offset, 'limit:', limit, 'searchQuery:', searchQuery);
      const response = await countriesApi.getAll({
        limit,
        offset,
        ...(searchQuery && { q: searchQuery }),
      });
      console.log('[NewTripPage] 国家列表加载成功:', {
        count: response.countries?.length || 0,
        total: response.total,
        hasMore: response.hasMore,
        offset: response.offset,
        searchQuery: searchQuery,
        // 如果搜索了但没结果，显示详细信息用于调试
        ...(searchQuery && response.countries?.length === 0 && {
          warning: '搜索无结果，请检查后端搜索逻辑是否支持该搜索词',
        }),
      });
      
      if (response.countries && response.countries.length > 0) {
        // ✅ 创建新数组，确保触发重新渲染
        if (append) {
          // 追加模式：合并到现有列表
          setCountries(prev => [...prev, ...response.countries]);
        } else {
          // 替换模式：立即替换整个列表（使用新数组确保React重新渲染）
          // 这样即使有旧数据，也会立即显示新数据
          setCountries([...response.countries]);
        }
        // 更新分页信息
        setCountriesHasMore(response.hasMore ?? false);
        setCountriesTotal(response.total || 0);
        setCountriesOffset(response.offset ?? offset);
      } else {
        // ✅ 即使没有数据，也不清空数组（避免Popover关闭）
        // 只有在非追加模式且确实没有数据时才清空，但要确保Popover保持打开
        if (!append) {
          // 如果Popover是打开的，不清空数据，只显示空状态（避免Popover关闭）
          // 如果Popover是关闭的，可以清空数据
          if (!destinationOpen) {
            setCountries([]);
          }
          // 如果Popover是打开的，保留现有数据，让UI显示"未找到匹配的国家"
        }
        setCountriesHasMore(false);
        setCountriesTotal(0);
      }
    } catch (err: any) {
      console.error('[NewTripPage] 加载国家列表失败:', err);
      if (!append) {
        // 错误时，如果Popover是打开的，不清空数据（避免Popover关闭）
        if (!destinationOpen) {
          setCountries([]);
        }
      }
      setCountriesHasMore(false);
      setCountriesTotal(0);
      // 失败不影响使用，可以继续手动输入
    } finally {
      setCountriesLoading(false);
    }
  };

  const loadCountryInfo = async (countryCode: string) => {
    if (!countryCode) {
      console.warn('[NewTripPage] loadCountryInfo: 国家代码为空');
      setSelectedCountryInfo(null);
      return;
    }
    
    try {
      setCountryInfoLoading(true);
      console.log('[NewTripPage] 调用 countriesApi.getCurrencyStrategy，国家代码:', countryCode);
      const data = await countriesApi.getCurrencyStrategy(countryCode);
      console.log('[NewTripPage] 国家信息加载成功:', data.countryName);
      setSelectedCountryInfo(data);
    } catch (err: any) {
      console.error('[NewTripPage] 加载国家信息失败:', err);
      setSelectedCountryInfo(null);
    } finally {
      setCountryInfoLoading(false);
    }
  };
  
  // 通过城市API获取城市列表
  // 动态调用 /api/cities?countryCode={国家代码}&limit=100
  const loadCitiesByCountry = async (countryCode: string, offset = 0, append = false) => {
    if (!countryCode) {
      console.warn('[NewTripPage] loadCitiesByCountry: 国家代码为空');
      return;
    }
    
    // ✅ 如果不是追加模式，先清除旧数据，避免显示缓存
    if (!append) {
      setCities([]);
      setCitiesOffset(0);
    }
    setCitiesLoading(true);
    
    try {
      const limit = 100; // 使用较大的limit，减少请求次数
      console.log('[NewTripPage] 调用 citiesApi.getByCountry，国家代码:', countryCode, 'offset:', offset, 'limit:', limit);
      // 调用 API: GET /api/cities?countryCode={countryCode}&limit=100&offset={offset}
      const response = await citiesApi.getByCountry(countryCode, limit, offset);
      console.log('[NewTripPage] 城市列表加载成功:', {
        count: response.cities?.length || 0,
        total: response.total,
        hasMore: response.hasMore,
        offset: response.offset,
      });
      
      if (response.cities && response.cities.length > 0) {
        // ✅ 创建新数组，确保触发重新渲染
        if (append) {
          // 追加模式：合并到现有列表
          setCities(prev => [...prev, ...response.cities]);
        } else {
          // 替换模式：替换整个列表
          setCities([...response.cities]);
        }
        // 更新分页信息
        setCitiesHasMore(response.hasMore ?? false);
        setCitiesTotal(response.total || 0);
        setCitiesOffset(response.offset ?? offset);
      } else {
        if (!append) {
          setCities([]);
        }
        setCitiesHasMore(false);
        setCitiesTotal(0);
      }
    } catch (err: any) {
      console.error('[NewTripPage] 加载城市列表失败:', err);
      if (!append) {
        setCities([]);
      }
      setCitiesHasMore(false);
      setCitiesTotal(0);
    } finally {
      setCitiesLoading(false);
    }
  };
  
  // 搜索城市（使用城市API）
  const searchCities = async (query: string, countryCode: string, offset = 0, append = false) => {
    if (!query.trim() || !countryCode) {
      console.warn('[NewTripPage] searchCities: 查询或国家代码为空', { query, countryCode });
      return;
    }
    
    // ✅ 如果不是追加模式，先清除旧数据，避免显示缓存
    if (!append) {
      setCities([]);
      setCitiesOffset(0);
    }
    setCitiesLoading(true);
    
    try {
      const limit = 50; // 搜索时使用较小的limit
      console.log('[NewTripPage] 调用 citiesApi.search，查询:', query, '国家代码:', countryCode, 'offset:', offset);
      const response = await citiesApi.search(query, countryCode, limit);
      console.log('[NewTripPage] 城市搜索成功:', {
        count: response.cities?.length || 0,
        total: response.total,
        hasMore: response.hasMore,
      });
      
      if (response.cities && response.cities.length > 0) {
        // ✅ 创建新数组，确保触发重新渲染
        if (append) {
          // 追加模式：合并到现有列表
          setCities(prev => [...prev, ...response.cities]);
        } else {
          // 替换模式：替换整个列表
          setCities([...response.cities]);
        }
        // 更新分页信息
        setCitiesHasMore(response.hasMore ?? false);
        setCitiesTotal(response.total || 0);
        setCitiesOffset(response.offset ?? offset);
      } else {
        if (!append) {
          setCities([]);
        }
        setCitiesHasMore(false);
        setCitiesTotal(0);
      }
    } catch (err: any) {
      console.error('[NewTripPage] 搜索城市失败:', err);
      if (!append) {
        setCities([]);
      }
      setCitiesHasMore(false);
      setCitiesTotal(0);
    } finally {
      setCitiesLoading(false);
    }
  };
  
  // 处理城市搜索输入变化
  useEffect(() => {
    if (!selectedCountry) {
      console.warn('[NewTripPage] 城市搜索 useEffect: 未选择国家，跳过');
      return;
    }
    
    if (citySearchQuery.trim()) {
      console.log('[NewTripPage] 城市搜索输入变化，准备搜索:', citySearchQuery, '国家代码:', selectedCountry);
      const debounceTimer = setTimeout(() => {
        searchCities(citySearchQuery, selectedCountry);
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      // 如果清空搜索，重新加载所有城市
      console.log('[NewTripPage] 搜索框清空，重新加载所有城市，国家代码:', selectedCountry);
      loadCitiesByCountry(selectedCountry);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citySearchQuery, selectedCountry]);
  
  // 选择城市
  const handleCitySelect = (city: City) => {
    if (!selectedCities.find(c => c.id === city.id)) {
      setSelectedCities([...selectedCities, city]);
      // 将城市标识符添加到selectedDestinations（用于UI显示，格式：countryCode-cityId）
      const cityIdentifier = `${city.countryCode}-${city.id}`;
      if (!selectedDestinations.includes(cityIdentifier)) {
        setSelectedDestinations([...selectedDestinations, cityIdentifier]);
      }
      // ✅ 确保 formData.destination 始终是纯国家代码（不是城市标识符）
      if (!formData.destination || formData.destination !== city.countryCode) {
        setFormData({ ...formData, destination: city.countryCode });
      }
      // ✅ 如果还没有选择国家，也更新 selectedCountry
      if (!selectedCountry || selectedCountry !== city.countryCode) {
        setSelectedCountry(city.countryCode);
      }
    }
  };
  
  // 移除城市
  const handleRemoveCity = (city: City) => {
    setSelectedCities(selectedCities.filter(c => c.id !== city.id));
    const cityIdentifier = `${city.countryCode}-${city.id}`;
    setSelectedDestinations(selectedDestinations.filter(d => d !== cityIdentifier));
    
    // ✅ 更新formData.destination（确保始终是纯国家代码）
    const remaining = selectedCities.filter(c => c.id !== city.id);
    if (remaining.length > 0) {
      // 还有城市，使用第一个城市的国家代码
      setFormData({ ...formData, destination: remaining[0].countryCode });
    } else {
      // 没有城市了，检查是否还有其他目的地
      const remainingDests = selectedDestinations.filter(d => d !== cityIdentifier);
      if (remainingDests.length > 0) {
        // 从剩余目的地中提取国家代码（可能是城市标识符或纯国家代码）
        const firstDest = remainingDests[0];
        const countryCode = firstDest.includes('-') ? firstDest.split('-')[0] : firstDest;
        if (/^[A-Z]{2}$/.test(countryCode)) {
          setFormData({ ...formData, destination: countryCode });
        } else {
          setFormData({ ...formData, destination: '' });
        }
      } else {
        // 没有目的地了，清空
        setFormData({ ...formData, destination: '' });
        setSelectedCountry('');
      }
    }
  };
  
  // 获取城市显示名称（优先使用中文，其次英文，最后通用名称）
  const getCityDisplayName = (city: City): string => {
    if (city.nameCN) return city.nameCN;
    if (city.nameEN) return city.nameEN;
    return city.name;
  };

  // 自然语言模式
  const [nlText, setNlText] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  
  // 结构化澄清问题状态（Phase 1）
  const [structuredQuestions, setStructuredQuestions] = useState<ClarificationQuestion[]>([]);
  const [structuredAnswers, setStructuredAnswers] = useState<ClarificationAnswer[]>([]);
  const [clarificationRound, setClarificationRound] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  
  // 向后兼容：旧的字符串澄清问题（逐步淘汰）
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<number, string>>({});
  
  const [needsClarification, setNeedsClarification] = useState(false);
  const [originalNLText, setOriginalNLText] = useState('');
  const [submittingAnswers, setSubmittingAnswers] = useState(false);
  const [uiStatus, setUiStatus] = useState<UIStatus>('done');
  const [, setOrchestrationStep] = useState<OrchestrationStep | null>(null);
  
  // 行程预览状态（当返回 OK 且有 itinerary 时）
  const [previewItinerary, setPreviewItinerary] = useState<TripDetail | null>(null);
  const [gateResult, setGateResult] = useState<GateResult | null>(null);
  const [decisionLogs, setDecisionLogs] = useState<DecisionLogEntry[]>([]);
  
  // 审批和授权状态
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [, setSuspensionInfo] = useState<SuspensionInfo | null>(null);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [consentInfo, setConsentInfo] = useState<{
    title?: string;
    message?: string;
    requiredPermissions?: string[];
    warning?: string;
  } | null>(null);
  
  const [creationResult, setCreationResult] = useState<{
    trip: any;
    parsedParams?: any;
    nextSteps?: any[];
    message?: string;
  } | null>(null);
  
  // 等待规划完成弹窗
  const [showPlanningWaitDialog, setShowPlanningWaitDialog] = useState(false);
  const [waitingTripId, setWaitingTripId] = useState<string | null>(null);

  const handleAddTraveler = () => {
    setFormData({
      ...formData,
      travelers: [...formData.travelers, { type: 'ADULT', mobilityTag: 'CITY_POTATO' }],
    });
  };

  const handleRemoveTraveler = (index: number) => {
    setFormData({
      ...formData,
      travelers: formData.travelers.filter((_, i) => i !== index),
    });
  };

  const handleTravelerChange = (index: number, field: keyof Traveler, value: string) => {
    const newTravelers = [...formData.travelers];
    newTravelers[index] = { ...newTravelers[index], [field]: value };
    setFormData({ ...formData, travelers: newTravelers });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // ✅ 验证至少选择了一个目的地，并确保使用纯国家代码
      let finalDestination: string = '';
      
      // 优先使用 selectedCountry（纯国家代码）
      if (selectedCountry) {
        finalDestination = selectedCountry;
      } 
      // 其次使用 formData.destination（如果已设置）
      else if (formData.destination) {
        // 如果 formData.destination 是城市标识符格式（如 "IS-7338"），提取国家代码
        if (formData.destination.includes('-')) {
          finalDestination = formData.destination.split('-')[0];
        } else {
          finalDestination = formData.destination;
        }
      }
      // 最后从 selectedDestinations 中提取
      else if (selectedDestinations.length > 0) {
        const firstDest = selectedDestinations[0];
        // 如果是城市标识符格式（如 "IS-7338"），提取国家代码
        if (firstDest.includes('-')) {
          finalDestination = firstDest.split('-')[0];
        } else {
          finalDestination = firstDest;
        }
      }
      
      // 验证国家代码格式（必须是2个大写字母）
      if (!finalDestination || !/^[A-Z]{2}$/.test(finalDestination)) {
        setError(`无效的目的地国家代码: ${finalDestination || '空'}。必须是 ISO 3166-1 alpha-2 格式(2个大写字母,如 JP、IS、US)`);
        setLoading(false);
        return;
      }
      
      if (!finalDestination) {
        setError('请至少选择一个目的地');
        setLoading(false);
        return;
      }

      // 如果选择了多个目的地，使用第一个作为主要目的地
      // 其他目的地可以在后续的规划阶段添加
      const submitData: CreateTripRequest = {
        ...formData,
        destination: finalDestination,
        // 高级设置：必须点/不去点
        mustPlaces: mustPlaces.length > 0 ? mustPlaces : undefined,
        avoidPlaces: avoidPlaces.length > 0 ? avoidPlaces : undefined,
      };
      
      await tripsApi.create(submitData);
      // 创建成功后跳转到行程列表，并传递状态以触发刷新
      navigate('/dashboard/trips', { state: { from: 'create' } });
    } catch (err: any) {
      setError(err.message || '创建行程失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 移除目的地
  const handleRemoveDestination = (countryCode: string) => {
    const newDestinations = selectedDestinations.filter(code => code !== countryCode);
    setSelectedDestinations(newDestinations);
    setFormData({ ...formData, destination: newDestinations.length > 0 ? newDestinations[0] : '' });
  };
  
  // handleDestinationSelect 和 handleAddNewCity 已移除，未使用

  // 映射 OrchestrationStep 到 UIStatus
  const mapOrchestrationStepToUIStatus = useCallback((step: OrchestrationStep | undefined): UIStatus => {
    if (!step) return 'thinking';
    switch (step) {
      case 'INTAKE':
      case 'PLAN_GEN':
      case 'NARRATE':
        return 'thinking';
      case 'RESEARCH':
        return 'browsing';
      case 'GATE_EVAL':
      case 'VERIFY':
        return 'verifying';
      case 'REPAIR':
        return 'repairing';
      case 'DONE':
        return 'done';
      case 'FAILED':
        return 'failed';
      default:
        return 'thinking';
    }
  }, []);

  const handleNLSubmit = async () => {
    if (!nlText.trim() || !user?.id) return;

    setNlLoading(true);
    setError(null);
    setNeedsClarification(false);
    setStructuredQuestions([]);
    setStructuredAnswers([]);
    setClarificationQuestions([]);
    setClarificationAnswers({});
    setOriginalNLText(nlText);
    setClarificationRound(0);
    setConversationHistory([nlText]);
    setPreviewItinerary(null);
    setGateResult(null);
    setDecisionLogs([]);
    setUiStatus('thinking');
    setOrchestrationStep(null);

    try {
      console.log('[NewTripPage] 调用 agentApi.routeAndRun...');
      
      const request = {
        request_id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: user.id,
        trip_id: null,
        message: nlText,
        conversation_context: {
          recent_messages: [],
          locale: 'zh-CN',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        options: {
          max_steps: 50,
          routeType: 'SYSTEM2_REASONING' as const,
        },
      };

      const response: RouteAndRunResponse = await agentApi.routeAndRun(request);
      console.log('[NewTripPage] ✅ Agent 响应:', response);

      // 更新 UI 状态
      if (response.ui_state?.ui_status) {
        setUiStatus(response.ui_state.ui_status);
      } else if (response.ui_state?.phase) {
        setUiStatus(mapOrchestrationStepToUIStatus(response.ui_state.phase));
      }
      if (response.ui_state?.phase) {
        setOrchestrationStep(response.ui_state.phase);
      }

      // 处理决策日志（兼容新旧两种格式）
      if (response.explain?.decision_log) {
        const logs = Array.isArray(response.explain.decision_log) ? response.explain.decision_log : [];
        // 过滤出 DecisionLogEntry 格式的日志（新格式）
        const decisionLogEntries = logs.filter((log): log is DecisionLogEntry => 
          'request_id' in log && 'step' in log && 'actor' in log
        );
        setDecisionLogs(decisionLogEntries);
      }

      // 处理不同状态
      if (response.result.status === 'NEED_MORE_INFO') {
        // 需要澄清问题
        const payload = response.result.payload;
        
        // 优先使用结构化问题
        if (payload?.clarificationQuestions && payload.clarificationQuestions.length > 0) {
          setNeedsClarification(true);
          setStructuredQuestions(payload.clarificationQuestions);
          setStructuredAnswers([]);
          setClarificationRound((prev) => prev + 1);
          setUiStatus('awaiting_user_input');
        } 
        // 向后兼容：使用 clarificationMessage
        else if (payload?.clarificationMessage) {
          setNeedsClarification(true);
          const fallbackQuestion = parseClarificationMessage(payload.clarificationMessage);
          setStructuredQuestions([fallbackQuestion]);
          setStructuredAnswers([]);
          setClarificationRound((prev) => prev + 1);
          setUiStatus('awaiting_user_input');
        } else {
          setError('需要更多信息，但未收到澄清问题');
          setUiStatus('failed');
        }
      } else if (response.result.status === 'OK') {
        // 成功生成行程
        const payload = response.result.payload;
        const itinerary = payload?.orchestrationResult?.itinerary;
        const gate = payload?.orchestrationResult?.gate_result;

        if (itinerary) {
          // 有行程数据，显示预览
          setPreviewItinerary(itinerary as TripDetail);
          setGateResult(gate || null);
          setUiStatus('done');
          // TODO: 显示行程预览页面（待实现）
          console.log('[NewTripPage] 行程预览:', { itinerary, gate });
        } else {
          // 没有行程数据，可能需要创建行程
          // 这里可以根据实际情况决定是否需要调用 tripsApi.create
          setError('成功响应但未包含行程数据');
          setUiStatus('failed');
        }
      } else if (response.result.status === 'FAILED') {
        setError(response.result.answer_text || '处理失败');
        setUiStatus('failed');
      } else if (response.result.status === 'TIMEOUT') {
        setError('请求超时，请稍后重试或简化需求');
        setUiStatus('failed');
      } else if (response.result.status === 'NEED_CONFIRMATION') {
        // 需要审批
        const payload = response.result.payload;
        const suspension = payload?.suspensionInfo;
        if (suspension?.approvalId) {
          setApprovalId(suspension.approvalId);
          setSuspensionInfo(suspension);
          setApprovalDialogOpen(true);
          setUiStatus('awaiting_confirmation');
        } else {
          setError('需要审批确认，但未收到审批信息');
          setUiStatus('awaiting_confirmation');
        }
      } else if (response.result.status === 'NEED_CONSENT') {
        // 需要授权
        const payload = response.result.payload;
        setConsentInfo({
          title: '需要您的授权',
          message: payload?.consentMessage || response.result.answer_text || '此操作需要您的授权才能继续执行。',
          requiredPermissions: payload?.requiredPermissions || [],
          warning: payload?.consentWarning,
        });
        setConsentDialogOpen(true);
        setUiStatus('awaiting_consent');
      } else if (response.result.status === 'REDIRECT_REQUIRED') {
        // 需要重定向到规划工作台
        const payload = response.result.payload;
        const redirectInfo = payload?.redirectInfo;
        if (redirectInfo) {
          setError(
            redirectInfo.redirect_reason || 
            response.result.answer_text || 
            '行程规划功能已迁移到规划工作台，请使用规划工作台功能创建行程。'
          );
          setUiStatus('failed');
          console.warn('[NewTripPage] 需要重定向到:', redirectInfo.redirect_to);
        } else {
          setError(response.result.answer_text || '需要重定向到其他页面');
          setUiStatus('failed');
        }
      } else {
        setError(`未知状态: ${response.result.status}`);
        setUiStatus('failed');
      }
    } catch (err: any) {
      console.error('[NewTripPage] ❌ 请求失败:', err);
      setError(err.message || '创建行程失败');
      setUiStatus('failed');
    } finally {
      setNlLoading(false);
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    setClarificationAnswers({
      ...clarificationAnswers,
      [index]: value,
    });
  };

  // 处理结构化澄清问题提交
  const handleStructuredAnswersSubmit = async () => {
    if (!user?.id) return;

    // 检查澄清轮数（最多5轮）
    if (clarificationRound >= 5) {
      setError('澄清轮数过多（最多5轮），建议使用结构化表单创建行程');
      return;
    }

    setSubmittingAnswers(true);
    setError(null);
    setUiStatus('thinking');

    try {
      // 格式化回答
      const formattedAnswers = formatClarificationAnswers(structuredQuestions, structuredAnswers);
      
      // 更新对话历史
      const updatedHistory = [...conversationHistory, formattedAnswers];
      setConversationHistory(updatedHistory);

      console.log('[NewTripPage] 提交结构化澄清答案，继续规划...');
      
      const request = {
        request_id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: user.id,
        trip_id: null,
        message: formattedAnswers,
        conversation_context: {
          recent_messages: updatedHistory,
          locale: 'zh-CN',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        options: {
          max_steps: 50,
          routeType: 'SYSTEM2_REASONING' as const,
          entry_point: 'dashboard' as const, // 标识从 Dashboard 创建新行程
        },
      };

      const response: RouteAndRunResponse = await agentApi.routeAndRun(request);
      console.log('[NewTripPage] ✅ Agent 响应:', response);

      // 更新 UI 状态
      if (response.ui_state?.ui_status) {
        setUiStatus(response.ui_state.ui_status);
      } else if (response.ui_state?.phase) {
        setUiStatus(mapOrchestrationStepToUIStatus(response.ui_state.phase));
      }
      if (response.ui_state?.phase) {
        setOrchestrationStep(response.ui_state.phase);
      }

      // 处理决策日志（兼容新旧两种格式）
      if (response.explain?.decision_log) {
        const logs = Array.isArray(response.explain.decision_log) ? response.explain.decision_log : [];
        // 过滤出 DecisionLogEntry 格式的日志（新格式）
        const decisionLogEntries = logs.filter((log): log is DecisionLogEntry => 
          'request_id' in log && 'step' in log && 'actor' in log
        );
        setDecisionLogs(decisionLogEntries);
      }

      // 处理不同状态
      if (response.result.status === 'NEED_MORE_INFO') {
        // 需要更多澄清问题
        const payload = response.result.payload;
        
        if (payload?.clarificationQuestions && payload.clarificationQuestions.length > 0) {
          setStructuredQuestions(payload.clarificationQuestions);
          setStructuredAnswers([]);
          setClarificationRound((prev) => prev + 1);
          setUiStatus('awaiting_user_input');
          
          // 检查是否超过5轮
          if (clarificationRound + 1 >= 5) {
            setError('澄清轮数较多，建议简化需求或使用结构化表单');
          }
        } else if (payload?.clarificationMessage) {
          // 向后兼容
          const fallbackQuestion = parseClarificationMessage(payload.clarificationMessage);
          setStructuredQuestions([fallbackQuestion]);
          setStructuredAnswers([]);
          setClarificationRound((prev) => prev + 1);
          setUiStatus('awaiting_user_input');
        } else {
          setError('需要更多信息，但未收到澄清问题');
          setUiStatus('failed');
        }
      } else if (response.result.status === 'OK') {
        // 成功生成行程
        const payload = response.result.payload;
        const itinerary = payload?.orchestrationResult?.itinerary;
        const gate = payload?.orchestrationResult?.gate_result;

        if (itinerary) {
          // 有行程数据，显示预览
          setPreviewItinerary(itinerary as TripDetail);
          setGateResult(gate || null);
          setNeedsClarification(false);
          setStructuredQuestions([]);
          setStructuredAnswers([]);
          setUiStatus('done');
          // TODO: 显示行程预览页面（待实现）
          console.log('[NewTripPage] 行程预览:', { itinerary, gate });
        } else {
          setError('成功响应但未包含行程数据');
          setUiStatus('failed');
        }
      } else if (response.result.status === 'FAILED') {
        setError(response.result.answer_text || '处理失败');
        setUiStatus('failed');
      } else if (response.result.status === 'TIMEOUT') {
        setError('请求超时，请稍后重试或简化需求');
        setUiStatus('failed');
      } else if (response.result.status === 'NEED_CONFIRMATION') {
        // 需要审批（多轮澄清中也可能需要审批）
        const payload = response.result.payload;
        const suspension = payload?.suspensionInfo;
        if (suspension?.approvalId) {
          setApprovalId(suspension.approvalId);
          setSuspensionInfo(suspension);
          setApprovalDialogOpen(true);
          setUiStatus('awaiting_confirmation');
        } else {
          setError('需要审批确认，但未收到审批信息');
          setUiStatus('awaiting_confirmation');
        }
      } else if (response.result.status === 'NEED_CONSENT') {
        // 需要授权（多轮澄清中也可能需要授权）
        const payload = response.result.payload;
        setConsentInfo({
          title: '需要您的授权',
          message: payload?.consentMessage || response.result.answer_text || '此操作需要您的授权才能继续执行。',
          requiredPermissions: payload?.requiredPermissions || [],
          warning: payload?.consentWarning,
        });
        setConsentDialogOpen(true);
        setUiStatus('awaiting_consent');
      } else if (response.result.status === 'REDIRECT_REQUIRED') {
        // 需要重定向到规划工作台
        const payload = response.result.payload;
        const redirectInfo = payload?.redirectInfo;
        if (redirectInfo) {
          setError(
            redirectInfo.redirect_reason || 
            response.result.answer_text || 
            '行程规划功能已迁移到规划工作台，请使用规划工作台功能创建行程。'
          );
          setUiStatus('failed');
          console.warn('[NewTripPage] 需要重定向到:', redirectInfo.redirect_to);
        } else {
          setError(response.result.answer_text || '需要重定向到其他页面');
          setUiStatus('failed');
        }
      } else {
        setError(`未知状态: ${response.result.status}`);
        setUiStatus('failed');
      }
    } catch (err: any) {
      console.error('[NewTripPage] ❌ 提交答案失败:', err);
      setError(err.message || '提交答案失败');
      setUiStatus('failed');
    } finally {
      setSubmittingAnswers(false);
    }
  };

  // 向后兼容：处理旧的字符串澄清问题提交
  const handleSubmitAnswers = async () => {
    // 检查是否所有问题都已回答
    const unansweredQuestions = clarificationQuestions.filter((_, index) => !clarificationAnswers[index]?.trim());
    if (unansweredQuestions.length > 0) {
      setError('请回答所有澄清问题');
      return;
    }

    setSubmittingAnswers(true);
    setError(null);

    try {
      // 构建包含答案的文本：原始文本 + 问题和答案
      const answersText = clarificationQuestions
        .map((question, index) => {
          const answer = clarificationAnswers[index]?.trim() || '';
          return `问题：${question}\n回答：${answer}`;
        })
        .join('\n\n');

      const enhancedText = `${originalNLText}\n\n澄清问题的回答：\n${answersText}`;

      console.log('[NewTripPage] 提交澄清答案，重新创建行程...');
      const result = await tripsApi.createFromNL({ text: enhancedText });
      console.log('[NewTripPage] ✅ 重新创建成功:', result);

      if (result.needsClarification && result.clarificationQuestions) {
        // 如果还有新的澄清问题，继续显示
        setClarificationQuestions(result.clarificationQuestions);
        const initialAnswers: Record<number, string> = {};
        result.clarificationQuestions.forEach((_, index) => {
          initialAnswers[index] = '';
        });
        setClarificationAnswers(initialAnswers);
        setOriginalNLText(enhancedText);
      } else if (result.trip) {
        const trip = result.trip;
        
        // 检查是否正在生成规划点
        if (result.generatingItems) {
          // 如果正在生成，显示等待弹窗，等待后端完成规划
          setWaitingTripId(trip.id);
          setShowPlanningWaitDialog(true);
        } else {
          // 检查行程是否已经规划完成
          // 判断标准：有 TripDay 且至少有一个 ItineraryItem，或者 stats.progress 不是 'PLANNING'
          const hasItems = trip.TripDay && trip.TripDay.length > 0 && trip.TripDay.some((day: any) => 
            day.ItineraryItem && day.ItineraryItem.length > 0
          );
          const isProgressComplete = trip.stats && trip.stats.progress !== 'PLANNING';
          const hasStatsItems = trip.stats && trip.stats.totalItems > 0;
          const isProgressStatusComplete = trip.metadata?.generationProgress?.status === 'completed';
          
          const isPlanningComplete = hasItems || isProgressComplete || hasStatsItems || isProgressStatusComplete;
          
          if (isPlanningComplete) {
            // 如果已经规划完成，直接跳转到行程详情页
            navigate(`/dashboard/trips/${trip.id}`);
          } else {
            // 如果未规划完成，也显示等待弹窗
            setWaitingTripId(trip.id);
            setShowPlanningWaitDialog(true);
          }
        }
        
        setNeedsClarification(false);
        setClarificationQuestions([]);
        setClarificationAnswers({});
        setOriginalNLText('');
      }
    } catch (err: any) {
      console.error('[NewTripPage] ❌ 提交答案失败:', err);
      setError(err.message || '提交答案失败');
    } finally {
      setSubmittingAnswers(false);
    }
  };

  // 处理规划完成
  const handlePlanningComplete = (trip: TripDetail) => {
    setShowPlanningWaitDialog(false);
    setWaitingTripId(null);
    // 跳转到行程详情页
    navigate(`/dashboard/trips/${trip.id}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* 等待规划完成弹窗 */}
      {waitingTripId && (
        <TripPlanningWaitDialog
          tripId={waitingTripId}
          open={showPlanningWaitDialog}
          onPlanningComplete={handlePlanningComplete}
          onClose={() => {
            setShowPlanningWaitDialog(false);
            setWaitingTripId(null);
          }}
        />
      )}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/trips')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">创建新行程</h1>
          <p className="text-muted-foreground mt-1">使用表单或自然语言描述创建您的行程</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'form' | 'nl')}>
        <TabsList>
          <TabsTrigger value="form">标准表单</TabsTrigger>
          <TabsTrigger value="nl">自然语言</TabsTrigger>
        </TabsList>

        <TabsContent value="form">
          <Card>
            <CardHeader>
              <CardTitle>行程信息</CardTitle>
              <CardDescription>填写行程的基本信息</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <Label htmlFor="destination">目的地（选择国家后选择城市）</Label>
                    {countries.length > 0 ? (
                      <div className="space-y-4">
                        {/* 第一步：选择国家 */}
                        <div className="space-y-2">
                          <Label htmlFor="country-select" className="text-sm font-medium">1. 选择国家</Label>
                          <Popover 
                            open={destinationOpen} 
                            onOpenChange={(open) => {
                              setDestinationOpen(open);
                              // 当关闭时，重置搜索状态
                              if (!open) {
                                setCountrySearchQuery('');
                              } else {
                                // 当打开时，如果没有数据，加载初始列表
                                if (countries.length === 0 && !countriesLoading) {
                                  loadCountries(0, false);
                                }
                              }
                            }}
                            modal={false}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                id="country-select"
                                variant="outline"
                                role="combobox"
                                aria-expanded={destinationOpen}
                                className="w-full justify-between"
                                disabled={countriesLoading}
                              >
                                {selectedCountry
                                  ? countries.find((c) => c.isoCode === selectedCountry)?.nameCN || selectedCountry
                                  : '选择国家...'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="p-0 w-[300px]" 
                              align="start"
                              onOpenAutoFocus={(e) => {
                                // 防止自动聚焦导致的问题
                                e.preventDefault();
                              }}
                            >
                              <Command shouldFilter={false}>
                                <CommandInput 
                                  placeholder="搜索国家（支持中文名、英文名、国家代码如 CN/JP）..." 
                                  value={countrySearchQuery}
                                  onValueChange={(value) => {
                                    setCountrySearchQuery(value);
                                  }}
                                  onKeyDown={(e) => {
                                    // 防止某些按键导致Popover关闭
                                    if (e.key === 'Escape') {
                                      e.stopPropagation();
                                    }
                                  }}
                                />
                                <CommandList>
                                  {countriesLoading ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                      加载中...
                                    </div>
                                  ) : countries.length === 0 ? (
                                    <CommandEmpty>
                                      {countrySearchQuery ? '未找到匹配的国家' : '暂无国家数据'}
                                    </CommandEmpty>
                                  ) : (
                                    <CommandGroup>
                                      {countries.map((country) => (
                                        <CommandItem
                                          key={country.isoCode}
                                          value={`${country.nameCN} ${country.nameEN} ${country.isoCode}`}
                                        onSelect={() => {
                                          console.log('[NewTripPage] 选择国家:', country.isoCode, country.nameCN);
                                          setSelectedCountry(country.isoCode);
                                          // ✅ 同步更新 formData.destination 为纯国家代码
                                          setFormData(prev => ({ ...prev, destination: country.isoCode }));
                                          setDestinationOpen(false);
                                        }}
                                        >
                                          <Check
                                            className={cn(
                                              'mr-2 h-4 w-4',
                                              selectedCountry === country.isoCode ? 'opacity-100' : 'opacity-0'
                                            )}
                                          />
                                          {country.nameCN} ({country.nameEN})
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  )}
                                </CommandList>
                                {/* 分页信息和加载更多（放在 CommandList 外面） */}
                                {!countriesLoading && countries.length > 0 && (countriesTotal > 0 || countriesHasMore) && (
                                  <div className="border-t p-2 space-y-2 bg-background">
                                    <div className="text-xs text-muted-foreground text-center">
                                      {countrySearchQuery 
                                        ? `找到 ${countriesTotal} 个匹配的国家，显示 ${countries.length} 个`
                                        : `共 ${countriesTotal} 个国家，显示 ${countries.length} 个`
                                      }
                                    </div>
                                    {countriesHasMore && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => {
                                          loadCountries(countriesOffset + countries.length, true, countrySearchQuery || undefined);
                                        }}
                                        disabled={countriesLoading}
                                      >
                                        {countriesLoading ? '加载中...' : `加载更多 (还有 ${countriesTotal - countries.length} 个)`}
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        {/* 第二步：选择城市（仅在选择了国家后显示） */}
                        {selectedCountry && (
                          <div className="space-y-2">
                            <Label htmlFor="city-select" className="text-sm font-medium">2. 选择城市（可多选）</Label>
                            
                            {/* 已选择的城市标签 */}
                            {selectedCities.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {selectedCities.map((city) => (
                                  <Badge
                                    key={city.id}
                                    variant="secondary"
                                    className="px-3 py-1 text-sm"
                                  >
                                    {getCityDisplayName(city)}
                                    {city.nameCN && city.nameEN && ` (${city.nameEN})`}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCity(city)}
                                      className="ml-2 hover:text-destructive"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                            
                            {/* 城市搜索和选择 */}
                            <Popover open={citySelectOpen} onOpenChange={setCitySelectOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  id="city-select"
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={citySelectOpen}
                                  className="w-full justify-between"
                                  disabled={citiesLoading}
                                >
                                  {selectedCities.length > 0
                                    ? `已选择 ${selectedCities.length} 个城市`
                                    : '搜索并选择城市...'}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-[400px]" align="start">
                                <Command>
                                  <CommandInput 
                                    placeholder="搜索城市名称..." 
                                    value={citySearchQuery}
                                    onValueChange={setCitySearchQuery}
                                  />
                                  <CommandList>
                                    {citiesLoading ? (
                                      <div className="p-4 text-center text-sm text-muted-foreground">
                                        加载中...
                                      </div>
                                    ) : cities.length === 0 ? (
                                      <CommandEmpty>
                                        {citySearchQuery ? '未找到匹配的城市' : '暂无城市数据，请先选择国家'}
                                      </CommandEmpty>
                                    ) : (
                                      <CommandGroup>
                                        {cities.map((city) => {
                                          const isSelected = selectedCities.some(c => c.id === city.id);
                                          const displayName = getCityDisplayName(city);
                                          const searchValue = `${city.nameCN || ''} ${city.nameEN || ''} ${city.name || ''} ${city.id}`.trim();
                                          return (
                                            <CommandItem
                                              key={city.id}
                                              value={searchValue}
                                              onSelect={() => {
                                                handleCitySelect(city);
                                                // 不自动关闭，允许继续选择
                                              }}
                                            >
                                              <Check
                                                className={cn(
                                                  'mr-2 h-4 w-4',
                                                  isSelected ? 'opacity-100' : 'opacity-0'
                                                )}
                                              />
                                              {displayName}
                                              {city.nameCN && city.nameEN && city.nameCN !== city.nameEN && ` (${city.nameEN})`}
                                            </CommandItem>
                                          );
                                        })}
                                      </CommandGroup>
                                    )}
                                  </CommandList>
                                  {/* 分页信息和加载更多（放在 CommandList 外面） */}
                                  {!citiesLoading && cities.length > 0 && (citiesTotal > 0 || citiesHasMore) && (
                                    <div className="border-t p-2 space-y-2 bg-background">
                                      <div className="text-xs text-muted-foreground text-center">
                                        {citySearchQuery 
                                          ? `找到 ${citiesTotal} 个匹配的城市，显示 ${cities.length} 个`
                                          : `共 ${citiesTotal} 个城市，显示 ${cities.length} 个`
                                        }
                                      </div>
                                      {citiesHasMore && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="w-full"
                                          onClick={() => {
                                            if (citySearchQuery.trim()) {
                                              searchCities(citySearchQuery, selectedCountry, citiesOffset + cities.length, true);
                                            } else {
                                              loadCitiesByCountry(selectedCountry, citiesOffset + cities.length, true);
                                            }
                                          }}
                                          disabled={citiesLoading}
                                        >
                                          {citiesLoading ? '加载中...' : `加载更多 (还有 ${citiesTotal - cities.length} 个)`}
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                        
                        {/* 已选择的目的地汇总（兼容旧的方式） */}
                        {selectedDestinations.length > 0 && selectedCities.length === 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">已选择的目的地</Label>
                            <div className="flex flex-wrap gap-2">
                              {selectedDestinations.map((code) => {
                                const country = countries.find((c) => c.isoCode === code);
                                return (
                                  <Badge
                                    key={code}
                                    variant="secondary"
                                    className="px-3 py-1 text-sm"
                                  >
                                    {country?.nameCN || country?.nameEN || code}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDestination(code)}
                                      className="ml-2 hover:text-destructive"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* 已选择的目的地标签 */}
                        {selectedDestinations.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {selectedDestinations.map((code) => (
                              <Badge
                                key={code}
                                variant="secondary"
                                className="px-3 py-1 text-sm"
                              >
                                {code}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDestination(code)}
                                  className="ml-2 hover:text-destructive"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        <Input
                          id="destination"
                          value={formData.destination}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData({ ...formData, destination: value });
                            // 如果输入的是新的代码，添加到选择列表
                            if (value && !selectedDestinations.includes(value)) {
                              setSelectedDestinations([...selectedDestinations, value]);
                            }
                          }}
                          placeholder="例如: JP, IS, US（可输入多个，用逗号分隔）"
                          required
                          disabled={countriesLoading}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              const value = formData.destination.trim();
                              if (value && !selectedDestinations.includes(value)) {
                                setSelectedDestinations([...selectedDestinations, value]);
                                setFormData({ ...formData, destination: '' });
                              }
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalBudget">总预算 (CNY)</Label>
                    <Input
                      id="totalBudget"
                      type="number"
                      min="0"
                      value={formData.totalBudget}
                      onChange={(e) =>
                        setFormData({ ...formData, totalBudget: Number(e.target.value) })
                      }
                      required
                    />
                  </div>
                </div>

                {/* 国家档案预览 */}
                {(selectedCountry || formData.destination) && (
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">目的地信息</CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/dashboard/countries/${selectedCountry || formData.destination}`)}
                        >
                          查看详情
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {countryInfoLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Spinner className="w-4 h-4" />
                        </div>
                      ) : selectedCountryInfo ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{selectedCountryInfo.countryName}</span>
                            <Badge variant="outline" className="ml-2">
                              {PAYMENT_TYPE_LABELS[selectedCountryInfo.paymentType]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">货币:</span>
                            <span className="font-medium">
                              {selectedCountryInfo.currencyCode} ({selectedCountryInfo.currencyName})
                            </span>
                          </div>
                          {selectedCountryInfo.exchangeRateToCNY && (
                            <div className="flex items-center gap-2 text-sm">
                              <TrendingUp className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">汇率:</span>
                              <span className="font-medium">
                                1 {selectedCountryInfo.currencyCode} ≈ {selectedCountryInfo.exchangeRateToCNY.toFixed(4)} CNY
                              </span>
                            </div>
                          )}
                          {selectedCountryInfo.quickTip && (
                            <div className="pt-2 border-t text-sm text-muted-foreground">
                              {selectedCountryInfo.quickTip.split('\n')[0]}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          暂无国家档案信息
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">开始日期</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">结束日期</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>旅行者</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddTraveler}>
                      <Plus className="w-4 h-4 mr-2" />
                      添加
                    </Button>
                  </div>

                  {formData.travelers.map((traveler, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>类型</Label>
                          <Select
                            value={traveler.type}
                            onValueChange={(value) =>
                              handleTravelerChange(index, 'type', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADULT">成人</SelectItem>
                              <SelectItem value="ELDERLY">老年人</SelectItem>
                              <SelectItem value="CHILD">儿童</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>行动能力</Label>
                          <Select
                            value={traveler.mobilityTag}
                            onValueChange={(value) =>
                              handleTravelerChange(index, 'mobilityTag', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IRON_LEGS">特种兵</SelectItem>
                              <SelectItem value="ACTIVE_SENIOR">银发徒步</SelectItem>
                              <SelectItem value="CITY_POTATO">城市脆皮</SelectItem>
                              <SelectItem value="LIMITED">行动不便</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {formData.travelers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTraveler(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* 旅行风格 - 节奏选择 */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="text-base font-medium">旅行风格</Label>
                    <p className="text-sm text-muted-foreground">选择您期望的旅行节奏</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'relaxed' as TripPace, label: '悠闲', desc: '每天2-3个点', emoji: '🌿' },
                      { value: 'standard' as TripPace, label: '标准', desc: '每天4-5个点', emoji: '⚖️' },
                      { value: 'tight' as TripPace, label: '紧凑', desc: '每天6+个点', emoji: '🚀' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, pace: option.value })}
                        className={cn(
                          'p-4 rounded-lg border-2 text-left transition-all',
                          formData.pace === option.value
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <div className="text-2xl mb-2">{option.emoji}</div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 兴趣偏好 - 多选标签 */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base font-medium">兴趣偏好</Label>
                    <p className="text-sm text-muted-foreground">选择您感兴趣的内容（可多选，用于AI推荐）</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'nature' as TripPreference, label: '自然', emoji: '🏞️' },
                      { value: 'city' as TripPreference, label: '城市', emoji: '🏙️' },
                      { value: 'photography' as TripPreference, label: '摄影', emoji: '📷' },
                      { value: 'food' as TripPreference, label: '美食', emoji: '🍜' },
                      { value: 'history' as TripPreference, label: '历史', emoji: '🏛️' },
                      { value: 'art' as TripPreference, label: '艺术', emoji: '🎨' },
                      { value: 'shopping' as TripPreference, label: '购物', emoji: '🛍️' },
                      { value: 'nightlife' as TripPreference, label: '夜生活', emoji: '🌃' },
                    ].map((pref) => {
                      const isSelected = formData.preferences?.includes(pref.value);
                      return (
                        <button
                          key={pref.value}
                          type="button"
                          onClick={() => {
                            const current = formData.preferences || [];
                            const updated = isSelected
                              ? current.filter(p => p !== pref.value)
                              : [...current, pref.value];
                            setFormData({ ...formData, preferences: updated });
                          }}
                          className={cn(
                            'px-4 py-2 rounded-full border transition-all text-sm',
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                          )}
                        >
                          <span className="mr-1">{pref.emoji}</span>
                          {pref.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 更多设置 - 可折叠区域 */}
                <Collapsible open={advancedSettingsOpen} onOpenChange={setAdvancedSettingsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="w-full justify-between text-muted-foreground hover:text-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4" />
                        <span>更多设置</span>
                        {(mustPlaces.length > 0 || avoidPlaces.length > 0) && (
                          <Badge variant="secondary" className="text-xs">
                            {mustPlaces.length + avoidPlaces.length} 项
                          </Badge>
                        )}
                      </div>
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform",
                        advancedSettingsOpen && "rotate-180"
                      )} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-6 pt-4">
                    {/* 提示：需要先选择国家 */}
                    {!selectedCountry && (
                      <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 text-center">
                        请先选择目的地国家，然后可以搜索添加具体地点
                      </div>
                    )}

                    {/* 必须去的地点 */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">必须去的地点</Label>
                        <p className="text-xs text-muted-foreground">添加您一定要去的景点、餐厅或地标</p>
                      </div>
                      
                      {/* 已选择的地点 */}
                      {mustPlaces.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {mustPlaces.map((placeId) => {
                            const place = mustPlaceMap.get(placeId);
                            return (
                              <Badge key={placeId} variant="secondary" className="px-3 py-1.5 text-sm">
                                <MapPin className="w-3 h-3 mr-1.5" />
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
                      
                      {/* 搜索输入 */}
                      <Popover open={mustPlaceSearchOpen} onOpenChange={setMustPlaceSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            disabled={!selectedCountry}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            搜索并添加地点...
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[400px]" align="start">
                          <Command>
                            <CommandInput
                              placeholder="输入地点名称搜索..."
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
                                  <CommandEmpty>未找到相关地点</CommandEmpty>
                                  <CommandGroup>
                                    {mustPlaceSearchResults.map((place) => (
                                      <CommandItem
                                        key={place.id}
                                        value={`${place.nameCN} ${place.nameEN} ${place.id}`}
                                        onSelect={() => handleAddMustPlace(place)}
                                        disabled={mustPlaces.includes(place.id)}
                                      >
                                        <MapPin className="w-4 h-4 mr-2" />
                                        <div className="flex-1">
                                          <div className="font-medium">{place.nameCN || place.nameEN}</div>
                                          {place.nameEN && place.nameCN && (
                                            <div className="text-xs text-muted-foreground">{place.nameEN}</div>
                                          )}
                                        </div>
                                        {mustPlaces.includes(place.id) && (
                                          <Badge variant="outline" className="text-xs">已添加</Badge>
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

                    {/* 不想去的地点 */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">不想去的地点</Label>
                        <p className="text-xs text-muted-foreground">添加您想避开的地点（如太商业化的景点）</p>
                      </div>
                      
                      {/* 已选择的地点 */}
                      {avoidPlaces.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {avoidPlaces.map((placeId) => {
                            const place = avoidPlaceMap.get(placeId);
                            return (
                              <Badge key={placeId} variant="outline" className="px-3 py-1.5 text-sm border-red-200 bg-red-50 text-red-700">
                                <X className="w-3 h-3 mr-1.5" />
                                {place?.nameCN || place?.nameEN || `POI ${placeId}`}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAvoidPlace(placeId)}
                                  className="ml-2 hover:text-red-900"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* 搜索输入 */}
                      <Popover open={avoidPlaceSearchOpen} onOpenChange={setAvoidPlaceSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            disabled={!selectedCountry}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            搜索并添加地点...
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[400px]" align="start">
                          <Command>
                            <CommandInput
                              placeholder="输入地点名称搜索..."
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
                                  <CommandEmpty>未找到相关地点</CommandEmpty>
                                  <CommandGroup>
                                    {avoidPlaceSearchResults.map((place) => (
                                      <CommandItem
                                        key={place.id}
                                        value={`${place.nameCN} ${place.nameEN} ${place.id}`}
                                        onSelect={() => handleAddAvoidPlace(place)}
                                        disabled={avoidPlaces.includes(place.id)}
                                      >
                                        <MapPin className="w-4 h-4 mr-2" />
                                        <div className="flex-1">
                                          <div className="font-medium">{place.nameCN || place.nameEN}</div>
                                          {place.nameEN && place.nameCN && (
                                            <div className="text-xs text-muted-foreground">{place.nameEN}</div>
                                          )}
                                        </div>
                                        {avoidPlaces.includes(place.id) && (
                                          <Badge variant="outline" className="text-xs">已添加</Badge>
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
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => navigate('/dashboard/trips')}>
                    取消
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Spinner className="w-4 h-4 mr-2" />}
                    创建行程
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nl">
          <Card>
            <CardHeader>
              <CardTitle>自然语言创建</CardTitle>
              <CardDescription>
                用自然语言描述您的行程需求，AI 会自动解析并创建行程
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nl-text">描述您的行程需求</Label>
                <Textarea
                  id="nl-text"
                  value={nlText}
                  onChange={(e) => setNlText(e.target.value)}
                  placeholder="例如: 帮我规划带娃去东京5天的行程，预算2万"
                  rows={6}
                />
                <p className="text-sm text-muted-foreground">
                  提示：请包含目的地、日期、预算、旅行者信息等
                </p>
                <StatusIndicator status={uiStatus} />
              </div>

              {/* DEV-only: structured clarification preview */}
              {showStructuredClarificationMock && (
                <ClarificationQuestionsPanel
                  questions={mockClarificationQuestions}
                  answers={structuredAnswers}
                  onAnswerChange={setStructuredAnswers}
                  onCancel={() => {
                    setStructuredAnswers([]);
                    setUiStatus('done');
                  }}
                  onSubmit={() => {
                    // eslint-disable-next-line no-console
                    console.log('[mockClarification] answers:', structuredAnswers);
                    setUiStatus('done');
                  }}
                  disabled={nlLoading}
                />
              )}

              {/* 结构化澄清问题（真实 API） */}
              {!showStructuredClarificationMock && needsClarification && structuredQuestions.length > 0 && (
                <>
                  {clarificationRound >= 5 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                      <p className="text-sm text-yellow-800">
                        ⚠️ 澄清轮数较多（{clarificationRound}/5），建议简化需求或使用结构化表单创建行程
                      </p>
                    </div>
                  )}
                  <ClarificationQuestionsPanel
                    questions={structuredQuestions}
                    answers={structuredAnswers}
                    onAnswerChange={setStructuredAnswers}
                    onCancel={() => {
                      setNeedsClarification(false);
                      setStructuredQuestions([]);
                      setStructuredAnswers([]);
                      setClarificationRound(0);
                      setConversationHistory([]);
                      setUiStatus('done');
                    }}
                    onSubmit={handleStructuredAnswersSubmit}
                    disabled={nlLoading || submittingAnswers}
                  />
                </>
              )}

              {/* 行程预览（当返回 OK 且有 itinerary 时） */}
              {previewItinerary && (
                <Card className="border-green-200 bg-green-50/30">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <CardTitle className="text-lg text-green-900">行程方案已生成</CardTitle>
                        <CardDescription className="mt-1">
                          已为您生成行程方案，请查看并确认
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">概览</TabsTrigger>
                        <TabsTrigger value="itinerary">行程详情</TabsTrigger>
                        <TabsTrigger value="gate">Gate 评估</TabsTrigger>
                        <TabsTrigger value="logs">决策日志</TabsTrigger>
                      </TabsList>

                      {/* 概览 Tab */}
                      <TabsContent value="overview" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">目的地：</span>
                            <span className="font-medium">{previewItinerary.destination}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">日期：</span>
                            <span className="font-medium">
                              {previewItinerary.startDate.split('T')[0]} - {previewItinerary.endDate.split('T')[0]}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">预算：</span>
                            <span className="font-medium">¥{previewItinerary.totalBudget?.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">天数：</span>
                            <span className="font-medium">{previewItinerary.TripDay?.length || 0} 天</span>
                          </div>
                        </div>

                        {/* 行程项统计 */}
                        {previewItinerary.TripDay && previewItinerary.TripDay.length > 0 && (
                          <div className="p-4 bg-white rounded-lg border">
                            <h4 className="font-semibold mb-3">行程统计</h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground">总行程项</div>
                                <div className="text-lg font-semibold">
                                  {previewItinerary.TripDay.reduce((sum, day) => sum + (day.ItineraryItem?.length || 0), 0)}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">平均每天</div>
                                <div className="text-lg font-semibold">
                                  {Math.round(
                                    previewItinerary.TripDay.reduce((sum, day) => sum + (day.ItineraryItem?.length || 0), 0) /
                                      previewItinerary.TripDay.length
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">行程天数</div>
                                <div className="text-lg font-semibold">{previewItinerary.TripDay.length}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      {/* 行程详情 Tab */}
                      <TabsContent value="itinerary" className="space-y-4 mt-4">
                        {previewItinerary.TripDay && previewItinerary.TripDay.length > 0 ? (
                          <div className="space-y-4">
                            {previewItinerary.TripDay.map((day, dayIndex) => (
                              <Card key={day.id} className="border-l-4 border-l-primary">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base">
                                    Day {dayIndex + 1} - {day.date.split('T')[0]}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {day.ItineraryItem && day.ItineraryItem.length > 0 ? (
                                    <div className="space-y-2">
                                      {day.ItineraryItem.map((item, itemIndex) => (
                                        <div
                                          key={item.id}
                                          className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50"
                                        >
                                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                            {itemIndex + 1}
                                          </div>
                                          <div className="flex-1">
                                            <div className="font-medium">{item.Place?.nameCN || item.type}</div>
                                            {item.note && (
                                              <div className="text-sm text-muted-foreground mt-1">{item.note}</div>
                                            )}
                                            {item.startTime && item.endTime && (
                                              <div className="text-xs text-muted-foreground mt-1">
                                                {item.startTime.split('T')[1]?.slice(0, 5)} -{' '}
                                                {item.endTime.split('T')[1]?.slice(0, 5)}
                                              </div>
                                            )}
                                          </div>
                                          <Badge variant="outline">{item.type}</Badge>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="py-8 text-center text-muted-foreground">该日暂无安排</div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 text-center text-muted-foreground">暂无行程数据</div>
                        )}
                      </TabsContent>

                      {/* Gate 评估 Tab */}
                      <TabsContent value="gate" className="space-y-4 mt-4">
                        {gateResult ? (
                          <div className="space-y-4">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">Gate 评估结果</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <div className="font-semibold text-blue-900 mb-1">评估状态</div>
                                  <div className="text-sm text-blue-800">
                                    {gateResult.result || gateResult.status || '评估完成'}
                                  </div>
                                </div>
                                {gateResult.reason && (
                                  <div className="p-3 bg-gray-50 border rounded-lg">
                                    <div className="font-semibold mb-1">评估原因</div>
                                    <div className="text-sm text-muted-foreground">{gateResult.reason}</div>
                                  </div>
                                )}
                                {gateResult.warnings && gateResult.warnings.length > 0 && (
                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="font-semibold text-yellow-900 mb-2">警告</div>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                                      {gateResult.warnings.map((warning: string, idx: number) => (
                                        <li key={idx}>{warning}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {gateResult.recommendations && gateResult.recommendations.length > 0 && (
                                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="font-semibold text-green-900 mb-2">建议</div>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                                      {gateResult.recommendations.map((rec: string, idx: number) => (
                                        <li key={idx}>{rec}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        ) : (
                          <div className="py-12 text-center text-muted-foreground">暂无 Gate 评估数据</div>
                        )}
                      </TabsContent>

                      {/* 决策日志 Tab */}
                      <TabsContent value="logs" className="space-y-4 mt-4">
                        {decisionLogs && decisionLogs.length > 0 ? (
                          <div className="space-y-3">
                            {decisionLogs.map((log: DecisionLogEntry, idx: number) => {
                              const getPersonaIcon = () => {
                                switch (log.actor) {
                                  case 'Gatekeeper':
                                    return <Shield className="w-4 h-4 text-blue-600" />;
                                  case 'Planner':
                                    return <Activity className="w-4 h-4 text-green-600" />;
                                  case 'LocalInsight':
                                    return <RefreshCw className="w-4 h-4 text-orange-600" />;
                                  default:
                                    return <History className="w-4 h-4 text-gray-600" />;
                                }
                              };

                              const getPersonaName = () => {
                                switch (log.actor) {
                                  case 'Gatekeeper':
                                    return 'Abu (Gatekeeper)';
                                  case 'Planner':
                                    return 'Dr.Dre (Planner)';
                                  case 'LocalInsight':
                                    return 'Neptune (LocalInsight)';
                                  default:
                                    return log.actor;
                                }
                              };

                              return (
                                <Card key={idx} className="border-l-4 border-l-primary">
                                  <CardContent className="pt-4">
                                    <div className="flex items-start gap-3">
                                      {getPersonaIcon()}
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                          <Badge variant="outline">{getPersonaName()}</Badge>
                                          <Badge variant="secondary">{log.step}</Badge>
                                          <span className="text-xs text-muted-foreground ml-auto">
                                            {new Date(log.timestamp).toLocaleString('zh-CN')}
                                          </span>
                                        </div>
                                        {log.inputs_summary && (
                                          <div className="mb-2">
                                            <div className="text-xs font-semibold text-muted-foreground mb-1">输入</div>
                                            <div className="text-sm">{log.inputs_summary}</div>
                                          </div>
                                        )}
                                        {log.outputs_summary && (
                                          <div className="mb-2">
                                            <div className="text-xs font-semibold text-muted-foreground mb-1">输出</div>
                                            <div className="text-sm">{log.outputs_summary}</div>
                                          </div>
                                        )}
                                        {log.evidence_refs && log.evidence_refs.length > 0 && (
                                          <div>
                                            <div className="text-xs font-semibold text-muted-foreground mb-1">证据引用</div>
                                            <div className="flex flex-wrap gap-1">
                                              {log.evidence_refs.map((ref, refIdx) => (
                                                <Badge key={refIdx} variant="outline" className="text-xs">
                                                  {ref}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-12 text-center text-muted-foreground">
                            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>暂无决策日志</p>
                            <p className="text-sm mt-2">当系统做出决策时，记录会显示在这里</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>

                    {/* 操作按钮 */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPreviewItinerary(null);
                          setGateResult(null);
                          setDecisionLogs([]);
                          setUiStatus('done');
                        }}
                      >
                        返回修改
                      </Button>
                      <Button
                        onClick={async () => {
                          if (!previewItinerary) return;
                          
                          setNlLoading(true);
                          try {
                            // 将 TripDetail 转换为 CreateTripRequest
                            // 尝试从 itinerary 中提取 travelers 信息
                            let travelers: Traveler[] = [{ type: 'ADULT', mobilityTag: 'CITY_POTATO' }]; // 默认值
                            
                            // 尝试从 metadata 或其他字段中提取 travelers
                            if (previewItinerary.metadata?.travelers && Array.isArray(previewItinerary.metadata.travelers)) {
                              travelers = previewItinerary.metadata.travelers;
                            } else if ((previewItinerary as any).travelers && Array.isArray((previewItinerary as any).travelers)) {
                              travelers = (previewItinerary as any).travelers;
                            }
                            
                            const createRequest: CreateTripRequest = {
                              destination: previewItinerary.destination,
                              startDate: previewItinerary.startDate.split('T')[0],
                              endDate: previewItinerary.endDate.split('T')[0],
                              totalBudget: previewItinerary.totalBudget,
                              travelers,
                            };

                            const result = await tripsApi.create(createRequest);
                            console.log('[NewTripPage] ✅ 创建行程成功:', result);
                            
                            // 创建成功后跳转到行程详情页
                            navigate(`/dashboard/trips/${result.id}`);
                          } catch (err: any) {
                            console.error('[NewTripPage] ❌ 创建行程失败:', err);
                            setError(err.message || '创建行程失败');
                          } finally {
                            setNlLoading(false);
                          }
                        }}
                        disabled={nlLoading}
                      >
                        {nlLoading && <Spinner className="w-4 h-4 mr-2" />}
                        接受方案并创建行程
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          if (!previewItinerary) return;
                          
                          setNlLoading(true);
                          try {
                            // 注意：保存草稿功能需要将 TripDetail 转换为 TripDraftResponse 格式
                            // 但由于 TripDraftResponse 的结构与 TripDetail 不同，这里暂时使用 create API
                            // 实际应该调用专门的保存草稿接口，或者后端需要支持从 TripDetail 直接保存
                            
                            // 将 TripDetail 转换为 CreateTripRequest
                            // 尝试从 itinerary 中提取 travelers 信息
                            let travelers: Traveler[] = [{ type: 'ADULT', mobilityTag: 'CITY_POTATO' }]; // 默认值
                            
                            // 尝试从 metadata 或其他字段中提取 travelers
                            if (previewItinerary.metadata?.travelers && Array.isArray(previewItinerary.metadata.travelers)) {
                              travelers = previewItinerary.metadata.travelers;
                            } else if ((previewItinerary as any).travelers && Array.isArray((previewItinerary as any).travelers)) {
                              travelers = (previewItinerary as any).travelers;
                            }
                            
                            const createRequest: CreateTripRequest = {
                              destination: previewItinerary.destination,
                              startDate: previewItinerary.startDate.split('T')[0],
                              endDate: previewItinerary.endDate.split('T')[0],
                              totalBudget: previewItinerary.totalBudget,
                              travelers,
                            };

                            // 创建行程（作为草稿）
                            const result = await tripsApi.create(createRequest);
                            console.log('[NewTripPage] ✅ 保存草稿成功（已创建为行程）:', result);
                            
                            // 保存成功后提示用户
                            setError(null);
                            // TODO: 使用 toast 提示成功
                            alert('草稿已保存成功！您可以在行程列表中查看。');
                            
                            // 清空预览状态
                            setPreviewItinerary(null);
                            setGateResult(null);
                            setDecisionLogs([]);
                            setUiStatus('done');
                            
                            // 可选：跳转到行程列表
                            // navigate('/dashboard/trips');
                          } catch (err: any) {
                            console.error('[NewTripPage] ❌ 保存草稿失败:', err);
                            setError(err.message || '保存草稿失败');
                          } finally {
                            setNlLoading(false);
                          }
                        }}
                        disabled={nlLoading}
                      >
                        {nlLoading && <Spinner className="w-4 h-4 mr-2" />}
                        保存为草稿
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 向后兼容：旧的字符串澄清问题交互界面 */}
              {!showStructuredClarificationMock && !previewItinerary && needsClarification && structuredQuestions.length === 0 && clarificationQuestions.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50/30">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <CardTitle className="text-lg text-yellow-900">需要澄清的问题</CardTitle>
                        <CardDescription className="mt-1">
                          为了更好地创建您的行程，请回答以下问题：
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {clarificationQuestions.map((question, index) => (
                      <div key={index} className="space-y-2">
                        <Label htmlFor={`clarification-${index}`} className="text-sm font-medium">
                          问题 {index + 1}：{question}
                        </Label>
                        <Textarea
                          id={`clarification-${index}`}
                          value={clarificationAnswers[index] || ''}
                          onChange={(e) => handleAnswerChange(index, e.target.value)}
                          placeholder="请输入您的回答..."
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                    ))}
                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNeedsClarification(false);
                          setClarificationQuestions([]);
                          setClarificationAnswers({});
                          setOriginalNLText('');
                        }}
                        disabled={submittingAnswers}
                      >
                        取消
                      </Button>
                      <Button
                        onClick={handleSubmitAnswers}
                        disabled={submittingAnswers || Object.values(clarificationAnswers).some(answer => !answer?.trim())}
                      >
                        {submittingAnswers && <Spinner className="w-4 h-4 mr-2" />}
                        提交答案并创建行程
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 创建成功结果显示 */}
              {creationResult && creationResult.trip && !needsClarification && (
                <div className="space-y-4">
                  {/* 成功消息 */}
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-green-900 mb-1">行程创建成功！</h4>
                        {creationResult.message && (
                          <p className="text-sm text-green-800">{creationResult.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 解析的参数信息 */}
                  {creationResult.parsedParams && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">解析的参数</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">目的地：</span>
                            <span className="font-medium ml-2">{creationResult.parsedParams.destination}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">预算：</span>
                            <span className="font-medium ml-2">¥{creationResult.parsedParams.totalBudget?.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">开始日期：</span>
                            <span className="font-medium ml-2">{creationResult.parsedParams.startDate}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">结束日期：</span>
                            <span className="font-medium ml-2">{creationResult.parsedParams.endDate}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 统计信息 */}
                  {creationResult.trip.stats && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">行程统计</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-2xl font-bold">{creationResult.trip.stats.totalDays}</div>
                            <div className="text-sm text-muted-foreground">总天数</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{creationResult.trip.stats.daysWithActivities || 0}</div>
                            <div className="text-sm text-muted-foreground">有活动天数</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{creationResult.trip.stats.totalItems || 0}</div>
                            <div className="text-sm text-muted-foreground">总行程项</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{creationResult.trip.stats.totalActivities || 0}</div>
                            <div className="text-sm text-muted-foreground">活动数</div>
                          </div>
                        </div>
                        {creationResult.trip.stats.budgetStats && (
                          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
                            <div>
                              <div className="text-lg font-semibold">¥{creationResult.trip.stats.budgetStats.totalBudget?.toLocaleString()}</div>
                              <div className="text-sm text-muted-foreground">总预算</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold">¥{creationResult.trip.stats.budgetStats.budgetUsed?.toLocaleString() || 0}</div>
                              <div className="text-sm text-muted-foreground">已使用</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold">¥{creationResult.trip.stats.budgetStats.budgetRemaining?.toLocaleString() || 0}</div>
                              <div className="text-sm text-muted-foreground">剩余</div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* 下一步操作建议 */}
                  {creationResult.nextSteps && creationResult.nextSteps.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">下一步操作</CardTitle>
                        <CardDescription>建议您执行的下一步操作</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {creationResult.nextSteps.map((step, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg border ${
                              step.priority === 'high'
                                ? 'border-blue-200 bg-blue-50'
                                : step.priority === 'medium'
                                ? 'border-yellow-200 bg-yellow-50'
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="font-medium mb-1">{step.action}</div>
                                <div className="text-sm text-muted-foreground">{step.description}</div>
                              </div>
                              <Badge
                                variant={
                                  step.priority === 'high'
                                    ? 'default'
                                    : step.priority === 'medium'
                                    ? 'secondary'
                                    : 'outline'
                                }
                              >
                                {step.priority === 'high' ? '高优先级' : step.priority === 'medium' ? '中优先级' : '低优先级'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex justify-end gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCreationResult(null);
                        setNlText('');
                      }}
                    >
                      创建新行程
                    </Button>
                    <Button
                      onClick={() => {
                        navigate(`/dashboard/trips/${creationResult.trip.id}`);
                      }}
                    >
                      查看行程详情
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => {
                        navigate('/dashboard/trips', { state: { from: 'create' } });
                      }}
                    >
                      返回行程列表
                    </Button>
                  </div>
                </div>
              )}

              {!needsClarification && !creationResult && !previewItinerary && (
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => navigate('/dashboard/trips')}>
                  取消
                </Button>
                <Button onClick={handleNLSubmit} disabled={nlLoading || !nlText.trim()}>
                  {nlLoading && <Spinner className="w-4 h-4 mr-2" />}
                  创建行程
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    {/* 审批对话框 */}
    {approvalId && (
      <ApprovalDialog
        approvalId={approvalId}
        open={approvalDialogOpen}
        onOpenChange={(open) => {
          setApprovalDialogOpen(open);
          if (!open) {
            // 关闭对话框时，如果用户没有做出决定，重置状态
            setApprovalId(null);
            setSuspensionInfo(null);
            setUiStatus('done');
          }
        }}
        onDecision={async (approved, approval) => {
          console.log('[NewTripPage] 审批决定:', { approved, approval });
          
          if (approved) {
            // 审批通过，继续执行流程
            // 可以重新调用 routeAndRun 继续处理
            setApprovalId(null);
            setSuspensionInfo(null);
            setApprovalDialogOpen(false);
            setUiStatus('thinking');
            
            // TODO: 重新调用 routeAndRun 继续处理（需要保存原始请求信息）
            // 这里暂时提示用户
            setError(null);
            // alert('审批已通过，正在继续处理...');
          } else {
            // 审批拒绝，结束流程
            setApprovalId(null);
            setSuspensionInfo(null);
            setApprovalDialogOpen(false);
            setUiStatus('done');
            setError('审批已拒绝，流程已终止');
          }
        }}
      />
    )}

    {/* 授权对话框 */}
    <ConsentDialog
      open={consentDialogOpen}
      onOpenChange={(open) => {
        setConsentDialogOpen(open);
        if (!open) {
          // 关闭对话框时，如果用户没有做出决定，重置状态
          setConsentInfo(null);
          setUiStatus('done');
        }
      }}
      onConsent={(granted) => {
        console.log('[NewTripPage] 授权决定:', { granted });
        
        if (granted) {
          // 授权通过，继续执行流程
          setConsentInfo(null);
          setConsentDialogOpen(false);
          setUiStatus('thinking');
          setError(null);
          
          // TODO: 重新调用 routeAndRun 继续处理（需要保存原始请求信息）
          // 这里暂时提示用户
          // alert('授权已通过，正在继续处理...');
        } else {
          // 授权拒绝，结束流程
          setConsentInfo(null);
          setConsentDialogOpen(false);
          setUiStatus('done');
          setError('授权已拒绝，流程已终止');
        }
      }}
      title={consentInfo?.title}
      message={consentInfo?.message}
      requiredPermissions={consentInfo?.requiredPermissions}
      warning={consentInfo?.warning}
    />
  </div>
);
}


