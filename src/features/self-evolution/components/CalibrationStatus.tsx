import { LogoLoading } from '@/components/common/LogoLoading';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  getColdStartPhaseLabel,
  useCalibrationCurves,
  useColdStartStatus,
  TRIP_OUTCOME_DIMENSION_LABELS,
} from '../hooks/useSelfEvolution';
import { DimensionBar } from './DimensionBar';

interface CalibrationStatusProps {
  userId: string;
  className?: string;
}

const DIMENSION_LABELS: Record<string, string> = {
  budget: '预算',
  travel_pace: '旅行节奏',
  interaction_mode: '互动模式',
  skill_requirement: '技能要求',
  risk_tolerance: '风险承受',
  social_style: '社交风格',
  team_balance: '团队平衡',
  past_collaboration: '过往合作',
  reputation_score: '信誉分',
  mbti_compatibility: 'MBTI 契合',
};

export function CalibrationStatus({ userId, className }: CalibrationStatusProps) {
  const coldStart = useColdStartStatus(userId);
  const curves = useCalibrationCurves();

  if (coldStart.isLoading || curves.isLoading) {
    return (
      <div className={cn('flex justify-center py-6', className)}>
        <LogoLoading size={32} />
      </div>
    );
  }

  const phase = coldStart.data;
  const curveMap = curves.data ?? {};
  const curveEntries = Object.entries(curveMap);
  const progressPct = phase ? Math.min(100, (phase.tripCount / 11) * 100) : 0;

  return (
    <section className={cn('rounded-xl border border-border bg-card p-4 space-y-4', className)}>
      <div>
        <h3 className="text-lg font-semibold text-foreground">搭子匹配校准状态</h3>
        <p className="text-sm text-muted-foreground">冷启动阶段与各维度校准准确度</p>
      </div>

      {phase && (
        <div className="rounded-lg border border-border/70 bg-muted/20 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">当前阶段</span>
            <span className="font-medium text-foreground">{getColdStartPhaseLabel(phase.phase)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">已完成旅行</span>
            <span className="font-medium tabular-nums">{phase.tripCount} 次</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          <p className="text-xs text-muted-foreground">完成 11 次旅行后进入实时校准阶段</p>
        </div>
      )}

      {curveEntries.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">各维度校准准确度</h4>
          {curveEntries.map(([dimension, curve]) => (
            <DimensionBar
              key={dimension}
              label={DIMENSION_LABELS[dimension] ?? TRIP_OUTCOME_DIMENSION_LABELS[dimension] ?? dimension}
              value={curve.accuracy}
            />
          ))}
        </div>
      )}

      {curveEntries.length === 0 && !phase && (
        <p className="text-sm text-muted-foreground">暂无校准数据，完成招募与旅行后将逐步积累。</p>
      )}
    </section>
  );
}
