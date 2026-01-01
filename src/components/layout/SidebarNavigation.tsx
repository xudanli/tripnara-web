import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  MapPin,
  Compass,
  Play,
  Mountain,
  Shield,
  BarChart3,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface NavItem {
  key: string;
  label: string;
  icon: typeof Home;
  path: string;
  badge?: string | number;
}

const navItems: NavItem[] = [
  {
    key: 'home',
    label: '工作台',
    icon: Home,
    path: '/dashboard',
  },
  {
    key: 'trips',
    label: '行程库',
    icon: MapPin,
    path: '/dashboard/trips',
  },
  {
    key: 'plan-studio',
    label: '规划工作台',
    icon: Compass,
    path: '/dashboard/plan-studio',
  },
  {
    key: 'execute',
    label: '执行模式',
    icon: Play,
    path: '/dashboard/execute',
  },
  {
    key: 'trails',
    label: '徒步',
    icon: Mountain,
    path: '/dashboard/trails',
  },
  {
    key: 'readiness',
    label: '准备度',
    icon: Shield,
    path: '/dashboard/readiness',
  },
  {
    key: 'insights',
    label: '复盘',
    icon: BarChart3,
    path: '/dashboard/insights',
  },
  {
    key: 'settings',
    label: '设置',
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
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

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
            className="text-xl font-bold text-gray-900 no-underline hover:text-gray-700 transition-colors"
          >
            TripNARA
          </a>
        )}
        {collapsed && (
          <div className="text-xl font-bold text-gray-900">TN</div>
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
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.path)}
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
                    {item.badge && (
                      <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}

