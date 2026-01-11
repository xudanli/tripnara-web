import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { countriesApi } from '@/api/countries';
import type { UserPreferences } from '@/api/user';
import type { Country } from '@/types/country';

// 可选的景点类型
const ATTRACTION_TYPES = [
  { value: 'ATTRACTION', label: { zh: '景点', en: 'Attraction' } },
  { value: 'NATURE', label: { zh: '自然风光', en: 'Nature' } },
  { value: 'CULTURE', label: { zh: '文化历史', en: 'Culture' } },
  { value: 'ADVENTURE', label: { zh: '冒险', en: 'Adventure' } },
  { value: 'FOOD', label: { zh: '美食', en: 'Food' } },
  { value: 'SHOPPING', label: { zh: '购物', en: 'Shopping' } },
  { value: 'NIGHTLIFE', label: { zh: '夜生活', en: 'Nightlife' } },
  { value: 'BEACH', label: { zh: '海滩', en: 'Beach' } },
];

// 饮食禁忌选项
const DIETARY_RESTRICTIONS = [
  { value: 'VEGETARIAN', label: { zh: '素食', en: 'Vegetarian' } },
  { value: 'VEGAN', label: { zh: '纯素', en: 'Vegan' } },
  { value: 'NO_PORK', label: { zh: '不吃猪肉', en: 'No Pork' } },
  { value: 'NO_BEEF', label: { zh: '不吃牛肉', en: 'No Beef' } },
  { value: 'NO_SEAFOOD', label: { zh: '不吃海鲜', en: 'No Seafood' } },
  { value: 'HALAL', label: { zh: '清真', en: 'Halal' } },
  { value: 'KOSHER', label: { zh: '犹太洁食', en: 'Kosher' } },
  { value: 'GLUTEN_FREE', label: { zh: '无麸质', en: 'Gluten Free' } },
];

// 节奏选项
const PACE_OPTIONS = [
  { value: 'LEISURE', label: { zh: '悠闲', en: 'Leisure' } },
  { value: 'MODERATE', label: { zh: '适中', en: 'Moderate' } },
  { value: 'FAST', label: { zh: '快速', en: 'Fast' } },
];

// 预算选项
const BUDGET_OPTIONS = [
  { value: 'LOW', label: { zh: '低', en: 'Low' } },
  { value: 'MEDIUM', label: { zh: '中', en: 'Medium' } },
  { value: 'HIGH', label: { zh: '高', en: 'High' } },
];

// 住宿选项
const ACCOMMODATION_OPTIONS = [
  { value: 'BUDGET', label: { zh: '经济', en: 'Budget' } },
  { value: 'COMFORTABLE', label: { zh: '舒适', en: 'Comfortable' } },
  { value: 'LUXURY', label: { zh: '豪华', en: 'Luxury' } },
];

// 旅行者标签选项
const TRAVELER_TAGS = [
  { value: 'senior', label: { zh: '老年旅行者', en: 'Senior Traveler' } },
  { value: 'family_with_children', label: { zh: '带小孩家庭', en: 'Family with Children' } },
  { value: 'solo', label: { zh: '独自旅行', en: 'Solo Traveler' } },
  { value: 'adventure', label: { zh: '冒险爱好者', en: 'Adventure Enthusiast' } },
  { value: 'photography', label: { zh: '摄影爱好者', en: 'Photography Enthusiast' } },
];

