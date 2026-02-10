import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import Logo from '../common/Logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown } from 'lucide-react';

interface NavItem {
  key: string;
  path: string;
  dropdownItems?: { key: string; path: string }[];
}

const navItems: NavItem[] = [
  {
    key: 'home',
    path: '/',
  },
  {
    key: 'product',
    path: '/product',
  },
  {
    key: 'stories',
    path: '/stories',
  },
  {
    key: 'routeIntelligence',
    path: '/route-intelligence',
  },
  {
    key: 'professionals',
    path: '/professionals',
  },
  {
    key: 'pricing',
    path: '/pricing',
  },
  {
    key: 'about',
    path: '/about',
  },
];

export default function WebsiteNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="sticky top-0 z-[1000] bg-background border-b border-border py-4 px-8">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link
          to="/"
          className="no-underline text-foreground flex items-center"
        >
          <Logo variant="full" size={40} className="text-foreground" />
        </Link>

        {/* Desktop Navigation */}
        <div className="desktop-nav flex gap-10 items-center">
          {navItems.map((item) => (
            <div
              key={item.key}
              className="relative"
            >
              {item.dropdownItems ? (
                <DropdownMenu open={openDropdown === item.key} onOpenChange={(open) => setOpenDropdown(open ? item.key : null)}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'h-auto py-2 px-0 flex items-center gap-1 relative',
                        isActive(item.path) ? 'text-foreground font-bold' : 'text-muted-foreground font-normal',
                        'hover:text-foreground'
                      )}
                    >
                      {t(`nav.${item.key}`)}
                      <ChevronDown className="h-3 w-3" />
                      {isActive(item.path) && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="start" 
                    className="min-w-[280px] border-2 border-black rounded-lg"
                    onMouseEnter={() => setOpenDropdown(item.key)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    {item.dropdownItems.map((dropdownItem) => (
                      <DropdownMenuItem key={dropdownItem.key} asChild>
                        <Link
                          to={dropdownItem.path}
                          onClick={(e) => {
                            setOpenDropdown(null);
                            // Handle anchor link navigation
                            if (dropdownItem.path.includes('#')) {
                              const [path, hash] = dropdownItem.path.split('#');
                              if (location.pathname === path) {
                                // If already on the page, scroll to anchor
                                e.preventDefault();
                                const element = document.querySelector(`#${hash}`);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                } else {
                                  // Fallback: navigate normally
                                  window.location.href = dropdownItem.path;
                                }
                              }
                            }
                          }}
                          className="cursor-pointer"
                        >
                          {t(`nav.dropdown.${dropdownItem.key}`)}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  to={item.path}
                  className={cn(
                    'no-underline py-2 relative transition-colors text-sm',
                    isActive(item.path) 
                      ? 'text-foreground font-bold' 
                      : 'text-muted-foreground font-normal hover:text-foreground'
                  )}
                >
                  {t(`nav.${item.key}`)}
                  {isActive(item.path) && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                  )}
                </Link>
              )}
            </div>
          ))}

          {/* Right side buttons - 参考 YouMind 设计：主要 CTA 突出，用户菜单低调 */}
          <div className="flex items-center gap-3 ml-8">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {/* 主要 CTA：打开应用按钮（突出显示，深色背景） */}
                <Button asChild className="bg-black hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all whitespace-nowrap">
                  <Link to="/dashboard">
                    {t('nav.openApp')}
                  </Link>
                </Button>
                
                {/* 用户菜单（次要操作，更低调） */}
                <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <button className="outline-none">
                      <Avatar className="h-9 w-9 border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity">
                        <AvatarImage src={user?.avatarUrl || undefined} alt={user?.displayName || user?.email || 'User'} />
                        <AvatarFallback className="bg-black text-white text-sm font-semibold">
                          {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[200px]">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold leading-none">
                          {user?.displayName || user?.email}
                        </p>
                        {user?.email && user?.displayName && (
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      {t('nav.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button asChild variant="outline" className="border-black bg-gray-100 hover:bg-gray-200 whitespace-nowrap">
                <Link to="/login">
                  {t('nav.startPlanning')}
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="hidden mobile-menu-button"
          aria-label="Toggle menu"
        >
          <span className="text-2xl">☰</span>
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu flex flex-col gap-4 p-4 border-t border-gray-200">
          {/* CTA first on mobile */}
          <Button
            asChild
            className="w-full bg-black hover:bg-gray-800 text-white font-semibold"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Link to={isAuthenticated ? "/dashboard" : "/login"}>
              {isAuthenticated ? t('nav.openApp') : t('nav.startPlanning')}
            </Link>
          </Button>

          {navItems.map((item) => (
            <div key={item.key}>
              <Link
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'block no-underline py-2',
                  isActive(item.path) ? 'text-foreground font-bold' : 'text-gray-700 font-normal'
                )}
              >
                {t(`nav.${item.key}`)}
              </Link>
              {item.dropdownItems && (
                <div className="pl-4 mt-2">
                  {item.dropdownItems.map((dropdownItem) => (
                    <Link
                      key={dropdownItem.key}
                      to={dropdownItem.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block no-underline text-gray-600 text-sm py-1"
                    >
                      {t(`nav.dropdown.${dropdownItem.key}`)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="py-2 border-t border-gray-200 mt-2">
            <LanguageSwitcher />
          </div>
          {isAuthenticated ? (
            <>
              <div className="pt-3 mt-2 border-t border-gray-200 flex items-center gap-3 px-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.avatarUrl || undefined} alt={user?.displayName || user?.email || 'User'} />
                  <AvatarFallback className="bg-black text-white text-base font-semibold">
                    {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-foreground">
                    {user?.displayName || user?.email}
                  </div>
                  {user?.email && user.displayName && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {user.email}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                asChild
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Link to="/dashboard/settings?tab=preferences">
                  {t('nav.preferences')}
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full border-black text-black hover:bg-gray-100"
              >
                {t('nav.logout')}
              </Button>
            </>
          ) : null}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-button {
            display: block !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-menu {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
}
