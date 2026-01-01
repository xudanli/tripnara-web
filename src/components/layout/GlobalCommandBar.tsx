import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { agentApi } from '@/api/agent';
import type { RouteAndRunRequest, RouteAndRunResponse, RouteType } from '@/api/agent';
import { Input } from '@/components/ui/input';
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
import { Bell, Send, Settings, LogOut, User, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalCommandBarProps {
  activeTripId?: string | null;
  onSystem2Response?: () => void;
  className?: string;
}

export default function GlobalCommandBar({
  activeTripId,
  onSystem2Response,
  className,
}: GlobalCommandBarProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 聚焦时展开
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

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

  const handleSend = async () => {
    if (!input.trim() || loading || !user) return;

    const userInput = input.trim();
    setInput('');
    setLoading(true);
    setIsExpanded(false);

    try {
      const request: RouteAndRunRequest = {
        request_id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: user.id,
        trip_id: activeTripId || null,
        message: userInput,
        conversation_context: {
          recent_messages: [],
        },
      };

      const response: RouteAndRunResponse = await agentApi.routeAndRun(request);

      // 根据 routeType 处理响应
      const routeType = response.route.route;
      const isSystem2 = routeType === 'SYSTEM2_REASONING' || routeType === 'SYSTEM2_WEBBROWSE';

      // 如果是 System2 且有回调，通知父组件刷新数据
      if (isSystem2 && onSystem2Response) {
        setTimeout(() => {
          onSystem2Response();
        }, 500);
      }

      // 如果有 plan 或需要导航，可以在这里处理
      // 目前先简单显示成功消息
      console.log('Agent response:', response);
    } catch (err) {
      console.error('Failed to send agent request:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header
      className={cn(
        'h-16 border-b border-gray-200 bg-white sticky top-0 z-50',
        className
      )}
    >
      <div className="h-full flex items-center justify-between px-4 gap-4">
        {/* Agent 输入框（占中间） */}
        <div className="flex-1 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsExpanded(true)}
              onBlur={() => {
                // 延迟关闭，允许点击按钮
                setTimeout(() => setIsExpanded(false), 200);
              }}
              placeholder="说一句：我想更松一点/把徒步放到上午/今天下雨怎么办？"
              disabled={loading}
              className={cn(
                'pl-10 pr-10',
                isExpanded && 'ring-2 ring-primary'
              )}
            />
            {input.trim() && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSend}
                disabled={loading}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 右侧：通知 + 账户 */}
        <div className="flex items-center gap-2">
          {/* 通知 */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>

          {/* 用户菜单 */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 outline-none hover:opacity-80 transition-opacity">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user.avatarUrl || undefined}
                    alt={user.displayName || user.email || 'User'}
                  />
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
                  onClick={() => navigate('/dashboard/settings')}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>设置</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/dashboard/settings?tab=preferences')}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>偏好设置</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

