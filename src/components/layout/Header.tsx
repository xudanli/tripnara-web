import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, LogOut, User, MapPin, Compass, Wrench, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import Logo from '@/components/common/Logo';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

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

  const navItems = [
    { path: '/dashboard/trips', key: 'trips', icon: MapPin },
    { path: '/route-philosophy', key: 'routePhilosophy', icon: Compass },
    { path: '/dashboard/professional', key: 'professional', icon: Wrench },
    { path: '/dashboard/share', key: 'share', icon: Share2 },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard/trips') {
      return location.pathname.startsWith('/dashboard/trips') && !location.pathname.includes('/trips/new');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a
            href="/dashboard"
            className="no-underline hover:opacity-80 transition-opacity"
            onClick={(e) => {
              e.preventDefault();
              navigate('/dashboard/trips');
            }}
          >
            <Logo variant="full" size={28} color="#111827" />
          </a>

          {/* Navigation Items */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      'flex items-center gap-2 text-sm font-medium transition-colors',
                      isActive(item.path)
                        ? 'text-primary'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t(`header.nav.${item.key}`)}</span>
                  </button>
                );
              })}
            </nav>
          )}
          
          {/* Language Switcher */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center">
              <LanguageSwitcher />
            </div>
          )}

          {/* User Menu */}
          {isAuthenticated && user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 outline-none hover:opacity-80 transition-opacity">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || user.email || 'User'} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(user.displayName, user.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                  {user.displayName || user.email}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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
                  onClick={() => navigate('/dashboard/settings?tab=preferences')}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t('header.preferences')}</span>
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
          )}
        </div>
      </div>
    </header>
  );
}