import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  Activity,
  RefreshCw,
  CheckCircle2,
  Edit,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Clock,
} from 'lucide-react';
import type { ReviewInsight, InsightCategory } from '@/types/trip-review';
import { cn } from '@/lib/utils';

interface InsightsProps {
  insights: ReviewInsight[];
  onVote?: (insightId: string, vote: 'agree' | 'disagree' | 'edit', note?: string) => Promise<void>;
  onSaveAnchor?: (insightId: string) => Promise<void>;
}

export default function Insights({ insights, onVote, onSaveAnchor }: InsightsProps) {
  // 按分类分组
  const insightsByCategory = insights.reduce(
    (acc, insight) => {
      if (!acc[insight.category]) {
        acc[insight.category] = [];
      }
      acc[insight.category].push(insight);
      return acc;
    },
    {} as Record<InsightCategory, ReviewInsight[]>
  );

  const categoryConfig: Record<InsightCategory, { label: string; icon: any; color: string }> = {
    highlight: { label: '高光', icon: CheckCircle2, color: 'text-green-600' },
    friction: { label: '摩擦点', icon: AlertTriangle, color: 'text-orange-600' },
    decision: { label: '决策质量', icon: TrendingUp, color: 'text-blue-600' },
    rhythm: { label: '节奏画像', icon: Clock, color: 'text-purple-600' },
    cost: { label: '成本', icon: DollarSign, color: 'text-yellow-600' },
    safety: { label: '安全', icon: Shield, color: 'text-red-600' },
  };

  const tabs = Object.keys(categoryConfig) as InsightCategory[];

  return (
    <Tabs defaultValue={tabs[0]} className="w-full">
      <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
        {tabs.map((category) => {
          const config = categoryConfig[category];
          const Icon = config.icon;
          const count = insightsByCategory[category]?.length || 0;
          return (
            <TabsTrigger key={category} value={category} className="flex items-center gap-2">
              <Icon className={cn('w-4 h-4', config.color)} />
              {config.label}
              {count > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {count}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {tabs.map((category) => (
        <TabsContent key={category} value={category} className="mt-6">
          <div className="space-y-4">
            {insightsByCategory[category]?.map((insight) => (
              <InsightCard
                key={insight.insightId}
                insight={insight}
                onVote={onVote}
                onSaveAnchor={onSaveAnchor}
              />
            ))}
            {(!insightsByCategory[category] || insightsByCategory[category].length === 0) && (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  暂无 {categoryConfig[category].label} 洞察
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

interface InsightCardProps {
  insight: ReviewInsight;
  onVote?: (insightId: string, vote: 'agree' | 'disagree' | 'edit', note?: string) => Promise<void>;
  onSaveAnchor?: (insightId: string) => Promise<void>;
}

function InsightCard({ insight, onVote, onSaveAnchor }: InsightCardProps) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(insight.userFeedback?.note || '');
  const [submitting, setSubmitting] = useState(false);

  const personaConfig = {
    abu: { icon: Shield, label: 'Abu', color: 'text-red-600 bg-red-50' },
    dre: { icon: Activity, label: 'Dr.Dre', color: 'text-orange-600 bg-orange-50' },
    neptune: { icon: RefreshCw, label: 'Neptune', color: 'text-green-600 bg-green-50' },
  };

  const persona = (insight.persona || undefined) as keyof typeof personaConfig | undefined;
  const personaInfo = persona ? personaConfig[persona] : null;

  const handleVote = async (vote: 'agree' | 'disagree' | 'edit') => {
    if (!onVote) return;
    setSubmitting(true);
    try {
      if (vote === 'edit') {
        setEditing(true);
        setSubmitting(false);
        return;
      }
      await onVote(insight.insightId, vote, editing ? note : undefined);
      setEditing(false);
    } catch (err) {
      console.error('Failed to vote:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitNote = async () => {
    if (!onVote) return;
    setSubmitting(true);
    try {
      await onVote(insight.insightId, 'edit', note);
      setEditing(false);
    } catch (err) {
      console.error('Failed to submit note:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{insight.title}</CardTitle>
              {personaInfo && (
                <Badge variant="outline" className={cn('text-xs', personaInfo.color)}>
                  {personaInfo.icon && <personaInfo.icon className="w-3 h-3 mr-1" />}
                  {personaInfo.label}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                置信度: {Math.round(insight.confidence * 100)}%
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{insight.summary}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 关键数字 */}
        {insight.metrics && Object.keys(insight.metrics).length > 0 && (
          <div className="flex flex-wrap gap-4">
            {Object.entries(insight.metrics).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{key}:</span>
                <span className="text-lg font-semibold">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* 证据引用 */}
        {insight.evidenceEventIds.length > 0 && (
          <div className="text-xs text-gray-500">
            基于 {insight.evidenceEventIds.length} 个事件证据
          </div>
        )}

        {/* 用户反馈 */}
        {editing ? (
          <div className="space-y-2">
            <Textarea
              placeholder="添加你的反馈..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSubmitNote} disabled={submitting}>
                提交
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setNote(insight.userFeedback?.note || '');
                }}
              >
                取消
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={insight.userFeedback?.vote === 'agree' ? 'default' : 'outline'}
              onClick={() => handleVote('agree')}
              disabled={submitting}
            >
              <ThumbsUp className="w-4 h-4 mr-1" />
              同意
            </Button>
            <Button
              size="sm"
              variant={insight.userFeedback?.vote === 'disagree' ? 'default' : 'outline'}
              onClick={() => handleVote('disagree')}
              disabled={submitting}
            >
              <ThumbsDown className="w-4 h-4 mr-1" />
              不同意
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleVote('edit')} disabled={submitting}>
              <Edit className="w-4 h-4 mr-1" />
              补充说明
            </Button>
            {onSaveAnchor && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSaveAnchor(insight.insightId)}
                className="ml-auto"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                保存为锚点
              </Button>
            )}
          </div>
        )}

        {/* 用户备注显示 */}
        {insight.userFeedback?.note && !editing && (
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
            {insight.userFeedback.note}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

