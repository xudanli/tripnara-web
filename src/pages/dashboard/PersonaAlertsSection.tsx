import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TripDetail, PersonaAlert } from '@/types/trip';
import { tripsApi } from '@/api/trips';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
import { PersonaAvatar } from '@/components/common/PersonaAvatar';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { getPersonaAlertUserBody } from '@/lib/persona-alert-display';

interface PersonaAlertsSectionProps {
  activeTrip: TripDetail | null;
}

export default function PersonaAlertsSection({ activeTrip }: PersonaAlertsSectionProps) {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<PersonaAlert[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTrip) {
      loadPersonaAlerts();
    } else {
      setAlerts([]);
    }
  }, [activeTrip]);

  // 检查是否是"未发现问题"类型的提示
  const isNoIssueAlert = (alert: PersonaAlert): boolean => {
    const message = alert.message || '';
    const title = alert.title || '';
    const text = `${title} ${message}`.toLowerCase();
    
    // 检查是否包含"未发现"、"未检测到"、"无"、"通过"等关键词
    const noIssuePatterns = [
      '未发现',
      '未检测到',
      '未发现.*问题',
      '无.*问题',
      '均通过',
      '允许继续',
      '检查通过',
      '没有问题',
      '一切正常',
    ];
    
    return noIssuePatterns.some(pattern => {
      const regex = new RegExp(pattern);
      return regex.test(text);
    });
  };

  const loadPersonaAlerts = async () => {
    if (!activeTrip) return;

    try {
      setLoading(true);
      const data = await tripsApi.getPersonaAlerts(activeTrip.id);
      // 过滤掉"未发现问题"类型的提示
      const filteredData = (data || []).filter(alert => !isNoIssueAlert(alert));
      setAlerts(filteredData);
    } catch (err: any) {
      console.error('Failed to load persona alerts:', err);
      // 失败时显示空数组，不显示错误（保持安静、理性的调性）
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  if (!activeTrip) {
    return null;
  }

  const getPersonaStyles = (persona: string) => {
    switch (persona) {
      case 'ABU':
        // Abu: 静谧蓝/冰川白（安全守护者）
        return {
          bg: 'bg-persona-abu/50 border-persona-abu-accent/60',
          icon: 'text-persona-abu-foreground',
          title: 'text-persona-abu-foreground',
          accent: 'text-persona-abu-accent',
        };
      case 'DR_DRE':
        // Dr.Dre: 森林绿/柔棕（节奏设计师）
        return {
          bg: 'bg-persona-dre/50 border-persona-dre-accent/60',
          icon: 'text-persona-dre-foreground',
          title: 'text-persona-dre-foreground',
          accent: 'text-persona-dre-accent',
        };
      case 'NEPTUNE':
        // Neptune: 修复绿（结构修复者）
        return {
          bg: 'bg-persona-neptune/50 border-persona-neptune-accent/60',
          icon: 'text-persona-neptune-foreground',
          title: 'text-persona-neptune-foreground',
          accent: 'text-persona-neptune-accent',
        };
      case 'USER_ACTION':
        return {
          bg: 'bg-slate-50 border-slate-200',
          icon: 'text-slate-700',
          title: 'text-slate-800',
          accent: 'text-slate-600',
        };
      default:
        return {
          bg: 'bg-muted/50 border-border/60',
          icon: 'text-muted-foreground',
          title: 'text-foreground',
          accent: 'text-muted-foreground',
        };
    }
  };

  const getPersonaEmoji = (persona: string) => {
    switch (persona) {
      case 'ABU':
        return '🛡';
      case 'DR_DRE':
        return '🎧';
      case 'NEPTUNE':
        return '🌊';
      case 'USER_ACTION':
        return '📋';
      default:
        return '';
    }
  };

  const getSeverityIcon = (severity: string, persona: string) => {
    switch (severity) {
      case 'warning':
        // Abu 的风险提醒：使用 ⚠ 三角
        return <AlertTriangle className="w-4 h-4" />;
      case 'info':
        // Dr.Dre 的节奏建议：不需要额外图标
        return null;
      case 'success':
        // Neptune 的修复成功：使用绿色对勾
        if (persona === 'NEPTUNE') {
          return <CheckCircle2 className="w-4 h-4" />;
        }
        return null;
      default:
        return null;
    }
  };

  const getRouteForPersona = (persona: string, tripId: string): string => {
    switch (persona) {
      case 'ABU':
        return `/dashboard/trips/${tripId}/decision`;
      case 'DR_DRE':
        return `/dashboard/trips/${tripId}/schedule`;
      case 'NEPTUNE':
        return `/dashboard/trips/what-if`;
      default:
        return `/dashboard/trips/${tripId}`;
    }
  };

  if (loading) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-6 h-6 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-gray-200">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">三人格提醒</h3>
        <div className="space-y-4">
          {alerts.map((alert) => {
            const styles = getPersonaStyles(alert.persona);
            const severityIcon = getSeverityIcon(alert.severity, alert.persona);
            const route = getRouteForPersona(alert.persona, activeTrip.id);
            
            return (
              <div
                key={alert.id}
                className={cn(
                  "p-4 rounded-lg border bg-white/80",
                  styles.bg,
                  "cursor-pointer hover:shadow-sm hover:bg-white transition-all"
                )}
                onClick={() => navigate(route)}
              >
                <div className="flex items-start gap-3">
                  {/* 图标区域 - 使用标志性图标 */}
                  <div className={cn(
                    "flex-shrink-0 p-2 rounded-lg bg-white border",
                    styles.bg.replace('bg-', 'border-'),
                    styles.icon
                  )}>
                    {alert.persona === 'USER_ACTION' ? (
                      <ClipboardList className="w-5 h-5" />
                    ) : (
                      <PersonaAvatar persona={alert.persona} size={28} />
                    )}
                  </div>

                  {/* 内容区域 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {/* 人格标识：图标+头像+人格名 */}
                      <span className={cn("font-semibold text-sm", styles.title)}>
                        {getPersonaEmoji(alert.persona)} {alert.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        · {alert.title}
                      </span>
                      {severityIcon && (
                        <div className={cn("ml-auto", styles.accent)}>
                          {severityIcon}
                        </div>
                      )}
                    </div>
                    
                    {/* 文案 - 保持安静、理性、陪伴的语气 */}
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line mb-3">
                      {getPersonaAlertUserBody(alert)}
                    </p>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-gray-600 hover:text-gray-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(route);
                      }}
                    >
                      查看详情 →
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}