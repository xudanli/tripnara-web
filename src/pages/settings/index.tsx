import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogoLoading } from '@/components/common/LogoLoading';
import { ContactUsDialog } from '@/components/common/ContactUsDialog';
import {
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  Dumbbell,
  Shield,
  LogOut,
  HelpCircle,
  Pencil,
} from 'lucide-react';
import { userApi, UserApiError, type User } from '@/api/user';
import { toast } from 'sonner';
import { useFitnessContext } from '@/contexts/FitnessContext';
import { FitnessQuestionnaireDialog } from '@/components/fitness';
import { DimensionRadarChart } from '@/components/fitness/DimensionRadarChart';
import { FitnessLevelBadge } from '@/components/fitness/FitnessLevelBadge';
import { AccountGovernancePanel } from '@/components/account-governance';
import { useAccountCapabilities } from '@/hooks/useAccountCapabilities';
import { useAuth } from '@/hooks/useAuth';
import { FITNESS_LEVEL_CONFIG, DEFAULT_FITNESS_PROFILE } from '@/constants/fitness';
import { cn } from '@/lib/utils';

const SETTINGS_SECTIONS = [
  { id: 'account', label: '账户信息', icon: UserIcon },
  { id: 'governance', label: '身份与权限', icon: Shield },
  { id: 'fitness', label: '体能画像', icon: Dumbbell },
] as const;

type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id'];

const LEGACY_TAB_REDIRECTS: Record<string, SettingsSectionId> = {
  profile: 'governance',
  optimization: 'account',
  preferences: 'account',
  integrations: 'account',
  data: 'account',
  billing: 'account',
  notifications: 'account',
};

