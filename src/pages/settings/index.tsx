import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { User as UserIcon, Database, Link2, AlertCircle, CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useIntegrationAuth } from '@/hooks/useIntegrationAuth';
import { userApi, UserApiError, type User } from '@/api/user';
import { countriesApi } from '@/api/countries';
import type { UserPreferences } from '@/api/user';
import type { Country } from '@/types/country';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// 可选的景点类型
const ATTRACTION_TYPES = [
  { value: 'ATTRACTION', label: '景点' },
  { value: 'NATURE', label: '自然风光' },
  { value: 'CULTURE', label: '文化历史' },
  { value: 'ADVENTURE', label: '冒险' },
  { value: 'FOOD', label: '美食' },
  { value: 'SHOPPING', label: '购物' },
  { value: 'NIGHTLIFE', label: '夜生活' },
  { value: 'BEACH', label: '海滩' },
];

// 饮食禁忌选项
const DIETARY_RESTRICTIONS = [
  { value: 'VEGETARIAN', label: '素食' },
  { value: 'VEGAN', label: '纯素' },
  { value: 'NO_PORK', label: '不吃猪肉' },
  { value: 'NO_BEEF', label: '不吃牛肉' },
  { value: 'NO_SEAFOOD', label: '不吃海鲜' },
  { value: 'HALAL', label: '清真' },
  { value: 'KOSHER', label: '犹太洁食' },
  { value: 'GLUTEN_FREE', label: '无麸质' },
];

// 节奏选项
const PACE_OPTIONS = [
  { value: 'LEISURE', label: '悠闲' },
  { value: 'MODERATE', label: '适中' },
  { value: 'FAST', label: '快速' },
];

// 预算选项
const BUDGET_OPTIONS = [
  { value: 'LOW', label: '低' },
  { value: 'MEDIUM', label: '中' },
  { value: 'HIGH', label: '高' },
];

// 住宿选项
const ACCOMMODATION_OPTIONS = [
  { value: 'BUDGET', label: '经济' },
  { value: 'COMFORTABLE', label: '舒适' },
  { value: 'LUXURY', label: '豪华' },
];

// 旅行者标签选项
const TRAVELER_TAGS = [
  { value: 'senior', label: '老年旅行者' },
  { value: 'family_with_children', label: '带小孩家庭' },
  { value: 'solo', label: '独自旅行' },
  { value: 'adventure', label: '冒险爱好者' },
  { value: 'photography', label: '摄影爱好者' },
];

// 集成授权卡片组件
interface IntegrationCardProps {
  service: 'google-calendar' | 'browserbase' | 'airbnb';
  title: string;
  description: string;
  iconSrc: string;
  iconAlt: string;
}

