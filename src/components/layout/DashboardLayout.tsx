import { useState, createContext, useContext, useMemo, useEffect } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
// SidebarNavigation 已删除 - 所有功能通过对话界面访问
import MobileBottomNav from './MobileBottomNav';
import EvidenceDrawer from './EvidenceDrawer';
// ConversationHistorySidebar 已移除 - Dashboard 页面不再显示对话历史
// DashboardTopBar 已删除 - 顶部导航栏已移除
import AgentChatSidebar from '@/components/agent/AgentChatSidebar';
import MainSidebar from './MainSidebar';
import { AssistantSidebarProvider } from '@/contexts/AssistantSidebarContext';
import { NLConversationProvider } from '@/contexts/NLConversationContext';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { tripsApi } from '@/api/trips';
import { Toaster } from '@/components/ui/sonner';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Compass } from 'lucide-react';
import type { EntryPoint } from '@/api/agent';
import type { TripDetail } from '@/types/trip';

// Context for drawer control
interface DrawerContextType {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  drawerTab: 'evidence' | 'risk' | 'decision';
  setDrawerTab: (tab: 'evidence' | 'risk' | 'decision') => void;
  highlightItemId?: string;
  setHighlightItemId: (id?: string) => void;
  /** 高亮的行程项 ID 列表（证据点击时用于在时间轴中高亮） */
  highlightItineraryItemIds: string[];
  setHighlightItineraryItemIds: (ids: string[]) => void;
}

export const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export const useDrawer = () => {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within DashboardLayout');
  }
  return context;
};

export default function DashboardLayout() {
  // 移动端菜单已删除，不再需要状态
  // const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'evidence' | 'risk' | 'decision'>('evidence');
  const [highlightItemId, setHighlightItemId] = useState<string | undefined>();
  const [highlightItineraryItemIds, setHighlightItineraryItemIds] = useState<string[]>([]);
  // 从 localStorage 读取初始状态，与 AgentChatSidebar 保持一致
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('agent-sidebar-expanded');
    return saved !== null ? saved === 'true' : false;
  });
  // 当前活跃行程（用于显示上下文侧边栏）
  const [activeTrip, setActiveTrip] = useState<TripDetail | null>(null);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();

  // 从当前路径或查询参数提取 tripId（排除保留路径：optimize、new、generate 等）
  const tripIdMatch = location.pathname.match(/\/trips\/([^/]+)/);
  const queryTripId = searchParams.get('tripId') || searchParams.get('tripid');
  const rawTripId = tripIdMatch ? tripIdMatch[1] : queryTripId;
  const RESERVED_TRIP_PATHS = ['optimize', 'new', 'generate', 'decision', 'what-if', 'collected', 'featured'];
  const activeTripId = rawTripId && !RESERVED_TRIP_PATHS.includes(rawTripId) && !rawTripId.startsWith(':')
    ? rawTripId
    : queryTripId || null;
  
  // 在 Dashboard 页面时，加载最近行程用于显示上下文侧边栏
  const isDashboardPage = location.pathname === '/dashboard';
  
  useEffect(() => {
    if (isDashboardPage && !activeTripId) {
      // 加载最近规划中的行程
      const loadRecentTrip = async () => {
        try {
          const trips = await tripsApi.getAll();
          const tripsList = Array.isArray(trips) ? trips : [];
          const planningTrips = tripsList.filter(trip => trip.status === 'PLANNING');
          
          if (planningTrips.length > 0) {
            const sortedTrips = [...planningTrips].sort((a, b) => {
              const aTime = new Date(a.updatedAt || a.createdAt).getTime();
              const bTime = new Date(b.updatedAt || b.createdAt).getTime();
              return bTime - aTime;
            });
            
            try {
              const tripDetail = await tripsApi.getById(sortedTrips[0].id);
              setActiveTrip(tripDetail);
            } catch (err) {
              console.error('Failed to load recent trip:', err);
              setActiveTrip(null);
            }
          } else {
            setActiveTrip(null);
          }
        } catch (err) {
          console.error('Failed to load trips:', err);
          setActiveTrip(null);
        }
      };
      
      loadRecentTrip();
    } else if (activeTripId) {
      // 如果有 activeTripId，加载该行程
      const loadTrip = async () => {
        try {
          const tripDetail = await tripsApi.getById(activeTripId);
          setActiveTrip(tripDetail);
        } catch (err) {
          console.error('Failed to load trip:', err);
          setActiveTrip(null);
        }
      };
      
      loadTrip();
    } else {
      setActiveTrip(null);
    }
  }, [isDashboardPage, activeTripId]);
  
  // 左侧导航菜单已完全删除，不再需要保存状态

  // 根据路由识别入口点，用于定制 AI 助手开场白
  const entryPoint = useMemo((): EntryPoint | undefined => {
    const path = location.pathname;
    
    // 规划工作台
    if (path.includes('/plan-studio')) {
      return 'planning_workbench';
    }
    
    // 执行页面
    if (path.includes('/execute')) {
      return 'execute';
    }
    
    // 行程详情页（仅当路径为有效行程 ID 时，排除 optimize/new/generate 等）
    if (activeTripId && tripIdMatch && !path.includes('/trips/new') && !path.includes('/trips/generate')) {
      return 'trip_detail_page';
    }
    
    // 行程列表页
    if (path === '/dashboard/trips' || path.includes('/trips/collected') || path.includes('/trips/featured')) {
      return 'trip_list_page';
    }
    
    // 仪表盘
    if (path === '/dashboard') {
      return 'dashboard';
    }
    
    return undefined;
  }, [location.pathname, tripIdMatch, activeTripId]);

  const drawerContextValue: DrawerContextType = {
    drawerOpen,
    setDrawerOpen,
    drawerTab,
    setDrawerTab,
    highlightItemId,
    setHighlightItemId,
    highlightItineraryItemIds,
    setHighlightItineraryItemIds,
  };

  // 🐛 修复：即使未认证，也要渲染 Context Provider，避免子组件报错
  // 未认证时返回 null，但 Context Provider 必须在子组件之前渲染
  if (!isAuthenticated) {
    return (
      <DrawerContext.Provider value={drawerContextValue}>
        {null}
      </DrawerContext.Provider>
    );
  }

  return (
    <DrawerContext.Provider value={drawerContextValue}>
      <NLConversationProvider>
        <DashboardLayoutInner
          drawerOpen={drawerOpen}
          setDrawerOpen={setDrawerOpen}
          drawerTab={drawerTab}
          setDrawerTab={setDrawerTab}
          highlightItemId={highlightItemId}
          setHighlightItemId={setHighlightItemId}
          highlightItineraryItemIds={highlightItineraryItemIds}
          setHighlightItineraryItemIds={setHighlightItineraryItemIds}
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          activeTrip={activeTrip}
          activeTripId={activeTripId}
          entryPoint={entryPoint}
          isDashboardPage={isDashboardPage}
          isMobile={isMobile}
        />
      </NLConversationProvider>
    </DrawerContext.Provider>
  );
}

