/**
 * 创建行程入口选择 — 黑色 primary 主题 · 中性克制布局
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FileSpreadsheet,
  Lightbulb,
  MapPin,
  Link2,
  Image,
  Type,
  FileUp,
  ChevronRight,
  Bot,
  FileSearch,
  Route,
  ListChecks,
  Check,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  guideImportUi,
  GuideImportScrollX,
  GuideImportSidebarPanel,
  GuideImportStepHeader,
  guideImportPrimaryButtonClass,
} from '@/components/guide-import/guide-import-ui';

export type CreateTripEntryId = 'tell-ai' | 'from-guide' | 'import' | 'inspiration';

const TELL_AI_HREF = '/dashboard/explore';
const FROM_GUIDE_HREF = '/dashboard/trips/new/from-guide';

interface EntryOption {
  id: CreateTripEntryId;
  title: string;
  description: string;
  icon: typeof MapPin;
  disabled?: boolean;
  badge?: string;
}

const ENTRIES: EntryOption[] = [
  {
    id: 'tell-ai',
    title: '探索路线怎么规划',
    description: '填写目的地与旅行条件，比较路线策略并完成可靠性检查',
    icon: MapPin,
    badge: '推荐',
  },
  {
    id: 'from-guide',
    title: '从攻略开始规划',
    description: '粘贴小红书、公众号或上传截图',
    icon: BookOpen,
  },
  {
    id: 'import',
    title: '导入已有行程',
    description: '导入 Excel、PDF、旅行社行程单',
    icon: FileSpreadsheet,
    disabled: true,
    badge: '即将上线',
  },
  {
    id: 'inspiration',
    title: '我还不知道去哪',
    description: '从旅行灵感开始',
    icon: Lightbulb,
    disabled: true,
    badge: '即将上线',
  },
];

const PAGE_COPY = {
  title: '你准备怎么开始？',
  subtitle:
    'TripNARA 可以从目的地、攻略、已有行程或旅行灵感出发，帮你快速生成专属行程。',
};

const GUIDE_SIDEBAR = {
  title: '从攻略开始规划',
  intro:
    '支持合并多篇已收藏的攻略、笔记或截图，一键整理为可执行的行程计划。',
  bullets: [
    '自动提炼景点、交通、住宿、美食等信息',
    '智能去重与整合，生成最优行程顺序',
    '可调整、可协作，轻松落地旅行计划',
  ],
  inputsLabel: '支持的输入方式',
  inputs: [
    { icon: Link2, label: '网页链接' },
    { icon: Image, label: '截图图片' },
    { icon: Type, label: '粘贴文本' },
    { icon: FileUp, label: '文件上传' },
  ],
  footer:
    '小红书链接、公众号文章、文字内容、图片截图、PDF、Word、Excel 等均可导入',
};

const EXPLORATION_STEPS = [
  { label: '填写旅行条件', icon: MapPin },
  { label: '选择旅行原则', icon: FileSearch },
  { label: '比较路线策略', icon: Route },
  { label: '检查并修复问题', icon: ListChecks },
] as const;

const GUIDE_STEPS = [
  { label: '导入攻略', icon: Link2 },
  { label: '理解解析', icon: FileSearch },
  { label: '确认摘要', icon: ListChecks },
  { label: '生成行程草案', icon: Route },
] as const;

const ENTRY_PRIMARY: Record<
  CreateTripEntryId,
  { label: string; footnote: string; helperTitle: string; steps: readonly { label: string; icon: typeof MapPin }[] }
> = {
  'tell-ai': {
    label: '开始探索',
    footnote: '也可切换为攻略导入，或等待其他入口上线',
    helperTitle: '探索规划会帮你',
    steps: EXPLORATION_STEPS,
  },
  'from-guide': {
    label: '从攻略开始规划',
    footnote: '也可切换为探索规划，或等待其他入口上线',
    helperTitle: '攻略导入会帮你',
    steps: GUIDE_STEPS,
  },
  import: {
    label: '即将上线',
    footnote: '该入口尚未开放',
    helperTitle: '导入已有行程',
    steps: EXPLORATION_STEPS,
  },
  inspiration: {
    label: '即将上线',
    footnote: '该入口尚未开放',
    helperTitle: '旅行灵感',
    steps: EXPLORATION_STEPS,
  },
};

const TELL_AI_SIDEBAR = {
  title: '探索规划',
  intro: '从出行条件出发，比较不同路线策略的收益与代价，并在真实规则下完成可靠性决策。',
  bullets: [
    '先填写目的地、日期、预算与车辆等约束',
    '同一目的地下多条路线策略可比较',
    'BLOCK 问题来自 Constraint Gateway，修复方案可应用并重新验证',
  ],
};

function entryIconClass(highlighted: boolean, disabled?: boolean): string {
  if (disabled) return 'bg-muted/50 text-muted-foreground';
  if (highlighted) return 'bg-primary text-primary-foreground';
  return 'bg-muted text-foreground';
}

interface CreateTripEntryPickerProps {
  activeId?: CreateTripEntryId;
  className?: string;
  showPageTitle?: boolean;
}

export function CreateTripEntryPicker({
  activeId = 'tell-ai',
  className,
  showPageTitle = false,
}: CreateTripEntryPickerProps) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<CreateTripEntryId>(activeId);
  const [hovered, setHovered] = useState<CreateTripEntryId>(activeId);

  const sidebarEntry =
    hovered === 'from-guide' || selected === 'from-guide' ? 'from-guide' : hovered;

  const selectedEntry = ENTRIES.find((e) => e.id === selected);
  const primaryMeta = ENTRY_PRIMARY[selected];
  const canContinue = selectedEntry != null && !selectedEntry.disabled;

  const handleContinue = () => {
    if (!canContinue) return;
    if (selected === 'tell-ai') navigate(TELL_AI_HREF);
    else if (selected === 'from-guide') navigate(FROM_GUIDE_HREF);
  };

  return (
    <div className={cn('flex flex-col flex-1 min-w-0', className)}>
      <GuideImportScrollX contentClassName="w-full min-w-[720px] xl:min-w-0">
        <div
          className={cn(
            'flex flex-col gap-6 lg:gap-8 flex-1 min-w-0',
            guideImportUi.entryPageMinH,
          )}
        >
          {showPageTitle && (
            <GuideImportStepHeader
              title={PAGE_COPY.title}
              description={PAGE_COPY.subtitle}
              align="left"
              className="pt-2 sm:pt-4 lg:pt-6"
              titleClassName={guideImportUi.entryPageTitle}
              descriptionClassName={guideImportUi.entryPageSubtitle}
            />
          )}

          <div className={guideImportUi.gridMainSidebarEntry}>
          <div className="flex flex-col gap-6 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ENTRIES.map((entry) => {
              const Icon = entry.icon;
              const isSelected = entry.id === selected;
              const isHovered = entry.id === hovered;
              const highlighted = (isSelected || isHovered) && !entry.disabled;

              return (
                <button
                  key={entry.id}
                  type="button"
                  disabled={entry.disabled}
                  aria-pressed={isSelected}
                  onMouseEnter={() => setHovered(entry.id)}
                  onFocus={() => setHovered(entry.id)}
                  onClick={() => {
                    if (entry.disabled) return;
                    setSelected(entry.id);
                  }}
                  className={cn(
                    'flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl text-left border transition-all w-full',
                    guideImportUi.entryCardMinH,
                    isSelected && !entry.disabled
                      ? 'border-foreground/25 bg-muted/20 shadow-sm ring-1 ring-foreground/10'
                      : highlighted
                        ? 'border-foreground/15 bg-muted/10 shadow-none'
                        : cn(
                            guideImportUi.card,
                            'hover:border-foreground/15 hover:bg-muted/10 shadow-none',
                          ),
                    entry.disabled && 'opacity-55 cursor-not-allowed hover:bg-card hover:border-border',
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                      entryIconClass(highlighted, entry.disabled),
                    )}
                  >
                    <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground text-[15px] leading-snug">
                        {entry.title}
                      </h3>
                      {entry.badge === '推荐' && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-2 py-0 font-medium bg-foreground text-primary-foreground hover:bg-foreground"
                        >
                          推荐
                        </Badge>
                      )}
                      {entry.badge && entry.badge !== '推荐' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {entry.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {entry.description}
                    </p>
                  </div>

                  {!entry.disabled && (
                    <span
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
                        highlighted ? 'text-foreground' : 'text-muted-foreground/40',
                      )}
                      aria-hidden
                    >
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className={cn(guideImportUi.cardInset, 'px-5 py-4')}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                <Bot className="w-4 h-4 text-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">{primaryMeta.helperTitle}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
              {primaryMeta.steps.map(({ label, icon: StepIcon }) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <StepIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <Button
              type="button"
              size="lg"
              className={guideImportPrimaryButtonClass('min-w-[220px]')}
              onClick={handleContinue}
              disabled={!canContinue}
            >
              {primaryMeta.label}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <p className={guideImportUi.footnote}>{primaryMeta.footnote}</p>
          </div>
        </div>

        <GuideImportSidebarPanel
          variant="accent"
          className="lg:sticky lg:top-6 self-start w-full min-w-0"
        >
          {sidebarEntry === 'from-guide' ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-sm">{GUIDE_SIDEBAR.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{GUIDE_SIDEBAR.intro}</p>
              <ul className="space-y-3 flex-1">
                {GUIDE_SIDEBAR.bullets.map((b) => (
                  <li key={b} className="text-xs text-foreground flex gap-2 leading-relaxed">
                    <Check
                      className="w-3.5 h-3.5 text-foreground flex-shrink-0 mt-0.5"
                      strokeWidth={2.5}
                    />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="space-y-2.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  {GUIDE_SIDEBAR.inputsLabel}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {GUIDE_SIDEBAR.inputs.map(({ icon: InputIcon, label }) => (
                    <div
                      key={label}
                      className="rounded-xl border border-border bg-muted/20 p-3.5 text-center min-h-[76px] flex flex-col items-center justify-center"
                    >
                      <InputIcon className="w-4 h-4 mx-auto text-muted-foreground mb-1.5" />
                      <p className="text-[11px] font-medium text-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed flex gap-1.5 pt-3 border-t border-border mt-auto">
                <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-muted-foreground" />
                {GUIDE_SIDEBAR.footer}
              </p>
            </>
          ) : sidebarEntry === 'tell-ai' ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-sm">{TELL_AI_SIDEBAR.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{TELL_AI_SIDEBAR.intro}</p>
              <ul className="space-y-3 flex-1">
                {TELL_AI_SIDEBAR.bullets.map((b) => (
                  <li key={b} className="text-xs text-foreground flex gap-2 leading-relaxed">
                    <Check
                      className="w-3.5 h-3.5 text-foreground flex-shrink-0 mt-0.5"
                      strokeWidth={2.5}
                    />
                    {b}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-sm">选择一种开始方式</h3>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                悬停查看各入口说明。选中后点击下方按钮继续。
              </p>
            </>
          )}
        </GuideImportSidebarPanel>
          </div>
        </div>
      </GuideImportScrollX>
    </div>
  );
}
