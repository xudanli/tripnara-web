import { useState, createContext, useContext, useMemo, useEffect } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
// SidebarNavigation 已删除 - 所有功能通过对话界面访问
import MobileBottomNav from './MobileBottomNav';
import EvidenceDrawer from './EvidenceDrawer';
import ContextSidebar from './ContextSidebar';
import ConversationHistorySidebar from './ConversationHistorySidebar';
import DashboardTopBar from './DashboardTopBar';
import AgentChatFab from '@/components/agent/AgentChatFab';
import AgentChatSidebar from '@/components/agent/AgentChatSidebar';
import { NLConversationProvider, useNLConversation } from '@/contexts/NLConversationContext';
import { Button } from '@/components/ui/button';
import { ChevronUp } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { tripsApi } from '@/api/trips';
import { cn } from '@/lib/utils';
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
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

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

  // 从当前路径或查询参数提取 tripId
  const tripIdMatch = location.pathname.match(/\/trips\/([^/]+)/);
  const queryTripId = searchParams.get('tripId');
  const activeTripId = tripIdMatch ? tripIdMatch[1] : queryTripId;
  
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
    
    // 行程详情页
    if (tripIdMatch && !path.includes('/trips/new') && !path.includes('/trips/generate')) {
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
  }, [location.pathname, tripIdMatch]);

  if (!isAuthenticated) {
    return null;
  }

  const drawerContextValue: DrawerContextType = {
    drawerOpen,
    setDrawerOpen,
    drawerTab,
    setDrawerTab,
    highlightItemId,
    setHighlightItemId,
  };

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
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          activeTrip={activeTrip}
          activeTripId={activeTripId}
          entryPoint={entryPoint}
          isDashboardPage={isDashboardPage}
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
  sidebarExpanded,
  setSidebarExpanded,
  activeTrip,
  activeTripId,
  entryPoint,
  isDashboardPage,
}: {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  drawerTab: 'evidence' | 'risk' | 'decision';
  setDrawerTab: (tab: 'evidence' | 'risk' | 'decision') => void;
  highlightItemId: string | undefined;
  setHighlightItemId: (id: string | undefined) => void;
  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
  activeTrip: TripDetail | null;
  activeTripId: string | null | undefined;
  entryPoint: EntryPoint | undefined;
  isDashboardPage: boolean;
}) {
  const { currentSessionId, onSessionSelect, onNewSession } = useNLConversation();
  const isMobile = useIsMobile();
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
        {/* 顶部导航栏 */}
        <DashboardTopBar />

        {/* 移动端菜单按钮和侧边栏已删除 - 使用底部导航栏 MobileBottomNav */}

        {/* 主内容区域 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 对话历史侧边栏（Dashboard 页面显示） */}
          {isDashboardPage && (
            <ConversationHistorySidebar
              currentSessionId={currentSessionId}
              onSessionSelect={onSessionSelect}
              onNewSession={onNewSession}
            />
          )}

          {/* 左侧导航菜单已完全删除 - 所有功能通过对话界面访问 */}

          {/* 主内容区和侧边栏 */}
          <div className="flex-1 flex h-full">
            {/* 主内容区 */}
            <div className={cn(
              'flex-1 h-full overflow-hidden transition-all duration-300',
              // Dashboard 页面且有行程时，为上下文侧边栏留出空间（增加主内容区宽度）
              isDashboardPage && activeTrip ? 'lg:w-[75%]' : 'lg:w-full'
            )}>
              {/* 规划工作台的 AI 助手侧边栏 */}
              {entryPoint === 'planning_workbench' && activeTripId ? (
                <div className="flex h-full">
                  <div className="flex-1 h-full overflow-hidden">
                    <main className="h-full overflow-y-auto pb-16 lg:pb-0">
                      <Outlet />
                    </main>
                  </div>
                  {/* AI 助手侧边栏 */}
                  <div 
                    className={cn(
                      'h-full overflow-hidden border-l border-gray-200 transition-all duration-300 ease-in-out',
                      sidebarExpanded ? 'w-96' : 'w-16'
                    )}
                  >
                    <AgentChatSidebar 
                      activeTripId={activeTripId} 
                      entryPoint={entryPoint}
                      onExpandedChange={setSidebarExpanded}
                    />
                  </div>
                </div>
              ) : (
                /* 普通页面内容 */
                <main className="h-full overflow-y-auto pb-16 lg:pb-0">
                  <Outlet />
                </main>
              )}
            </div>
            
            {/* 上下文侧边栏（Dashboard 页面且有行程时显示） */}
            {isDashboardPage && activeTrip && (
              <>
                {/* 桌面端：右侧侧边栏（减少宽度以给对话框更多空间） */}
                <div className="hidden lg:block w-[25%] border-l border-gray-200">
                  <ContextSidebar 
                    tripId={activeTrip.id}
                    conversationContext={null} // TODO: 从 NLChatInterface 获取对话上下文
                  />
                </div>
                
                {/* 移动端：底部抽屉 */}
                {isMobile && (
                  <>
                    {/* 底部抽屉触发按钮 - 调整位置避免与底部导航栏重叠 */}
                    <div className="lg:hidden fixed bottom-24 right-4 z-40">
                      <Button
                        size="icon"
                        className="h-12 w-12 rounded-full shadow-lg"
                        onClick={() => setContextDrawerOpen(true)}
                        aria-label="打开行程详情"
                      >
                        <ChevronUp className="h-5 w-5" />
                      </Button>
                    </div>
                    
                    {/* 底部抽屉 */}
                    <Sheet open={contextDrawerOpen} onOpenChange={setContextDrawerOpen}>
                      <SheetContent side="bottom" className="h-[60vh] p-0">
                        <div className="h-full overflow-y-auto">
                          <ContextSidebar 
                            tripId={activeTrip.id}
                            conversationContext={null}
                            onClose={() => setContextDrawerOpen(false)}
                          />
                        </div>
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
          />
        </div>

        {/* 移动端底部导航 */}
        <MobileBottomNav />

        {/* 智能助手悬浮按钮（仅移动端 + 仅规划工作台详情页） */}
        {entryPoint === 'planning_workbench' && activeTripId && (
          <div className="lg:hidden">
            <AgentChatFab activeTripId={activeTripId} />
          </div>
        )}
      </div>
  );
}

