/**
 * 上下文侧边栏组件
 * 根据当前上下文（是否有行程、对话状态等）动态显示相关信息
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import type { TripDetail, AttentionItem, PersonaAlert } from '@/types/trip';
import { getPersonaAlertUserBody } from '@/lib/persona-alert-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { GateStatusBanner } from '@/components/ui/gate-status-banner';
import { 
  MapPin, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Shield,
  Wallet,
  ChevronRight,
  X,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { normalizeGateStatus, getGateStatusLabel, type GateStatus } from '@/lib/gate-status';
import { useDrawer } from './DashboardLayout';

interface ContextSidebarProps {
  tripId?: string | null;
  conversationContext?: any; // 对话上下文，用于智能显示
  className?: string;
  onClose?: () => void;
}

export default function ContextSidebar({
  tripId,
  conversationContext,
  className,
  onClose,
}: ContextSidebarProps) {
  const navigate = useNavigate();
  const { setDrawerOpen, setDrawerTab, setHighlightItemId } = useDrawer();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [personaAlerts, setPersonaAlerts] = useState<PersonaAlert[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 智能显示状态（根据对话上下文自动展开相关卡片）
  const [expandedCards, setExpandedCards] = useState<{
    attention: boolean;
    risk: boolean;
    budget: boolean;
    readiness: boolean;
  }>({
    attention: false,
    risk: false,
    budget: false,
    readiness: false,
  });

  // 如果没有 tripId，不显示侧边栏
  if (!tripId) {
    return null;
  }

  // 根据对话上下文智能展开相关卡片
  useEffect(() => {
    if (conversationContext) {
      // 检查对话中是否提到相关关键词
      const contextStr = JSON.stringify(conversationContext).toLowerCase();
      setExpandedCards({
        attention: contextStr.includes('待处理') || contextStr.includes('事项') || contextStr.includes('决策'),
        risk: contextStr.includes('风险') || contextStr.includes('安全') || contextStr.includes('警告'),
        budget: contextStr.includes('预算') || contextStr.includes('花费') || contextStr.includes('成本'),
        readiness: contextStr.includes('准备') || contextStr.includes('阻塞') || contextStr.includes('完成'),
      });
    }
  }, [conversationContext]);

  useEffect(() => {
    if (tripId) {
      loadData();
    }
  }, [tripId]);

  const loadData = async () => {
    if (!tripId) return;
    
    try {
      setLoading(true);
      const [tripData, attentionResponse, alerts] = await Promise.all([
        tripsApi.getById(tripId),
        tripsApi.getAttentionQueue({ limit: 5, offset: 0 }),
        tripsApi.getPersonaAlerts(tripId).catch(() => []),
      ]);
      
      setTrip(tripData);
      setAttentionItems(attentionResponse.items || []);
      setPersonaAlerts(alerts || []);
    } catch (err) {
      console.error('Failed to load context sidebar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCountryName = (destination: string | undefined, destinationName?: string) => {
    // 🐛 优先使用 destinationName，如果没有则使用 destination
    if (destinationName) {
      return destinationName;
    }
    if (destination) {
      // 简单的提取国家名称逻辑
      return destination.split(',')[0]?.trim() || destination;
    }
    return '未知目的地';
  };

  const blockers = attentionItems.filter(item => item.severity === 'critical').length;

  // 从 AttentionItem 推断决策状态
  const getAttentionItemDecisionStatus = (item: AttentionItem): GateStatus => {
    // 如果 metadata 中有 action，使用它
    if (item.metadata?.action) {
      const action = item.metadata.action.toUpperCase();
      if (action === 'ALLOW') return 'ALLOW';
      if (action === 'REJECT') return 'REJECT';
      if (action === 'ADJUST' || action === 'REPLACE') return 'SUGGEST_REPLACE';
    }
    
    // 根据严重程度推断状态
    if (item.severity === 'critical') return 'REJECT';
    if (item.severity === 'high') return 'NEED_CONFIRM';
    if (item.severity === 'medium') return 'SUGGEST_REPLACE';
    return 'ALLOW';
  };

  // 从 PersonaAlert 推断决策状态
  const getPersonaAlertDecisionStatus = (alert: PersonaAlert): GateStatus => {
    // 如果 metadata 中有 action，使用它
    if (alert.metadata?.action) {
      return normalizeGateStatus(alert.metadata.action);
    }
    
    // 根据严重程度推断状态
    if (alert.severity === 'warning') return 'REJECT';
    if (alert.severity === 'info') return 'NEED_CONFIRM';
    return 'ALLOW';
  };

  // 键盘导航处理
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <aside 
      className={cn('h-full overflow-y-auto bg-white border-l border-gray-200 p-4', className)}
      aria-label="行程上下文侧边栏"
    >
      {/* 关闭按钮（移动端） */}
      {onClose && (
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <h2 className="text-lg font-semibold" id="context-sidebar-title">行程详情</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            onKeyDown={(e) => handleKeyDown(e, onClose)}
            aria-label="关闭行程详情"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8" role="status" aria-label="加载行程信息中">
          <Spinner className="w-6 h-6" aria-hidden="true" />
        </div>
      ) : trip ? (
        <div className="space-y-4" aria-labelledby={onClose ? "context-sidebar-title" : undefined}>
          {/* 行程摘要 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">当前行程</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-semibold text-sm mb-2">{getCountryName(trip.destination, (trip as any).destinationName)}</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {getCountryName(trip.destination, (trip as any).destinationName)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(trip.startDate), 'yyyy-MM-dd')}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/dashboard/trips/${trip.id}`)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  查看详情
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/dashboard/plan-studio?tripId=${trip.id}`)}
                >
                  继续规划
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 待处理决策点 */}
          {attentionItems.length > 0 && (
            <Card className={cn(expandedCards.attention && 'ring-2 ring-primary/20')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  待处理事项
                  {blockers > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {blockers}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {attentionItems.slice(0, 3).map((item) => {
                    const decisionStatus = getAttentionItemDecisionStatus(item);
                    return (
                      <div
                        key={item.id}
                        className="flex items-start justify-between p-2 border rounded-lg hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        onClick={() => {
                          if (item.tripId) {
                            setDrawerTab('risk');
                            setDrawerOpen(true);
                            setHighlightItemId(item.type);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (item.tripId) {
                              setDrawerTab('risk');
                              setDrawerOpen(true);
                              setHighlightItemId(item.type);
                            }
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`${item.title}，决策状态：${getGateStatusLabel(decisionStatus)}，点击查看详情`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-sm font-medium truncate">{item.title}</div>
                            <GateStatusBanner 
                              status={decisionStatus} 
                              size="sm" 
                              showIcon={true}
                              className="flex-shrink-0"
                            />
                          </div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {item.description}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-2 flex-shrink-0" />
                      </div>
                    );
                  })}
                  {attentionItems.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => {
                        setDrawerTab('risk');
                        setDrawerOpen(true);
                      }}
                      aria-label={`查看全部 ${attentionItems.length} 个待处理事项`}
                    >
                      查看全部 ({attentionItems.length})
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 风险概览 */}
          {personaAlerts.length > 0 && (
            <Card className={cn(expandedCards.risk && 'ring-2 ring-primary/20')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  风险提示
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {personaAlerts.slice(0, 3).map((alert) => {
                    const decisionStatus = getPersonaAlertDecisionStatus(alert);
                    const personaName = 
                      alert.persona === 'ABU' ? '安全官 (Abu)' :
                      alert.persona === 'DR_DRE' ? '节奏官 (Dr.Dre)' :
                      alert.persona === 'USER_ACTION' ? '系统处理记录' :
                      '修复官 (Neptune)';
                    
                    return (
                      <div 
                        key={alert.id} 
                        className="p-2 border rounded-lg hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        onClick={() => {
                          setDrawerTab('risk');
                          setDrawerOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setDrawerTab('risk');
                            setDrawerOpen(true);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`${alert.title}，来自${personaName}，决策状态：${getGateStatusLabel(decisionStatus)}，点击查看详情`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-sm flex-1">{alert.title}</div>
                          <GateStatusBanner 
                            status={decisionStatus} 
                            size="sm" 
                            showIcon={true}
                            className="flex-shrink-0"
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {personaName}: {getPersonaAlertUserBody(alert)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => {
                    setDrawerTab('risk');
                    setDrawerOpen(true);
                  }}
                  aria-label={`查看全部 ${personaAlerts.length} 个风险提示`}
                >
                  查看全部风险
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 预算状态（如果有预算信息） */}
          {trip.totalBudget && (
            <Card className={cn(expandedCards.budget && 'ring-2 ring-primary/20')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  预算状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">总预算</span>
                    <span className="text-sm font-semibold">
                      {trip.totalBudget?.toLocaleString()} 元
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => navigate(`/dashboard/trips/${trip.id}/budget`)}
                  >
                    查看预算详情
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 准备度（如果有阻塞项） */}
          {blockers > 0 && (
            <Card className={cn(expandedCards.readiness && 'ring-2 ring-primary/20')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  准备度
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm mb-2">
                  <span className="font-medium text-red-600">{blockers}</span> 个阻塞项需要处理
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate('/dashboard/readiness')}
                >
                  查看准备度
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">暂无行程信息</p>
        </div>
      )}
    </aside>
  );
}
