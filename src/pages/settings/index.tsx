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
import { User as UserIcon, Database, Link2, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { userApi, UserApiError, type User } from '@/api/user';
import { countriesApi } from '@/api/countries';
import type { UserPreferences } from '@/api/user';
import type { Country } from '@/types/country';

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

export default function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'preferences';
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
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

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
      setTimeout(() => setUserUpdateSuccess(false), 3000);
    } catch (err) {
      if (err instanceof UserApiError) {
        setUserError(err.message);
      } else {
        setUserError('更新用户信息失败');
      }
      console.error('Failed to update user:', err);
    } finally {
      setUserUpdating(false);
    }
  };

  // 处理删除账户
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== '确认删除') {
      setUserError('请输入"确认删除"以确认操作');
      return;
    }

    try {
      setDeleting(true);
      setUserError(null);
      await userApi.deleteMe('确认删除');
      // 删除成功后，清除本地状态并跳转到首页
      sessionStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      navigate('/', { replace: true });
      window.location.reload();
    } catch (err) {
      if (err instanceof UserApiError) {
        setUserError(err.message);
      } else {
        setUserError('删除账户失败');
      }
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
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      // 错误由 updateError 处理
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
                        <Select
                          value={formData.nationality || '__none__'}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, nationality: value === '__none__' ? undefined : value }))
                          }
                          disabled={countriesLoading}
                        >
                          <SelectTrigger id="nationality">
                            <SelectValue placeholder={countriesLoading ? '加载中...' : '选择国籍'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">未设置</SelectItem>
                            {countries.map((country) => (
                              <SelectItem key={country.isoCode} value={country.isoCode}>
                                {country.nameCN} ({country.isoCode})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 居住国 */}
                      <div className="space-y-2">
                        <Label htmlFor="residencyCountry">居住国</Label>
                        <Select
                          value={formData.residencyCountry || '__none__'}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, residencyCountry: value === '__none__' ? undefined : value }))
                          }
                          disabled={countriesLoading}
                        >
                          <SelectTrigger id="residencyCountry">
                            <SelectValue placeholder={countriesLoading ? '加载中...' : '选择居住国'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">未设置</SelectItem>
                            {countries.map((country) => (
                              <SelectItem key={country.isoCode} value={country.isoCode}>
                                {country.nameCN} ({country.isoCode})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">日历同步</div>
                      <div className="text-sm text-muted-foreground">同步行程到Google Calendar</div>
                    </div>
                    <Button variant="outline">连接</Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">地图应用</div>
                      <div className="text-sm text-muted-foreground">导出到Google Maps / Apple Maps</div>
                    </div>
                    <Button variant="outline">连接</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

