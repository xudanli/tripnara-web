import { useState, createContext, useContext, useMemo, useEffect } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
// SidebarNavigation 已删除 - 所有功能通过对话界面访问
import MobileBottomNav from './MobileBottomNav';
import EvidenceDrawer from './EvidenceDrawer';
// ConversationHistorySidebar 已移除 - Dashboard 页面不再显示对话历史
import DashboardTopBar from './DashboardTopBar';
import AgentChatFab from '@/components/agent/AgentChatFab';
import AgentChatSidebar from '@/components/agent/AgentChatSidebar';
import { NLConversationProvider, useNLConversation } from '@/contexts/NLConversationContext';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { tripsApi } from '@/api/trips';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';
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
  const location = useLocation();
  const isPlanStudioPage = location.pathname.includes('/plan-studio');

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
        {/* 顶部导航栏 */}
        <DashboardTopBar />

        {/* 移动端菜单按钮和侧边栏已删除 - 使用底部导航栏 MobileBottomNav */}

        {/* 主内容区域 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 🆕 移除对话历史侧边栏 - Dashboard 页面不再显示对话历史 */}
          {/* 对话历史侧边栏已移除，Dashboard 页面显示继续编辑卡片和快捷入口 */}

          {/* 左侧导航菜单已完全删除 - 所有功能通过对话界面访问 */}

          {/* 主内容区和侧边栏 */}
          <div className="flex-1 flex h-full">
            {/* 主内容区 */}
            <div className="flex-1 h-full overflow-hidden transition-all duration-300">
              <main className="h-full overflow-y-auto pb-16 lg:pb-0">
                <Outlet />
              </main>
            </div>
            
            {/* 🆕 规划工作台右侧 AI 助手抽屉 */}
            {(isDashboardPage || location.pathname.includes('/plan-studio')) && (
              <AgentChatSidebar
                activeTripId={activeTripId}
                onSystem2Response={() => {
                  // 行程更新后的回调
                }}
                entryPoint={entryPoint}
                onExpandedChange={setSidebarExpanded}
              />
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

        {/* Toast 通知组件 */}
        <Toaster position="top-right" richColors />
      </div>
  );
}