function resolveSectionId(raw: string | null): SettingsSectionId {
  if (!raw) return 'account';
  if (raw in LEGACY_TAB_REDIRECTS) return LEGACY_TAB_REDIRECTS[raw];
  return SETTINGS_SECTIONS.some((s) => s.id === raw) ? (raw as SettingsSectionId) : 'account';
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) return name.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return 'U';
}

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout } = useAuth();

  const activeSection = resolveSectionId(searchParams.get('tab'));

  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userUpdating, setUserUpdating] = useState(false);
  const [userUpdateSuccess, setUserUpdateSuccess] = useState(false);
  const [contactUsOpen, setContactUsOpen] = useState(false);

  const [accountFormData, setAccountFormData] = useState({
    displayName: '',
    avatarUrl: '',
  });

  const { profile: fitnessProfile, isDefault: isFitnessDefault, isLoading: fitnessLoading } = useFitnessContext();
  const [fitnessQuestionnaireOpen, setFitnessQuestionnaireOpen] = useState(false);
  const { data: accountCapabilities, isLoading: accountCapabilitiesLoading } = useAccountCapabilities();

  const setActiveSection = (sectionId: SettingsSectionId) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', sectionId);
    setSearchParams(newParams, { replace: true });
  };

  useEffect(() => {
    const raw = searchParams.get('tab');
    const normalized = resolveSectionId(raw);
    if (raw && raw !== normalized) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('tab', normalized);
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

    loadUser();
  }, []);

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

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const fitnessLevelConfig = FITNESS_LEVEL_CONFIG[fitnessProfile.fitnessLevel] ?? FITNESS_LEVEL_CONFIG.MEDIUM;
  const fitnessDimensions = fitnessProfile.dimensions ?? DEFAULT_FITNESS_PROFILE.dimensions;

  const sectionTitle = SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.label ?? '设置';

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-sm text-muted-foreground mt-1">
          管理账户、身份权限与体能画像
        </p>
      </div>

      <div className="flex-1 flex min-h-0">
        <aside className="w-52 shrink-0 border-r bg-white flex flex-col">
          <nav className="flex-1 p-3 space-y-1">
            {SETTINGS_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </nav>

          <div className="border-t p-3 space-y-1">
            <button
              type="button"
              onClick={() => setContactUsOpen(true)}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            >
              <HelpCircle className="h-4 w-4 shrink-0" />
              帮助中心
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gate-reject-foreground hover:bg-gate-reject transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              退出登录
            </button>
          </div>
        </aside>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl">
            <h2 className="text-lg font-semibold mb-6">{sectionTitle}</h2>

            {activeSection === 'account' && (
              <div id="settings-account">
                {userLoading ? (
                  <Card>
                    <CardContent className="py-12">
                      <div className="flex items-center justify-center">
                        <LogoLoading size={40} />
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <form onSubmit={handleAccountSubmit}>
                    {userError && (
                      <Card className="border-gate-reject-border bg-gate-reject mb-6">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-2 text-gate-reject-foreground">
                            <AlertCircle className="h-5 w-5" />
                            <span>{userError}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {userUpdateSuccess && (
                      <Card className="border-gate-allow-border bg-gate-allow mb-6">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-2 text-gate-allow-foreground">
                            <CheckCircle2 className="h-5 w-5" />
                            <span>账户信息已更新</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardContent className="pt-6 space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Avatar className="h-20 w-20">
                              <AvatarImage
                                src={accountFormData.avatarUrl || user?.avatarUrl || undefined}
                                alt={accountFormData.displayName || user?.email || 'User'}
                              />
                              <AvatarFallback className="text-xl">
                                {getInitials(accountFormData.displayName || user?.displayName, user?.email)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border bg-background shadow-sm">
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{accountFormData.displayName || user?.displayName || '用户'}</p>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
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
                            <Label htmlFor="avatarUrl">头像 URL</Label>
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
                        </div>

                        <div className="space-y-2">
                          <Label>邮箱</Label>
                          <div className="flex items-center gap-3">
                            <Input
                              type="email"
                              value={user?.email || ''}
                              disabled
                              className="bg-muted/50 flex-1"
                            />
                            <Badge variant={user?.emailVerified ? 'default' : 'outline'}>
                              {user?.emailVerified ? '已验证' : '未验证'}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
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
              </div>
            )}

            {activeSection === 'governance' && (
              <div id="settings-governance" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  订阅、专业认证与发布权限相互独立；付费不能替代认证。
                </p>
                <AccountGovernancePanel
                  capabilities={accountCapabilities}
                  isLoading={accountCapabilitiesLoading}
                  layout="settings-grid"
                />
              </div>
            )}

            {activeSection === 'fitness' && (
              <div id="settings-fitness" className="space-y-6">
                {fitnessLoading ? (
                  <Card>
                    <CardContent className="py-12">
                      <div className="flex items-center justify-center">
                        <LogoLoading size={40} />
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid gap-6 lg:grid-cols-5">
                      <Card className="lg:col-span-3">
                        <CardHeader>
                          <CardTitle className="text-base">能力维度</CardTitle>
                          <CardDescription>
                            {isFitnessDefault ? '当前使用默认参数，完成评估后可获得更精准推荐' : fitnessProfile.levelDescription}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                'flex h-16 w-16 items-center justify-center rounded-full border-4',
                                fitnessLevelConfig.borderColor,
                                fitnessLevelConfig.bgColor,
                              )}
                            >
                              <span className={cn('text-xl font-bold', fitnessLevelConfig.color)}>
                                {fitnessProfile.overallScore}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <FitnessLevelBadge level={fitnessProfile.fitnessLevel} />
                              {isFitnessDefault && (
                                <Badge variant="outline" className="ml-0">
                                  默认画像
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-center py-2">
                            <DimensionRadarChart dimensions={fitnessDimensions} size={240} />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="lg:col-span-2 flex flex-col">
                        <CardHeader>
                          <CardTitle className="text-base">重新评估</CardTitle>
                          <CardDescription>
                            通过简短问卷更新您的体能画像，帮助系统推荐更合适的行程强度。
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col justify-between gap-4">
                          <div className="space-y-3 text-sm text-muted-foreground">
                            <p>推荐单日爬升：{fitnessProfile.recommendedDailyAscentM} 米</p>
                            <p>推荐单日距离：{fitnessProfile.recommendedDailyDistanceKm} 公里</p>
                          </div>
                          <Button className="w-full" onClick={() => setFitnessQuestionnaireOpen(true)}>
                            {isFitnessDefault ? '开始评估' : '重新评估'}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                      体能画像会影响行程难度推荐与风险提示，建议出发前保持更新。
                    </div>
                  </>
                )}

                <FitnessQuestionnaireDialog
                  open={fitnessQuestionnaireOpen}
                  onOpenChange={setFitnessQuestionnaireOpen}
                  onComplete={() => {
                    setFitnessQuestionnaireOpen(false);
                  }}
                  trigger="settings_page"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ContactUsDialog open={contactUsOpen} onOpenChange={setContactUsOpen} />
    </div>
  );
}
