/**
 * 创建行程欢迎界面 - TripNARA 视觉设计规范
 *
 * 设计原则（视觉设计师.md）：
 * - Clarity over Charm：清晰优先于讨喜
 * - Quiet confidence：比例、留白、层级、细节一致性
 * - 中性色为主，强调色用于裁决状态，严禁情绪化大色块
 * - 主靠层级、描边、icon、标签，避免情绪化
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, AlertCircle, ArrowUp, Mic, Mountain, Sun, Flower2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateTripWelcomeScreenProps {
  onStart: (message: string) => void;
  isLoading?: boolean;
  isCreating?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

/** 产品文案 - 降低心理门槛，强调可执行、即刻开始 */
const COPY = {
  title: '输入你的旅行意向，我帮你做一次完整决策',
  placeholder: '想去冰岛 7 天，南岸+黄金圈，自驾但安全优先，想看瀑布、冰河湖和黑沙滩',
  styleWeightLabel: '更偏向',
  styleWeightCta: '以此开始',
  exampleSectionLabel: '也可以从这些灵感开始',
  creatingStatus: '正在生成可执行行程',
  creatingSteps: ['校验目的地', '安排节奏', '生成方案'] as const,
};

/** 多选式风格权重 - 符合决策模型，用户勾选偏好后组合成 prompt */
const STYLE_WEIGHTS = [
  { id: 'relax', label: '放松' },
  { id: 'deep', label: '深度' },
  { id: 'photo', label: '摄影' },
  { id: 'food', label: '美食' },
  { id: 'nature', label: '自然' },
] as const;

const exampleCards = [
  { id: 'iceland-ring-road', title: '冰岛环岛 · 7天自驾（含黄金圈）', prompt: '想去冰岛环岛自驾 7 天，想看瀑布、冰川和黑沙滩，节奏平衡，包含黄金圈。', icon: MapPin },
  { id: 'iceland-south-coast', title: '冰岛南岸 · 4天轻松看瀑布', prompt: '想去冰岛南岸 4 天游玩，节奏轻松，重点是瀑布、黑沙滩和冰河湖，不要太赶。', icon: Sun },
  { id: 'iceland-northern-lights', title: '冰岛冬季 · 5天追极光（安全优先）', prompt: '冬天去冰岛 5 天，想追极光但安全优先，希望避开危险路况，安排温泉和城市休整。', icon: Mountain },
  { id: 'iceland-hot-springs', title: '冰岛温泉 · 3天周末放松', prompt: '想去冰岛 3 天短途放松，想泡温泉（蓝湖/天空之湖/当地温泉），配合轻量城市漫步。', icon: Flower2 },
  { id: 'iceland-family', title: '冰岛亲子 · 6天不自虐行程', prompt: '带家人去冰岛 6 天，节奏不要太赶，路程别太长，想看自然景观+温泉，住宿尽量稳定。', icon: MapPin },
];

