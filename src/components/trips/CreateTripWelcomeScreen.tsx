/**
 * 创建行程欢迎界面 - 优化转化率
 * 
 * 黄金结构：
 * 1. 强价值标题
 * 2. 降低心理负担的副标题
 * 3. 创建行程输入区（绝对主角）
 * 4. 可点击示例（结果导向）
 * 5. 风险消除 / 信心补充
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, MapPin, Calendar, Users, Loader2, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateTripWelcomeScreenProps {
  onStart: (message: string) => void;
  isLoading?: boolean;
  isCreating?: boolean;
  error?: string | null; // 🆕 P1: 错误状态
  onRetry?: () => void; // 🆕 P1: 重试机制
  className?: string;
}

// 示例卡片数据（结果导向）
const exampleCards = [
  {
    id: 'japan-cherry',
    emoji: '🌸',
    title: '日本樱花季行程',
    subtitle: '7 天 · 关东/关西 · 亲子友好',
    prompt: '3 月和家人去日本 7 天，节奏轻松，想看樱花',
  },
  {
    id: 'iceland-aurora',
    emoji: '❄️',
    title: '冰岛极光之旅',
    subtitle: '6 天 · 自驾/跟团可选 · 冬季限定',
    prompt: '想去冰岛看极光，6天左右，可以自驾',
  },
  {
    id: 'disney-family',
    emoji: '🏰',
    title: '迪士尼亲子游',
    subtitle: '5 天 · 上海/东京 · 含游玩建议',
    prompt: '带小孩去迪士尼，5天行程，需要详细的游玩建议',
  },
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
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [creatingSteps, setCreatingSteps] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // 处理示例点击（支持鼠标和键盘）
  const handleExampleClick = (example: typeof exampleCards[0]) => {
    if (isLoading || isCreating) return;
    
    setSelectedExample(example.id);
    // 🆕 显示创建中步骤
    setCreatingSteps(['分析目的地', '安排行程节奏', '优化交通与时间']);
    
    // 🆕 自动提交示例内容（半自动创建，转化率更高）
    onStart(example.prompt);
    setInputValue('');
    
    // 🆕 HCI优化：焦点管理 - 创建中状态出现时聚焦到状态区域
    setTimeout(() => {
      statusRef.current?.focus();
    }, 100);
    
    // 延迟清除选中状态，让用户看到反馈
    setTimeout(() => {
      setSelectedExample(null);
    }, 500);
  };

  // 🆕 HCI优化：键盘事件处理
  const handleExampleKeyDown = (
    e: React.KeyboardEvent,
    example: typeof exampleCards[0]
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleExampleClick(example);
    }
  };

  // 处理提交
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading || isCreating) return;
    
    // 显示创建中步骤
    setCreatingSteps(['分析目的地', '安排行程节奏', '优化交通与时间']);
    
    onStart(inputValue.trim());
    setInputValue('');
    setSelectedExample(null);
    
    // 🆕 HCI优化：提交后聚焦到状态区域（如果创建中）或保持输入框焦点
    setTimeout(() => {
      if (isLoading || isCreating) {
        statusRef.current?.focus();
      } else {
        textareaRef.current?.focus();
      }
    }, 100);
  };

  // 🆕 当开始加载或创建时，显示创建步骤
  useEffect(() => {
    if (isLoading || isCreating) {
      setCreatingSteps(['分析目的地', '安排行程节奏', '优化交通与时间']);
    } else {
      // 延迟清除步骤，让用户看到完成状态
      const timer = setTimeout(() => {
        setCreatingSteps([]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isCreating]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 主内容区 - 居中显示 */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-3xl space-y-6 sm:space-y-8">
          {/* 1. 强价值标题 */}
          <div className="text-center space-y-2 sm:space-y-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              创建你的专属行程 <span aria-hidden="true">✨</span>
            </h1>
            {/* 2. 降低心理负担的副标题 */}
            <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto px-4">
              一句话描述你的旅行想法，AI 立即为你生成完整可用的行程方案
            </p>
          </div>

          {/* 3. 创建行程输入区（绝对主角） */}
          <Card className={cn(
            "shadow-lg border-2 transition-all duration-200",
            error 
              ? "border-red-200 hover:border-red-300" 
              : "border-gray-200 hover:border-primary/30"
          )}>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                {/* 标题 */}
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    创建新行程
                  </h2>
                </div>
                
                {/* 分隔线 */}
                <div className="border-t border-gray-200" />
                
                {/* 提示文字 */}
                <p className="text-sm text-gray-600">
                  📍 想去哪？几天？和谁？
                </p>
                
                {/* 大号输入框 - ChatGPT 风格 */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="trip-input" className="sr-only">
                      描述您的旅行想法
                    </label>
                    {/* ChatGPT 风格：统一的输入条容器 */}
                    <div className={cn(
                      'flex items-end gap-2',
                      'bg-white rounded-2xl shadow-sm',
                      'border border-gray-200',
                      'transition-all duration-200',
                      'hover:shadow-md focus-within:shadow-md focus-within:border-primary/30',
                      'p-2'
                    )}>
                      {/* 输入框 - 无边框，作为容器的一部分 */}
                      <Textarea
                        id="trip-input"
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="例如：3 月和家人去日本 7 天，节奏轻松"
                        disabled={isLoading || isCreating}
                        aria-describedby="trip-input-hint"
                        aria-invalid={false}
                        className={cn(
                          'flex-1 min-h-[80px] sm:min-h-[100px] text-base resize-none',
                          'border-0 bg-transparent shadow-none',
                          'rounded-xl px-3 sm:px-4 py-2 sm:py-3',
                          'placeholder:text-gray-400',
                          'focus-visible:outline-none focus-visible:ring-0',
                          'transition-all duration-200',
                          'disabled:cursor-not-allowed'
                        )}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            handleSubmit(e);
                          }
                        }}
                      />
                      {/* 按钮 - 作为输入条的一部分，底部对齐 */}
                      <Button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading || isCreating}
                        aria-label={!inputValue.trim() ? '请输入旅行想法后再生成行程' : '立即生成行程'}
                        aria-describedby={!inputValue.trim() ? 'submit-hint' : undefined}
                        className={cn(
                          'h-10 w-10 p-0 mb-2 flex-shrink-0',
                          'bg-primary hover:bg-primary/90',
                          'text-white rounded-xl',
                          'transition-all duration-200',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                          'active:scale-[0.98]'
                        )}
                      >
                        {isLoading || isCreating ? (
                          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                        ) : (
                          <ArrowRight className="w-5 h-5" aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                    {/* 🆕 HCI优化：关联提示文字 */}
                    <p id="trip-input-hint" className="sr-only">
                      输入您的旅行想法，例如目的地、天数、同行人员等信息
                    </p>
                    {/* 🆕 HCI优化：禁用状态提示 */}
                    {!inputValue.trim() && (
                      <p id="submit-hint" className="sr-only">
                        请输入旅行想法后才能生成行程
                      </p>
                    )}
                  </div>
                </form>
                
                {/* 🆕 P1: 错误提示区域 */}
                {error && (
                  <div 
                    role="alert"
                    aria-live="assertive"
                    className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-red-900 font-medium mb-1">
                          生成行程时出现问题
                        </p>
                        <p className="text-xs text-red-700">
                          {error}
                        </p>
                        {onRetry && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onRetry}
                            className="mt-2 h-7 text-xs"
                            aria-label="重试生成行程"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            重试
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 降低心理负担的文案 */}
                <p className="text-xs text-gray-500 text-center">
                  不需要想得很清楚，后面可以随时修改 · 已为上万用户生成真实可用行程
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 4. 可点击示例（结果导向） */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 text-center">
              或者选择一个示例快速开始：
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3" role="list">
              {exampleCards.map((example) => (
                <Card
                  key={example.id}
                  role="listitem"
                  tabIndex={isLoading || isCreating ? -1 : 0}
                  aria-label={`选择示例：${example.title}，${example.subtitle}，点击或按 Enter 键使用此示例`}
                  aria-disabled={isLoading || isCreating}
                  className={cn(
                    'cursor-pointer transition-all duration-200',
                    'hover:shadow-md active:scale-[0.98]',
                    'border-2',
                    selectedExample === example.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2 animate-in zoom-in-95 duration-200'
                      : 'border-gray-200 hover:border-primary/30',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    (isLoading || isCreating) && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => handleExampleClick(example)}
                  onKeyDown={(e) => handleExampleKeyDown(e, example)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl" aria-hidden="true">{example.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">
                          {example.title}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {example.subtitle}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* 5. 风险消除 / 信心补充 */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              💡 提示：生成的行程包含详细的日程安排、交通建议和游玩推荐，可直接使用
            </p>
          </div>
        </div>
      </div>

      {/* 创建中状态（提升信任感） */}
      {(isCreating || isLoading) && creatingSteps.length > 0 && (
        <div
          ref={statusRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          tabIndex={-1}
          className="border-t bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 animate-in slide-in-from-bottom duration-300"
        >
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <Loader2 
                className="w-5 h-5 animate-spin text-primary" 
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  <span aria-hidden="true">🧠</span>{' '}
                  <span>正在为你规划行程</span>
                </p>
                <div className="space-y-1" role="list">
                  {creatingSteps.map((step, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-2 text-xs text-gray-600"
                      role="listitem"
                    >
                      <CheckCircle2 
                        className="w-3 h-3 text-green-600" 
                        aria-hidden="true"
                      />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                {/* 🆕 HCI优化：屏幕阅读器完整描述 */}
                <div className="sr-only">
                  正在生成行程，步骤包括：{creatingSteps.join('、')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
