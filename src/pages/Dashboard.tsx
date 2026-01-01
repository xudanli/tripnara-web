import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { tripsApi } from '@/api/trips';
import { countriesApi } from '@/api/countries';
import { routeDirectionsApi } from '@/api/route-directions';
import type { TripListItem, TripDetail, AttentionItem } from '@/types/trip';
import type { Country } from '@/types/country';
import type { RouteTemplate } from '@/types/places-routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, MapPin, Calendar, Eye, AlertCircle, AlertTriangle, Shield, BarChart3, Plus, HelpCircle, Sparkles } from 'lucide-react';
import { EmptyTemplatesIllustration } from '@/components/illustrations';
import { cn } from '@/lib/utils';
import { useDrawer } from '@/components/layout/DashboardLayout';
import { format } from 'date-fns';
import WelcomeModal from '@/components/onboarding/WelcomeModal';
import Checklist from '@/components/onboarding/Checklist';
import SpotlightTour from '@/components/onboarding/SpotlightTour';
import type { TourStep } from '@/components/onboarding/SpotlightTour';
import { useOnboarding } from '@/hooks/useOnboarding';
import { CreateTripFromTemplateDialog } from '@/components/trips/CreateTripFromTemplateDialog';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setDrawerOpen, setDrawerTab, setHighlightItemId } = useDrawer();
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [recentTrip, setRecentTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [countryMap, setCountryMap] = useState<Map<string, Country>>(new Map());
  const [templates, setTemplates] = useState<RouteTemplate[]>([]);
  const [blockersCount, setBlockersCount] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RouteTemplate | null>(null);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [loadingAttentionQueue, setLoadingAttentionQueue] = useState(false);
  
  // Onboarding
  const {
    isFirstTime,
    showChecklist,
    state: onboardingState,
    completeWelcome,
    completeStep,
    completeTour,
    dismiss,
  } = useOnboarding();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showHomeTour, setShowHomeTour] = useState(false);
  const [inactiveTimer, setInactiveTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    loadAttentionQueue();
    
    // 首次登录显示 Welcome Modal
    if (isFirstTime) {
      setShowWelcomeModal(true);
    }
  }, [isFirstTime]);

  // 检测用户卡住（30秒无操作）
  useEffect(() => {
    if (!showChecklist || onboardingState.dismissed) return;

    const resetTimer = () => {
      if (inactiveTimer) {
        clearTimeout(inactiveTimer);
      }
      const timer = setTimeout(() => {
        // 显示帮助提示
        console.log('User inactive, show help');
      }, 30000);
      setInactiveTimer(timer);
    };

    resetTimer();
    window.addEventListener('mousedown', resetTimer);
    window.addEventListener('keydown', resetTimer);

    return () => {
      window.removeEventListener('mousedown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      if (inactiveTimer) {
        clearTimeout(inactiveTimer);
      }
    };
  }, [showChecklist, onboardingState.dismissed]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 加载国家、行程和模板
      // 模板接口调用（如果后端接口有问题，静默失败，显示空列表）
      let templatesData: RouteTemplate[] = [];
      try {
        templatesData = await routeDirectionsApi.queryTemplates();
        templatesData = Array.isArray(templatesData) ? templatesData : [];
        console.log('✅ Loaded templates:', templatesData.length);
      } catch (err: any) {
        // 静默处理错误：后端接口可能未实现或返回 400
        // 不影响页面其他功能，只是模板列表为空
        if (err.response?.status === 400) {
          console.warn('⚠️ 路线模板接口返回 400，可能是后端接口未实现或参数问题');
        } else {
          console.warn('⚠️ 加载路线模板失败:', err.message);
        }
        templatesData = [];
      }

      const [countries, tripsData] = await Promise.allSettled([
        countriesApi.getAll(),
        tripsApi.getAll(),
      ]);

      // 前端筛选：只显示 isActive 为 true 的模板（如果接口返回了该字段）
      templatesData = templatesData.filter((t) => t.isActive !== false);

      const countriesData = countries.status === 'fulfilled' ? countries.value : [];
      const tripsList = tripsData.status === 'fulfilled' ? (Array.isArray(tripsData.value) ? tripsData.value : []) : [];

      // 建立国家映射
      const map = new Map<string, Country>();
      countriesData.forEach((country) => {
        map.set(country.isoCode, country);
      });
      setCountryMap(map);

      // 设置行程列表
      setTrips(tripsList);

      // 设置模板列表
      setTemplates(templatesData);

      // 获取最近一次编辑的 Trip
      if (tripsList.length > 0) {
        // 按更新时间排序，获取最新的
        const sortedTrips = [...tripsList].sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.createdAt).getTime();
          const bTime = new Date(b.updatedAt || b.createdAt).getTime();
          return bTime - aTime;
        });
        
        try {
          const tripDetail = await tripsApi.getById(sortedTrips[0].id);
          setRecentTrip(tripDetail);
        } catch (err) {
          console.error('Failed to load recent trip detail:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };


  const getCountryName = (countryCode: string): string => {
    const country = countryMap.get(countryCode);
    return country ? country.nameCN : countryCode;
  };

  const handleFixIssue = (issueType: string, tripId?: string) => {
    if (tripId) {
      navigate(`/dashboard/trips/${tripId}`);
      setDrawerTab('risk');
      setDrawerOpen(true);
      setHighlightItemId(issueType);
    }
  };

  // 统计数据
  const needsAttention = trips.filter(t => t.status === 'PLANNING').length;
  const ready = trips.filter(t => t.status === 'IN_PROGRESS' || t.status === 'COMPLETED').length;
  const blockers = blockersCount;

  const handleUseTemplate = (template: RouteTemplate) => {
    setSelectedTemplate(template);
    setCreateDialogOpen(true);
  };

  const handleCreateSuccess = (tripId: string) => {
    navigate(`/dashboard/trips/${tripId}`);
  };

  const loadAttentionQueue = async () => {
    try {
      setLoadingAttentionQueue(true);
      const response = await tripsApi.getAttentionQueue({
        limit: 20,
        offset: 0,
      });
      setAttentionItems(response.items || []);
    } catch (err: any) {
      console.error('Failed to load attention queue:', err);
      setAttentionItems([]);
    } finally {
      setLoadingAttentionQueue(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  const userName = user?.displayName || user?.email?.split('@')[0] || '朋友';

  // Home 页面引导步骤
  const homeTourSteps: TourStep[] = [
    {
      id: 'checklist',
      target: '[data-tour="checklist"]',
      title: 'Your first trip checklist',
      description: '完成这 5 步，您就能创建第一个可执行路线。点击任一项可直接跳转。',
      position: 'left',
    },
    {
      id: 'continue-card',
      target: '[data-tour="continue-card"]',
      title: 'Continue Card',
      description: 'This is where you resume planning. 继续上次未完成的行程。',
      position: 'bottom',
    },
    {
      id: 'risk-drawer',
      target: '[data-tour="risk-drawer"]',
      title: 'Evidence & Risk Drawer',
      description: 'TripNARA always shows why a decision is safe or not. 点击打开抽屉查看证据。',
      position: 'left',
      action: () => {
        setDrawerTab('risk');
        setDrawerOpen(true);
      },
    },
  ];

  const handleWelcomeComplete = (experienceType: 'steady' | 'balanced' | 'exploratory') => {
    completeWelcome(experienceType);
    setShowWelcomeModal(false);
    // 延迟显示 Home Tour
    setTimeout(() => {
      setShowHomeTour(true);
    }, 500);
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      {/* Welcome Modal */}
      <WelcomeModal
        open={showWelcomeModal}
        onClose={() => {
          setShowWelcomeModal(false);
          dismiss();
        }}
        onComplete={handleWelcomeComplete}
      />

      {/* Home Tour */}
      <SpotlightTour
        steps={homeTourSteps}
        open={showHomeTour && !onboardingState.toursCompleted.home}
        onClose={() => {
          setShowHomeTour(false);
          completeTour('home');
        }}
        onComplete={() => {
          setShowHomeTour(false);
          completeTour('home');
        }}
      />

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* A. 顶部状态区（12/12） */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">欢迎回来，{userName}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>Today: {needsAttention} trip needs attention</span>
                <span>·</span>
                <span>{ready} trips ready</span>
                <span>·</span>
                <span>{blockers} blocker</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/dashboard/trips')}>
                Continue Last
              </Button>
              <Button onClick={() => navigate('/dashboard/trips/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Trip
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* B. 左主区（8/12） */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Continue Card */}
            {recentTrip && (
              <Card data-tour="continue-card">
                <CardHeader>
                  <CardTitle>继续上次</CardTitle>
                  <CardDescription>最近一次编辑的行程</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{getCountryName(recentTrip.destination)}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {getCountryName(recentTrip.destination)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(recentTrip.startDate), 'yyyy-MM-dd')}
                          </span>
                          <Badge variant={recentTrip.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
                            {recentTrip.status === 'PLANNING' ? 'Draft' : recentTrip.status === 'IN_PROGRESS' ? 'Executing' : recentTrip.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}
                          </Badge>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            风险: 低
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => navigate(`/dashboard/plan-studio?tripId=${recentTrip.id}`)}>
                        Continue Planning
                      </Button>
                      {recentTrip.status === 'IN_PROGRESS' && (
                        <Button variant="outline" onClick={() => navigate(`/dashboard/execute?tripId=${recentTrip.id}`)}>
                          Enter Execute
                        </Button>
                      )}
                      <Button variant="ghost" onClick={() => navigate(`/dashboard/trips/${recentTrip.id}`)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Open Overview
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attention Queue */}
            <Card>
              <CardHeader>
                <CardTitle>需要处理</CardTitle>
                <CardDescription>需要您关注的问题</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAttentionQueue ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner className="w-6 h-6" />
                  </div>
                ) : attentionItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="mb-4 opacity-50">
                      <CheckCircle2 className="w-20 h-20 text-green-500" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">暂无需要关注的事项</p>
                    <p className="text-xs text-muted-foreground">一切都很顺利！</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attentionItems.map((item: AttentionItem) => {
                      const getSeverityColor = (severity: string) => {
                        switch (severity) {
                          case 'critical':
                            return 'text-red-600';
                          case 'high':
                            return 'text-orange-600';
                          case 'medium':
                            return 'text-yellow-600';
                          case 'low':
                            return 'text-blue-600';
                          default:
                            return 'text-gray-600';
                        }
                      };

                      const getSeverityIcon = (severity: string) => {
                        switch (severity) {
                          case 'critical':
                          case 'high':
                            return <AlertTriangle className="h-4 w-4" />;
                          default:
                            return <AlertCircle className="h-4 w-4" />;
                        }
                      };

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            if (item.metadata?.actionUrl) {
                              navigate(item.metadata.actionUrl);
                            } else if (item.tripId) {
                              handleFixIssue(item.type, item.tripId);
                            }
                          }}
                        >
                          <div className="flex items-start gap-2 flex-1">
                            <div className={cn('mt-0.5', getSeverityColor(item.severity))}>
                              {getSeverityIcon(item.severity)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{item.title}</span>
                                <Badge
                                  variant={
                                    item.severity === 'critical'
                                      ? 'destructive'
                                      : item.severity === 'high'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {item.severity === 'critical'
                                    ? '严重'
                                    : item.severity === 'high'
                                    ? '高'
                                    : item.severity === 'medium'
                                    ? '中'
                                    : '低'}
                                </Badge>
                                {item.status === 'new' && (
                                  <Badge variant="outline" className="text-xs bg-blue-50">
                                    新
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {item.description}
                                </div>
                              )}
                              {item.metadata?.persona && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {item.metadata.persona === 'ABU'
                                    ? '安全官 (Abu)'
                                    : item.metadata.persona === 'DR_DRE'
                                    ? '节奏官 (Dr.Dre)'
                                    : '修复官 (Neptune)'}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.metadata?.actionUrl) {
                                navigate(item.metadata.actionUrl);
                              } else {
                                handleFixIssue(item.type, item.tripId);
                              }
                            }}
                          >
                            Fix
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Templates / Patterns */}
            <Card>
              <CardHeader>
                <CardTitle>路线模板</CardTitle>
                <CardDescription>快速开始您的旅程</CardDescription>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="mb-4 opacity-50">
                      <EmptyTemplatesIllustration size={160} />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">暂无模板</p>
                    <p className="text-xs text-muted-foreground">路线模板正在准备中</p>
                  </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => {
                    const countryCode = template.routeDirection?.countryCode;
                    const countryName = countryCode ? getCountryName(countryCode) : null;
                    return (
                      <Card key={template.id} className="cursor-pointer hover:border-primary">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="font-semibold">{template.nameCN || template.nameEN}</div>
                            <div className="text-sm text-muted-foreground">
                              {template.nameEN && template.nameCN !== template.nameEN ? template.nameEN : ''}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {countryName && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {countryName}
                                </Badge>
                              )}
                              <Badge variant="outline">{template.durationDays} 天</Badge>
                              {template.defaultPacePreference && (
                                <Badge variant="secondary">{template.defaultPacePreference}</Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-end gap-2 mt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/dashboard/route-directions/templates/${template.id}`)}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Preview
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUseTemplate(template)}
                              >
                                <Sparkles className="w-3 h-3 mr-1" />
                                使用模板
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* C. 右侧边栏（4/12） */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Checklist */}
            {showChecklist && (
              <div data-tour="checklist">
                <Checklist
                  completedSteps={onboardingState.completedSteps}
                  currentStep={onboardingState.completedSteps.length < 5 ? 
                    ['style', 'places', 'schedule', 'optimize', 'execute'][onboardingState.completedSteps.length] as any : undefined
                  }
                  onStepClick={completeStep}
                />
              </div>
            )}

            {/* Risk Snapshot */}
            <Card data-tour="risk-drawer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  风险概览
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                    <div className="font-medium text-red-800">时间窗冲突</div>
                    <div className="text-xs text-red-600 mt-1">
                      {onboardingState.experienceType === 'steady' ? 'Abu: ' : 
                       onboardingState.experienceType === 'balanced' ? 'Dr.Dre: ' : 
                       'Neptune: '}
                      缺少缓冲可能导致延误连锁反应
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setDrawerTab('risk');
                    setDrawerOpen(true);
                  }}
                >
                  Open Risk Drawer
                </Button>
              </CardContent>
            </Card>

            {/* Readiness */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  准备度
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">{blockers}</span> blockers
                  </div>
                  <div className="text-xs text-muted-foreground">截止日: 2024-02-01</div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => navigate('/dashboard/readiness')}
                  >
                    Complete Readiness
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  最近复盘
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="font-medium">冰岛南岸路线</div>
                    <div className="text-xs text-muted-foreground mt-1">稳健度: 8.5/10</div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">日本关西体验</div>
                    <div className="text-xs text-muted-foreground mt-1">体验密度: 9/10</div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => navigate('/dashboard/insights')}
                  >
                    View Insights
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Help 按钮（右上角） */}
        {showChecklist && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shadow-lg"
              onClick={() => setShowHomeTour(true)}
              title="Start tour / Replay tour"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* 使用模板创建行程对话框 */}
      {selectedTemplate && (
        <CreateTripFromTemplateDialog
          templateId={selectedTemplate.id}
          templateName={selectedTemplate.nameCN}
          defaultDurationDays={selectedTemplate.durationDays}
          defaultPacePreference={selectedTemplate.defaultPacePreference}
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              setSelectedTemplate(null);
            }
          }}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}