export function CreateTripWelcomeScreen({
  onStart,
  isLoading = false,
  isCreating = false,
  error = null,
  onRetry,
  className,
}: CreateTripWelcomeScreenProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(new Set());
  const [creatingSteps, setCreatingSteps] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading || isCreating) return;
    setCreatingSteps([...COPY.creatingSteps]);
    onStart(inputValue.trim());
    setInputValue('');
    setTimeout(() => {
      if (isLoading || isCreating) statusRef.current?.focus();
      else textareaRef.current?.focus();
    }, 100);
  };

  const handleExampleClick = (prompt: string) => {
    if (isLoading || isCreating) return;
    setCreatingSteps([...COPY.creatingSteps]);
    onStart(prompt);
    setInputValue('');
    setTimeout(() => statusRef.current?.focus(), 100);
  };

  const setStyleChecked = (id: string, checked: boolean) => {
    if (isLoading || isCreating) return;
    setSelectedStyles((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleStyleWeightStart = () => {
    if (isLoading || isCreating || selectedStyles.size === 0) return;
    const labels = STYLE_WEIGHTS.filter((s) => selectedStyles.has(s.id)).map((s) => s.label);
    const prompt = `想要更偏向${labels.join('、')}的旅行，请帮我规划`;
    setCreatingSteps([...COPY.creatingSteps]);
    onStart(prompt);
    setSelectedStyles(new Set());
    setTimeout(() => statusRef.current?.focus(), 100);
  };

  useEffect(() => {
    if (isLoading || isCreating) {
      setCreatingSteps([...COPY.creatingSteps]);
    } else {
      const timer = setTimeout(() => setCreatingSteps([]), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isCreating]);

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* 主内容区 - 留白充足，层级清晰 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-8 py-12 sm:py-16">
        <div className="w-full max-w-2xl space-y-10">
          {/* 1. 主标题 - 层级一：清晰问句 */}
          <div className="text-center space-y-1">
            <h1 className="text-xl sm:text-2xl font-medium text-foreground tracking-tight">
              {COPY.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              我会综合时间、预算、节奏与风险，给出最合理的行程结构。
            </p>
          </div>

          {/* 2. 输入区 - 层级二：绝对主角，克制动效 */}
          <div className="space-y-5">
            <form onSubmit={handleSubmit} className="w-full">
              <div
                className={cn(
                  'flex items-end gap-0 rounded-xl border border-border bg-card',
                  'transition-all duration-200',
                  'hover:border-input',
                  'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30',
                  error && 'border-destructive focus-within:ring-destructive/20'
                )}
              >
                <label htmlFor="trip-input" className="sr-only">描述行程想法</label>
                <Textarea
                  id="trip-input"
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={COPY.placeholder}
                  disabled={isLoading || isCreating}
                  aria-invalid={!!error}
                  className={cn(
                    'flex-1 min-h-[52px] sm:min-h-[56px] text-[15px] resize-none',
                    'border-0 bg-transparent shadow-none rounded-xl pl-4 pr-2 py-3',
                    'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0'
                  )}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e);
                  }}
                />
                <div className="flex items-center gap-0.5 pr-2 pb-2">
                  <button
                    type="button"
                    className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label="语音输入"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <Button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading || isCreating}
                    aria-label="发送"
                    className="h-8 w-8 p-0 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
                  >
                    {isLoading || isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowUp className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </form>

            {/* 3. 多选式风格权重 - 层级三：符合决策模型，克制动效 */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">{COPY.styleWeightLabel}</p>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                {STYLE_WEIGHTS.map(({ id, label }) => {
                  const checked = selectedStyles.has(id);
                  return (
                    <label
                      key={id}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors',
                        'border',
                        checked
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:border-input',
                        (isLoading || isCreating) && 'opacity-50 cursor-not-allowed pointer-events-none'
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => setStyleChecked(id, c === true)}
                        disabled={isLoading || isCreating}
                        onPointerDown={(e) => (isLoading || isCreating) && e.preventDefault()}
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
              {selectedStyles.size > 0 && (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleStyleWeightStart}
                    disabled={isLoading || isCreating}
                    className="text-sm"
                  >
                    {COPY.styleWeightCta}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 4. 示例卡片 - 层级四：主靠描边与层级，图标中性灰 */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">{COPY.exampleSectionLabel}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {exampleCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleExampleClick(card.prompt)}
                    disabled={isLoading || isCreating}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-xl text-left',
                      'border border-border bg-card',
                      'hover:border-input hover:bg-muted/50 transition-colors',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground text-sm">{card.title}</h3>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div role="alert" className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
              {onRetry && (
                <button onClick={onRetry} className="underline hover:no-underline ml-1">
                  重试
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 创建中状态 - 克制动效，状态解释 */}
      {(isCreating || isLoading) && creatingSteps.length > 0 && (
        <div
          ref={statusRef}
          role="status"
          aria-live="polite"
          tabIndex={-1}
          className="border-t border-border bg-muted/50 px-6 py-3 animate-in slide-in-from-bottom duration-200"
        >
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{COPY.creatingStatus}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                {creatingSteps.map((step, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-foreground/60" strokeWidth={2} />
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
