import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Brain, CalendarDays, Sparkles } from 'lucide-react';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEpisodicMemories, useSemanticMemories } from '../hooks/useSelfEvolution';
import type { EpisodicMemory, SemanticMemory } from '@/types/self-evolution';

function PreferenceCard({ memory }: { memory: SemanticMemory }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm text-foreground">{memory.content}</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">{memory.metadata.pattern}</Badge>
        <span>置信度 {(memory.confidence * 100).toFixed(0)}%</span>
        <span>出现 {memory.metadata.frequency} 次</span>
      </div>
    </div>
  );
}

function TripMemoryCard({ memory }: { memory: EpisodicMemory }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <p className="text-sm text-foreground">{memory.content}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays className="h-3 w-3" />
        <span>
          {format(new Date(memory.createdAt), 'yyyy年M月d日', { locale: zhCN })}
        </span>
        <Badge variant="outline">{memory.seasonalityFactor.season}</Badge>
        <span>激活度 {(memory.activationScore * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

interface MemoryTimelineProps {
  userId: string;
  className?: string;
}

export function MemoryTimeline({ userId, className }: MemoryTimelineProps) {
  const episodic = useEpisodicMemories(userId, { topK: 10 });
  const semantic = useSemanticMemories(userId, { topK: 5, minConfidence: 0.5 });

  const loading = episodic.isLoading || semantic.isLoading;
  const error = episodic.error ?? semantic.error;

  if (loading) {
    return (
      <div className={cn('flex justify-center py-8', className)}>
        <LogoLoading size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground', className)}>
        无法加载旅行记忆
      </div>
    );
  }

  const episodicList = episodic.data ?? [];
  const semanticList = semantic.data ?? [];

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">旅行记忆</h3>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">偏好模式</h4>
        {semanticList.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无语义记忆，完成更多旅行后将自动归纳偏好。</p>
        ) : (
          <div className="space-y-2">
            {semanticList.map((memory) => (
              <PreferenceCard key={memory.id} memory={memory} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">旅行回忆</h4>
        {episodicList.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无情景记忆。</p>
        ) : (
          <div className="relative space-y-4 pl-4 before:absolute before:left-1.5 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
            {episodicList.map((memory) => (
              <div key={memory.id} className="relative">
                <span className="absolute -left-4 top-3 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                <TripMemoryCard memory={memory} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
