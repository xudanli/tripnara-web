import { useEffect, useState } from 'react';
import type { GuideBundleSummary, GuideSource } from '@/types/guide-import';
import {
  detectGuidePlatform,
  getGuideDisplaySubtitle,
  getGuideDisplayTitle,
  PLATFORM_LABELS,
} from '@/lib/guide-source-display';
import { PERSONA_LOGO_SRC } from '@/lib/persona-icons';
import {
  AlertTriangle,
  BedDouble,
  CheckCircle2,
  Clock,
  FileSearch,
  Lightbulb,
  ListChecks,
  Loader2,
  MapPin,
  Plus,
  Route,
  Utensils,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { GuideImportCard, GuideImportScrollX, guideImportUi } from '@/components/guide-import/guide-import-ui';

const PIPELINE_STEPS = [
  { id: 'content', label: '内容解析' },
  { id: 'places', label: '地点提取' },
  { id: 'routes', label: '路线识别' },
  { id: 'verify', label: '事实校验' },
  { id: 'draft', label: '生成草案' },
] as const;

const AI_FOOTER_STEPS = [
  { label: '提炼关键信息', icon: FileSearch },
  { label: '智能规划路线', icon: Route },
  { label: '优化时间与预算', icon: Clock },
  { label: '生成可执行行程', icon: ListChecks },
] as const;

const PERSONA_THOUGHTS = [
  {
    id: 'abu',
    name: 'Abu',
    logo: PERSONA_LOGO_SRC.ABU,
    text: '攻略提到冬季夜间驾驶，需核验道路状况与能见度风险。',
  },
  {
    id: 'dre',
    name: 'Dr.Dre',
    logo: PERSONA_LOGO_SRC.DR_DRE,
    text: '当前节奏偏紧，单日移动时间可能超出舒适阈值。',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    logo: PERSONA_LOGO_SRC.NEPTUNE,
    text: '体验主线：极光 + 冰河湖 + 黑沙滩，南岸自然景观为核心。',
  },
];

function formatImportTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function sourceMetaLine(source: GuideSource): string {
  const platform = detectGuidePlatform(source);
  const parts: string[] = [PLATFORM_LABELS[platform]];
  if (source.type === 'text' && source.rawText) {
    parts.push(`${source.rawText.length.toLocaleString()} 字`);
  }
  if (source.type === 'file') {
    parts.push('PDF 文档');
  }
  if (source.type === 'link') {
    parts.push('网页链接');
  }
  parts.push('已读取');
  if (source.addedAt) {
    const t = formatImportTime(source.addedAt);
    if (t) parts.push(t);
  }
  return parts.join(' · ');
}

interface GuideParsingProgressProps {
  sources: GuideSource[];
  liveSummary?: GuideBundleSummary | null;
  progress: number;
  recognizedTags?: string[];
  activeStepIndex?: number;
  currentStepLabel?: string;
  estimatedSecondsRemaining?: number;
  onAddSource?: () => void;
  addSourceDisabled?: boolean;
  className?: string;
}

export function GuideParsingProgress({
  sources,
  liveSummary,
  progress,
  recognizedTags,
  activeStepIndex: activeStepIndexProp,
  currentStepLabel,
  estimatedSecondsRemaining,
  onAddSource,
  addSourceDisabled,
  className,
}: GuideParsingProgressProps) {
  const progressIndex = Math.min(
    PIPELINE_STEPS.length - 1,
    Math.floor((progress / 100) * PIPELINE_STEPS.length),
  );
  const activeStepIndex = activeStepIndexProp ?? progressIndex;
  const [visibleThoughts, setVisibleThoughts] = useState(0);

  useEffect(() => {
    if (visibleThoughts >= PERSONA_THOUGHTS.length) return;
    const t = setTimeout(() => setVisibleThoughts((n) => n + 1), 1200);
    return () => clearTimeout(t);
  }, [visibleThoughts]);

  const counts = liveSummary?.stats ?? {
    placeCount: Math.round((progress / 100) * 18),
    restaurantCount: Math.round((progress / 100) * 5),
    accommodationCount: Math.round((progress / 100) * 4),
    tipCount: Math.round((progress / 100) * 7),
    riskCount: Math.round((progress / 100) * 3),
  };

  const etaSec =
    estimatedSecondsRemaining ??
    Math.max(0, Math.round(((100 - progress) / 100) * 60));

  const displayTags =
    recognizedTags && recognizedTags.length > 0
      ? recognizedTags
      : ['自驾', '冬季', '极光', '黑沙滩', '冰川湖'];

  const activeLabel = currentStepLabel ?? PIPELINE_STEPS[activeStepIndex]?.label;

  return (
    <div className={cn(guideImportUi.stackCompact, 'min-w-0', className)}>
      <GuideImportScrollX contentClassName="w-full min-w-[860px] xl:min-w-0">
        <div className={guideImportUi.gridThreeCol}>
        <GuideImportCard className="space-y-3 h-fit flex flex-col min-w-0" compact padding>
          <h3 className={guideImportUi.sectionTitle}>已导入的攻略来源 ({sources.length})</h3>
          <ul className="space-y-3 flex-1">
            {sources.map((s) => (
              <li key={s.id} className="flex gap-2.5 items-start text-xs">
                <CheckCircle2 className="w-4 h-4 text-gate-allow-foreground flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium leading-snug">{getGuideDisplayTitle(s)}</p>
                  <p className="text-muted-foreground mt-0.5 leading-relaxed">{sourceMetaLine(s)}</p>
                  {getGuideDisplaySubtitle(s) && (
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                      {getGuideDisplaySubtitle(s)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {onAddSource && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs h-9"
              disabled={addSourceDisabled}
              onClick={onAddSource}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              继续添加攻略来源
            </Button>
          )}
        </GuideImportCard>

        <GuideImportCard className="space-y-4 min-w-0" compact padding>
          <div className="min-w-0">
            <div className="overflow-x-auto overscroll-x-contain -mx-0.5 px-0.5">
              <div className="flex items-center gap-1 sm:gap-1.5 pb-1 w-max">
            {PIPELINE_STEPS.map((step, i) => {
              const done = i < activeStepIndex;
              const active = i === activeStepIndex;
              return (
                <div key={step.id} className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                  <div
                    className={cn(
                      'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors',
                      done && 'bg-primary border-primary text-primary-foreground',
                      active && 'border-primary text-foreground ring-2 ring-primary/10',
                      !done && !active && 'border-muted text-muted-foreground',
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    ) : active ? (
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[11px] sm:text-xs whitespace-nowrap',
                      active ? 'font-medium text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </span>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div
                      className={cn('w-3 sm:w-4 h-0.5 mx-0.5', done ? 'bg-primary/30' : 'bg-muted')}
                    />
                  )}
                </div>
              );
            })}
              </div>
            </div>
          </div>

          <div className="space-y-2" aria-live="polite" aria-atomic="true">
            <div className="flex justify-between text-xs">
              <span className="font-medium tabular-nums">{Math.round(progress)}%</span>
              <span className="text-muted-foreground">
                {activeLabel ? `正在${activeLabel} · ` : ''}大约还需 {etaSec} 秒
              </span>
            </div>
            <Progress value={progress} className="h-2" aria-label="攻略解析进度" />
          </div>

          <div className="space-y-2">
            <p className={guideImportUi.label}>正在识别的关键信息</p>
            <div className="flex flex-wrap gap-2">
              {displayTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full bg-muted text-foreground border border-border"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">三位 AI 伙伴的实时思考</p>
            {PERSONA_THOUGHTS.slice(0, visibleThoughts).map((p) => (
              <div
                key={p.id}
                className="flex gap-3 p-3 rounded-xl bg-muted/40 border border-border/60"
              >
                <img src={p.logo} alt={p.name} className="w-8 h-8 rounded-lg flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{p.text}</p>
                </div>
              </div>
            ))}
            {visibleThoughts < PERSONA_THOUGHTS.length && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                审议中…
              </div>
            )}
          </div>
        </GuideImportCard>

        <GuideImportCard
          className={cn(guideImportUi.highlightSurface, 'space-y-2.5 h-fit min-w-0')}
          compact
          padding
        >
          <h3 className={guideImportUi.sectionTitle}>实时提取结果</h3>
          {[
            { icon: MapPin, label: '地点', value: counts.placeCount, sub: '已识别' },
            { icon: Utensils, label: '餐厅', value: counts.restaurantCount, unit: '家' },
            { icon: BedDouble, label: '住宿区域', value: counts.accommodationCount, unit: '个' },
            { icon: Lightbulb, label: '经验主张', value: counts.tipCount, unit: '条' },
            {
              icon: AlertTriangle,
              label: '待验证风险',
              value: counts.riskCount,
              unit: '条',
              highlight: true,
            },
          ].map(({ icon: Icon, label, value, sub, unit, highlight }) => (
            <div
              key={label}
              className={cn(
                'flex items-center justify-between p-2.5 rounded-lg bg-white/80 border',
                highlight ? 'border-border' : 'border-transparent',
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon
                  className={cn(
                    'w-4 h-4 flex-shrink-0',
                    highlight ? 'text-muted-foreground' : 'text-muted-foreground',
                  )}
                />
                <span className="text-xs truncate">{label}</span>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <span className="text-sm font-bold text-muted-foreground tabular-nums">
                  {value}
                  {unit ? ` ${unit}` : ''}
                </span>
                {sub && <p className="text-[10px] text-gate-allow-foreground">{sub}</p>}
              </div>
            </div>
          ))}
          <p className={guideImportUi.footnote}>
            结果会随解析进度持续更新；完成后可进入理解摘要并生成行程草案。
          </p>
        </GuideImportCard>
        </div>
      </GuideImportScrollX>

      <GuideImportScrollX contentClassName="min-w-[640px] w-full sm:min-w-0">
        <GuideImportCard compact padding className="bg-muted/20 min-w-0">
          <p className={cn(guideImportUi.label, 'mb-2')}>AI 会帮你做这些事</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 min-w-0">
            {AI_FOOTER_STEPS.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-xs"
              >
                <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="leading-snug">{label}</span>
              </div>
            ))}
          </div>
        </GuideImportCard>
      </GuideImportScrollX>
    </div>
  );
}
