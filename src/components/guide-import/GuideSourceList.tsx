import type { GuideSource } from '@/types/guide-import';
import { Button } from '@/components/ui/button';
import {
  detectGuidePlatform,
  getGuideDisplaySubtitle,
  getGuideDisplayTitle,
  PLATFORM_LABELS,
} from '@/lib/guide-source-display';
import { FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  guideImportUi,
  GuideImportSidebarPanel,
} from '@/components/guide-import/guide-import-ui';

const PLATFORM_STYLES: Record<string, { bg: string; text: string; abbr: string }> = {
  xiaohongshu: { bg: 'bg-gate-reject-foreground', text: 'text-white', abbr: '红' },
  wechat: { bg: 'bg-gate-allow-foreground', text: 'text-white', abbr: '微' },
  bilibili: { bg: 'bg-pink-500', text: 'text-white', abbr: 'B' },
  zhihu: { bg: 'bg-muted/150', text: 'text-white', abbr: '知' },
  blog: { bg: 'bg-slate-500', text: 'text-white', abbr: '链' },
  file: { bg: 'bg-orange-500', text: 'text-white', abbr: '文' },
  screenshot: { bg: 'bg-slate-600', text: 'text-white', abbr: '图' },
  text: { bg: 'bg-slate-400', text: 'text-white', abbr: '字' },
  inspiration: { bg: 'bg-amber-500', text: 'text-white', abbr: '灵' },
  unknown: { bg: 'bg-muted', text: 'text-muted-foreground', abbr: '略' },
};

interface GuideSourceListProps {
  sources: GuideSource[];
  onRemove: (id: string) => void;
  removeDisabled?: boolean;
  className?: string;
  compact?: boolean;
}

export function GuideSourceList({
  sources,
  onRemove,
  removeDisabled,
  className,
  compact = false,
}: GuideSourceListProps) {
  if (sources.length === 0) return null;

  return (
    <ul className={cn(compact ? 'space-y-2' : 'space-y-3', className)}>
      {sources.map((source) => {
        const platform = detectGuidePlatform(source);
        const style = PLATFORM_STYLES[platform] ?? PLATFORM_STYLES.unknown;
        const title = getGuideDisplayTitle(source);
        const subtitle = getGuideDisplaySubtitle(source);

        return (
          <li
            key={source.id}
            className={cn(
              'flex items-center gap-3 rounded-xl border border-border bg-card hover:border-foreground/20 transition-colors',
              compact ? 'p-3 gap-2.5' : 'p-4',
            )}
          >
            {source.imagePreviewUrl ? (
              <img
                src={source.imagePreviewUrl}
                alt=""
                className={cn(
                  'rounded-lg object-cover flex-shrink-0 border',
                  compact ? 'w-10 h-10' : 'w-12 h-12',
                )}
              />
            ) : (
              <div
                className={cn(
                  'rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold',
                  compact ? 'w-10 h-10 text-xs' : 'w-12 h-12',
                  style.bg,
                  style.text,
                )}
              >
                {style.abbr}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {PLATFORM_LABELS[platform]}
                {subtitle && subtitle !== PLATFORM_LABELS[platform] ? ` · ${subtitle}` : ''}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 text-muted-foreground"
              onClick={() => onRemove(source.id)}
              disabled={removeDisabled}
              aria-label="移除"
            >
              <X className="w-4 h-4" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

interface GuideExtractionPreviewProps {
  places: number;
  restaurants: number;
  accommodations: number;
  risks: number;
  className?: string;
  compact?: boolean;
}

export function GuideExtractionPreview({
  places,
  restaurants,
  accommodations,
  risks,
  className,
  compact = false,
}: GuideExtractionPreviewProps) {
  const items = [
    { label: '地点', value: places, icon: '📍' },
    { label: '餐厅', value: restaurants, icon: '🍽' },
    { label: '住宿', value: accommodations, icon: '🏨' },
    { label: '风险提示', value: risks, icon: '⚠️' },
  ];

  return (
    <div
      className={cn(
        guideImportUi.highlightSurface,
        'flex flex-wrap justify-between items-center',
        compact ? 'px-3 py-2 gap-2' : 'px-4 py-3 gap-4',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="w-3.5 h-3.5" />
        预计提取（解析后可能变化）
      </div>
      <div className={cn('flex flex-wrap', compact ? 'gap-3 sm:gap-4' : 'gap-4 sm:gap-6')}>
        {items.map(({ label, value, icon }) => (
          <div key={label} className="text-center min-w-[48px]">
            <p
              className={cn(
                'font-semibold text-muted-foreground tabular-nums',
                compact ? 'text-base' : 'text-lg',
              )}
            >
              {value}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {icon} {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface GuideImportSidebarProps {
  className?: string;
  compact?: boolean;
}

export function GuideImportSidebar({ className, compact = false }: GuideImportSidebarProps) {
  const features = [
    {
      title: '自动提取关键信息',
      desc: '景点、餐厅、住宿、路线、交通方式等结构化提取',
    },
    {
      title: '智能合并与去重',
      desc: '多篇攻略中相同地点自动合并，保留最优信息',
    },
    {
      title: '生成可执行草案',
      desc: '按天整理行程结构，支持后续在规划工作台编辑',
    },
  ];

  return (
    <GuideImportSidebarPanel variant="default" compact={compact} className={className}>
      <h3 className={guideImportUi.sectionTitle}>支持同时导入多篇攻略</h3>
      <p className={guideImportUi.sectionDesc}>
        路线、餐厅、住宿、避坑可分开导入，系统会合并理解而非各生成一条行程。
      </p>
      <ul className={compact ? 'space-y-2' : 'space-y-3'}>
        {features.map((f) => (
          <li key={f.title} className="flex gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 mt-1.5 flex-shrink-0" />
            <div>
              <p className={guideImportUi.sectionTitle}>{f.title}</p>
              <p className={guideImportUi.sectionDesc}>{f.desc}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className={cn(guideImportUi.tipBox, compact && 'p-2.5')}>
        <span className="font-medium">小贴士：</span>
        攻略内容越完整、结构越清晰，提取效果越好。建议选择有明确天数和路线顺序的内容。
      </div>
    </GuideImportSidebarPanel>
  );
}
