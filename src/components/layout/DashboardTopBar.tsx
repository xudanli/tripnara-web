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
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/common/Logo';

interface DashboardTopBarProps {}

export default function DashboardTopBar({}: DashboardTopBarProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

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
              <Logo variant="full" size={40} color="#111827" />
            </a>
          </div>

          {/* 右上角操作区：创建行程按钮 */}
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
          </div>
        </div>
      </div>
    </header>
  );
}
