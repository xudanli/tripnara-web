import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { routeDirectionsApi } from '@/api/route-directions';
import type { RouteDirection } from '@/types/places-routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle2,
  Info,
  Filter,
  X,
} from 'lucide-react';

const MONTHS = [
  { value: 1, label: '一月' },
  { value: 2, label: '二月' },
  { value: 3, label: '三月' },
  { value: 4, label: '四月' },
  { value: 5, label: '五月' },
  { value: 6, label: '六月' },
  { value: 7, label: '七月' },
  { value: 8, label: '八月' },
  { value: 9, label: '九月' },
  { value: 10, label: '十月' },
  { value: 11, label: '十一月' },
  { value: 12, label: '十二月' },
];

export default function RouteDirectionsByCountryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const countryCode = searchParams.get('countryCode') || '';
  const monthParam = searchParams.get('month');
  const tagsParam = searchParams.get('tags');
  const limitParam = searchParams.get('limit');

  const [inputCountryCode, setInputCountryCode] = useState(countryCode);
  const [month, setMonth] = useState<number | undefined>(
    monthParam ? parseInt(monthParam, 10) : undefined
  );
  const [tags, setTags] = useState<string[]>(
    tagsParam ? tagsParam.split(',') : []
  );
  const [tagInput, setTagInput] = useState('');
  const [limit, setLimit] = useState<number | undefined>(
    limitParam ? parseInt(limitParam, 10) : undefined
  );

  const [activeDirections, setActiveDirections] = useState<RouteDirection[]>([]);
  const [deprecatedDirections, setDeprecatedDirections] = useState<RouteDirection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (countryCode) {
      loadRouteDirections();
    }
  }, [countryCode, month, tags, limit]);

  const loadRouteDirections = async () => {
    if (!countryCode) return;

    try {
      setLoading(true);
      setError(null);

      const params: {
        tags?: string[];
        month?: number;
        limit?: number;
      } = {};

      if (tags.length > 0) {
        params.tags = tags;
      }
      if (month) {
        params.month = month;
      }
      if (limit) {
        params.limit = limit;
      }

      const data = await routeDirectionsApi.getByCountry(countryCode, params);
      setActiveDirections(data.active || []);
      setDeprecatedDirections(data.deprecated || []);
    } catch (err: any) {
      setError(err.message || '加载路线方向失败');
      console.error('Failed to load route directions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (inputCountryCode) {
      params.set('countryCode', inputCountryCode);
    }
    if (month) {
      params.set('month', month.toString());
    }
    if (tags.length > 0) {
      params.set('tags', tags.join(','));
    }
    if (limit) {
      params.set('limit', limit.toString());
    }
    setSearchParams(params);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (tagInput.trim()) {
        handleAddTag();
      } else {
        handleSearch();
      }
    }
  };

  const formatMonthRange = (months: number[]) => {
    if (months.length === 0) return '无限制';
    if (months.length === 12) return '全年';
    return months.map((m) => MONTHS[m - 1]?.label || m).join('、');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">根据国家获取路线方向</h1>
          <p className="text-muted-foreground mt-2">
            根据国家代码查询该国家的所有激活路线方向，支持按标签、月份筛选
          </p>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            搜索条件
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">国家代码 *</label>
              <Input
                placeholder="例如: IS, NP, CN_XIZANG"
                value={inputCountryCode}
                onChange={(e) => setInputCountryCode(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">月份 (1-12)</label>
              <Input
                type="number"
                min="1"
                max="12"
                placeholder="可选，用于季节性筛选"
                value={month || ''}
                onChange={(e) => setMonth(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                onKeyPress={handleKeyPress}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">返回数量限制</label>
              <Input
                type="number"
                min="1"
                placeholder="默认 20"
                value={limit || ''}
                onChange={(e) => setLimit(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                onKeyPress={handleKeyPress}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">标签筛选</label>
              <div className="flex gap-2">
                <Input
                  placeholder="输入标签后按回车添加"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <Button onClick={handleAddTag} disabled={!tagInput.trim()}>
                  添加
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button onClick={handleSearch} disabled={!inputCountryCode} className="w-full md:w-auto">
            查询路线方向
          </Button>
        </CardContent>
      </Card>

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center h-96">
          <Spinner className="w-8 h-8" />
        </div>
      )}

      {/* 错误状态 */}
      {error && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 结果展示 */}
      {!loading && !error && countryCode && (
        <>
          {/* 激活的路线方向 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                激活的路线方向 ({activeDirections.length})
              </h2>
            </div>

            {activeDirections.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>未找到激活的路线方向</EmptyTitle>
                      <EmptyDescription>
                        请尝试修改搜索条件或选择其他国家代码
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {activeDirections.map((direction) => (
                  <Card key={direction.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{direction.nameCN}</CardTitle>
                          <CardDescription className="mt-1">
                            {direction.nameEN || direction.name}
                          </CardDescription>
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {direction.description && (
                        <p className="text-sm text-muted-foreground">{direction.description}</p>
                      )}

                      {direction.tags && direction.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {direction.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {direction.seasonality && (
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">季节性信息:</span>
                          </div>
                          {direction.seasonality.bestMonths && direction.seasonality.bestMonths.length > 0 && (
                            <div className="pl-6">
                              <span className="text-muted-foreground">最佳月份: </span>
                              <span>{formatMonthRange(direction.seasonality.bestMonths)}</span>
                            </div>
                          )}
                          {direction.seasonality.avoidMonths && direction.seasonality.avoidMonths.length > 0 && (
                            <div className="pl-6">
                              <span className="text-muted-foreground">禁忌月份: </span>
                              <span className="text-red-600">{formatMonthRange(direction.seasonality.avoidMonths)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {direction.entryHubs && direction.entryHubs.length > 0 && (
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">入口枢纽:</span>
                          </div>
                          <div className="pl-6 flex flex-wrap gap-2">
                            {direction.entryHubs.map((hub, idx) => (
                              <Badge key={idx} variant="secondary">{hub}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {direction.regions && direction.regions.length > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">区域: </span>
                          <span>{direction.regions.join(', ')}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>ID: {direction.id}</span>
                        <span>国家: {direction.countryCode}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* 已弃用的路线方向 */}
          {deprecatedDirections.length > 0 && (
            <div className="space-y-4 mt-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <Info className="h-6 w-6 text-muted-foreground" />
                  已弃用的路线方向 ({deprecatedDirections.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {deprecatedDirections.map((direction) => (
                  <Card key={direction.id} className="opacity-75 hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{direction.nameCN}</CardTitle>
                          <CardDescription className="mt-1">
                            {direction.nameEN || direction.name}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">Deprecated</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {direction.description && (
                        <p className="text-sm text-muted-foreground">{direction.description}</p>
                      )}

                      {direction.tags && direction.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {direction.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>ID: {direction.id}</span>
                        <span>国家: {direction.countryCode}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 未选择国家代码时的提示 */}
      {!loading && !error && !countryCode && (
        <Card>
          <CardContent className="pt-6">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>请输入国家代码</EmptyTitle>
                <EmptyDescription>
                  在上方输入国家代码（如：IS、NP、CN_XIZANG）开始查询
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