function IntegrationCard({ service, title, description, iconSrc, iconAlt }: IntegrationCardProps) {
  const {
    status,
    loading,
    error,
    authorizing,
    isAuthorized,
    authorize,
    revoke,
  } = useIntegrationAuth(service);

  const handleAuthorize = async () => {
    try {
      await authorize();
      toast.success('授权成功');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '授权失败');
    }
  };

  const handleRevoke = async () => {
    try {
      await revoke();
      toast.success('已撤销授权');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '撤销授权失败');
    }
  };

  const getStatusBadge = () => {
    if (loading || authorizing) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {authorizing ? '授权中...' : '加载中...'}
        </div>
      );
    }

    if (isAuthorized) {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          已连接
        </div>
      );
    }

    if (status === 'expired') {
      return (
        <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="h-4 w-4" />
          已过期
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        未连接
      </div>
    );
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
          <img 
            src={iconSrc} 
            alt={iconAlt} 
            className="w-full h-full object-contain p-1"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-medium">{title}</div>
            {getStatusBadge()}
          </div>
          <div className="text-sm text-muted-foreground">{description}</div>
          {error && (
            <div className="text-sm text-destructive mt-1">{error}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isAuthorized ? (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRevoke}
            disabled={loading}
          >
            断开连接
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleAuthorize}
            disabled={loading || authorizing}
          >
            {authorizing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                授权中...
              </>
            ) : (
              '连接'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // 支持的 tab 值：account, preferences, data, integrations
  // 如果 URL 参数是 'profile'，映射到 'account'（个人资料在账户 tab 中）
  const rawTabParam = searchParams.get('tab') || 'preferences';
  const tabParam = rawTabParam === 'profile' ? 'account' : rawTabParam;
  const [activeTab, setActiveTab] = useState(tabParam);

  const {
    preferences,
    loading,
    updating,
    error,
    updateError,
    updateProfile,
  } = useUserPreferences();

  // 用户信息相关状态
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userUpdating, setUserUpdating] = useState(false);
  const [userUpdateSuccess, setUserUpdateSuccess] = useState(false);
  
  // 账户表单数据
  const [accountFormData, setAccountFormData] = useState({
    displayName: '',
    avatarUrl: '',
  });
  
  // 删除账户相关状态
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 当URL参数变化时更新Tab
  useEffect(() => {
    const rawTabParam = searchParams.get('tab') || 'preferences';
    const normalizedTab = rawTabParam === 'profile' ? 'account' : rawTabParam;
    // 验证 tab 值是否有效
    const validTabs = ['account', 'preferences', 'data', 'integrations'];
    const finalTab = validTabs.includes(normalizedTab) ? normalizedTab : 'preferences';
    setActiveTab(finalTab);
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', value);
    setSearchParams(newParams);
  };

  const [formData, setFormData] = useState<UserPreferences>({
    nationality: undefined,
    residencyCountry: undefined,
    tags: [],
    preferredAttractionTypes: [],
    dietaryRestrictions: [],
    preferOffbeatAttractions: false,
    travelPreferences: {
      pace: undefined,
      budget: undefined,
      accommodation: undefined,
    },
  });

  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // 🆕 国家选择器搜索状态
  const [nationalityOpen, setNationalityOpen] = useState(false);
  const [nationalitySearchQuery, setNationalitySearchQuery] = useState('');
  const [residencyOpen, setResidencyOpen] = useState(false);
  const [residencySearchQuery, setResidencySearchQuery] = useState('');

  // 加载用户信息
  useEffect(() => {
    const loadUser = async () => {
      try {
        setUserLoading(true);
        setUserError(null);
        const userData = await userApi.getMe();
        setUser(userData);
        setAccountFormData({
          displayName: userData.displayName || '',
          avatarUrl: userData.avatarUrl || '',
        });
      } catch (err) {
        if (err instanceof UserApiError) {
          setUserError(err.message);
        } else {
          setUserError('加载用户信息失败');
        }
        console.error('Failed to load user:', err);
      } finally {
        setUserLoading(false);
      }
    };
    
    // 只在账户标签页时加载用户信息
    if (activeTab === 'account') {
      loadUser();
    }
  }, [activeTab]);

  // 加载国家列表
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setCountriesLoading(true);
        const response = await countriesApi.getAll();
        const data = response.countries || [];
        setCountries(data);
      } catch (err) {
        console.error('Failed to load countries:', err);
      } finally {
        setCountriesLoading(false);
      }
    };
    loadCountries();
  }, []);

  // 初始化表单数据
  useEffect(() => {
    if (preferences) {
      setFormData({
        nationality: preferences.nationality,
        residencyCountry: preferences.residencyCountry,
        tags: preferences.tags || [],
        preferredAttractionTypes: preferences.preferredAttractionTypes || [],
        dietaryRestrictions: preferences.dietaryRestrictions || [],
        preferOffbeatAttractions: preferences.preferOffbeatAttractions ?? false,
        travelPreferences: {
          pace: preferences.travelPreferences?.pace,
          budget: preferences.travelPreferences?.budget,
          accommodation: preferences.travelPreferences?.accommodation,
        },
      });
    }
  }, [preferences]);

  // 处理旅行者标签选择
  const handleTagToggle = (value: string) => {
    setFormData((prev) => {
      const current = prev.tags || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, tags: updated };
    });
  };

  // 处理景点类型选择
  const handleAttractionTypeToggle = (value: string) => {
    setFormData((prev) => {
      const current = prev.preferredAttractionTypes || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, preferredAttractionTypes: updated };
    });
  };

  // 处理饮食禁忌选择
  const handleDietaryRestrictionToggle = (value: string) => {
    setFormData((prev) => {
      const current = prev.dietaryRestrictions || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, dietaryRestrictions: updated };
    });
  };

  // 处理账户信息提交
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserUpdateSuccess(false);
    setUserError(null);

    try {
      setUserUpdating(true);
      const updatedUser = await userApi.updateMe({
        displayName: accountFormData.displayName || undefined,
        avatarUrl: accountFormData.avatarUrl || undefined,
      });
      setUser(updatedUser);
      setUserUpdateSuccess(true);
      toast.success('账户信息已更新', {
        description: '您的账户信息已成功保存',
        duration: 3000,
      });
      setTimeout(() => setUserUpdateSuccess(false), 3000);
    } catch (err) {
      const errorMessage = err instanceof UserApiError ? err.message : '更新用户信息失败';
      setUserError(errorMessage);
      toast.error('更新失败', {
        description: errorMessage,
        duration: 5000,
      });
      console.error('Failed to update user:', err);
    } finally {
      setUserUpdating(false);
    }
  };

  // 处理删除账户
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== '确认删除') {
      const errorMsg = '请输入"确认删除"以确认操作';
      setUserError(errorMsg);
      // 移除 toast.error，只使用页面内的错误提示，避免"两次弹窗"的感觉
      return;
    }

    try {
      setDeleting(true);
      setUserError(null);
      await userApi.deleteMe('确认删除');
      // 删除成功后，显示提示并跳转
      toast.success('账户已删除', {
        description: '您的账户及其所有数据已永久删除',
        duration: 2000,
      });
      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        sessionStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/', { replace: true });
        window.location.reload();
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof UserApiError ? err.message : '删除账户失败';
      setUserError(errorMessage);
      toast.error('删除失败', {
        description: errorMessage,
        duration: 5000,
      });
      console.error('Failed to delete account:', err);
      setDeleting(false);
    }
  };

  // 处理偏好提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(false);

    try {
      await updateProfile(formData);
      setSubmitSuccess(true);
      toast.success('偏好设置已保存', {
        description: '您的偏好设置已成功保存',
        duration: 3000,
      });
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      // 错误由 updateError 处理，但也要显示 toast 提示
      const errorMessage = updateError || (err instanceof Error ? err.message : '保存偏好设置失败');
      toast.error('保存失败', {
        description: errorMessage,
        duration: 5000,
      });
      console.error('Failed to update preferences:', err);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部 */}
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-sm text-muted-foreground mt-1">
          账户、偏好、数据、集成
        </p>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList>
              <TabsTrigger value="account">账户</TabsTrigger>
              <TabsTrigger value="preferences">偏好</TabsTrigger>
              <TabsTrigger value="data">数据</TabsTrigger>
              <TabsTrigger value="integrations">集成</TabsTrigger>
            </TabsList>

            {/* 账户 */}
            <TabsContent value="account" className="space-y-6">
              {userLoading ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="flex items-center justify-center">
                      <Spinner className="w-8 h-8" />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <form onSubmit={handleAccountSubmit}>
                  {/* 错误提示 */}
                  {userError && (
                    <Card className="border-red-200 bg-red-50 mb-6">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-red-800">
                          <AlertCircle className="h-5 w-5" />
                          <span>{userError}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 成功提示 */}
                  {userUpdateSuccess && (
                    <Card className="border-green-200 bg-green-50 mb-6">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-green-800">
                          <CheckCircle2 className="h-5 w-5" />
                          <span>账户信息已更新</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5" />
                        账户信息
                      </CardTitle>
                      <CardDescription>更新您的显示名称和头像</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="displayName">显示名称</Label>
                        <Input
                          id="displayName"
                          placeholder="输入显示名称"
                          value={accountFormData.displayName}
                          onChange={(e) =>
                            setAccountFormData((prev) => ({ ...prev, displayName: e.target.value }))
                          }
                          maxLength={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="avatarUrl">头像URL</Label>
                        <Input
                          id="avatarUrl"
                          type="url"
                          placeholder="https://example.com/avatar.jpg"
                          value={accountFormData.avatarUrl}
                          onChange={(e) =>
                            setAccountFormData((prev) => ({ ...prev, avatarUrl: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>邮箱</Label>
                        <Input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="bg-gray-50"
                        />
                        <p className="text-sm text-muted-foreground">
                          {user?.emailVerified ? '邮箱已验证' : '邮箱未验证'}
                        </p>
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={userUpdating}>
                          {userUpdating ? (
                            <>
                              <Spinner className="w-4 h-4 mr-2" />
                              保存中...
                            </>
                          ) : (
                            '保存更改'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </form>
              )}
            </TabsContent>

            {/* 偏好 */}
            <TabsContent value="preferences" className="space-y-6">
              {loading ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="flex items-center justify-center">
                      <Spinner className="w-8 h-8" />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* 错误提示 */}
                  {(error || updateError) && (
                    <Card className="border-red-200 bg-red-50 mb-6">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-red-800">
                          <AlertCircle className="h-5 w-5" />
                          <span>{error || updateError}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 成功提示 */}
                  {submitSuccess && (
                    <Card className="border-green-200 bg-green-50 mb-6">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-green-800">
                          <CheckCircle2 className="h-5 w-5" />
                          <span>偏好设置已保存</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 个人信息 */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>个人信息</CardTitle>
                      <CardDescription>设置您的国籍和居住国家</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* 国籍 */}
                      <div className="space-y-2">
                        <Label htmlFor="nationality">国籍</Label>
                        <Popover open={nationalityOpen} onOpenChange={setNationalityOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              id="nationality"
                              variant="outline"
                              role="combobox"
                              aria-expanded={nationalityOpen}
                              className="w-full justify-between"
                              disabled={countriesLoading}
                            >
                              {formData.nationality
                                ? countries.find((c) => c.isoCode === formData.nationality)?.nameCN || formData.nationality
                                : countriesLoading
                                ? '加载中...'
                                : '选择国籍'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-none p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="搜索国家..."
                                value={nationalitySearchQuery}
                                onValueChange={setNationalitySearchQuery}
                              />
                              <CommandList className="max-h-[300px]">
                                <CommandEmpty>
                                  {nationalitySearchQuery ? '未找到匹配的国家' : '暂无国家数据'}
                                </CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="__none__"
                                    onSelect={() => {
                                      setFormData((prev) => ({ ...prev, nationality: undefined }));
                                      setNationalityOpen(false);
                                      setNationalitySearchQuery('');
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        !formData.nationality ? 'opacity-100' : 'opacity-0'
                                      )}
                                    />
                                    未设置
                                  </CommandItem>
                                  {countries
                                    .filter((country) => {
                                      if (!nationalitySearchQuery) return true;
                                      const query = nationalitySearchQuery.toLowerCase();
                                      return (
                                        country.nameCN?.toLowerCase().includes(query) ||
                                        country.nameEN?.toLowerCase().includes(query) ||
                                        country.isoCode?.toLowerCase().includes(query)
                                      );
                                    })
                                    .map((country) => (
                                      <CommandItem
                                        key={country.isoCode}
                                        value={`${country.nameCN} ${country.nameEN} ${country.isoCode}`}
                                        onSelect={() => {
                                          setFormData((prev) => ({ ...prev, nationality: country.isoCode }));
                                          setNationalityOpen(false);
                                          setNationalitySearchQuery('');
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            'mr-2 h-4 w-4',
                                            formData.nationality === country.isoCode ? 'opacity-100' : 'opacity-0'
                                          )}
                                        />
                                        {country.nameCN} ({country.isoCode})
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* 居住国 */}
                      <div className="space-y-2">
                        <Label htmlFor="residencyCountry">居住国</Label>
                        <Popover open={residencyOpen} onOpenChange={setResidencyOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              id="residencyCountry"
                              variant="outline"
                              role="combobox"
                              aria-expanded={residencyOpen}
                              className="w-full justify-between"
                              disabled={countriesLoading}
                            >
                              {formData.residencyCountry
                                ? countries.find((c) => c.isoCode === formData.residencyCountry)?.nameCN || formData.residencyCountry
                                : countriesLoading
                                ? '加载中...'
                                : '选择居住国'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-none p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="搜索国家..."
                                value={residencySearchQuery}
                                onValueChange={setResidencySearchQuery}
                              />
                              <CommandList className="max-h-[300px]">
                                <CommandEmpty>
                                  {residencySearchQuery ? '未找到匹配的国家' : '暂无国家数据'}
                                </CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="__none__"
                                    onSelect={() => {
                                      setFormData((prev) => ({ ...prev, residencyCountry: undefined }));
                                      setResidencyOpen(false);
                                      setResidencySearchQuery('');
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        !formData.residencyCountry ? 'opacity-100' : 'opacity-0'
                                      )}
                                    />
                                    未设置
                                  </CommandItem>
                                  {countries
                                    .filter((country) => {
                                      if (!residencySearchQuery) return true;
                                      const query = residencySearchQuery.toLowerCase();
                                      return (
                                        country.nameCN?.toLowerCase().includes(query) ||
                                        country.nameEN?.toLowerCase().includes(query) ||
                                        country.isoCode?.toLowerCase().includes(query)
                                      );
                                    })
                                    .map((country) => (
                                      <CommandItem
                                        key={country.isoCode}
                                        value={`${country.nameCN} ${country.nameEN} ${country.isoCode}`}
                                        onSelect={() => {
                                          setFormData((prev) => ({ ...prev, residencyCountry: country.isoCode }));
                                          setResidencyOpen(false);
                                          setResidencySearchQuery('');
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            'mr-2 h-4 w-4',
                                            formData.residencyCountry === country.isoCode ? 'opacity-100' : 'opacity-0'
                                          )}
                                        />
                                        {country.nameCN} ({country.isoCode})
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 旅行者标签 */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>旅行者标签</CardTitle>
                      <CardDescription>选择适合您的旅行者标签</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {TRAVELER_TAGS.map((tag) => (
                          <div key={tag.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`tag-${tag.value}`}
                              checked={formData.tags?.includes(tag.value)}
                              onCheckedChange={() => handleTagToggle(tag.value)}
                            />
                            <Label
                              htmlFor={`tag-${tag.value}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {tag.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 景点类型 */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>喜欢的景点类型</CardTitle>
                      <CardDescription>选择您感兴趣的景点类型</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {ATTRACTION_TYPES.map((type) => (
                          <div key={type.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`attraction-${type.value}`}
                              checked={formData.preferredAttractionTypes?.includes(type.value)}
                              onCheckedChange={() => handleAttractionTypeToggle(type.value)}
                            />
                            <Label
                              htmlFor={`attraction-${type.value}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {type.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 饮食禁忌 */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>饮食禁忌</CardTitle>
                      <CardDescription>选择您的饮食限制</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {DIETARY_RESTRICTIONS.map((restriction) => (
                          <div key={restriction.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`dietary-${restriction.value}`}
                              checked={formData.dietaryRestrictions?.includes(restriction.value)}
                              onCheckedChange={() => handleDietaryRestrictionToggle(restriction.value)}
                            />
                            <Label
                              htmlFor={`dietary-${restriction.value}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {restriction.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 偏好小众景点 */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>偏好小众景点</CardTitle>
                      <CardDescription>是否偏好探索小众、非热门的景点</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>偏好小众景点</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            开启后，系统会优先推荐小众、非热门的景点
                          </p>
                        </div>
                        <Switch
                          checked={formData.preferOffbeatAttractions}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({ ...prev, preferOffbeatAttractions: checked }))
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* 出行偏好 */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>出行偏好</CardTitle>
                      <CardDescription>设置您的旅行节奏、预算和住宿偏好</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* 节奏 */}
                      <div className="space-y-3">
                        <Label>节奏偏好</Label>
                        <RadioGroup
                          value={formData.travelPreferences?.pace}
                          onValueChange={(value: 'LEISURE' | 'MODERATE' | 'FAST') =>
                            setFormData((prev) => ({
                              ...prev,
                              travelPreferences: { ...prev.travelPreferences, pace: value },
                            }))
                          }
                        >
                          {PACE_OPTIONS.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem value={option.value} id={`pace-${option.value}`} />
                              <Label htmlFor={`pace-${option.value}`} className="font-normal cursor-pointer">
                                {option.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>

                      {/* 预算 */}
                      <div className="space-y-3">
                        <Label>预算偏好</Label>
                        <RadioGroup
                          value={formData.travelPreferences?.budget}
                          onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH') =>
                            setFormData((prev) => ({
                              ...prev,
                              travelPreferences: { ...prev.travelPreferences, budget: value },
                            }))
                          }
                        >
                          {BUDGET_OPTIONS.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem value={option.value} id={`budget-${option.value}`} />
                              <Label htmlFor={`budget-${option.value}`} className="font-normal cursor-pointer">
                                {option.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>

                      {/* 住宿 */}
                      <div className="space-y-3">
                        <Label>住宿偏好</Label>
                        <RadioGroup
                          value={formData.travelPreferences?.accommodation}
                          onValueChange={(value: 'BUDGET' | 'COMFORTABLE' | 'LUXURY') =>
                            setFormData((prev) => ({
                              ...prev,
                              travelPreferences: { ...prev.travelPreferences, accommodation: value },
                            }))
                          }
                        >
                          {ACCOMMODATION_OPTIONS.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem value={option.value} id={`accommodation-${option.value}`} />
                              <Label
                                htmlFor={`accommodation-${option.value}`}
                                className="font-normal cursor-pointer"
                              >
                                {option.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 提交按钮 */}
                  <div className="flex justify-end">
                    <Button type="submit" disabled={updating}>
                      {updating ? (
                        <>
                          <Spinner className="w-4 h-4 mr-2" />
                          保存中...
                        </>
                      ) : (
                        '保存偏好'
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>

            {/* 数据 */}
            <TabsContent value="data" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    数据管理
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">导出数据</div>
                      <div className="text-sm text-muted-foreground">导出所有行程和偏好数据</div>
                    </div>
                    <Button variant="outline">导出</Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg border-red-200">
                    <div>
                      <div className="font-medium text-red-600">删除账户</div>
                      <div className="text-sm text-muted-foreground">
                        永久删除所有数据，此操作不可撤销
                      </div>
                    </div>
                    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除账户
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除账户</AlertDialogTitle>
                          <AlertDialogDescription>
                            此操作将永久删除您的账户及其所有关联数据，包括：
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>所有行程数据</li>
                              <li>用户偏好设置</li>
                              <li>其他关联数据</li>
                            </ul>
                            <p className="mt-4 font-medium text-red-600">
                              此操作不可撤销！
                            </p>
                            <div className="mt-4 space-y-2">
                              <Label htmlFor="deleteConfirm">
                                请输入"确认删除"以确认操作：
                              </Label>
                              <Input
                                id="deleteConfirm"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="确认删除"
                              />
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        {userError && (
                          <div className="flex items-center gap-2 text-red-600 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>{userError}</span>
                          </div>
                        )}
                        <AlertDialogFooter>
                          <AlertDialogCancel
                            onClick={() => {
                              setDeleteConfirmText('');
                              setUserError(null);
                            }}
                          >
                            取消
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={deleting || deleteConfirmText !== '确认删除'}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deleting ? (
                              <>
                                <Spinner className="w-4 h-4 mr-2" />
                                删除中...
                              </>
                            ) : (
                              '确认删除'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 集成 */}
            <TabsContent value="integrations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    第三方集成
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <IntegrationCard
                    service="google-calendar"
                    title="日历同步"
                    description="同步行程到Google Calendar"
                    iconSrc="/images/personas/Google Calendar.png"
                    iconAlt="Google Calendar"
                  />
                  <IntegrationCard
                    service="browserbase"
                    title="浏览器自动化"
                    description="使用浏览器自动化功能进行数据抓取"
                    iconSrc="/images/personas/google maps.png"
                    iconAlt="Browserbase"
                  />
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                        <img 
                          src="/images/personas/google maps.png" 
                          alt="Google Maps" 
                          className="w-full h-full object-contain p-1"
                        />
                      </div>
                      <div>
                        <div className="font-medium">地图应用</div>
                        <div className="text-sm text-muted-foreground">导出到Google Maps / Apple Maps</div>
                      </div>
                    </div>
                    <Button variant="outline" disabled>即将推出</Button>
                  </div>
                  <IntegrationCard
                    service="airbnb"
                    title="Airbnb"
                    description="同步住宿预订信息到行程"
                    iconSrc="/images/personas/airbnb.png"
                    iconAlt="Airbnb"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

