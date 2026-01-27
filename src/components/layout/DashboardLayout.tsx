import { useState, createContext, useContext, useMemo } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import SidebarNavigation from './SidebarNavigation';
import MobileBottomNav from './MobileBottomNav';
import EvidenceDrawer from './EvidenceDrawer';
import AgentChatFab from '@/components/agent/AgentChatFab';
import AgentChatSidebar from '@/components/agent/AgentChatSidebar';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { EntryPoint } from '@/api/agent';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'evidence' | 'risk' | 'decision'>('evidence');
  const [highlightItemId, setHighlightItemId] = useState<string | undefined>();
  // 从 localStorage 读取初始状态，与 AgentChatSidebar 保持一致
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('agent-sidebar-expanded');
    return saved !== null ? saved === 'true' : false;
  });
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  // 从当前路径或查询参数提取 tripId
  const tripIdMatch = location.pathname.match(/\/trips\/([^/]+)/);
  const queryTripId = searchParams.get('tripId');
  const activeTripId = tripIdMatch ? tripIdMatch[1] : queryTripId;

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
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* 桌面端左侧导航 */}
        <aside className="hidden lg:block">
          <SidebarNavigation />
        </aside>

        {/* 移动端菜单按钮 */}
        <div className="lg:hidden fixed top-0 left-0 z-50 p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="bg-white shadow-md"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* 移动端侧边栏 */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarNavigation
              isMobile
              onMobileClose={() => setMobileMenuOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* 主内容区和 AI 助手侧边栏 */}
        {entryPoint === 'planning_workbench' && activeTripId ? (
          <div className="flex-1 hidden lg:flex h-full">
            {/* 主内容区 */}
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
          /* 主内容区（无 AI 助手时） */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 页面内容 */}
            <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
              <Outlet />
            </main>
          </div>
        )}

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
    </DrawerContext.Provider>
  );
}

