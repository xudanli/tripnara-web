import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { countriesApi } from '@/api/countries';
import type {
  CurrencyStrategy,
  CountryPack,
  PaymentInfo,
  TerrainAdvice,
} from '@/types/country';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  MapPin,
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('currency');

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
      const [currency, payment, pack, terrain] = await Promise.allSettled([
        countriesApi.getCurrencyStrategy(countryCode),
        countriesApi.getPaymentInfo(countryCode),
        countriesApi.getPack(countryCode).catch(() => null), // Pack配置可能不存在
        countriesApi.getTerrainAdvice(countryCode).catch(() => null), // 地形建议可能不存在
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
        setTerrainAdvice(terrain.value);
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="currency">
            <DollarSign className="w-4 h-4 mr-2" />
            货币策略
          </TabsTrigger>
          <TabsTrigger value="payment">
            <CreditCard className="w-4 h-4 mr-2" />
            支付信息
          </TabsTrigger>
          <TabsTrigger value="pack">
            <MapPin className="w-4 h-4 mr-2" />
            地形配置
          </TabsTrigger>
          <TabsTrigger value="terrain">
            <Mountain className="w-4 h-4 mr-2" />
            地形建议
          </TabsTrigger>
        </TabsList>

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
                          {terrainAdvice.terrainConfig.riskThresholds.rapidAscentM && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">快速上升阈值</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.riskThresholds.rapidAscentM}m/天
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
                          {terrainAdvice.terrainConfig.riskThresholds.bigAscentDayM && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">大爬升日阈值</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.riskThresholds.bigAscentDayM}m/天
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
                          {terrainAdvice.terrainConfig.effortLevelMapping.relaxMax !== undefined && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">轻松等级最大值</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.effortLevelMapping.relaxMax}
                              </div>
                            </div>
                          )}
                          {terrainAdvice.terrainConfig.effortLevelMapping.moderateMax !== undefined && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">中等等级最大值</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.effortLevelMapping.moderateMax}
                              </div>
                            </div>
                          )}
                          {terrainAdvice.terrainConfig.effortLevelMapping.challengeMax !== undefined && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">挑战等级最大值</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.effortLevelMapping.challengeMax}
                              </div>
                            </div>
                          )}
                          {terrainAdvice.terrainConfig.effortLevelMapping.extremeMin !== undefined && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">极限等级最小值</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.effortLevelMapping.extremeMin}
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
                          {terrainAdvice.terrainConfig.terrainConstraints.firstDayMaxElevationM !==
                            undefined && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">第一天高海拔限制</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.terrainConstraints.firstDayMaxElevationM}m
                              </div>
                            </div>
                          )}
                          {terrainAdvice.terrainConfig.terrainConstraints.maxDailyAscentM !== undefined && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">最大日爬升限制</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.terrainConstraints.maxDailyAscentM}m
                              </div>
                            </div>
                          )}
                          {terrainAdvice.terrainConfig.terrainConstraints.maxConsecutiveHighAscentDays !==
                            undefined && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">连续高爬升天数限制</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.terrainConstraints
                                  .maxConsecutiveHighAscentDays}{' '}
                                天
                              </div>
                            </div>
                          )}
                          {terrainAdvice.terrainConfig.terrainConstraints.highAltitudeBufferHours !==
                            undefined && (
                            <div className="space-y-1">
                              <div className="text-sm text-muted-foreground">高海拔日缓冲时间</div>
                              <div className="text-lg font-semibold">
                                {terrainAdvice.terrainConfig.terrainConstraints.highAltitudeBufferHours} 小时
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

