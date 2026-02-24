import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EvidenceDrawerSkeleton } from './EvidenceDrawerSkeleton';
import { X, FileText, AlertTriangle, History, ExternalLink, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tripsApi } from '@/api/trips';
import type { DecisionLogEntry, PersonaAlert, EvidenceItem as EvidenceItemType } from '@/types/trip';
import BusinessHoursCard from '@/components/trips/BusinessHoursCard';

interface EvidenceDrawerProps {
  open: boolean;
  onClose: () => void;
  tripId?: string | null;
  activeTab?: 'evidence' | 'risk' | 'decision';
  highlightItemId?: string; // 用于高亮特定项
  /** 点击证据时回调，用于在行程时间轴中高亮 evidence.affectedItemIds */
  onEvidenceClick?: (evidence: EvidenceItemType) => void;
}

// EvidenceItem 类型已从 @/types/trip 导入

interface RiskItem {
  id: string;
  level: 'high' | 'medium' | 'low';
  category: 'time' | 'weather' | 'road' | 'fatigue' | 'booking' | 'other';
  title: string;
  description: string;
  reason: string; // Abu 风格的一句话原因
  affectedItems?: string[];
  evidenceIds?: string[];
  createdAt?: string;
  persona?: 'ABU' | 'DR_DRE' | 'NEPTUNE';
}

interface DecisionLogItem {
  id: string;
  timestamp: string;
  action: string;
  reason: string;
  persona?: 'abu' | 'dre' | 'neptune';
  result?: string;
  evidenceIds?: string[];
}

