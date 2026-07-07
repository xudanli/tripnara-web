/**
 * 主侧边栏组件 - 混合模式导航栏
 * 
 * Phase 1: 核心导航项
 * - Logo
 * - 新行程 / 我的行程 / 可信项目 / 路线模版 / 徒步
 * - 收藏（展开显示收藏的行程）
 * - 规划中（展开显示规划中的行程）
 * - 进行中（展开显示进行中的行程）
 * - 用户头像
 * 
 * Phase 2: 可选导航项（待实施）
 * - 新行程
 * - 路线模版
 * - 我的行程
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { tripsApi } from '@/api/trips';
import { buildTripTravelStatusPath } from '@/lib/travel-status-navigation.util';
import type { TripListItem, TripStatus } from '@/types/trip';
import Logo from '@/components/common/Logo';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Route, MapPin, Heart, ChevronDown, ChevronRight, User, Settings, LogOut, PanelLeftClose, PanelLeftOpen, Share2, Edit, MoreVertical, RefreshCw, Users, Trash2, CreditCard, Bell, Mountain, MessageCircle, Shield, BadgeCheck, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ContactUsDialog } from '@/components/common/ContactUsDialog';
import { getTripHikingProfile } from '@/lib/trip-hiking';
import { parseHikingSegments } from '@/lib/hiking-segments';
import { hikingPhaseSidebarLine } from '@/lib/hiking-phase';
import { useTripEmbeddedSidebarStore } from '@/store/tripEmbeddedSidebarStore';
import { DeleteTripDialog } from '@/components/trips/DeleteTripDialog';

interface MainSidebarProps {
  className?: string;
}

export default function MainSidebar({ className }: MainSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  
  // 侧边栏展开/收起状态 - 从 localStorage 读取
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('main-sidebar-collapsed');
    return saved === 'true';
  });
  
  // Logo 区域悬浮状态 - 用于控制收起状态下 Logo 和展开图标的切换
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  
  // 当侧边栏收起时，重置 Logo 悬浮状态，确保默认显示 Logo
  useEffect(() => {
    if (collapsed) {
      setIsLogoHovered(false);
    }
  }, [collapsed]);
  
  // 展开/收起状态 - 默认展开
  const [collectedExpanded, setCollectedExpanded] = useState(true);
  const [planningTripsExpanded, setPlanningTripsExpanded] = useState(true);
  const [inProgressTripsExpanded, setInProgressTripsExpanded] = useState(true);
  
  // 保存侧边栏状态到 localStorage
  useEffect(() => {
    localStorage.setItem('main-sidebar-collapsed', String(collapsed));
  }, [collapsed]);
  
  // 数据状态
  const [collectedTrips, setCollectedTrips] = useState<TripListItem[]>([]);
  const [planningTrips, setPlanningTrips] = useState<TripListItem[]>([]);
  const [inProgressTrips, setInProgressTrips] = useState<TripListItem[]>([]);
  const [allTrips, setAllTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectedTripIds, setCollectedTripIds] = useState<Set<string>>(new Set());
  const [hoveredTripId, setHoveredTripId] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [contactUsOpen, setContactUsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<TripListItem | null>(null);
  const [deletingTrip, setDeletingTrip] = useState(false);
  
  // 加载所有行程
  const loadTrips = async () => {
    try {
      setLoading(true);
      const trips = await tripsApi.getAll();
      setAllTrips(trips);
      
      // 从 localStorage 获取收藏状态
      const storedCollected = localStorage.getItem('collectedTripIds');
      if (storedCollected) {
        try {
          const collectedIds = JSON.parse(storedCollected);
          setCollectedTripIds(new Set(collectedIds));
          const collected = trips.filter(trip => collectedIds.includes(trip.id));
          setCollectedTrips(collected);
        } catch (e) {
          console.error('Failed to parse stored collected trips:', e);
        }
      }
      
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadTrips();
  }, []);

  // 监听路径变化，当从行程详情页返回时刷新列表
  useEffect(() => {
    // 如果当前不在行程详情页，说明可能从详情页返回，刷新列表
    if (!location.pathname.match(/^\/dashboard\/trips\/[^/]+$/)) {
      loadTrips();
    }
  }, [location.pathname]);
  
  // 当收藏状态变化时，更新收藏列表
  useEffect(() => {
    const storedCollected = localStorage.getItem('collectedTripIds');
    if (storedCollected && allTrips.length > 0) {
      try {
        const collectedIds = JSON.parse(storedCollected);
        setCollectedTripIds(new Set(collectedIds));
        const collected = allTrips.filter(trip => collectedIds.includes(trip.id));
        setCollectedTrips(collected);
      } catch (e) {
        console.error('Failed to parse stored collected trips:', e);
      }
    } else {
      setCollectedTripIds(new Set());
      setCollectedTrips([]);
    }
  }, [allTrips]);
  
  // 处理分享
  const handleShare = (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/dashboard/trips/${tripId}`, { state: { openShareDialog: true } });
  };
  
  // 处理编辑
  const handleEdit = (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/dashboard/trips/${tripId}`, { state: { openEditDialog: true } });
  };
  
  // 处理修改状态
  const handleChangeStatus = (tripId: string, newStatus: TripStatus) => {
    navigate(`/dashboard/trips/${tripId}`, { state: { changeStatus: newStatus } });
  };
  
  // 处理协作者
  const handleCollaborate = (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/dashboard/trips/${tripId}`, { state: { openCollaboratorsDialog: true } });
  };
  
  // 打开删除确认弹窗
  const handleDelete = (trip: TripListItem) => {
    if (!trip.destination) {
      toast.error('无法删除：行程目的地信息缺失');
      return;
    }
    setTripToDelete(trip);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTrip = async (confirmText: string) => {
    if (!tripToDelete) return;
    try {
      setDeletingTrip(true);
      await tripsApi.delete(tripToDelete.id, confirmText);

      const trips = await tripsApi.getAll();
      setAllTrips(trips);

      const newCollectedIds = new Set(collectedTripIds);
      newCollectedIds.delete(tripToDelete.id);
      setCollectedTripIds(newCollectedIds);
      localStorage.setItem('collectedTripIds', JSON.stringify(Array.from(newCollectedIds)));

      const collected = trips.filter((t) => newCollectedIds.has(t.id));
      setCollectedTrips(collected);

      if (location.pathname === `/dashboard/trips/${tripToDelete.id}`) {
        navigate('/dashboard/trips');
      }

      setDeleteDialogOpen(false);
      setTripToDelete(null);
      toast.success('行程已删除');
    } catch (err: unknown) {
      console.error('Failed to delete trip:', err);
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
              ?.message
          : undefined;
      toast.error(message || (err instanceof Error ? err.message : '删除行程失败'));
    } finally {
      setDeletingTrip(false);
    }
  };
  
  // 当行程数据变化时，更新分类列表
  useEffect(() => {
    if (allTrips.length > 0) {
      const planning = allTrips.filter(trip => trip.status === 'PLANNING');
      const inProgress = allTrips.filter(trip => trip.status === 'IN_PROGRESS');
      
      // 按更新时间排序
      planning.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        return timeB - timeA;
      });
      inProgress.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        return timeB - timeA;
      });
      
      setPlanningTrips(planning);
      setInProgressTrips(inProgress);
    }
  }, [allTrips]);
  
  // 判断当前页面是否激活
  const isActive = (path: string) => {
    if (path === '/dashboard') {
      // Dashboard 页面：精确匹配，排除 trips 和 plan-studio 子路径
      return location.pathname === '/dashboard';
    }
    if (path === '/dashboard/trips') {
      // "我的行程"：精确匹配，排除具体行程页面（/dashboard/trips/xxx）
      return location.pathname === '/dashboard/trips' || location.pathname === '/dashboard/trips/';
    }
    return location.pathname.startsWith(path);
  };
  
  // 处理导航点击
  const handleNavClick = (path: string) => {
    navigate(path);
  };
  
  // 处理行程点击：规划中 → 规划工作台；进行中 → 行中执行页；其余 → 详情
  const handleTripClick = (tripId: string, status?: TripStatus) => {
    if (status === 'PLANNING') {
      navigate(buildTripTravelStatusPath(tripId));
    } else if (status === 'IN_PROGRESS') {
      navigate(`/dashboard/execute?tripId=${tripId}`);
    } else {
      navigate(`/dashboard/trips/${tripId}`);
    }
  };
  
  // 获取行程显示名称
  const getTripDisplayName = (trip: TripListItem): string => {
    if (trip.name) return trip.name;
    if (trip.destination && trip.startDate) {
      // destination 可能是国家代码，直接显示
      return `${trip.destination} ${format(new Date(trip.startDate), 'MM-dd')}`;
    }
    return trip.destination || '未知目的地';
  };

  // 处理退出登录
  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  // 获取用户头像首字母
  const getInitials = (name?: string | null, email?: string | null): string => {
    if (name) {
      return name.charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };
  
  // 切换侧边栏展开/收起
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  return (
    <aside
      className={cn(
        'bg-white border-r border-gray-200 flex flex-col h-full max-h-screen min-h-0 overflow-hidden transition-all duration-300 relative z-10',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Logo 区域 - ChatGPT 风格：收起状态下悬浮时显示展开图标 */}
      <div className="h-14 flex items-center justify-between px-3 relative">
        {!collapsed && (
          <>
            <button
              onClick={() => handleNavClick('/dashboard')}
              className="flex items-center justify-center hover:opacity-80 transition-opacity"
              title="返回首页"
            >
              <Logo variant="icon" size={40} color="#111827" />
            </button>
            {/* 展开状态：右上角收起按钮 */}
            <button
              onClick={toggleCollapsed}
              className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-100 transition-colors outline-none focus:outline-none"
              title="收起侧边栏"
              aria-label="收起侧边栏"
            >
              <PanelLeftClose className="w-4 h-4" style={{ color: '#666666' }} strokeWidth={1.5} />
            </button>
          </>
        )}
        {collapsed && (
          <div
            className="w-full flex items-center justify-center relative"
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
          >
            {/* Logo - 默认显示，悬浮时隐藏 */}
            <button
              onClick={() => handleNavClick('/dashboard')}
              className={cn(
                "flex items-center justify-center transition-opacity absolute inset-0",
                isLogoHovered ? "opacity-0 pointer-events-none" : "opacity-100"
              )}
              title="返回首页"
            >
              <Logo variant="icon" size={40} color="#111827" />
            </button>
            {/* 展开图标 - 默认隐藏，悬浮时显示 */}
            <button
              onClick={toggleCollapsed}
              className={cn(
                "flex items-center justify-center transition-opacity absolute inset-0",
                isLogoHovered ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              title="打开边栏"
              aria-label="打开边栏"
            >
              <PanelLeftOpen className="w-4 h-4" style={{ color: '#666666' }} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
      
      
      {/* 导航内容区域 - ChatGPT 风格：更紧凑的间距 */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="py-1">
          {/* 导航菜单项 */}
          {/* 新行程 — 创建入口（探索规划 / 攻略导入等） */}
          <NavItem
            icon={Plus}
            label="新行程"
            onClick={() => handleNavClick('/dashboard/trips/new')}
            active={
              isActive('/dashboard/trips/new') ||
              isActive('/dashboard/trips/new/from-guide') ||
              location.pathname.includes('/dashboard/explore')
            }
            collapsed={collapsed}
          />
          
          {/* Nara 对话 */}
          <NavItem
            icon={Sparkles}
            label="Nara 对话"
            onClick={() => handleNavClick('/dashboard/nara')}
            active={isActive('/dashboard/nara')}
            collapsed={collapsed}
          />

          {/* 我的行程 */}
          <NavItem
            icon={MapPin}
            label="我的行程"
            onClick={() => handleNavClick('/dashboard/trips')}
            active={isActive('/dashboard/trips')}
            collapsed={collapsed}
          />

          {/* 可信旅行项目 */}
          <NavItem
            icon={BadgeCheck}
            label="可信项目"
            onClick={() => handleNavClick('/dashboard/trusted-projects')}
            active={isActive('/dashboard/trusted-projects')}
            collapsed={collapsed}
          />
          
          {/* 路线模版 */}
          <NavItem
            icon={Route}
            label="路线模版"
            onClick={() => handleNavClick('/dashboard/route-directions/templates')}
            active={isActive('/dashboard/route-directions/templates')}
            collapsed={collapsed}
          />
          
          {/* 徒步 */}
          <NavItem
            icon={Mountain}
            label="徒步"
            onClick={() => handleNavClick('/dashboard/trails')}
            active={isActive('/dashboard/trails')}
            collapsed={collapsed}
          />

          {/* 收藏 - 只在有收藏内容时显示 */}
          {!collapsed && collectedTrips.length > 0 && (
            <ExpandableNavItem
              icon={Heart}
              label="收藏"
              expanded={collectedExpanded}
              onToggle={() => setCollectedExpanded(!collectedExpanded)}
              count={collectedTrips.length}
              loading={loading}
            >
              {collectedTrips.map((trip) => (
                <TripListItem
                  key={trip.id}
                  trip={trip}
                  onClick={() => handleTripClick(trip.id, trip.status)}
                  active={location.pathname === `/dashboard/trips/${trip.id}`}
                  getDisplayName={getTripDisplayName}
                  onShare={handleShare}
                  onEdit={handleEdit}
                  onChangeStatus={handleChangeStatus}
                  onCollaborate={handleCollaborate}
                  onDelete={handleDelete}
                  hoveredTripId={hoveredTripId}
                  setHoveredTripId={setHoveredTripId}
                />
              ))}
            </ExpandableNavItem>
          )}
          
          {/* 规划中 - 只在有规划中行程时显示 */}
          {!collapsed && planningTrips.length > 0 && (
            <ExpandableNavItem
              label="规划中"
              expanded={planningTripsExpanded}
              onToggle={() => setPlanningTripsExpanded(!planningTripsExpanded)}
              count={planningTrips.length}
              loading={loading}
              textColor="#666666" // 🎨 "规划中"使用灰色文字
            >
              {planningTrips.map((trip) => (
                <TripListItem
                  key={trip.id}
                  trip={trip}
                  onClick={() => handleTripClick(trip.id, trip.status)}
                  active={location.pathname === `/dashboard/trips/${trip.id}`}
                  getDisplayName={getTripDisplayName}
                  onShare={handleShare}
                  onEdit={handleEdit}
                  onChangeStatus={handleChangeStatus}
                  onCollaborate={handleCollaborate}
                  onDelete={handleDelete}
                  hoveredTripId={hoveredTripId}
                  setHoveredTripId={setHoveredTripId}
                />
              ))}
            </ExpandableNavItem>
          )}
          
          {/* 进行中 - 只在有进行中行程时显示 */}
          {!collapsed && inProgressTrips.length > 0 && (
            <ExpandableNavItem
              label="进行中"
              expanded={inProgressTripsExpanded}
              onToggle={() => setInProgressTripsExpanded(!inProgressTripsExpanded)}
              count={inProgressTrips.length}
              loading={loading}
            >
              {inProgressTrips.map((trip) => (
                <TripListItem
                  key={trip.id}
                  trip={trip}
                  onClick={() => handleTripClick(trip.id, trip.status)}
                  active={location.pathname === `/dashboard/trips/${trip.id}`}
                  getDisplayName={getTripDisplayName}
                  onShare={handleShare}
                  onEdit={handleEdit}
                  onChangeStatus={handleChangeStatus}
                  onCollaborate={handleCollaborate}
                  onDelete={handleDelete}
                  hoveredTripId={hoveredTripId}
                  setHoveredTripId={setHoveredTripId}
                />
              ))}
            </ExpandableNavItem>
          )}
          
        </div>
      </ScrollArea>
      
      {/* 🆕 参考 shadcn 设计：用户资料组件 - 左下角 */}
      <div className="border-t border-gray-200 px-2 py-1.5">
        {user ? (
          <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg outline-none transition-colors',
                'hover:bg-gray-100',
                userMenuOpen && 'bg-gray-100',
                collapsed && 'justify-center px-1'
              )}>
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || user.email || 'User'} />
                  <AvatarFallback className="bg-gray-600 text-white text-xs font-medium">
                    {getInitials(user.displayName, user.email)}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-normal truncate text-gray-900">
                      {user.displayName || user.email || '用户'}
                    </p>
                    {user.email && user.displayName && (
                      <p className="text-[10px] truncate mt-0.5 text-gray-500">
                        {user.email}
                      </p>
                    )}
                  </div>
                )}
                {!collapsed && (
                  <MoreVertical className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56" side="top">
              {/* 🆕 下拉菜单顶部显示用户信息 - 参考 shadcn 设计 */}
              <DropdownMenuLabel className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || user.email || 'User'} />
                    <AvatarFallback className="bg-gray-600 text-white text-sm font-medium">
                      {getInitials(user.displayName, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-semibold leading-none text-gray-900">
                      {user.displayName || 'User'}
                    </p>
                    {user.email && (
                      <p className="text-xs leading-none text-gray-500">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* 🆕 参考 shadcn 设计：账户、账单、通知、偏好、退出登录 */}
              <DropdownMenuItem
                onClick={() => {
                  navigate('/dashboard/profile');
                  setUserMenuOpen(false);
                }}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                <span>我的主页</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigate('/dashboard/settings?tab=governance');
                  setUserMenuOpen(false);
                }}
                className="cursor-pointer"
              >
                <Shield className="mr-2 h-4 w-4" />
                <span>身份与权限</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigate('/dashboard/settings?tab=account');
                  setUserMenuOpen(false);
                }}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>账户</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigate('/dashboard/settings?tab=billing');
                  setUserMenuOpen(false);
                }}
                className="cursor-pointer"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                <span>账单</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigate('/dashboard/settings?tab=notifications');
                  setUserMenuOpen(false);
                }}
                className="cursor-pointer"
              >
                <Bell className="mr-2 h-4 w-4" />
                <span>通知</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigate('/dashboard/settings?tab=preferences');
                  setUserMenuOpen(false);
                }}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>偏好</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setContactUsOpen(true);
                  setUserMenuOpen(false);
                }}
                className="cursor-pointer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                <span>{t('header.contact', { defaultValue: '联系我们' })}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  handleLogout();
                  setUserMenuOpen(false);
                }}
                className="cursor-pointer text-gate-reject-foreground focus:text-gate-reject-foreground focus:bg-gate-reject"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>退出登录</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className={cn(
            'flex items-center p-1.5',
            collapsed ? 'justify-center' : 'gap-2'
          )}>
            <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
              <User className="w-3 h-3 text-white" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-normal truncate" style={{ color: '#111827' }}>用户</p>
                <p className="text-[10px] truncate mt-0.5" style={{ color: '#999999' }}>免费版</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 联系我们对话框 */}
      <ContactUsDialog open={contactUsOpen} onOpenChange={setContactUsOpen} />

      <DeleteTripDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setTripToDelete(null);
        }}
        destination={tripToDelete?.destination ?? ''}
        tripLabel={tripToDelete ? getTripDisplayName(tripToDelete) : undefined}
        impact={
          tripToDelete
            ? {
                totalDays: tripToDelete.days?.length,
                hikePlanCount: parseHikingSegments(tripToDelete.metadata?.hikingSegments).filter(
                  (s) => s.hikePlanId,
                ).length,
              }
            : undefined
        }
        deleting={deletingTrip}
        onConfirm={confirmDeleteTrip}
      />
    </aside>
  );
}