export default function PreferencesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { preferences, loading, updating, error, updateProfile } = useUserPreferences();

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const currentLang = i18n.language === 'zh' ? 'zh' : 'en';

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

  // 未登录时重定向（等待 auth 加载完成后再检查）
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

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

  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await updateProfile(formData);
      setSubmitSuccess(true);
      // 3秒后清除成功提示
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '保存失败，请稍后重试');
    }
  };

  // 处理重置
  const handleReset = () => {
    setFormData({
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
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  // 等待认证状态加载完成（避免在认证状态未加载完成时就跳转）
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('preferences.loading')}</p>
        </div>
      </div>
    );
  }

  // 如果认证状态已加载但未认证，显示加载中（会在 useEffect 中重定向）
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('preferences.loading')}</p>
        </div>
      </div>
    );
  }

  // 等待用户偏好数据加载
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('preferences.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('preferences.title')}</h1>
          <p className="mt-2 text-gray-600">{t('preferences.description')}</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {submitSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800">{t('preferences.saveSuccess')}</p>
          </div>
        )}

        {/* Submit Error */}
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{submitError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-8">
          {/* 个人信息 */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">{t('preferences.personalInfo') || '个人信息'}</Label>
              <p className="text-sm text-gray-500 mt-1">{t('preferences.personalInfoHint') || '设置您的国籍和居住国家'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 国籍 */}
              <div className="space-y-2">
                <Label htmlFor="nationality">{t('preferences.nationality') || '国籍'}</Label>
                <Select
                  value={formData.nationality || '__none__'}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, nationality: value === '__none__' ? undefined : value }))
                  }
                  disabled={countriesLoading}
                >
                  <SelectTrigger id="nationality">
                    <SelectValue placeholder={countriesLoading ? (t('preferences.loading') || '加载中...') : (t('preferences.selectNationality') || '选择国籍')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('preferences.notSet') || '未设置'}</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country.isoCode} value={country.isoCode}>
                        {currentLang === 'zh' ? country.nameCN : country.nameEN} ({country.isoCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 居住国 */}
              <div className="space-y-2">
                <Label htmlFor="residencyCountry">{t('preferences.residencyCountry') || '居住国'}</Label>
                <Select
                  value={formData.residencyCountry || '__none__'}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, residencyCountry: value === '__none__' ? undefined : value }))
                  }
                  disabled={countriesLoading}
                >
                  <SelectTrigger id="residencyCountry">
                    <SelectValue placeholder={countriesLoading ? (t('preferences.loading') || '加载中...') : (t('preferences.selectResidencyCountry') || '选择居住国')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('preferences.notSet') || '未设置'}</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country.isoCode} value={country.isoCode}>
                        {currentLang === 'zh' ? country.nameCN : country.nameEN} ({country.isoCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 旅行者标签 */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">{t('preferences.travelerTags') || '旅行者标签'}</Label>
              <p className="text-sm text-gray-500 mt-1">{t('preferences.travelerTagsHint') || '选择适合您的旅行者标签'}</p>
            </div>
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
                    {tag.label[currentLang]}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* 景点类型 */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">{t('preferences.attractionTypes')}</Label>
              <p className="text-sm text-gray-500 mt-1">{t('preferences.attractionTypesHint')}</p>
            </div>
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
                    {type.label[currentLang]}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* 饮食禁忌 */}
          <div className="space-y-4 border-t pt-6">
            <div>
              <Label className="text-base font-semibold">{t('preferences.dietaryRestrictions')}</Label>
              <p className="text-sm text-gray-500 mt-1">{t('preferences.dietaryRestrictionsHint')}</p>
            </div>
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
                    {restriction.label[currentLang]}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* 偏好小众景点 */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">{t('preferences.preferOffbeat')}</Label>
                <p className="text-sm text-gray-500 mt-1">{t('preferences.preferOffbeatHint')}</p>
              </div>
              <Switch
                checked={formData.preferOffbeatAttractions}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, preferOffbeatAttractions: checked }))
                }
              />
            </div>
          </div>

          {/* 出行偏好 */}
          <div className="space-y-6 border-t pt-6">
            <div>
              <Label className="text-base font-semibold">{t('preferences.travelPreferences')}</Label>
              <p className="text-sm text-gray-500 mt-1">{t('preferences.travelPreferencesHint')}</p>
            </div>

            {/* 节奏 */}
            <div className="space-y-3">
              <Label>{t('preferences.pace')}</Label>
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
                      {option.label[currentLang]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* 预算 */}
            <div className="space-y-3">
              <Label>{t('preferences.budget')}</Label>
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
                      {option.label[currentLang]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* 住宿 */}
            <div className="space-y-3">
              <Label>{t('preferences.accommodation')}</Label>
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
                      {option.label[currentLang]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 border-t pt-6">
            <Button type="button" variant="outline" onClick={handleReset} disabled={updating}>
              {t('preferences.reset')}
            </Button>
            <Button type="submit" disabled={updating}>
              {updating ? t('preferences.saving') : t('preferences.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