export default function EvidenceDrawer({
  open,
  onClose,
  tripId,
  activeTab = 'evidence',
  highlightItemId,
  onEvidenceClick,
}: EvidenceDrawerProps) {
  const [currentTab, setCurrentTab] = useState<'evidence' | 'risk' | 'decision'>(activeTab);
  const [decisionLogItems, setDecisionLogItems] = useState<DecisionLogEntry[]>([]);
  const [personaAlerts, setPersonaAlerts] = useState<PersonaAlert[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItemType[]>([]);
  const [loadingDecisionLog, setLoadingDecisionLog] = useState(false);
  const [loadingPersonaAlerts, setLoadingPersonaAlerts] = useState(false);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  // 当 drawer 打开或 tripId 变化时加载数据
  useEffect(() => {
    if (open && tripId) {
      if (currentTab === 'evidence') {
        loadEvidence();
      } else if (currentTab === 'decision') {
        loadDecisionLog();
      } else if (currentTab === 'risk') {
        loadPersonaAlerts();
      }
    }
  }, [open, tripId, currentTab]);

  const loadDecisionLog = async () => {
    if (!tripId) return;
    try {
      setLoadingDecisionLog(true);
      const response = await tripsApi.getDecisionLog(tripId, 50, 0);
      setDecisionLogItems(response.items || []);
    } catch (err: any) {
      console.error('Failed to load decision log:', err);
      setDecisionLogItems([]);
    } finally {
      setLoadingDecisionLog(false);
    }
  };

  const loadPersonaAlerts = async () => {
    if (!tripId) return;
    try {
      setLoadingPersonaAlerts(true);
      const alerts = await tripsApi.getPersonaAlerts(tripId);
      setPersonaAlerts(alerts || []);
    } catch (err: any) {
      console.error('Failed to load persona alerts:', err);
      setPersonaAlerts([]);
    } finally {
      setLoadingPersonaAlerts(false);
    }
  };

  const loadEvidence = async () => {
    if (!tripId) return;
    try {
      setLoadingEvidence(true);
      const response = await tripsApi.getEvidence(tripId, {
        limit: 50,
        offset: 0,
      });
      setEvidenceItems(response.items || []);
    } catch (err: any) {
      console.error('Failed to load evidence:', err);
      setEvidenceItems([]);
    } finally {
      setLoadingEvidence(false);
    }
  };

  // 将 DecisionLogEntry 转换为组件使用的格式
  const convertDecisionLogItem = (entry: DecisionLogEntry): DecisionLogItem => {
    const personaMap: Record<string, 'abu' | 'dre' | 'neptune'> = {
      'ABU': 'abu',
      'DR_DRE': 'dre',
      'NEPTUNE': 'neptune',
    };

    return {
      id: entry.id,
      timestamp: entry.date,
      action: entry.action,
      reason: entry.description,
      persona: entry.persona ? personaMap[entry.persona] : undefined,
      result: entry.metadata?.action || undefined,
      evidenceIds: entry.metadata?.evidenceRefs,
    };
  };

  // 获取角色信息（emoji + 名称）
  const getPersonaInfo = (persona: 'ABU' | 'DR_DRE' | 'NEPTUNE') => {
    switch (persona) {
      case 'ABU':
        return { emoji: '🐻‍❄️', name: '安全守护者 Abu', shortName: 'Abu' };
      case 'DR_DRE':
        return { emoji: '🐕', name: '节奏设计师 Dr.Dre', shortName: 'Dr.Dre' };
      case 'NEPTUNE':
        return { emoji: '🦦', name: '空间魔法师 Neptune', shortName: 'Neptune' };
    }
  };

  // 获取风险类型中文描述（根据角色和类别）
  const getRiskCategoryLabel = (category: RiskItem['category'], persona?: 'ABU' | 'DR_DRE' | 'NEPTUNE'): string => {
    // 根据角色优先显示特定类型
    if (persona === 'NEPTUNE' && (category === 'road' || category === 'other')) {
      return '空间层面阻断 / 封闭问题';
    }
    if (persona === 'DR_DRE' && category === 'fatigue') {
      return '日节奏与连续疲劳';
    }
    if (persona === 'ABU' && category === 'other') {
      return '硬性风险问题（DEM、道路、危险区域、合规）';
    }
    
    // 通用类型
    switch (category) {
      case 'time':
        return '时间冲突';
      case 'weather':
        return '天气风险';
      case 'road':
        return '道路封闭 / 阻断';
      case 'fatigue':
        return '疲劳风险';
      case 'booking':
        return '预订问题';
      case 'other':
      default:
        return '其他风险';
    }
  };

  // 根据 alert 的 message 推断风险类型
  const inferRiskCategory = (message: string, persona: 'ABU' | 'DR_DRE' | 'NEPTUNE'): RiskItem['category'] => {
    // 根据角色和消息内容推断
    if (persona === 'ABU') {
      if (message.includes('道路') || message.includes('road') || message.includes('封闭') || message.includes('阻断')) {
        return 'road';
      }
      if (message.includes('危险') || message.includes('合规') || message.includes('DEM')) {
        return 'other';
      }
    } else if (persona === 'DR_DRE') {
      if (message.includes('节奏') || message.includes('疲劳') || message.includes('连续')) {
        return 'fatigue';
      }
      if (message.includes('时间') || message.includes('time')) {
        return 'time';
      }
    } else if (persona === 'NEPTUNE') {
      if (message.includes('空间') || message.includes('阻断') || message.includes('封闭')) {
        return 'road';
      }
    }
    
    // 通用判断
    if (message.includes('时间') || message.includes('time')) {
      return 'time';
    }
    if (message.includes('天气') || message.includes('weather')) {
      return 'weather';
    }
    if (message.includes('道路') || message.includes('road')) {
      return 'road';
    }
    
    return 'other';
  };

  // 将 PersonaAlert 转换为 RiskItem
  const convertPersonaAlertToRiskItem = (alert: PersonaAlert): RiskItem => {
    const severityMap: Record<string, 'high' | 'medium' | 'low'> = {
      'warning': 'high',
      'info': 'medium',
      'success': 'low',
    };

    const category = inferRiskCategory(alert.message, alert.persona);

    return {
      id: alert.id,
      level: severityMap[alert.severity] || 'medium',
      category,
      title: alert.title,
      description: alert.message,
      reason: alert.message,
      evidenceIds: alert.metadata?.reasonCodes,
      createdAt: alert.createdAt,
      persona: alert.persona,
    };
  };

  // 格式化时间戳显示（标准格式：2026/01/04 13:52）
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${year}/${month}/${day} ${hour}:${minute}`;
    } catch {
      return timestamp;
    }
  };

  // 将 PersonaAlerts 转换为 RiskItems
  const riskItems: RiskItem[] = personaAlerts.map(convertPersonaAlertToRiskItem);

  // 将 DecisionLogEntries 转换为组件使用的格式
  const convertedDecisionLogItems: DecisionLogItem[] = decisionLogItems.map(convertDecisionLogItem);

  if (!open) {
    return null;
  }

  const getEvidenceIcon = (type: EvidenceItemType['type']) => {
    switch (type) {
      case 'opening_hours':
        return <Clock className="h-4 w-4" />;
      case 'road_closure':
        return <MapPin className="h-4 w-4" />;
      case 'weather':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };


  // 获取风险等级显示（icon + 文字）
  const getRiskLevelDisplay = (level: RiskItem['level']) => {
    switch (level) {
      case 'high':
        return { icon: '🔴', text: '高风险', color: 'text-red-600' };
      case 'medium':
        return { icon: '🟠', text: '中风险', color: 'text-orange-600' };
      case 'low':
        return { icon: '🟢', text: '低风险', color: 'text-green-600' };
    }
  };

  // 获取决策结果显示
  const getDecisionResultDisplay = (action: string) => {
    if (action === 'ALLOW' || action === '允许' || action.toLowerCase().includes('allow')) {
      return { icon: '✅', text: '无风险（Allow）', color: 'text-green-600' };
    }
    if (action === 'REJECT' || action === '拒绝' || action.toLowerCase().includes('reject')) {
      return { icon: '❌', text: '已拒绝（Reject）', color: 'text-red-600' };
    }
    if (action === 'ADJUST' || action === '调整' || action.toLowerCase().includes('adjust')) {
      return { icon: '⚠️', text: '已调整（Adjust）', color: 'text-orange-600' };
    }
    return { icon: '📝', text: action, color: 'text-gray-600' };
  };

  return (
    <div
      className={cn(
        'fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl z-50 transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
          <h2 className="text-lg font-semibold">证据与风险</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as any)} className="flex-1 flex flex-col">
          <div className="border-b px-4">
            <TabsList className="w-full">
              <TabsTrigger value="evidence" className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                证据
              </TabsTrigger>
              <TabsTrigger value="risk" className="flex-1">
                <AlertTriangle className="h-4 w-4 mr-2" />
                风险
              </TabsTrigger>
              <TabsTrigger value="decision" className="flex-1">
                <History className="h-4 w-4 mr-2" />
                决策
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Evidence Tab */}
              <TabsContent value="evidence" className="mt-0 space-y-3">
                {loadingEvidence ? (
                  <EvidenceDrawerSkeleton count={5} />
                ) : evidenceItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    暂无证据数据
                  </div>
                ) : (
                  evidenceItems.map((item) => {
                    // 如果是营业时间类型，使用优化的组件
                    if (item.type === 'opening_hours') {
                      // 从 title 或 description 中提取地点名称
                      let placeName: string | undefined = undefined;
                      
                      // 尝试从 title 提取
                      if (item.title) {
                        const titleMatch = item.title.match(/^(.+?)\s*营业时间/);
                        if (titleMatch && titleMatch[1] && titleMatch[1] !== '营业时间') {
                          placeName = titleMatch[1].trim();
                        }
                      }
                      
                      // 如果 title 中没有，尝试从 description 开头提取
                      if (!placeName && item.description) {
                        const descMatch = item.description.match(/^(.+?)\s*营业时间\s*[:：]/);
                        if (descMatch && descMatch[1]) {
                          placeName = descMatch[1].trim();
                        }
                      }
                      
                      return (
                        <div
                          key={item.id}
                          role={onEvidenceClick ? 'button' : undefined}
                          tabIndex={onEvidenceClick ? 0 : undefined}
                          onClick={() => onEvidenceClick?.(item)}
                          onKeyDown={(e) => onEvidenceClick && (e.key === 'Enter' || e.key === ' ') && onEvidenceClick(item)}
                          className={onEvidenceClick ? 'cursor-pointer' : undefined}
                        >
                          <BusinessHoursCard
                            title={placeName}
                            description={item.description || ''}
                            day={item.day}
                            severity={item.severity}
                            source={item.source}
                            timestamp={item.timestamp}
                            link={item.link}
                            className={cn(
                              highlightItemId === item.id && 'border-primary bg-primary/5'
                            )}
                          />
                        </div>
                      );
                    }
                    
                    // 其他类型的证据，使用原有样式
                    return (
                      <Card
                        key={item.id}
                        className={cn(
                          'cursor-pointer hover:border-primary transition-colors',
                          highlightItemId === item.id && 'border-primary bg-primary/5'
                        )}
                        onClick={() => onEvidenceClick?.(item)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">{getEvidenceIcon(item.type)}</div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-sm">{item.title}</div>
                                {item.severity && (
                                  <Badge
                                    variant={
                                      item.severity === 'high'
                                        ? 'destructive'
                                        : item.severity === 'medium'
                                        ? 'default'
                                        : 'secondary'
                                    }
                                    className="text-xs"
                                  >
                                    {item.severity === 'high' ? '高' : item.severity === 'medium' ? '中' : '低'}
                                  </Badge>
                                )}
                                {item.day && (
                                  <Badge variant="outline" className="text-xs">
                                    Day {item.day}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{item.description}</div>
                              {item.source && (
                                <div className="text-xs text-muted-foreground">
                                  来源: {item.source}
                                </div>
                              )}
                              {item.timestamp && (
                                <div className="text-xs text-muted-foreground">
                                  {formatTimestamp(item.timestamp)}
                                </div>
                              )}
                              {item.link && (
                                <a
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  查看详情
                                </a>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              {/* Risk Tab */}
              <TabsContent value="risk" className="mt-0 space-y-3">
                {loadingPersonaAlerts ? (
                  <EvidenceDrawerSkeleton count={5} />
                ) : riskItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    暂无风险提示
                  </div>
                ) : (
                  riskItems.map((item) => {
                    const personaInfo = item.persona ? getPersonaInfo(item.persona) : null;
                    const riskLevel = getRiskLevelDisplay(item.level);
                    return (
                      <Card
                        key={item.id}
                        className={cn(
                          'cursor-pointer hover:border-primary transition-colors shadow-sm',
                          highlightItemId === item.id && 'border-primary bg-primary/5'
                        )}
                      >
                        <CardContent className="p-4 space-y-3">
                          {/* 角色 + 风险等级 */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {personaInfo && (
                                <span className="text-base">{personaInfo.emoji}</span>
                              )}
                              <span className="font-medium text-sm">
                                {personaInfo ? personaInfo.name : item.title}
                              </span>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={cn('flex items-center gap-1', riskLevel.color)}
                            >
                              <span>{riskLevel.icon}</span>
                              <span>{riskLevel.text}</span>
                            </Badge>
                          </div>

                          {/* 风险类型 */}
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">风险类型：</span>
                            {getRiskCategoryLabel(item.category, item.persona)}
                          </div>

                          {/* 判定描述 */}
                          <div className={cn(
                            'text-xs font-medium p-2 rounded',
                            item.level === 'high' 
                              ? 'text-red-700 bg-red-50 border border-red-100' 
                              : item.level === 'medium'
                              ? 'text-orange-700 bg-orange-50 border border-orange-100'
                              : 'text-green-700 bg-green-50 border border-green-100'
                          )}>
                            {personaInfo ? `${personaInfo.shortName}：` : ''}{item.reason}
                          </div>

                          {/* 检测时间 */}
                          {item.createdAt && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>检测时间：{formatTimestamp(item.createdAt)}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              {/* Decision Log Tab */}
              <TabsContent value="decision" className="mt-0 space-y-3">
                {loadingDecisionLog ? (
                  <EvidenceDrawerSkeleton count={5} />
                ) : convertedDecisionLogItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    暂无决策记录
                  </div>
                ) : (
                  convertedDecisionLogItems.map((item) => {
                    const decisionResult = getDecisionResultDisplay(item.action);
                    const personaInfo = item.persona 
                      ? getPersonaInfo(item.persona === 'abu' ? 'ABU' : item.persona === 'dre' ? 'DR_DRE' : 'NEPTUNE')
                      : null;
                    return (
                      <Card
                        key={item.id}
                        className={cn(
                          'cursor-pointer hover:border-primary transition-colors shadow-sm',
                          highlightItemId === item.id && 'border-primary bg-primary/5'
                        )}
                      >
                        <CardContent className="p-4 space-y-3">
                          {/* 决策结果 */}
                          <div className={cn('text-sm font-semibold', decisionResult.color)}>
                            {decisionResult.icon} {decisionResult.text}
                          </div>

                          {/* 角色信息 */}
                          {personaInfo && (
                            <div className="flex items-center gap-2">
                              <span className="text-base">{personaInfo.emoji}</span>
                              <span className="text-sm font-medium">{personaInfo.name}</span>
                            </div>
                          )}

                          {/* 说明 */}
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">📝 说明：</span>
                            {item.reason}
                          </div>

                          {/* 时间 */}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>时间：{formatTimestamp(item.timestamp)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}