// 导航项组件
interface NavItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
  collapsed?: boolean;
}

function NavItem({ icon: Icon, label, onClick, active, collapsed = false }: NavItemProps) {
  return (
    <div className={cn(
      'px-2',
      collapsed && 'px-1'
    )}>
      <button
        onClick={onClick}
        className={cn(
          // 视觉优化：13px 字体（更紧凑），深灰色文本，紧凑的内边距
          'w-full flex items-center px-3 py-2 text-[13px] font-normal transition-colors',
          // ChatGPT 风格：hover 时浅灰背景 (#f5f5f5)
          'hover:bg-gray-100',
          // 🆕 激活状态：圆角矩形框，左右有间距
          active && 'bg-gray-100 rounded-md',
          // 收起状态：居中显示
          collapsed ? 'justify-center' : 'gap-2.5'
        )}
        // 🎨 统一颜色规范：主文本使用 #111827（深灰/接近黑色），激活和非激活状态保持一致
        style={{ color: '#111827' }}
        title={collapsed ? label : undefined}
      >
        {/* 视觉优化：图标大小 14px（更紧凑），与文本颜色一致 */}
        <Icon className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: '#111827' }} />
        {!collapsed && <span>{label}</span>}
      </button>
    </div>
  );
}

// 可展开导航项组件
interface ExpandableNavItemProps {
  icon?: React.ElementType; // 图标变为可选
  label: string;
  expanded: boolean;
  onToggle: () => void;
  count: number;
  loading?: boolean;
  children: React.ReactNode;
  textColor?: string; // 🆕 自定义文字颜色（用于"规划中"等需要灰色文字的项）
}

