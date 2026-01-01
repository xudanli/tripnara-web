import { useState, createContext, useContext } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SidebarNavigation from './SidebarNavigation';
import GlobalCommandBar from './GlobalCommandBar';
import MobileBottomNav from './MobileBottomNav';
import EvidenceDrawer from './EvidenceDrawer';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';

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
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // 从当前路径提取 tripId（如果存在）
  const tripIdMatch = location.pathname.match(/\/trips\/([^/]+)/);
  const activeTripId = tripIdMatch ? tripIdMatch[1] : null;

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

        {/* 主内容区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 顶部全局命令条 */}
          <GlobalCommandBar activeTripId={activeTripId} />

          {/* 页面内容 */}
          <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
            <Outlet />
          </main>
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
      </div>
    </DrawerContext.Provider>
  );
}

