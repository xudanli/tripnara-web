import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TripDetail, DecisionLogEntry } from '@/types/trip';
import { tripsApi } from '@/api/trips';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, ArrowRight } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DecisionLogSectionProps {
  activeTrip: TripDetail | null;
}

export default function DecisionLogSection({ activeTrip }: DecisionLogSectionProps) {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<DecisionLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTrip) {
      loadDecisionLogs();
    } else {
      setLogs([]);
    }
  }, [activeTrip]);

  const loadDecisionLogs = async () => {
    if (!activeTrip) return;

    try {
      setLoading(true);
      const response = await tripsApi.getDecisionLog(activeTrip.id, 10, 0);
      setLogs(response.items || []);
    } catch (err: any) {
      console.error('Failed to load decision log:', err);
      // 失败时显示空数组
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getSourceName = (source: string): string => {
    switch (source) {
      case 'PHYSICAL':
        return 'PHYSICAL';
      case 'HUMAN':
        return 'HUMAN';
      case 'PHILOSOPHY':
        return 'PHILOSOPHY';
      case 'SPATIAL':
        return 'SPATIAL';
      default:
        return source;
    }
  };

  const getPersonaName = (persona?: string): string => {
    if (!persona) return '';
    switch (persona) {
      case 'ABU':
        return 'Abu';
      case 'DR_DRE':
        return 'Dr.Dre';
      case 'NEPTUNE':
        return 'Neptune';
      default:
        return '';
    }
  };

  if (!activeTrip) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            决策记录 / 透明日志
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-6 h-6 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          决策记录 / 透明日志
        </CardTitle>
        <CardDescription>
          可追溯、可解释的决策轨迹
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-700 mb-4">最近发生：</div>
          
          {logs.map((log) => {
            const personaName = getPersonaName(log.persona);
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm text-gray-600">
                      {format(new Date(log.date), 'yyyy年M月d日', { locale: zhCN })}
                    </span>
                    <span className="text-xs text-gray-500">·</span>
                    {personaName && (
                      <>
                        <span className="text-xs text-gray-600 font-medium">
                          {personaName}
                        </span>
                        <span className="text-xs text-gray-500">·</span>
                      </>
                    )}
                    <span className="text-xs text-gray-500">
                      {log.description}
                    </span>
                    <span className="text-xs text-gray-400">
                      （来源：{getSourceName(log.source)}）
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/dashboard/trips/${activeTrip.id}/decision`)}
          >
            查看全部决策轨迹 <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}