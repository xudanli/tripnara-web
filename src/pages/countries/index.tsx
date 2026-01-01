import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { countriesApi } from '@/api/countries';
import type { Country } from '@/types/country';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Search, Globe, CreditCard, TrendingUp } from 'lucide-react';

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

  useEffect(() => {
    loadCountries();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = countries.filter(
        (country) =>
          country.nameCN.toLowerCase().includes(query) ||
          country.nameEN.toLowerCase().includes(query) ||
          country.isoCode.toLowerCase().includes(query) ||
          country.currencyCode.toLowerCase().includes(query)
      );
      setFilteredCountries(filtered);
    } else {
      setFilteredCountries(countries);
    }
  }, [searchQuery, countries]);

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

      {/* 搜索栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="搜索国家名称（中文/英文）或货币代码..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
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