function ExpandableNavItem({
  icon: Icon,
  label,
  expanded,
  onToggle,
  count,
  loading,
  children,
  textColor, // 🆕 自定义文字颜色
}: ExpandableNavItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // 🎨 默认文字颜色为 #111827，如果指定了 textColor 则使用指定颜色
  const labelColor = textColor || '#111827';
  
  return (
    <div>
      {/* ChatGPT 风格：分类标题样式 */}
      <button
        onClick={onToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          // 视觉优化：13px 字体（更紧凑），紧凑内边距
          'w-full flex items-center px-3 py-2 text-[13px] font-normal transition-colors',
          'hover:bg-gray-100'
        )}
        // 🎨 使用自定义文字颜色（如果提供）
        style={{ color: labelColor }}
      >
        <div className="flex items-center gap-1.5">
          {/* 图标（可选）- 视觉优化：14px，与文本颜色一致 */}
          {Icon && (
            <Icon className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: labelColor }} />
          )}
          <span>{label}</span>
          {/* 🆕 箭头只在鼠标悬浮时显示 - 视觉优化：12px，使用中等灰色 */}
          {isHovered && (
            <>
              {expanded ? (
                <ChevronDown className="w-3 h-3" style={{ color: '#666666' }} />
              ) : (
                <ChevronRight className="w-3 h-3" style={{ color: '#666666' }} />
              )}
            </>
          )}
          {count > 0 && (
            // 视觉优化：计数使用 11px 字体和浅灰色
            <span className="text-[11px]" style={{ color: '#999999' }}>({count})</span>
          )}
        </div>
        {loading && (
          <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin ml-auto" />
        )}
      </button>
      {expanded && (
        <div className="transition-all duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

// 行程列表项组件
interface TripListItemProps {
  trip: TripListItem;
  onClick: () => void;
  active?: boolean;
  getDisplayName: (trip: TripListItem) => string;
  onShare?: (tripId: string, e: React.MouseEvent) => void;
  onEdit?: (tripId: string, e: React.MouseEvent) => void;
  onChangeStatus?: (tripId: string, newStatus: TripStatus) => void;
  onCollaborate?: (tripId: string, e: React.MouseEvent) => void;
  onDelete?: (trip: TripListItem) => void;
  hoveredTripId?: string | null;
  setHoveredTripId?: (tripId: string | null) => void;
}

function TripListItem({ 
  trip, 
  onClick, 
  active, 
  getDisplayName,
  onShare,
  onEdit,
  onChangeStatus,
  onCollaborate,
  onDelete,
  hoveredTripId,
  setHoveredTripId,
}: TripListItemProps) {
  const isHovered = hoveredTripId === trip.id;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const embeddedSub = useTripEmbeddedSidebarStore((s) => s.subtitles[trip.id]);
  const embeddedSubtitle =
    getTripHikingProfile(trip) === 'embedded'
      ? embeddedSub
        ? `${embeddedSub.travelLabel ?? '自驾'} · ${
            embeddedSub.phaseHintZh ??
            hikingPhaseSidebarLine(embeddedSub.phase, embeddedSub.segmentCount)
          }`
        : (() => {
            const n = parseHikingSegments(trip.metadata).length;
            return n > 0 ? `自驾 · 含 ${n} 段徒步` : '自驾 · 含徒步片段';
          })()
      : null;
  
  // 根据当前状态获取允许的状态转换
  const getAllowedStatusTransitions = (currentStatus: TripStatus) => {
    const allowedTransitions: Array<{
      status: TripStatus;
      label: string;
      icon: string;
      description?: string;
    }> = [];
    
    if (currentStatus === 'PLANNING') {
      allowedTransitions.push(
        { status: 'IN_PROGRESS', label: '进行中', icon: '🚀', description: '开始执行行程' },
        { status: 'CANCELLED', label: '已取消', icon: '❌', description: '取消行程' }
      );
    } else if (currentStatus === 'IN_PROGRESS') {
      allowedTransitions.push(
        { status: 'COMPLETED', label: '已完成', icon: '✅', description: '完成行程' },
        { status: 'CANCELLED', label: '已取消', icon: '❌', description: '取消行程' }
      );
    } else if (currentStatus === 'COMPLETED') {
      allowedTransitions.push(
        { status: 'CANCELLED', label: '已取消', icon: '❌', description: '标记为已取消' }
      );
    }
    
    return allowedTransitions;
  };
  
  const allowedTransitions = getAllowedStatusTransitions(trip.status || 'PLANNING');
  
  return (
    <div className="px-2">
      <div
        className={cn(
          // 视觉优化：子项使用 13px 字体，内边距更紧凑
          'w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-left transition-colors group relative',
          'hover:bg-gray-100',
          // 🆕 激活状态：圆角矩形框，左右有间距
          active && 'bg-gray-100 rounded-md'
        )}
        onMouseEnter={() => setHoveredTripId?.(trip.id)}
        onMouseLeave={() => {
          // 如果下拉菜单打开，不要隐藏按钮
          if (!dropdownOpen) {
            setHoveredTripId?.(null);
          }
        }}
      >
      <button
        onClick={onClick}
        className="flex-1 min-w-0 text-left"
        // 🎨 统一颜色规范：主文本使用 #111827（与导航项保持一致）
        style={{ color: '#111827' }}
      >
        <p className="truncate font-normal">{getDisplayName(trip)}</p>
        {embeddedSubtitle ? (
          <p className="truncate text-[11px] mt-0.5" style={{ color: '#666666' }}>
            {embeddedSubtitle}
          </p>
        ) : null}
      </button>
      
      {/* 悬浮时显示的更多操作按钮 */}
      {(isHovered || dropdownOpen) && trip.status !== 'CANCELLED' && (
        <div 
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center relative"
          onMouseEnter={(e) => {
            e.stopPropagation();
            setHoveredTripId?.(trip.id);
          }}
          onMouseLeave={() => {
            // 如果下拉菜单打开，保持显示
            if (!dropdownOpen) {
              setHoveredTripId?.(null);
            }
          }}
        >
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen} modal={true}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1 hover:bg-gray-200 rounded transition-colors w-6 h-6 flex items-center justify-center outline-none focus:outline-none"
              >
                <MoreVertical className="w-3 h-3 text-gray-600" />
              </button>
            </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            side="bottom" 
            className="w-48 z-[9999]" 
            sideOffset={4}
            alignOffset={0}
            onInteractOutside={() => {
              // 允许点击外部关闭
              setHoveredTripId?.(null);
            }}
          >
            {onEdit && trip.status !== 'CANCELLED' && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(trip.id, e); }}>
                <Edit className="w-4 h-4 mr-2" />
                编辑
              </DropdownMenuItem>
            )}
            {onChangeStatus && allowedTransitions.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  修改状态
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {allowedTransitions.map((transition) => (
                    <DropdownMenuItem
                      key={transition.status}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeStatus(trip.id, transition.status);
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <span className="mr-2">{transition.icon}</span>
                        <div className="flex-1">
                          <div className="text-sm">{transition.label}</div>
                          {transition.description && (
                            <div className="text-xs text-muted-foreground">{transition.description}</div>
                          )}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {onShare && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(trip.id, e); }}>
                <Share2 className="w-4 h-4 mr-2" />
                分享
              </DropdownMenuItem>
            )}
            {onCollaborate && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCollaborate(trip.id, e); }}>
                <Users className="w-4 h-4 mr-2" />
                协作者
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(trip);
                }}
                className="text-gate-reject-foreground focus:text-gate-reject-foreground focus:bg-gate-reject"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                删除
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      )}
      </div>
    </div>
  );
}
