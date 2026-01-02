import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { countriesApi } from '@/api/countries';
import type { Country } from '@/types/country';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Search, Globe, CreditCard, TrendingUp, Filter, FileText, Route } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CASH_HEAVY: '现金为主',
  BALANCED: '混合支付',
  DIGITAL: '数字化支付',
};

const PAYMENT_TYPE_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
  CASH_HEAVY: 'default',
  BALANCED: 'secondary',
  DIGITAL: 'outline',
};

export default function CountriesPage() {
  const navigate = useNavigate();
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [selectedAudience, setSelectedAudience] = useState<string>('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCountries();
  }, []);

  useEffect(() => {
    filterCountries();
  }, [searchQuery, selectedSeason, selectedAudience, selectedRiskLevel, countries]);

  const filterCountries = () => {
    let filtered = [...countries];

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (country) =>
          country.nameCN.toLowerCase().includes(query) ||
          country.nameEN.toLowerCase().includes(query) ||
          country.isoCode.toLowerCase().includes(query) ||
          country.currencyCode.toLowerCase().includes(query)
      );
    }

    // TODO: 季节、适合人群、风险等级筛选需要后端接口支持
    // 目前只做前端占位

    setFilteredCountries(filtered);
  };

  const loadCountries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await countriesApi.getAll();
      setCountries(data);
      setFilteredCountries(data);
    } catch (err: any) {
      setError(err.message || '加载国家列表失败');
      console.error('Failed to load countries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCountryClick = (countryCode: string) => {
    navigate(`/dashboard/countries/${countryCode}`);
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
            <div className="text-center text-red-600">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">国家档案</h1>
        <p className="text-muted-foreground mt-2">
          查看各国的货币、支付、地形等信息，为您的旅行做好准备
        </p>
      </div>

      {/* 搜索和筛选栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="搜索国家名/别名/regionKey..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 筛选器 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-1" />
                筛选
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
                <div>
                  <Label>季节</Label>
                  <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                    <SelectTrigger>
                      <SelectValue placeholder="全部季节" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部季节</SelectItem>
                      <SelectItem value="spring">春季</SelectItem>
                      <SelectItem value="summer">夏季</SelectItem>
                      <SelectItem value="autumn">秋季</SelectItem>
                      <SelectItem value="winter">冬季</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>适合人群</Label>
                  <Select value={selectedAudience} onValueChange={setSelectedAudience}>
                    <SelectTrigger>
                      <SelectValue placeholder="全部人群" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部人群</SelectItem>
                      <SelectItem value="family">亲子</SelectItem>
                      <SelectItem value="hiking">徒步</SelectItem>
                      <SelectItem value="photography">摄影</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>风险等级</Label>
                  <Select value={selectedRiskLevel} onValueChange={setSelectedRiskLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="全部风险等级" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部风险等级</SelectItem>
                      <SelectItem value="low">低风险</SelectItem>
                      <SelectItem value="medium">中风险</SelectItem>
                      <SelectItem value="high">高风险</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 国家列表 */}
      {filteredCountries.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>未找到国家</EmptyTitle>
                <EmptyDescription>
                  {searchQuery ? '请尝试其他搜索关键词' : '暂无国家数据'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCountries.map((country) => (
            <Card
              key={country.isoCode}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCountryClick(country.isoCode)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{country.nameCN}</CardTitle>
                    <CardDescription className="mt-1">{country.nameEN}</CardDescription>
                  </div>
                  <Badge variant={PAYMENT_TYPE_COLORS[country.paymentType] || 'outline'}>
                    {PAYMENT_TYPE_LABELS[country.paymentType] || country.paymentType}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">代码:</span>
                    <span className="font-mono">{country.isoCode}</span>
                  </div>

                  {/* CTA 按钮 */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCountryClick(country.isoCode);
                      }}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      查看档案
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/countries/templates?countryCode=${country.isoCode}`);
                      }}
                    >
                      <Route className="w-4 h-4 mr-1" />
                      查看模版
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">货币:</span>
                    <span className="font-medium">
                      {country.currencyCode} ({country.currencyName})
                    </span>
                  </div>

                  {country.exchangeRateToCNY && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">汇率 (CNY):</span>
                      <span className="font-medium">
                        1 {country.currencyCode} ≈ {country.exchangeRateToCNY.toFixed(4)} CNY
                      </span>
                    </div>
                  )}

                  {country.exchangeRateToUSD && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">汇率 (USD):</span>
                      <span className="font-medium">
                        1 {country.currencyCode} ≈ {country.exchangeRateToUSD.toFixed(4)} USD
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredCountries.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          共 {filteredCountries.length} 个国家
        </div>
      )}
    </div>
  );
}

