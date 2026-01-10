import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import { countriesApi } from '@/api/countries';
import { citiesApi } from '@/api/cities';
import type { CreateTripRequest, Traveler, TripDetail } from '@/types/trip';
import type { Country, CurrencyStrategy } from '@/types/country';
import type { City } from '@/api/cities';
import TripPlanningWaitDialog from '@/components/trips/TripPlanningWaitDialog';
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
import { ArrowLeft, Plus, X, Globe, CreditCard, ExternalLink, TrendingUp, CheckCircle2, ArrowRight, AlertCircle, Info, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CASH_HEAVY: '现金为主',
  BALANCED: '混合支付',
  DIGITAL: '数字化支付',
};

export default function NewTripPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'nl'>('form');

  // 国家列表
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [selectedCountryInfo, setSelectedCountryInfo] = useState<CurrencyStrategy | null>(null);
  const [countryInfoLoading, setCountryInfoLoading] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);

  // 表单模式
  const [formData, setFormData] = useState<CreateTripRequest>({
    destination: '',
    startDate: '',
    endDate: '',
    totalBudget: 0,
    travelers: [{ type: 'ADULT', mobilityTag: 'CITY_POTATO' }],
  });
  
  // 多选目的地（城市/国家）
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  // 新增城市输入框
  const [newCityInput, setNewCityInput] = useState('');
  
  // 城市选择相关状态
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [selectedCities, setSelectedCities] = useState<City[]>([]);
  const [citySelectOpen, setCitySelectOpen] = useState(false);

  // 加载国家列表
  useEffect(() => {
    loadCountries();
  }, []);
  
  // 当选择国家时，加载该国家的城市列表
  useEffect(() => {
    if (selectedCountry) {
      loadCitiesByCountry(selectedCountry);
    } else {
      setCities([]);
      setSelectedCities([]);
    }
  }, [selectedCountry]);

  // 当选择目的地时，加载国家信息（使用第一个目的地）
  useEffect(() => {
    const primaryDestination = selectedDestinations.length > 0 ? selectedDestinations[0] : formData.destination;
    if (primaryDestination) {
      loadCountryInfo(primaryDestination);
    } else {
      setSelectedCountryInfo(null);
    }
  }, [formData.destination, selectedDestinations]);

  const loadCountries = async () => {
    try {
      setCountriesLoading(true);
      const data = await countriesApi.getAll();
      setCountries(data);
    } catch (err: any) {
      console.error('Failed to load countries:', err);
      // 失败不影响使用，可以继续手动输入
    } finally {
      setCountriesLoading(false);
    }
  };

  const loadCountryInfo = async (countryCode: string) => {
    try {
      setCountryInfoLoading(true);
      const data = await countriesApi.getCurrencyStrategy(countryCode);
      setSelectedCountryInfo(data);
    } catch (err: any) {
      console.error('Failed to load country info:', err);
      setSelectedCountryInfo(null);
    } finally {
      setCountryInfoLoading(false);
    }
  };
  
  // 通过城市API获取城市列表
  const loadCitiesByCountry = async (countryCode: string) => {
    try {
      setCitiesLoading(true);
      const response = await citiesApi.getByCountry(countryCode);
      setCities(response.cities);
    } catch (err: any) {
      console.error('Failed to load cities:', err);
      setCities([]);
    } finally {
      setCitiesLoading(false);
    }
  };
  
  // 搜索城市（使用城市API）
  const searchCities = async (query: string, countryCode: string) => {
    if (!query.trim() || !countryCode) {
      return;
    }
    
    try {
      setCitiesLoading(true);
      const response = await citiesApi.search(query, countryCode);
      setCities(response.cities);
    } catch (err: any) {
      console.error('Failed to search cities:', err);
      setCities([]);
    } finally {
      setCitiesLoading(false);
    }
  };
  
  // 处理城市搜索输入变化
  useEffect(() => {
    if (!selectedCountry) return;
    
    if (citySearchQuery.trim()) {
      const debounceTimer = setTimeout(() => {
        searchCities(citySearchQuery, selectedCountry);
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      // 如果清空搜索，重新加载所有城市
      loadCitiesByCountry(selectedCountry);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citySearchQuery, selectedCountry]);
  
  // 选择城市
  const handleCitySelect = (city: City) => {
    if (!selectedCities.find(c => c.id === city.id)) {
      setSelectedCities([...selectedCities, city]);
      // 将城市名称添加到selectedDestinations（使用城市名称作为标识）
      const cityIdentifier = `${city.countryCode}-${city.id}`;
      if (!selectedDestinations.includes(cityIdentifier)) {
        setSelectedDestinations([...selectedDestinations, cityIdentifier]);
      }
      // 更新formData.destination
      if (selectedDestinations.length === 0) {
        setFormData({ ...formData, destination: city.countryCode });
      }
    }
  };
  
  // 移除城市
  const handleRemoveCity = (city: City) => {
    setSelectedCities(selectedCities.filter(c => c.id !== city.id));
    const cityIdentifier = `${city.countryCode}-${city.id}`;
    setSelectedDestinations(selectedDestinations.filter(d => d !== cityIdentifier));
    // 更新formData.destination
    const remaining = selectedCities.filter(c => c.id !== city.id);
    if (remaining.length > 0) {
      setFormData({ ...formData, destination: remaining[0].countryCode });
    } else if (selectedDestinations.filter(d => d !== cityIdentifier).length > 0) {
      const remainingDests = selectedDestinations.filter(d => d !== cityIdentifier);
      setFormData({ ...formData, destination: remainingDests[0] });
    } else {
      setFormData({ ...formData, destination: '' });
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
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<number, string>>({});
  const [originalNLText, setOriginalNLText] = useState('');
  const [submittingAnswers, setSubmittingAnswers] = useState(false);
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
      // 验证至少选择了一个目的地
      const finalDestination = selectedDestinations.length > 0 
        ? selectedDestinations[0] 
        : formData.destination;
      
      if (!finalDestination) {
        setError('请至少选择一个目的地');
        setLoading(false);
        return;
      }

      // 如果选择了多个目的地，使用第一个作为主要目的地
      // 其他目的地可以在后续的规划阶段添加
      const submitData = {
        ...formData,
        destination: finalDestination,
      };
      
      const trip = await tripsApi.create(submitData);
      // 创建成功后跳转到行程列表，并传递状态以触发刷新
      navigate('/dashboard/trips', { state: { from: 'create' } });
    } catch (err: any) {
      setError(err.message || '创建行程失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理目的地选择（支持多选）
  const handleDestinationSelect = (countryCode: string) => {
    if (selectedDestinations.includes(countryCode)) {
      // 取消选择
      setSelectedDestinations(selectedDestinations.filter(code => code !== countryCode));
    } else {
      // 添加选择
      setSelectedDestinations([...selectedDestinations, countryCode]);
    }
    // 同时更新formData.destination为第一个选择（向后兼容）
    const newDestinations = selectedDestinations.includes(countryCode)
      ? selectedDestinations.filter(code => code !== countryCode)
      : [...selectedDestinations, countryCode];
    setFormData({ ...formData, destination: newDestinations.length > 0 ? newDestinations[0] : '' });
  };
  
  // 移除目的地
  const handleRemoveDestination = (countryCode: string) => {
    const newDestinations = selectedDestinations.filter(code => code !== countryCode);
    setSelectedDestinations(newDestinations);
    setFormData({ ...formData, destination: newDestinations.length > 0 ? newDestinations[0] : '' });
  };
  
  // 添加新城市
  const handleAddNewCity = () => {
    const cityCode = newCityInput.trim().toUpperCase();
    if (cityCode && !selectedDestinations.includes(cityCode)) {
      setSelectedDestinations([...selectedDestinations, cityCode]);
      setNewCityInput('');
      // 更新formData.destination
      if (selectedDestinations.length === 0) {
        setFormData({ ...formData, destination: cityCode });
      }
    }
  };

  const handleNLSubmit = async () => {
    if (!nlText.trim()) return;

    setNlLoading(true);
    setError(null);
    setNeedsClarification(false);
    setClarificationQuestions([]);
    setClarificationAnswers({});
    setOriginalNLText(nlText); // 保存原始文本

    // 调试日志：检查 token
    const token = sessionStorage.getItem('accessToken');
    console.log('[NewTripPage] 准备创建行程:', {
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
      text: nlText,
    });

    try {
      console.log('[NewTripPage] 调用 tripsApi.createFromNL...');
      const result = await tripsApi.createFromNL({ text: nlText });
      console.log('[NewTripPage] ✅ 创建成功:', result);
      
      if (result.needsClarification && result.clarificationQuestions) {
        setNeedsClarification(true);
        setClarificationQuestions(result.clarificationQuestions);
        setCreationResult(null);
        // 初始化答案对象
        const initialAnswers: Record<number, string> = {};
        result.clarificationQuestions.forEach((_, index) => {
          initialAnswers[index] = '';
        });
        setClarificationAnswers(initialAnswers);
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
      console.error('[NewTripPage] ❌ 创建失败:', err);
      setError(err.message || '创建行程失败');
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
                          <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
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
                            <PopoverContent className="p-0 w-[300px]" align="start">
                              <Command>
                                <CommandInput placeholder="搜索国家..." />
                                <CommandList>
                                  <CommandEmpty>未找到国家</CommandEmpty>
                                  <CommandGroup>
                                    {countries.map((country) => (
                                      <CommandItem
                                        key={country.isoCode}
                                        value={`${country.nameCN} ${country.nameEN} ${country.isoCode}`}
                                        onSelect={() => {
                                          setSelectedCountry(country.isoCode);
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
                                </CommandList>
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
                {formData.destination && (
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">目的地信息</CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/dashboard/countries/${formData.destination}`)}
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
              </div>

              {/* 澄清问题交互界面 */}
              {needsClarification && clarificationQuestions.length > 0 && (
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

              {!needsClarification && !creationResult && (
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
    </div>
  );
}