function DashboardLayoutInner({
  drawerOpen,
  setDrawerOpen,
  drawerTab,
  setDrawerTab,
  highlightItemId,
  setHighlightItemId,
  highlightItineraryItemIds,
  setHighlightItineraryItemIds,
  sidebarExpanded,
  setSidebarExpanded,
  activeTrip,
  activeTripId,
  entryPoint,
  isDashboardPage,
  isMobile,
}: {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  drawerTab: 'evidence' | 'risk' | 'decision';
  setDrawerTab: (tab: 'evidence' | 'risk' | 'decision') => void;
  highlightItemId: string | undefined;
  setHighlightItemId: (id: string | undefined) => void;
  highlightItineraryItemIds: string[];
  setHighlightItineraryItemIds: (ids: string[]) => void;
  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
  activeTrip: TripDetail | null;
  activeTripId: string | null | undefined;
  entryPoint: EntryPoint | undefined;
  isDashboardPage: boolean;
  isMobile: boolean;
}) {
  const location = useLocation();
  const isPlanStudioPage = location.pathname.includes('/plan-studio');
  const [assistantSheetOpen, setAssistantSheetOpen] = useState(false);
  const showAssistantArea = (location.pathname.includes('/plan-studio') || location.pathname.includes('/execute')) && !isDashboardPage;
  // 侧边栏宽度：展开 400px，收起 56px（w-14）
  const assistantSidebarWidth = sidebarExpanded ? 400 : 56;

  return (
    <AssistantSidebarProvider
      value={{
        expanded: showAssistantArea && sidebarExpanded && !isMobile,
        width: showAssistantArea && !isMobile ? assistantSidebarWidth : 0,
      }}
    >
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
        {/* 顶部导航栏已删除 */}

        {/* 移动端菜单按钮和侧边栏已删除 - 使用底部导航栏 MobileBottomNav */}

        {/* 主内容区域 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 🆕 左侧主导航栏（混合模式） */}
          <div className="hidden lg:block">
            <MainSidebar />
          </div>

          {/* 主内容区和右侧侧边栏 */}
          <div className="flex-1 flex h-full">
            {/* 主内容区 */}
            <div className="flex-1 h-full overflow-hidden transition-all duration-300">
              <main className="h-full overflow-y-auto pb-16 lg:pb-0">
                <Outlet />
              </main>
            </div>
            
            {/* 🆕 规划工作台、执行页面右侧 AI 助手 - 桌面端内联，移动端 FAB+Sheet */}
            {showAssistantArea && (
              <>
                {/* 桌面端：内联侧边栏；移动端隐藏（用 FAB+Sheet） */}
                <div className={isMobile ? 'hidden' : 'hidden lg:flex'}>
                  <AgentChatSidebar
                    activeTripId={activeTripId}
                    onSystem2Response={() => {}}
                    entryPoint={entryPoint}
                    onExpandedChange={setSidebarExpanded}
                  />
                </div>
                {/* 移动端：FAB + Sheet */}
                {isMobile && (
                  <>
                    <Button
                      size="icon"
                      className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg lg:hidden"
                      onClick={() => setAssistantSheetOpen(true)}
                      title="打开助手"
                    >
                      <Compass className="h-6 w-6" />
                    </Button>
                    <Sheet open={assistantSheetOpen} onOpenChange={setAssistantSheetOpen}>
                      <SheetContent side="right" className="w-full max-w-md p-0">
                        <AgentChatSidebar
                          activeTripId={activeTripId}
                          onSystem2Response={() => {}}
                          entryPoint={entryPoint}
                          forceExpanded
                          onClose={() => setAssistantSheetOpen(false)}
                        />
                      </SheetContent>
                    </Sheet>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* 右侧抽屉（桌面端） */}
        <div className="hidden lg:block">
          <EvidenceDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            tripId={activeTripId}
            activeTab={drawerTab}
            highlightItemId={highlightItemId}
            onEvidenceClick={(evidence) => {
              if (evidence.affectedItemIds?.length) {
                setHighlightItineraryItemIds(evidence.affectedItemIds);
              }
            }}
          />
        </div>

        {/* 移动端底部导航 */}
        <MobileBottomNav />

        {/* Toast 通知组件 */}
        <Toaster position="top-right" richColors />
      </div>
    </AssistantSidebarProvider>
  );
}

