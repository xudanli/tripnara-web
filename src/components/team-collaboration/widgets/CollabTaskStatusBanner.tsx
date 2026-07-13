import { useMemo } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Hourglass,
  PlayCircle,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildCollabTaskAiSummaryView,
  buildCollabTaskBoardStats,
} from '@/lib/collab-task-kanban.util';
import type { CollaborativeTaskView } from '@/types/collaborative-task-flywheel';
import { workbenchCard } from '@/components/plan-studio/workbench/workbench-ui';
import { cn } from '@/lib/utils';
import { CollabMetricRing } from './CollabMetricRing';

interface CollabTaskStatusBannerProps {
  tasks: CollaborativeTaskView[];
  onNewTask?: () => void;
  className?: string;
}

const STAT_ITEMS = [
  {
    key: 'total' as const,
    label: '全部任务',
    hint: '所有任务总数',
    icon: ClipboardList,
    tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    key: 'inProgress' as const,
    label: '进行中',
    hint: '正在推进中',
    icon: PlayCircle,
    tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    key: 'pending' as const,
    label: '待处理',
    hint: '等待处理',
    icon: Hourglass,
    tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    key: 'completed' as const,
    label: '已完成',
    hint: '已顺利完成',
    icon: CheckCircle2,
    tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
];

export function CollabTaskStatusBanner({ tasks, onNewTask, className }: CollabTaskStatusBannerProps) {
  const stats = useMemo(() => buildCollabTaskBoardStats(tasks), [tasks]);
  const summaryView = useMemo(() => buildCollabTaskAiSummaryView(tasks), [tasks]);

  return (
    <section className={cn(workbenchCard, 'p-2.5', className)}>
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:gap-2.5">
        <div className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4 sm:gap-x-3">
          {STAT_ITEMS.map(({ key, label, hint, icon: Icon, tone }) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  tone,
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold tabular-nums leading-tight text-foreground">
                  {stats[key]}
                </p>
                <p className="truncate text-[9px] text-muted-foreground/80">{hint}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden shrink-0 self-stretch xl:block xl:w-px xl:bg-border/60" aria-hidden />

        <div className="flex shrink-0 items-center gap-2">
          <CollabMetricRing
            value={stats.completionRate}
            size={52}
            strokeWidth={5}
            showCenterValue={false}
            strokeClassName="stroke-primary"
            className="gap-0"
          />
          <div className="min-w-0">
            <p className="text-lg font-semibold tabular-nums leading-tight text-foreground">
              {stats.completionRate}%
            </p>
            <p className="text-[10px] text-muted-foreground">完成率</p>
          </div>
        </div>

        <div className="hidden shrink-0 self-stretch xl:block xl:w-px xl:bg-border/60" aria-hidden />

        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-foreground">AI 总结</p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              {summaryView.highlights?.length ? (
                <>
                  {summaryView.prefix}
                  {summaryView.highlights.map((item, index) => (
                    <span key={item}>
                      <span className="font-medium text-primary">{item}</span>
                      {index < summaryView.highlights!.length - 1 ? '与' : null}
                    </span>
                  ))}
                  {summaryView.suffix}
                </>
              ) : (
                summaryView.text
              )}
            </p>
          </div>
        </div>

        {onNewTask ? (
          <Button
            type="button"
            size="sm"
            className="h-7 shrink-0 gap-1 self-start px-2.5 text-xs xl:self-center"
            onClick={onNewTask}
          >
            <Plus className="h-3.5 w-3.5" />
            新建任务
          </Button>
        ) : null}
      </div>
    </section>
  );
}
