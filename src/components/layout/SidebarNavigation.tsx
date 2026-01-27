import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  Home,
  MapPin,
  Compass,
  Play,
  Mountain,
  BarChart3,
  Settings,
  Menu,
  X,
  Globe,
  ChevronDown,
  ChevronRight,
  LogOut,
  MessageCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/common/Logo';
import { useAuth } from '@/hooks/useAuth';
import { ContactUsDialog } from '@/components/common/ContactUsDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NavSubItem {
  key: string;
  label: string;
  path: string;
}

interface NavItem {
  key: string;
  label: string;
  icon: typeof Home;
  path: string;
  badge?: string | number;
  subItems?: NavSubItem[];
}

// Note: Labels are now translated in the component using useTranslation
const navItems: NavItem[] = [
  {
    key: 'home',
    label: '', // Will be set in component
    icon: Home,
    path: '/dashboard',
  },
  {
    key: 'trips',
    label: '', // Will be set in component
    icon: MapPin,
    path: '/dashboard/trips',
    subItems: [
      {
        key: 'trips-all',
        label: '', // Will be set in component
        path: '/dashboard/trips',
      },
    ],
  },
  {
    key: 'countries',
    label: '', // Will be set in component
    icon: Globe,
    path: '/dashboard/countries',
    subItems: [
      {
        key: 'countries-archive',
        label: '', // Will be set in component
        path: '/dashboard/countries',
      },
      {
        key: 'countries-templates',
        label: '', // Will be set in component
        path: '/dashboard/countries/templates',
      },
    ],
  },
  {
    key: 'plan-studio',
    label: '', // Will be set in component
    icon: Compass,
    path: '/dashboard/plan-studio',
  },
  {
    key: 'execute',
    label: '', // Will be set in component
    icon: Play,
    path: '/dashboard/execute',
  },
  {
    key: 'trails',
    label: '', // Will be set in component
    icon: Mountain,
    path: '/dashboard/trails',
  },
  {
    key: 'insights',
    label: '', // Will be set in component
    icon: BarChart3,
    path: '/dashboard/insights',
  },
  {
    key: 'settings',
    label: '', // Will be set in component
    icon: Settings,
    path: '/dashboard/settings',
  },
];

interface SidebarNavigationProps {
  className?: string;
  onMobileClose?: () => void;
  isMobile?: boolean;
}

export default function SidebarNavigation({
  className,
  onMobileClose,
  isMobile = false,
}: SidebarNavigationProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [contactUsOpen, setContactUsOpen] = useState(false);
  
  // Map nav items with translated labels
  const translatedNavItems = navItems.map(item => ({
    ...item,
    label: t(`sidebar.${item.key}`),
    subItems: item.subItems?.map(subItem => ({
      ...subItem,
      label: t(`sidebar.${subItem.key}`),
    })),
  }));

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  const toggleExpanded = (key: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isItemExpanded = (key: string) => expandedItems.has(key);
  const hasActiveSubItem = (item: typeof translatedNavItems[0]) => {
    if (!item.subItems) return false;
    return item.subItems.some(subItem => isActive(subItem.path));
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const getInitials = (name?: string | null, email?: string | null): string => {
    if (name) {
      return name.charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <aside
      className={cn(
        'bg-white border-r border-gray-200 flex flex-col h-full',
        collapsed && 'w-16',
        !collapsed && 'w-64',
        className
      )}
    >
      {/* Logo */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
        {!collapsed && (
          <a
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick('/dashboard');
            }}
            className="no-underline hover:opacity-80 transition-opacity"
          >
            <Logo variant="full" size={24} color="#111827" />
          </a>
        )}
        {collapsed && (
          <a
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick('/dashboard');
            }}
            className="no-underline hover:opacity-80 transition-opacity flex items-center justify-center"
          >
            <Logo variant="icon" size={24} color="#111827" />
          </a>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8"
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        )}
        {isMobile && onMobileClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-2">
          {translatedNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path) || hasActiveSubItem(item);
            const expanded = isItemExpanded(item.key);
            const hasSubItems = item.subItems && item.subItems.length > 0;

            return (
              <div key={item.key}>
                <button
                  onClick={() => {
                    if (hasSubItems && !collapsed) {
                      toggleExpanded(item.key);
                    } else {
                      handleNavClick(item.path);
                    }
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 hover:bg-gray-100',
                    collapsed && 'justify-center'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {hasSubItems && (
                        <span className="flex-shrink-0">
                          {expanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </span>
                      )}
                      {item.badge && (
                        <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
                {!collapsed && hasSubItems && expanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.subItems?.map((subItem) => {
                      const subActive = isActive(subItem.path);
                      return (
                        <button
                          key={subItem.key}
                          onClick={() => handleNavClick(subItem.path)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                            subActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          )}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                          <span>{subItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* User Menu - Bottom */}
      {isAuthenticated && user && (
        <div className="border-t border-gray-200 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-gray-700 hover:bg-gray-100',
                  collapsed && 'justify-center'
                )}
                title={collapsed ? user.displayName || user.email || 'User' : undefined}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || user.email || 'User'} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(user.displayName, user.email)}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.displayName || user.email}
                      </p>
                      {user.email && user.displayName && (
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" side={collapsed ? 'right' : 'left'}>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.displayName || 'User'}
                  </p>
                  {user.email && (
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  navigate('/dashboard/settings?tab=preferences');
                  if (isMobile && onMobileClose) {
                    onMobileClose();
                  }
                }}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>{t('header.preferences')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setContactUsOpen(true);
                  if (isMobile && onMobileClose) {
                    onMobileClose();
                  }
                }}
                className="cursor-pointer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                <span>{t('header.contact', { defaultValue: '联系我们' })}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('header.logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* 联系对话框 */}
      <ContactUsDialog open={contactUsOpen} onOpenChange={setContactUsOpen} />
    </aside>
  );
}

