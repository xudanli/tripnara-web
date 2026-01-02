import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { countriesApi } from '@/api/countries';
import { routeDirectionsApi } from '@/api/route-directions';
import type {
  CurrencyStrategy,
  CountryPack,
  PaymentInfo,
  TerrainAdvice,
} from '@/types/country';
import type { RouteDirection } from '@/types/places-routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Info,
  Wallet,
  Building2,
  Coins,
  Mountain,
  Activity,
  Shield,
  Gauge,
  FileText,
  Route,
  BarChart3,
  Clock,
  Navigation,
  Sparkles,
} from 'lucide-react';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CASH_HEAVY: '现金为主',
  BALANCED: '混合支付',
  DIGITAL: '数字化支付',
};

export default function CountryDetailPage() {
  const { countryCode } = useParams<{ countryCode: string }>();
  const navigate = useNavigate();

  const [currencyStrategy, setCurrencyStrategy] = useState<CurrencyStrategy | null>(null);
  const [countryPack, setCountryPack] = useState<CountryPack | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [terrainAdvice, setTerrainAdvice] = useState<TerrainAdvice | null>(null);
  const [routeDirections, setRouteDirections] = useState<RouteDirection[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (countryCode) {
      loadCountryData();
    }
  }, [countryCode]);

  const loadCountryData = async () => {
    if (!countryCode) return;

    try {
      setLoading(true);
      setError(null);

      // 并行加载所有数据
      const [currency, payment, pack, terrain, routes] = await Promise.allSettled([
        countriesApi.getCurrencyStrategy(countryCode),
        countriesApi.getPaymentInfo(countryCode),
        countriesApi.getPack(countryCode).catch(() => null), // Pack配置可能不存在
        countriesApi.getTerrainAdvice(countryCode).catch(() => null), // 地形建议可能不存在
        routeDirectionsApi.getByCountry(countryCode).catch(() => []), // 路线方向
      ]);

      if (currency.status === 'fulfilled') {
        setCurrencyStrategy(currency.value);
      }

      if (payment.status === 'fulfilled') {
        setPaymentInfo(payment.value);
      }

      if (pack.status === 'fulfilled' && pack.value) {
        setCountryPack(pack.value);
      }

      if (terrain.status === 'fulfilled' && terrain.value) {
        // 转换旧格式数据到新格式（如果需要）
        const terrainData = terrain.value as any;
        
        // 如果后端返回的是旧格式，进行转换
        if (terrainData.terrainConfig?.riskThresholds) {
          const riskThresholds = terrainData.terrainConfig.riskThresholds;
          // 如果缺少新格式字段，尝试从旧格式字段转换
          if (!riskThresholds.maxDailyAscentM && riskThresholds.rapidAscentM) {
            riskThresholds.maxDailyAscentM = riskThresholds.rapidAscentM;
          }
        }
        
        // 转换 effortLevelMapping（如果需要）
        if (terrainData.terrainConfig?.effortLevelMapping) {
          const mapping = terrainData.terrainConfig.effortLevelMapping;
          // 如果缺少新格式字段，尝试从旧格式字段转换
          if (!mapping.easy && (mapping.relaxMax !== undefined || mapping.relaxMax === 0)) {
            // 旧格式只有数值，需要转换为新格式对象
            // 根据 DEM 文档，easy 等级默认值
            mapping.easy = { maxAscentM: mapping.relaxMax || 300, maxSlopePct: 8 };
          }
          if (!mapping.moderate && (mapping.moderateMax !== undefined || mapping.moderateMax === 0)) {
            mapping.moderate = { maxAscentM: mapping.moderateMax || 600, maxSlopePct: 12 };
          }
          if (!mapping.hard && (mapping.challengeMax !== undefined || mapping.challengeMax === 0)) {
            mapping.hard = { maxAscentM: mapping.challengeMax || 1000, maxSlopePct: 18 };
          }
          if (!mapping.extreme && (mapping.extremeMin !== undefined || mapping.extremeMin === 0)) {
            mapping.extreme = { maxAscentM: mapping.extremeMin || 1500, maxSlopePct: 25 };
          }
        }
        
        setTerrainAdvice(terrainData as TerrainAdvice);
      }

      if (routes.status === 'fulfilled') {
        // getByCountry 返回的数据结构可能是 { active: RouteDirection[], deprecated?: RouteDirection[] }
        const routesData = routes.value as any;
        let routeDirectionsList: RouteDirection[] = [];
        if (routesData.active && Array.isArray(routesData.active)) {
          routeDirectionsList = routesData.active;
        } else if (Array.isArray(routesData)) {
          routeDirectionsList = routesData;
        }
        setRouteDirections(routeDirectionsList);

        // 通过 routeDirectionId 获取模版
        if (routeDirectionsList.length > 0) {
          try {
            const routeDirectionIds = routeDirectionsList.map((rd) => rd.id);
            
            // 先尝试获取所有模版，然后在前端筛选
            let allTemplates: any[] = [];
            try {
              const templatesData = await routeDirectionsApi.queryTemplates();
              allTemplates = Array.isArray(templatesData) ? templatesData : [];
            } catch (err: any) {
              console.warn('⚠️ Failed to load all templates, trying by routeDirectionId:', err);
              // 如果失败，尝试通过 routeDirectionId 逐个获取
              const templatePromises = routeDirectionIds.map((id) =>
                routeDirectionsApi.queryTemplates({ routeDirectionId: id }).catch(() => [])
              );
              const templatesResults = await Promise.all(templatePromises);
              allTemplates = templatesResults.flat();
            }
            
            // 前端筛选：只显示 isActive 为 true 且 routeDirectionId 匹配的模版
            const activeTemplates = allTemplates.filter((t: any) => {
              const isActive = t.isActive !== false;
              const matchesRouteDirection = routeDirectionIds.includes(t.routeDirectionId);
              return isActive && matchesRouteDirection;
            });
            
            // 补充 routeDirection 信息
            activeTemplates.forEach((template: any) => {
              if (!template.routeDirection && template.routeDirectionId) {
                const routeDir = routeDirectionsList.find((rd) => rd.id === template.routeDirectionId);
                if (routeDir) {
                  template.routeDirection = {
                    id: routeDir.id,
                    nameCN: routeDir.nameCN,
                    nameEN: routeDir.nameEN,
                    countryCode: routeDir.countryCode,
                    tags: routeDir.tags,
                  };
                }
              }
            });
            
            console.log('📦 Country templates for', countryCode, ':', activeTemplates.length);
            setTemplates(activeTemplates);
          } catch (err) {
            console.warn('⚠️ Failed to load templates by routeDirection:', err);
            setTemplates([]);
          }
        } else {
          setTemplates([]);
        }
      }
    } catch (err: any) {
      setError(err.message || '加载国家数据失败');
      console.error('Failed to load country data:', err);
    } finally {
      setLoading(false);
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
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-red-600">{error}</div>
              <Button onClick={() => navigate('/dashboard/countries')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回国家列表
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const countryName = currencyStrategy?.countryName || paymentInfo?.countryName || '未知国家';

  return (
    <div className="space-y-6 p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/countries')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{countryName}</h1>
            <p className="text-muted-foreground mt-1">国家代码: {countryCode?.toUpperCase()}</p>
          </div>
        </div>
      </div>

      {/* 主要内容 - 使用Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">
            <FileText className="w-4 h-4 mr-2" />
            概览
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Shield className="w-4 h-4 mr-2" />
            通行与规则
          </TabsTrigger>
          <TabsTrigger value="transport">
            <Navigation className="w-4 h-4 mr-2" />
            交通与通达
          </TabsTrigger>
          <TabsTrigger value="pacing">
            <Clock className="w-4 h-4 mr-2" />
            行程节奏
          </TabsTrigger>
          <TabsTrigger value="terrain">
            <Activity className="w-4 h-4 mr-2" />
            地形适配
          </TabsTrigger>
          <TabsTrigger value="coverage">
            <BarChart3 className="w-4 h-4 mr-2" />
            数据覆盖
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Route className="w-4 h-4 mr-2" />
            模版
          </TabsTrigger>
        </TabsList>

        {/* 概览 */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>关键结论</CardTitle>
              <CardDescription>快速判断该国家是否适合您的旅行</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 从现有数据提取关键结论 */}
              <div className="space-y-2">
                {/* 适合季节 - 从 RouteDirection 获取 */}
                {routeDirections.length > 0 && routeDirections[0].seasonality?.bestMonths && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">适合季节</Badge>
                    <span className="text-sm text-muted-foreground">
                      {routeDirections[0].seasonality.bestMonths
                        .map((m) => {
                          const months = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
                          return months[m] || `${m}月`;
                        })
                        .join('、')}
                    </span>
                  </div>
                )}

                {/* 典型路线形态 - 从 RouteDirection 获取 */}
                {routeDirections.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">典型路线形态</Badge>
                    <span className="text-sm text-muted-foreground">
                      {routeDirections.map((rd) => rd.nameCN).join('、') || '环线、多城市跳跃'}
                    </span>
                  </div>
                )}

                {/* 风险提示 - 从 RouteDirection 或 TerrainAdvice 获取 */}
                {(routeDirections.some((rd) => rd.riskProfile) || terrainAdvice) && (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">风险提示</Badge>
                    <span className="text-sm text-muted-foreground">
                      {routeDirections
                        .filter((rd) => rd.riskProfile?.roadClosure)
                        .length > 0
                        ? '冬季封路风险'
                        : terrainAdvice?.seasonalConstraints?.roadAccess || '请查看详细风险信息'}
                    </span>
                  </div>
                )}

                {/* 城市密度 - 从 RouteDirection 的 entryHubs 推断 */}
                {routeDirections.length > 0 && routeDirections[0].entryHubs && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">交通枢纽</Badge>
                    <span className="text-sm text-muted-foreground">
                      {routeDirections[0].entryHubs.length > 3 ? '城市密集' : '中等'}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={() => {
                    // TODO: 跳转到规划工作台，带入默认约束
                    navigate(`/dashboard/plan-studio?countryCode=${countryCode}`);
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  用这套规则开始规划
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 货币策略（保留原有内容） */}
          {currencyStrategy && (
            <Card>
              <CardHeader>
                <CardTitle>货币策略</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{PAYMENT_TYPE_LABELS[currencyStrategy.paymentType]}</Badge>
                </div>
                {currencyStrategy.exchangeRateToCNY && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">汇率 (CNY): </span>
                    <span className="font-medium">
                      1 {currencyStrategy.currencyCode} = {currencyStrategy.exchangeRateToCNY.toFixed(4)} CNY
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 通行与规则 */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>通行与规则</CardTitle>
              <CardDescription>签证、安全风险、预约要求</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">签证/入境</h4>
                  <p className="text-sm text-muted-foreground">数据待对接（需要新增接口）</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">安全风险（Abu）</h4>
                  <div className="space-y-2">
                    {/* 从 RouteDirection 的 riskProfile 获取 */}
                    {routeDirections
                      .filter((rd) => rd.riskProfile)
                      .map((rd, idx) => (
                        <div key={idx} className="space-y-2">
                          {rd.riskProfile?.level === 'high' && (
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive">红线</Badge>
                              <span className="text-sm">
                                {rd.riskProfile.factors?.join('、') || '高风险'}
                              </span>
                            </div>
                          )}
                          {rd.riskProfile?.level === 'medium' && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">黄线</Badge>
                              <span className="text-sm">
                                {rd.riskProfile.factors?.join('、') || '中等风险'}
                              </span>
                            </div>
                          )}
                          {rd.riskProfile?.altitudeSickness && (
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive">红线</Badge>
                              <span className="text-sm">高海拔+新手不可行</span>
                            </div>
                          )}
                          {rd.riskProfile?.roadClosure && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">黄线</Badge>
                              <span className="text-sm">冬季封路风险</span>
                            </div>
                          )}
                        </div>
                      ))}
                    {/* 从 TerrainAdvice 获取 */}
                    {terrainAdvice?.adaptationStrategies?.highAltitude && (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">红线</Badge>
                        <span className="text-sm">高海拔风险：{terrainAdvice.adaptationStrategies.highAltitude}</span>
                      </div>
                    )}
                    {terrainAdvice?.seasonalConstraints?.weatherImpact && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">黄线</Badge>
                        <span className="text-sm">天气影响：{terrainAdvice.seasonalConstraints.weatherImpact}</span>
                      </div>
                    )}
                    {routeDirections.length === 0 && !terrainAdvice && (
                      <p className="text-sm text-muted-foreground">暂无风险数据</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">预约/门票类型</h4>
                  <p className="text-sm text-muted-foreground">数据待对接（需要新增接口）</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={() => {
                    navigate(`/dashboard/plan-studio?countryCode=${countryCode}`);
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  用这套规则开始规划
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 交通与通达 */}
        <TabsContent value="transport" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>交通与通达</CardTitle>
              <CardDescription>交通枢纽覆盖、交通方式建议</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 从 RouteDirection 获取交通信息 */}
              {routeDirections.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">交通枢纽</h4>
                    <div className="flex flex-wrap gap-2">
                      {routeDirections[0].entryHubs?.map((hub, idx) => (
                        <Badge key={idx} variant="outline">{hub}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">推荐交通方式</h4>
                    <div className="flex flex-wrap gap-2">
                      {routeDirections[0].constraints?.transportMode?.map((mode, idx) => (
                        <Badge key={idx} variant="secondary">{mode}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">暂无交通数据</p>
              )}
              <div className="pt-4 border-t">
                <Button
                  onClick={() => {
                    navigate(`/dashboard/plan-studio?countryCode=${countryCode}`);
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  用这套规则开始规划
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 行程节奏建议 */}
        <TabsContent value="pacing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>行程节奏建议</CardTitle>
              <CardDescription>每日步行上限、推荐停留时长、交通方式偏好</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 从 CountryPack 和 RouteDirection 获取节奏建议 */}
              <div className="space-y-2">
                {countryPack?.terrainConstraints?.maxDailyAscentM && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">每日最大爬升</span>
                    <Badge>{countryPack.terrainConstraints.maxDailyAscentM} 米</Badge>
                  </div>
                )}
                {routeDirections[0]?.constraints?.minDays && routeDirections[0]?.constraints?.maxDays && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">推荐行程天数</span>
                    <Badge>
                      {routeDirections[0].constraints.minDays}-
                      {routeDirections[0].constraints.maxDays} 天
                    </Badge>
                  </div>
                )}
                {routeDirections[0]?.constraints?.transportMode && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">交通方式偏好</span>
                    <Badge>{routeDirections[0].constraints.transportMode.join('/')}</Badge>
                  </div>
                )}
                {countryPack?.effortLevelMapping && (
                  <div className="space-y-1 pt-2 border-t">
                    <div className="text-sm font-medium mb-2">体力等级映射</div>
                    {countryPack.effortLevelMapping.relaxMax && (
                      <div className="text-xs text-muted-foreground">
                        轻松: ≤ {countryPack.effortLevelMapping.relaxMax}
                      </div>
                    )}
                    {countryPack.effortLevelMapping.moderateMax && (
                      <div className="text-xs text-muted-foreground">
                        中等: ≤ {countryPack.effortLevelMapping.moderateMax}
                      </div>
                    )}
                    {countryPack.effortLevelMapping.challengeMax && (
                      <div className="text-xs text-muted-foreground">
                        挑战: ≤ {countryPack.effortLevelMapping.challengeMax}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="pt-4 border-t">
                <Button
                  onClick={() => {
                    navigate(`/dashboard/plan-studio?countryCode=${countryCode}`);
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  用这套规则开始规划
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 数据覆盖与可信度 */}
        <TabsContent value="coverage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>数据覆盖与可信度</CardTitle>
              <CardDescription>POI 数量、openingHours 覆盖率、数据来源构成</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">POI 数量</span>
                    <span className="text-sm text-muted-foreground">数据待对接（需要新增接口）</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">openingHours 覆盖率</span>
                    <span className="text-sm text-muted-foreground">数据待对接（需要新增接口）</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">数据来源构成</span>
                    <span className="text-sm text-muted-foreground">OSM/Google/Manual（需要新增接口）</span>
                  </div>
                </div>
                {/* 显示 RouteDirection 数量作为数据覆盖度的参考 */}
                {routeDirections.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">路线方向覆盖</span>
                      <Badge>{routeDirections.length} 条路线方向</Badge>
                    </div>
                  </div>
                )}
                {templates.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">路线模版覆盖</span>
                      <Badge>{templates.length} 个模版</Badge>
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t">
                <Button
                  onClick={() => {
                    navigate(`/dashboard/plan-studio?countryCode=${countryCode}`);
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  用这套规则开始规划
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 模版 */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>国家路线模版</CardTitle>
              <CardDescription>选择模版快速生成可执行行程</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {templates.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.slice(0, 6).map((template) => (
                      <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{template.nameCN}</CardTitle>
                          {template.nameEN && (
                            <CardDescription>{template.nameEN}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {template.durationDays} 天
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigate(`/dashboard/route-directions/templates/${template.id}`);
                              }}
                            >
                              查看详情
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {templates.length > 6 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        navigate(`/dashboard/countries/templates?countryCode=${countryCode}`);
                      }}
                    >
                      查看全部 {templates.length} 个模版
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">暂无路线模版</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigate(`/dashboard/countries/templates?countryCode=${countryCode}`);
                    }}
                  >
                    <Route className="w-4 h-4 mr-2" />
                    查看所有模版
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 货币策略 */}
        <TabsContent value="currency" className="space-y-6">
          {currencyStrategy ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>货币信息</CardTitle>
                  <CardDescription>
                    {currencyStrategy.currencyCode} ({currencyStrategy.currencyName})
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{PAYMENT_TYPE_LABELS[currencyStrategy.paymentType]}</Badge>
                  </div>

                  {currencyStrategy.exchangeRateToCNY && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />
                        <span>汇率 (CNY)</span>
                      </div>
                      <div className="text-lg font-semibold">
                        1 {currencyStrategy.currencyCode} = {currencyStrategy.exchangeRateToCNY.toFixed(4)} CNY
                      </div>
                    </div>
                  )}

                  {currencyStrategy.exchangeRateToUSD && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />
                        <span>汇率 (USD)</span>
                      </div>
                      <div className="text-lg font-semibold">
                        1 {currencyStrategy.currencyCode} = {currencyStrategy.exchangeRateToUSD.toFixed(4)} USD
                      </div>
                    </div>
                  )}

                  {currencyStrategy.quickRule && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Info className="w-4 h-4" />
                        <span>速算口诀</span>
                      </div>
                      <div className="p-3 bg-muted rounded-md">{currencyStrategy.quickRule}</div>
                    </div>
                  )}

                  {currencyStrategy.quickTip && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Info className="w-4 h-4" />
                        <span>速算提示</span>
                      </div>
                      <div className="p-3 bg-muted rounded-md whitespace-pre-line">
                        {currencyStrategy.quickTip}
                      </div>
                    </div>
                  )}

                  {currencyStrategy.quickTable && currencyStrategy.quickTable.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Info className="w-4 h-4" />
                        <span>快速对照表</span>
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-medium">
                                当地货币 ({currencyStrategy.currencyCode})
                              </th>
                              <th className="px-4 py-2 text-left text-sm font-medium">人民币 (CNY)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currencyStrategy.quickTable.map((row, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="px-4 py-2">{row.local.toLocaleString()}</td>
                                <td className="px-4 py-2 font-medium">≈ {row.home} 元</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {currencyStrategy.paymentAdvice && (
                <Card>
                  <CardHeader>
                    <CardTitle>支付建议</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currencyStrategy.paymentAdvice.tipping && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Wallet className="w-4 h-4" />
                          <span>小费规则</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {currencyStrategy.paymentAdvice.tipping}
                        </p>
                      </div>
                    )}

                    {currencyStrategy.paymentAdvice.atm_network && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Building2 className="w-4 h-4" />
                          <span>ATM 网络</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {currencyStrategy.paymentAdvice.atm_network}
                        </p>
                      </div>
                    )}

                    {currencyStrategy.paymentAdvice.wallet_apps &&
                      currencyStrategy.paymentAdvice.wallet_apps.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <CreditCard className="w-4 h-4" />
                            <span>推荐钱包 App</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {currencyStrategy.paymentAdvice.wallet_apps.map((app, idx) => (
                              <Badge key={idx} variant="secondary">
                                {app}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    {currencyStrategy.paymentAdvice.cash_preparation && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Coins className="w-4 h-4" />
                          <span>现金准备</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {currencyStrategy.paymentAdvice.cash_preparation}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">暂无货币策略数据</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 支付信息 */}
        <TabsContent value="payment" className="space-y-6">
          {paymentInfo ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>货币信息</CardTitle>
                  <CardDescription>
                    {paymentInfo.currency.code} ({paymentInfo.currency.name})
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">
                      {PAYMENT_TYPE_LABELS[paymentInfo.paymentMethods.type]}
                    </Badge>
                  </div>

                  {paymentInfo.currency.exchangeRateToCNY && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />
                        <span>汇率 (CNY)</span>
                      </div>
                      <div className="text-lg font-semibold">
                        1 {paymentInfo.currency.code} = {paymentInfo.currency.exchangeRateToCNY.toFixed(4)} CNY
                      </div>
                    </div>
                  )}

                  {paymentInfo.currency.exchangeRateToUSD && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />
                        <span>汇率 (USD)</span>
                      </div>
                      <div className="text-lg font-semibold">
                        1 {paymentInfo.currency.code} = {paymentInfo.currency.exchangeRateToUSD.toFixed(4)} USD
                      </div>
                    </div>
                  )}

                  {paymentInfo.currency.quickRule && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Info className="w-4 h-4" />
                        <span>速算口诀</span>
                      </div>
                      <div className="p-3 bg-muted rounded-md">{paymentInfo.currency.quickRule}</div>
                    </div>
                  )}

                  {paymentInfo.currency.quickTip && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Info className="w-4 h-4" />
                        <span>速算提示</span>
                      </div>
                      <div className="p-3 bg-muted rounded-md whitespace-pre-line">
                        {paymentInfo.currency.quickTip}
                      </div>
                    </div>
                  )}

                  {paymentInfo.currency.quickTable && paymentInfo.currency.quickTable.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Info className="w-4 h-4" />
                        <span>快速对照表</span>
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-medium">
                                当地货币 ({paymentInfo.currency.code})
                              </th>
                              <th className="px-4 py-2 text-left text-sm font-medium">人民币 (CNY)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentInfo.currency.quickTable.map((row, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="px-4 py-2">{row.local.toLocaleString()}</td>
                                <td className="px-4 py-2 font-medium">≈ {row.home} 元</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>实用贴士</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {paymentInfo.practicalTips.tipping && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Wallet className="w-4 h-4" />
                        <span>小费规则</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{paymentInfo.practicalTips.tipping}</p>
                    </div>
                  )}

                  {paymentInfo.practicalTips.atmNetworks && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Building2 className="w-4 h-4" />
                        <span>ATM 网络</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{paymentInfo.practicalTips.atmNetworks}</p>
                    </div>
                  )}

                  {paymentInfo.practicalTips.walletApps && paymentInfo.practicalTips.walletApps.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CreditCard className="w-4 h-4" />
                        <span>推荐钱包 App</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {paymentInfo.practicalTips.walletApps.map((app, idx) => (
                          <Badge key={idx} variant="secondary">
                            {app}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {paymentInfo.practicalTips.cashPreparation && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Coins className="w-4 h-4" />
                        <span>现金准备</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {paymentInfo.practicalTips.cashPreparation}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">暂无支付信息数据</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pack配置 */}
        <TabsContent value="pack" className="space-y-6">
          {countryPack ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>国家 Pack 配置</CardTitle>
                  <CardDescription>{countryPack.countryName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {countryPack.riskThresholds && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        <h3 className="text-lg font-semibold">风险阈值</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {countryPack.riskThresholds.highAltitudeM && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">高海拔阈值</div>
                            <div className="text-lg font-semibold">
                              {countryPack.riskThresholds.highAltitudeM}m
                            </div>
                          </div>
                        )}
                        {countryPack.riskThresholds.rapidAscentM && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">快速上升阈值</div>
                            <div className="text-lg font-semibold">
                              {countryPack.riskThresholds.rapidAscentM}m/天
                            </div>
                          </div>
                        )}
                        {countryPack.riskThresholds.steepSlopePct && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">陡坡阈值</div>
                            <div className="text-lg font-semibold">
                              {countryPack.riskThresholds.steepSlopePct}%
                            </div>
                          </div>
                        )}
                        {countryPack.riskThresholds.bigAscentDayM && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">大爬升日阈值</div>
                            <div className="text-lg font-semibold">
                              {countryPack.riskThresholds.bigAscentDayM}m/天
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {countryPack.effortLevelMapping && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        <h3 className="text-lg font-semibold">体力等级映射</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {countryPack.effortLevelMapping.relaxMax !== undefined && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">轻松等级最大值</div>
                            <div className="text-lg font-semibold">
                              {countryPack.effortLevelMapping.relaxMax}
                            </div>
                          </div>
                        )}
                        {countryPack.effortLevelMapping.moderateMax !== undefined && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">中等等级最大值</div>
                            <div className="text-lg font-semibold">
                              {countryPack.effortLevelMapping.moderateMax}
                            </div>
                          </div>
                        )}
                        {countryPack.effortLevelMapping.challengeMax !== undefined && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">挑战等级最大值</div>
                            <div className="text-lg font-semibold">
                              {countryPack.effortLevelMapping.challengeMax}
                            </div>
                          </div>
                        )}
                        {countryPack.effortLevelMapping.extremeMin !== undefined && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">极限等级最小值</div>
                            <div className="text-lg font-semibold">
                              {countryPack.effortLevelMapping.extremeMin}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {countryPack.terrainConstraints && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-5 h-5" />
                        <h3 className="text-lg font-semibold">地形约束</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {countryPack.terrainConstraints.firstDayMaxElevationM !== undefined && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">第一天高海拔限制</div>
                            <div className="text-lg font-semibold">
                              {countryPack.terrainConstraints.firstDayMaxElevationM}m
                            </div>
                          </div>
                        )}
                        {countryPack.terrainConstraints.maxDailyAscentM !== undefined && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">最大日爬升限制</div>
                            <div className="text-lg font-semibold">
                              {countryPack.terrainConstraints.maxDailyAscentM}m
                            </div>
                          </div>
                        )}
                        {countryPack.terrainConstraints.maxConsecutiveHighAscentDays !== undefined && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">连续高爬升天数限制</div>
                            <div className="text-lg font-semibold">
                              {countryPack.terrainConstraints.maxConsecutiveHighAscentDays} 天
                            </div>
                          </div>
                        )}
                        {countryPack.terrainConstraints.highAltitudeBufferHours !== undefined && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">高海拔日缓冲时间</div>
                            <div className="text-lg font-semibold">
                              {countryPack.terrainConstraints.highAltitudeBufferHours} 小时
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">该国家暂无 Pack 配置</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 地形建议 */}
        <TabsContent value="terrain" className="space-y-6">
          {terrainAdvice ? (
            <>
              {terrainAdvice.terrainConfig && (
                <Card>
                  <CardHeader>
                    <CardTitle>地形配置</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {terrainAdvice.terrainConfig.riskThresholds && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5" />
                          <h3 className="text-lg font-semibold">风险阈值</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {terrainAdvice.terrainConfig.riskThresholds.highAltitudeM && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">高海拔阈值</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.riskThresholds.highAltitudeM}m
                              </div>
                            </div>
                          )}
                          {terrainAdvice.terrainConfig.riskThresholds.maxDailyAscentM && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">最大日爬升阈值</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.riskThresholds.maxDailyAscentM}m/天
                              </div>
                            </div>
                          )}
                          {terrainAdvice.terrainConfig.riskThresholds.steepSlopePct && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">陡坡阈值</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.riskThresholds.steepSlopePct}%
                              </div>
                            </div>
                          )}
                          {terrainAdvice.terrainConfig.riskThresholds.maxConsecutiveHighAltitudeDays && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">最大连续高海拔天数</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.riskThresholds.maxConsecutiveHighAltitudeDays} 天
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {terrainAdvice.terrainConfig.effortLevelMapping && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5" />
                          <h3 className="text-lg font-semibold">体力等级映射</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {terrainAdvice.terrainConfig.effortLevelMapping.easy && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">轻松等级</div>
                              <div className="text-lg font-semibold">
                                爬升 ≤ {terrainAdvice.terrainConfig.effortLevelMapping.easy.maxAscentM}m, 坡度 ≤ {terrainAdvice.terrainConfig.effortLevelMapping.easy.maxSlopePct}%
                              </div>
                            </div>
                          )}
                          {terrainAdvice.terrainConfig.effortLevelMapping.moderate && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">中等等级</div>
                              <div className="text-lg font-semibold">
                                爬升 ≤ {terrainAdvice.terrainConfig.effortLevelMapping.moderate.maxAscentM}m, 坡度 ≤ {terrainAdvice.terrainConfig.effortLevelMapping.moderate.maxSlopePct}%
                              </div>
                            </div>
                          )}
                          {terrainAdvice.terrainConfig.effortLevelMapping.hard && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">困难等级</div>
                              <div className="text-lg font-semibold">
                                爬升 ≤ {terrainAdvice.terrainConfig.effortLevelMapping.hard.maxAscentM}m, 坡度 ≤ {terrainAdvice.terrainConfig.effortLevelMapping.hard.maxSlopePct}%
                              </div>
                            </div>
                          )}
                          {terrainAdvice.terrainConfig.effortLevelMapping.extreme && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">极限等级</div>
                              <div className="text-lg font-semibold">
                                爬升 ≤ {terrainAdvice.terrainConfig.effortLevelMapping.extreme.maxAscentM}m, 坡度 ≤ {terrainAdvice.terrainConfig.effortLevelMapping.extreme.maxSlopePct}%
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {terrainAdvice.terrainConfig.terrainConstraints && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Gauge className="w-5 h-5" />
                          <h3 className="text-lg font-semibold">地形约束</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {terrainAdvice.terrainConfig.terrainConstraints.maxElevationM !== undefined && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">最大海拔</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.terrainConstraints.maxElevationM}m
                              </div>
                            </div>
                          )}
                          {terrainAdvice.terrainConfig.terrainConstraints.minElevationM !== undefined && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">最小海拔</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.terrainConstraints.minElevationM}m
                              </div>
                            </div>
                          )}
                          {terrainAdvice.terrainConfig.terrainConstraints.allowedSlopeRange && (
                            <div className="space-y-1 col-span-2">
                              <div className="text-sm text-muted-foreground">允许坡度范围</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.terrainConstraints.allowedSlopeRange.min}% - {terrainAdvice.terrainConfig.terrainConstraints.allowedSlopeRange.max}%
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {terrainAdvice.adaptationStrategies && (
                <Card>
                  <CardHeader>
                    <CardTitle>适应策略</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(terrainAdvice.adaptationStrategies).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <AlertTriangle className="w-4 h-4" />
                          <span>{key === 'highAltitude' ? '高海拔' : key === 'routeRisk' ? '路线风险' : key}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{value}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {terrainAdvice.equipmentRecommendations && (
                <Card>
                  <CardHeader>
                    <CardTitle>装备建议</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(terrainAdvice.equipmentRecommendations).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Mountain className="w-4 h-4" />
                          <span>
                            {key === 'basedOnTerrain' ? '基于地形' : key === 'trainingAdvice' ? '训练建议' : key}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{value}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {terrainAdvice.seasonalConstraints && (
                <Card>
                  <CardHeader>
                    <CardTitle>季节性约束</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(terrainAdvice.seasonalConstraints).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Info className="w-4 h-4" />
                          <span>
                            {key === 'roadAccess' ? '道路通行' : key === 'weatherImpact' ? '天气影响' : key}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{value}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">该国家暂无地形建议数据</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

