import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { X, FileText, AlertTriangle, History, ExternalLink, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tripsApi } from '@/api/trips';
import type { DecisionLogEntry, PersonaAlert, EvidenceItem as EvidenceItemType } from '@/types/trip';

interface EvidenceDrawerProps {
  open: boolean;
  onClose: () => void;
  tripId?: string | null;
  activeTab?: 'evidence' | 'risk' | 'decision';
  highlightItemId?: string; // 用于高亮特定项
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

  // 将 PersonaAlert 转换为 RiskItem
  const convertPersonaAlertToRiskItem = (alert: PersonaAlert): RiskItem => {
    const severityMap: Record<string, 'high' | 'medium' | 'low'> = {
      'warning': 'high',
      'info': 'medium',
      'success': 'low',
    };

    // 根据 alert 的 metadata 或 message 推断 category
    let category: RiskItem['category'] = 'other';
    if (alert.message.includes('时间') || alert.message.includes('time')) {
      category = 'time';
    } else if (alert.message.includes('天气') || alert.message.includes('weather')) {
      category = 'weather';
    } else if (alert.message.includes('道路') || alert.message.includes('road')) {
      category = 'road';
    }

    return {
      id: alert.id,
      level: severityMap[alert.severity] || 'medium',
      category,
      title: alert.title,
      description: alert.message,
      reason: `${alert.persona === 'ABU' ? 'Abu' : alert.persona === 'DR_DRE' ? 'Dr.Dre' : 'Neptune'}: ${alert.message}`,
      evidenceIds: alert.metadata?.reasonCodes,
    };
  };

  // 格式化时间戳显示
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
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

  const getRiskColor = (level: RiskItem['level']) => {
    switch (level) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
    }
  };

  const getPersonaColor = (persona?: DecisionLogItem['persona']) => {
    switch (persona) {
      case 'abu':
        return 'destructive';
      case 'dre':
        return 'default';
      case 'neptune':
        return 'secondary';
      default:
        return 'outline';
    }
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
                  <div className="flex items-center justify-center py-8">
                    <Spinner className="w-6 h-6" />
                  </div>
                ) : evidenceItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    暂无证据数据
                  </div>
                ) : (
                  evidenceItems.map((item) => (
                    <Card
                      key={item.id}
                      className={cn(
                        'cursor-pointer hover:border-primary transition-colors',
                        highlightItemId === item.id && 'border-primary bg-primary/5'
                      )}
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
                  ))
                )}
              </TabsContent>

              {/* Risk Tab */}
              <TabsContent value="risk" className="mt-0 space-y-3">
                {loadingPersonaAlerts ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner className="w-6 h-6" />
                  </div>
                ) : riskItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    暂无风险提示
                  </div>
                ) : (
                  riskItems.map((item) => (
                  <Card
                    key={item.id}
                    className={cn(
                      'cursor-pointer hover:border-primary transition-colors',
                      highlightItemId === item.id && 'border-primary bg-primary/5'
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{item.title}</div>
                          <Badge variant={getRiskColor(item.level)}>{item.level}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                        <div className="text-xs font-medium text-red-600 bg-red-50 p-2 rounded">
                          {item.reason}
                        </div>
                        {item.evidenceIds && item.evidenceIds.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            相关证据: {item.evidenceIds.length} 条
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  ))
                )}
              </TabsContent>

              {/* Decision Log Tab */}
              <TabsContent value="decision" className="mt-0 space-y-3">
                {loadingDecisionLog ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner className="w-6 h-6" />
                  </div>
                ) : convertedDecisionLogItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    暂无决策记录
                  </div>
                ) : (
                  convertedDecisionLogItems.map((item) => (
                  <Card
                    key={item.id}
                    className={cn(
                      'cursor-pointer hover:border-primary transition-colors',
                      highlightItemId === item.id && 'border-primary bg-primary/5'
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{item.action}</div>
                          {item.persona && (
                            <Badge variant={getPersonaColor(item.persona)}>
                              {item.persona === 'abu' ? 'Abu' : item.persona === 'dre' ? 'Dr.Dre' : 'Neptune'}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{item.reason}</div>
                        {item.result && (
                          <div className="text-xs font-medium text-green-600 bg-green-50 p-2 rounded">
                            {item.result}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">{item.timestamp}</div>
                      </div>
                    </CardContent>
                  </Card>
                  ))
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}

