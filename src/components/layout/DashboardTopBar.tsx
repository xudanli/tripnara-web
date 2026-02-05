/**
 * Dashboard 顶部导航栏
 * 
 * 设计参考：YouMind 右上角布局
 * - 主要 CTA 按钮（创建行程）：突出显示，深色背景
 * - 用户菜单：次要操作，更低调
 * - 视觉层次清晰：主要操作 vs 次要操作
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Plus, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/common/Logo';

interface DashboardTopBarProps {}

export default function DashboardTopBar({}: DashboardTopBarProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <a
              href="/dashboard"
              className="no-underline hover:opacity-80 transition-opacity"
              onClick={(e) => {
                e.preventDefault();
                navigate('/dashboard');
              }}
            >
              <Logo variant="full" size={28} color="#111827" />
            </a>
          </div>

          {/* 右上角操作区：参考 YouMind 设计 - 主要 CTA + 用户菜单 */}
          <div className="flex items-center gap-3">
            {/* 主要 CTA：创建行程按钮（突出显示） */}
            <Button
              onClick={() => navigate('/dashboard/trips/new')}
              className={cn(
                "bg-slate-900 hover:bg-slate-800 text-white",
                "shadow-md hover:shadow-lg transition-all",
                "hidden sm:flex" // 移动端隐藏，避免空间不足
              )}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span className="font-medium">创建行程</span>
            </Button>

            {/* 用户菜单（次要操作，更低调） */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 outline-none hover:opacity-80 transition-opacity">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || user.email || 'User'} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(user.displayName, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-gray-700 hidden lg:inline">
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
                  onClick={() => navigate('/dashboard/settings?tab=account')}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>{t('header.profile') || '个人资料'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/dashboard/settings')}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t('header.settings') || '设置'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('header.logout') || '退出登录'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
