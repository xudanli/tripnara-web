import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, MapPin, Play, BarChart3, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  key: string;
  label: string;
  icon: typeof Home;
  path: string;
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
    key: 'execute',
    label: '执行',
    icon: Play,
    path: '/dashboard/execute',
  },
  {
    key: 'insights',
    label: '复盘',
    icon: BarChart3,
    path: '/dashboard/insights',
  },
];

interface MobileBottomNavProps {
  onAgentClick?: () => void;
}

export default function MobileBottomNav({ onAgentClick }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 gap-1 py-2 transition-colors',
                active ? 'text-primary' : 'text-gray-600'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}

        {/* 中央浮动按钮 - Agent / Create */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => {
              if (onAgentClick) {
                onAgentClick();
              } else {
                // 默认行为：导航到创建页面或打开Agent
                navigate('/dashboard/trips/new');
              }
            }}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </nav>
  );
}

