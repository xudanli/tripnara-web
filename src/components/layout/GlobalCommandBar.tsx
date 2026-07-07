import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import type { RouteAndRunRequest } from '@/api/agent';
import { invokeRouteAndRun } from '@/lib/invoke-route-and-run';
import { PlanningPipelineProgress } from '@/components/agent/PlanningPipelineProgress';
import { RouteRunCtreProgressBand } from '@/features/agent/ctre';
import { usePlanningTaskStore } from '@/store/planningTaskStore';
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
import { Bell, Send, Settings, LogOut, User, Search, Globe, Check, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContactUsDialog } from '@/components/common/ContactUsDialog';
import ApprovalDialog from '@/components/trips/ApprovalDialog';
import { toast } from 'sonner';
import { needsApproval, extractApprovalId } from '@/utils/approval';
import { describeAgentFailureToast } from '@/utils/agent-error-types';
import { localeForAgentConversationContext } from '@/lib/agent-conversation-locale';
import { useRouteRunPreferenceProfile } from '@/hooks/useRouteRunPreferenceProfile';
import { sanitizeRouteRunTripId } from '@/lib/route-run-trip-id';

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
  const { t, i18n } = useTranslation();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [contactUsOpen, setContactUsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 审批相关状态
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const routeRunPreferenceProfile = useRouteRunPreferenceProfile(activeTripId);
  const sanitizedTripId = sanitizeRouteRunTripId(activeTripId);
  const planningTaskStatus = usePlanningTaskStore((s) => s.status);
  const planningTaskBusy = planningTaskStatus === 'PROCESSING';

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

    let routeRunRequestId: string | null = null;
    try {
      const agentLocale = localeForAgentConversationContext(i18n.language);
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const request: RouteAndRunRequest = {
        request_id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: user.id,
        trip_id: sanitizedTripId ?? null,
        message: userInput,
        ...(routeRunPreferenceProfile ? { preference_profile: routeRunPreferenceProfile as any } : {}),
        conversation_context: {
          recent_messages: [],
          ...(agentLocale ? { locale: agentLocale } : {}),
          timezone,
        },
        options: {
          intent_mode: sanitizedTripId ? 'AUTO' : 'GENERIC_QA',
          async_mode: 'AUTO',
          entry_point: 'dashboard',
          show_debug_scores: false,
          enable_guardians_debate_llm: true,
        },
      };
      routeRunRequestId = request.request_id;

      const response = await invokeRouteAndRun(request);

      // 检查是否需要审批
      if (needsApproval(response)) {
        const approvalId = extractApprovalId(response);
        if (!approvalId) {
          console.error('审批 ID 不存在，但需要审批');
          toast.error('获取审批信息失败');
          return;
        }
        
        // 显示审批对话框
        setPendingApprovalId(approvalId);
        setApprovalDialogOpen(true);
        
        toast.info('需要您的审批才能继续执行操作');
        return; // 等待审批，不继续处理
      }

      // 根据状态显示不同的提示
      const status = response.result.status;
      const answerText = response.result.answer_text || '操作完成';
      
      if (status === 'NEED_MORE_INFO') {
        // 需要更多信息，显示警告提示
        toast.warning(answerText, {
          duration: 8000, // 延长显示时间，让用户有时间阅读
        });
      } else if (status === 'NEED_CONSENT') {
        // 需要授权
        toast.info('需要您的授权才能继续操作');
      } else if (status === 'FAILED' || status === 'TIMEOUT') {
        // 失败或超时
        toast.error(answerText || '操作失败，请稍后重试');
      } else if (status === 'OK') {
        // 成功
        toast.success(answerText);
      } else {
        // 其他状态，默认显示成功
        toast.success(answerText);
      }

      // 根据 routeType 处理响应
      const routeType = response.route.route;
      const isSystem2 = routeType === 'SYSTEM2_REASONING' || routeType === 'SYSTEM2_WEBBROWSE';

      // 如果是 System2 且有回调，通知父组件刷新数据
      if (isSystem2 && onSystem2Response) {
        setTimeout(() => {
          onSystem2Response();
        }, 500);
      }

      console.log('Agent response:', response);
    } catch (err) {
      console.error('Failed to send agent request:', err);
      const httpStatus = (err as { response?: { status?: number } })?.response?.status;
      toast.error(httpStatus && httpStatus >= 500 ? '服务暂时不可用' : '操作失败', {
        description: describeAgentFailureToast(err, routeRunRequestId),
      });
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
              placeholder={t('globalCommandBar.placeholder')}
              disabled={loading || planningTaskBusy}
              className={cn(
                'pl-10 pr-10',
                isExpanded && 'ring-2 ring-primary'
              )}
            />
            {(loading || planningTaskBusy) && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 px-1 space-y-1">
                <PlanningPipelineProgress compact />
                <RouteRunCtreProgressBand compact />
              </div>
            )}
            {input.trim() && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSend}
                disabled={loading || planningTaskBusy}
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
            <span className="absolute top-1 right-1 h-2 w-2 bg-gate-reject-foreground rounded-full" />
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
                  <span>{t('globalCommandBar.settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/dashboard/settings?tab=preferences')}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>{t('globalCommandBar.preferences')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setContactUsOpen(true)}
                  className="cursor-pointer"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  <span>{t('globalCommandBar.contact')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => i18n.changeLanguage('zh')}
                  className="cursor-pointer"
                >
                  <Globe className="mr-2 h-4 w-4" />
                  <span className="flex-1">中文</span>
                  {i18n.language.startsWith('zh') && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => i18n.changeLanguage('en')}
                  className="cursor-pointer"
                >
                  <Globe className="mr-2 h-4 w-4" />
                  <span className="flex-1">English</span>
                  {i18n.language.startsWith('en') && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-gate-reject-foreground focus:text-gate-reject-foreground"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('globalCommandBar.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <ContactUsDialog open={contactUsOpen} onOpenChange={setContactUsOpen} />
      
      {/* 审批对话框 */}
      {pendingApprovalId && (
        <ApprovalDialog
          approvalId={pendingApprovalId}
          open={approvalDialogOpen}
          onOpenChange={(open) => {
            setApprovalDialogOpen(open);
            if (!open) {
              setPendingApprovalId(null);
            }
          }}
          onDecision={async (approved) => {
            // 审批完成后的处理
            if (approved) {
              toast.success('审批已批准，Agent 正在继续执行...');
            } else {
              toast.info('审批已拒绝，Agent 将调整策略');
            }
            
            // 关闭对话框
            setApprovalDialogOpen(false);
            setPendingApprovalId(null);
            
            // 如果有回调，通知父组件刷新数据
            if (onSystem2Response) {
              setTimeout(() => {
                onSystem2Response();
              }, 500);
            }
          }}
        />
      )}
    </header>
  );
}

