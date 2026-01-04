import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { routeDirectionsApi } from '@/api/route-directions';
import { countriesApi } from '@/api/countries';
import type { RouteTemplate } from '@/types/places-routes';
import type { Country } from '@/types/country';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateTripFromTemplateDialog } from '@/components/trips/CreateTripFromTemplateDialog';
import { DiscoverBoxIllustration } from '@/components/illustrations';
import {
  Search,
  Calendar,
  MapPin,
  Sparkles,
  Eye,
  ArrowLeft,
} from 'lucide-react';

export default function CountryTemplatesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const countryCodeFromUrl = searchParams.get('countryCode');

  const [templates, setTemplates] = useState<RouteTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<RouteTemplate[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>(countryCodeFromUrl || 'all');
  const [selectedDuration, setSelectedDuration] = useState<string>('all');
  const [selectedIntensity, setSelectedIntensity] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RouteTemplate | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // 当 URL 参数变化时，更新选中的国家
  useEffect(() => {
    if (countryCodeFromUrl) {
      setSelectedCountry(countryCodeFromUrl);
    }
  }, [countryCodeFromUrl]);

  useEffect(() => {
    filterTemplates();
  }, [searchQuery, selectedCountry, selectedDuration, selectedIntensity, templates]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 先加载国家列表
      const countriesData = await countriesApi.getAll();
      setCountries(countriesData || []);
      
      // 尝试加载模版（不传参数，避免 400 错误）
      let templatesData: RouteTemplate[] = [];
      try {
        templatesData = await routeDirectionsApi.queryTemplates();
        templatesData = Array.isArray(templatesData) ? templatesData : [];
      } catch (err: any) {
        // 如果接口返回 400，可能是参数问题，尝试不传参数
        if (err.response?.status === 400) {
          console.warn('⚠️ queryTemplates with params failed, trying without params');
          try {
            templatesData = await routeDirectionsApi.queryTemplates();
            templatesData = Array.isArray(templatesData) ? templatesData : [];
          } catch (err2: any) {
            console.error('⚠️ queryTemplates failed:', err2);
            templatesData = [];
          }
        } else {
          console.error('⚠️ Failed to load templates:', err);
          templatesData = [];
        }
      }
      
      // 前端筛选：只显示 isActive 为 true 的模版（如果接口返回了该字段）
      let activeTemplates = templatesData || [];
      if (Array.isArray(activeTemplates)) {
        activeTemplates = activeTemplates.filter((t: any) => t.isActive !== false);
      }
      
      // 调试信息：查看加载的模版数据
      console.log('📦 Loaded templates:', activeTemplates);
      console.log('📦 Templates count:', activeTemplates?.length || 0);
      if (activeTemplates && activeTemplates.length > 0) {
        console.log('📦 First template:', activeTemplates[0]);
        console.log('📦 First template routeDirection:', activeTemplates[0].routeDirection);
        // 查看所有模版的国家代码
        const countryCodes = activeTemplates
          .map((t: any) => t.routeDirection?.countryCode || (t as any).countryCode)
          .filter(Boolean);
        console.log('📦 Country codes in templates:', [...new Set(countryCodes)]);
        
        // 如果 routeDirection 为空，尝试通过 routeDirectionId 获取
        const templatesWithoutRouteDirection = activeTemplates.filter(
          (t: any) => !t.routeDirection && t.routeDirectionId
        );
        if (templatesWithoutRouteDirection.length > 0) {
          console.warn('⚠️ Some templates missing routeDirection:', templatesWithoutRouteDirection.length);
          // 尝试批量获取 routeDirection 信息（限制数量避免过多请求）
          try {
            const templatesToFix = templatesWithoutRouteDirection.slice(0, 10); // 只修复前10个
            const routeDirectionPromises = templatesToFix.map((t: any) =>
              routeDirectionsApi.getById(t.routeDirectionId).catch(() => null)
            );
            const routeDirections = await Promise.all(routeDirectionPromises);
            
            // 将 routeDirection 信息合并到模版中
            activeTemplates.forEach((template: any) => {
              if (!template.routeDirection && template.routeDirectionId) {
                const routeDir = routeDirections.find(
                  (rd: any) => rd?.id === template.routeDirectionId
                );
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
          } catch (err) {
            console.warn('⚠️ Failed to load routeDirections for templates:', err);
          }
        }
      }
      
      setTemplates(activeTemplates);
      setCountries(countriesData || []);
    } catch (err: any) {
      setError(err.message || '加载数据失败');
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // 调试信息
    console.log('🔍 Filtering templates:', {
      totalTemplates: templates.length,
      selectedCountry,
      searchQuery,
    });

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.nameCN.toLowerCase().includes(query) ||
          t.nameEN?.toLowerCase().includes(query) ||
          t.routeDirection?.nameCN?.toLowerCase().includes(query) ||
          t.routeDirection?.nameEN?.toLowerCase().includes(query)
      );
    }

    // 国家筛选
    if (selectedCountry !== 'all') {
      const beforeCount = filtered.length;
      filtered = filtered.filter((t) => {
        // 尝试多种方式获取国家代码
        const templateCountryCode = 
          t.routeDirection?.countryCode || 
          (t as any).countryCode ||
          (t.metadata as any)?.countryCode;
        
        if (!templateCountryCode) {
          console.warn('⚠️ Template missing countryCode:', {
            templateId: t.id,
            templateName: t.nameCN,
            routeDirection: t.routeDirection,
          });
          return false; // 如果没有国家代码，不显示
        }
        
        const match = templateCountryCode.toUpperCase() === selectedCountry.toUpperCase();
        if (!match) {
          console.log('🔍 Template filtered out:', {
            templateName: t.nameCN,
            templateCountryCode,
            selectedCountry,
          });
        }
        return match;
      });
      console.log('🔍 Country filter:', {
        before: beforeCount,
        after: filtered.length,
        selectedCountry,
      });
    }

    // 天数筛选
    if (selectedDuration !== 'all') {
      const [min, max] = selectedDuration.split('-').map(Number);
      if (max) {
        filtered = filtered.filter(
          (t) => t.durationDays >= min && t.durationDays <= max
        );
      } else {
        filtered = filtered.filter((t) => t.durationDays >= min);
      }
    }

    // 强度筛选
    if (selectedIntensity !== 'all') {
      filtered = filtered.filter((t) => {
        const pace = t.defaultPacePreference;
        if (selectedIntensity === 'relaxed') return pace === 'RELAXED';
        if (selectedIntensity === 'standard') return pace === 'BALANCED';
        if (selectedIntensity === 'intense') return pace === 'CHALLENGE';
        return true;
      });
    }

    setFilteredTemplates(filtered);
  };

  const handleUseTemplate = (template: RouteTemplate) => {
    setSelectedTemplate(template);
    setCreateDialogOpen(true);
  };

  const handlePreview = (templateId: number) => {
    navigate(`/dashboard/route-directions/templates/${templateId}`);
  };

  const getIntensityLabel = (pace?: string) => {
    switch (pace) {
      case 'RELAXED':
        return '轻松';
      case 'BALANCED':
        return '标准';
      case 'CHALLENGE':
        return '强';
      default:
        return '标准';
    }
  };

  const getIntensityColor = (pace?: string): 'default' | 'secondary' | 'destructive' => {
    switch (pace) {
      case 'RELAXED':
        return 'default';
      case 'BALANCED':
        return 'secondary';
      case 'CHALLENGE':
        return 'destructive';
      default:
        return 'secondary';
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
            <div className="text-center text-red-600">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard/countries')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">国家路线模版</h1>
          <p className="text-muted-foreground mt-2">
            选择模版快速生成可执行行程，从 0 到 1 规划您的旅程
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="搜索模版名称、关键词（如：环岛、徒步走廊、城市周末）..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>国家</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部国家" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部国家</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country.isoCode} value={country.isoCode}>
                        {country.nameCN} ({country.nameEN})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>天数</Label>
                <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部天数" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部天数</SelectItem>
                    <SelectItem value="1-3">1-3 天</SelectItem>
                    <SelectItem value="4-7">4-7 天</SelectItem>
                    <SelectItem value="8-14">8-14 天</SelectItem>
                    <SelectItem value="14-">14+ 天</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>强度</Label>
                <Select value={selectedIntensity} onValueChange={setSelectedIntensity}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部强度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部强度</SelectItem>
                    <SelectItem value="relaxed">轻松</SelectItem>
                    <SelectItem value="standard">标准</SelectItem>
                    <SelectItem value="intense">强</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info - 临时显示，帮助排查问题 */}
      {process.env.NODE_ENV === 'development' && templates.length > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-4">
            <div className="text-xs text-yellow-800 space-y-1">
              <div>📊 调试信息:</div>
              <div>总模版数: {templates.length}</div>
              <div>筛选后: {filteredTemplates.length}</div>
              <div>选中国家: {selectedCountry}</div>
              {templates.length > 0 && (
                <div>
                  模版国家代码: {templates
                    .map((t) => t.routeDirection?.countryCode || 'N/A')
                    .filter((code, idx, arr) => arr.indexOf(code) === idx)
                    .join(', ')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="mb-4 opacity-50">
                <DiscoverBoxIllustration size={160} />
              </div>
              <h3 className="text-lg font-semibold mb-2">未找到模版</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {searchQuery || selectedCountry !== 'all' || selectedDuration !== 'all' || selectedIntensity !== 'all'
                  ? '请尝试调整筛选条件'
                  : templates.length === 0
                  ? '暂无路线模版数据'
                  : `已加载 ${templates.length} 个模版，但筛选后无结果。请检查筛选条件。`}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{template.nameCN}</CardTitle>
                    {template.nameEN && (
                      <CardDescription className="mt-1">{template.nameEN}</CardDescription>
                    )}
                  </div>
                  <Badge variant={getIntensityColor(template.defaultPacePreference)}>
                    {getIntensityLabel(template.defaultPacePreference)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">天数:</span>
                    <span className="font-medium">{template.durationDays} 天</span>
                  </div>

                  {template.routeDirection && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">路线:</span>
                      <span className="font-medium">{template.routeDirection.nameCN}</span>
                      {template.routeDirection.countryCode && (
                        <Badge variant="outline" className="ml-1">
                          {template.routeDirection.countryCode}
                        </Badge>
                      )}
                    </div>
                  )}

                  {template.routeDirection?.tags && template.routeDirection.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.routeDirection.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(template.id);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      预览
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseTemplate(template);
                      }}
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      使用模版
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredTemplates.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          共 {filteredTemplates.length} 个模版
        </div>
      )}

      {/* Create Trip Dialog */}
      {selectedTemplate && (
        <CreateTripFromTemplateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          templateId={selectedTemplate.id}
          templateName={selectedTemplate.nameCN}
          defaultDurationDays={selectedTemplate.durationDays}
          defaultPacePreference={selectedTemplate.defaultPacePreference}
          onSuccess={(tripId) => {
            navigate(`/dashboard/plan-studio?tripId=${tripId}`);
          }}
        />
      )}
    </div>
  );
}

