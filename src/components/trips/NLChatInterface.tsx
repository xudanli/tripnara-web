/**
 * 自然语言创建行程 - 对话式交互界面
 * 
 * 提供类似聊天的交互体验，让用户通过自然语言描述旅行需求
 * 支持多轮对话、快捷回复、信息确认等功能
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import type { 
  ParsedTripParams, 
  ConversationContext,
  PlannerResponseBlock,
  NLClarificationQuestion,
  ThinkingProcess,
  ProgressStep,
} from '@/types/trip';
import { ResponseBlockRenderer } from './ResponseBlockRenderer';
import { NLClarificationQuestionCard } from './NLClarificationQuestionCard';
import { getConditionalInputStorageKey, getTriggeredConditionalInputs } from '@/utils/nl-conversation-adapter';
import { StructuredContentTypewriter } from './StructuredContentTypewriter';
import ConversationGuide from './ConversationGuide';
import { CreateTripWelcomeScreen } from './CreateTripWelcomeScreen';
import GateWarningCard, { type GateAlternative } from './GateWarningCard';
import PersonaInfoCard from './PersonaInfoCard';
import RecommendedRoutesCard from './RecommendedRoutesCard';
import SafetyWarningCard from './SafetyWarningCard';
import DecisionMatrixCard from './DecisionMatrixCard';
import {
  normalizeClarificationQuestions,
  areAllCriticalFieldsAnswered,
  getUnansweredCriticalFields,
  extractGateWarningMessage,
} from '@/utils/nl-conversation-adapter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  User, 
  MapPin, 
  Calendar, 
  Users, 
  Wallet,
  Target,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Loader2,
  ArrowRight,
  Plus,
  Compass,
  Search,
  ChevronDown,
  ChevronUp,
  Brain,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { useAuth } from '@/hooks/useAuth';
import { useContextApi } from '@/hooks/useContextApi';
import type { ContextPackage } from '@/api/context';
import { toast } from 'sonner';
import Logo from '@/components/common/Logo';
import { decisionApi } from '@/api/decision';
import ConflictDetectionCard from '@/components/constraints/ConflictDetectionCard';
import type { ConstraintDSL, Conflict } from '@/types/constraints';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PlannerThinkingLoading } from '@/components/common/PlannerThinkingLoading';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// ==================== 辅助函数 ====================
// 注意：normalizeClarificationQuestions 已移至 @/utils/nl-conversation-adapter

/**
 * 🐛 根据澄清问题答案生成明确的确认消息
 * 例如："明确两人出行，计划停留7天，对冰川徒步和温泉体验感兴趣"
 */
// 🐛 安全地将答案转换为字符串（处理对象类型）
function formatAnswerValue(answer: any): string {
  if (answer === null || answer === undefined || answer === '') {
    return '';
  }
  
  // 如果是对象（如 {value, label}），提取 label 或 value
  if (typeof answer === 'object' && !Array.isArray(answer)) {
    if ('label' in answer && typeof answer.label === 'string') {
      return answer.label;
    }
    if ('value' in answer) {
      return String(answer.value);
    }
    return String(answer);
  }
  
  // 如果是数组，递归处理每个元素
  if (Array.isArray(answer)) {
    return answer.map(item => formatAnswerValue(item)).join('、');
  }
  
  // 其他类型直接转换
  return String(answer);
}

/**
 * 「已识别」回显（可选展示）：
 * - 默认不展示（避免噪音/重复）
 * - 如需展示，应尽量使用选项的 label（与上方按钮文案一致），而不是内部 value（如 ISK/summer/high）
 */
const SHOW_RECOGNIZED_PREVIEW = import.meta.env.VITE_SHOW_NL_RECOGNIZED_PREVIEW === 'true';

function formatRecognizedAnswer(question: NLClarificationQuestion, answer: any): string {
  if (answer === null || answer === undefined || answer === '') return '';

  const normalizeScalar = (v: any): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object' && !Array.isArray(v)) {
      // 展示层：优先 label，缺失再 fallback 到 value
      return String((v as any).label ?? (v as any).value ?? v).trim();
    }
    return String(v).trim();
  };

  const optionTexts: Array<{ value: string; label: string }> = (question.options || []).map((opt: any) => {
    if (typeof opt === 'string') return { value: opt, label: opt };
    const value = String(opt?.value ?? opt?.label ?? opt).trim();
    const label = String(opt?.label ?? opt?.value ?? opt).trim();
    return { value, label };
  });

  const mapOne = (raw: any): string => {
    const v = normalizeScalar(raw);
    if (!v) return '';
    // 有 options 时：优先匹配 label/value，最终展示 label
    if (optionTexts.length > 0) {
      const matched = optionTexts.find((o) => o.label === v) || optionTexts.find((o) => o.value === v);
      return matched?.label || v;
    }
    // 无 options / 纯文本输入：直接展示（已经是 label>value 的标量归一化结果）
    return v;
  };

  if (Array.isArray(answer)) {
    return answer.map(mapOne).filter(Boolean).join('、');
  }
  if (question.inputType === 'boolean') {
    return answer ? '是' : '否';
  }
  return mapOne(answer);
}

type QuestionAnswerLabelsShape =
  | Array<{ questionId?: string; label: string; fieldName?: string; value?: any }>
  | Record<string, { label?: string; value?: any }>;

function lookupAnswerLabel(
  labels: QuestionAnswerLabelsShape | undefined,
  questionId: string,
  fieldKey: string
): string | undefined {
  if (!labels) return undefined;

  // 1) 后端常见：对象映射（key 可能是 fieldName 或 questionId）
  if (!Array.isArray(labels) && typeof labels === 'object') {
    const byField = (labels as any)[fieldKey]?.label;
    if (typeof byField === 'string' && byField.trim()) return byField.trim();
    const byQid = (labels as any)[questionId]?.label;
    if (typeof byQid === 'string' && byQid.trim()) return byQid.trim();
    return undefined;
  }

  // 2) 兼容：数组形式
  if (Array.isArray(labels)) {
    const hit =
      labels.find((x) => x.questionId === questionId) ||
      labels.find((x) => x.fieldName && x.fieldName === fieldKey);
    const label = hit?.label?.trim();
    return label ? label : undefined;
  }

  return undefined;
}

function getAnswerLabelOverride(
  message: { questionAnswerLabels?: QuestionAnswerLabelsShape } | undefined,
  question: NLClarificationQuestion,
  fieldKey: string
): string | undefined {
  return lookupAnswerLabel(message?.questionAnswerLabels, question.id, fieldKey);
}

function generateConfirmationMessage(
  questions: NLClarificationQuestion[],
  answers: Record<string, string | string[] | number | boolean | null>,
  questionAnswerLabels?: QuestionAnswerLabelsShape
): string {
  const answerTexts: string[] = [];
  
  questions.forEach((q) => {
    const fieldKey = q.metadata?.fieldName || q.id;
    const answer = answers[fieldKey] ?? answers[q.id];
    if (answer === null || answer === undefined || answer === '') return;
    
    let answerText = '';
    const labelOverride = lookupAnswerLabel(questionAnswerLabels, q.id, fieldKey);

    if (labelOverride) {
      answerText = labelOverride;
    } else if (q.inputType === 'boolean') {
      answerText = answer ? '是' : '否';
    } else {
      // fallback：用问题 options 做 value->label 映射，避免出现 summer/high/couple
      answerText = formatRecognizedAnswer(q, answer);
    }
    
    // 根据问题类型生成简洁的确认文本
    if (q.text.includes('几位') || q.text.includes('人数') || q.text.includes('出行')) {
      answerTexts.push(`明确${answerText}出行`);
    } else if (q.text.includes('多少天') || q.text.includes('停留')) {
      answerTexts.push(`计划停留${answerText}天`);
    } else if (q.text.includes('感兴趣') || q.text.includes('体验')) {
      answerTexts.push(`对${answerText}感兴趣`);
    } else {
      // 通用格式：提取问题的关键信息
      const shortQuestion = q.text.replace(/[？?]/g, '').substring(0, 10);
      answerTexts.push(`${shortQuestion}：${answerText}`);
    }
  });
  
  return answerTexts.length > 0 ? answerTexts.join('，') : '已确认';
}

/** 从 questions + questionAnswers 构建 finalAnswers（含条件输入） */
function buildFinalAnswers(
  questions: NLClarificationQuestion[],
  questionAnswers: Record<string, string | string[] | number | boolean | null> | undefined
): Record<string, string | string[] | number | boolean | null> {
  const finalAnswers: Record<string, string | string[] | number | boolean | null> = {};
  if (!questionAnswers) return finalAnswers;
  questions.forEach((q) => {
    const fieldKey = q.metadata?.fieldName || q.id;
    const answer = questionAnswers[fieldKey] ?? questionAnswers[q.id];
    if (answer !== null && answer !== undefined) {
      finalAnswers[fieldKey] = answer;
    }
    if (q.conditionalInputs?.length) {
      const selectedValue = typeof answer === 'string' ? answer : String(answer);
      q.conditionalInputs.forEach((ci) => {
        const matches =
          ci.triggerValue === selectedValue ||
          selectedValue.includes(ci.triggerValue) ||
          ci.triggerValue.includes(selectedValue);
        if (matches) {
          const storageKey = getConditionalInputStorageKey(q.id, fieldKey, ci);
          const condAns = questionAnswers[storageKey];
          if (condAns !== null && condAns !== undefined) {
            finalAnswers[storageKey] = condAns;
          }
        }
      });
    }
  });
  return finalAnswers;
}

// ==================== 类型定义 ====================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // AI 消息特有
  parsedParams?: ParsedTripParams;
  showConfirmCard?: boolean;
  // 🆕 需要用户确认创建行程
  needsConfirmation?: boolean;
  // 🆕 结构化内容块（优先使用）
  responseBlocks?: PlannerResponseBlock[];
  // 🆕 结构化澄清问题
  clarificationQuestions?: NLClarificationQuestion[];
  // 问题回答状态（用于追踪已回答的问题）
  questionAnswers?: Record<string, string | string[] | number | boolean | null>;
  // 🆕 展示层回显 label（优先于 questionAnswers 原始 value）
  questionAnswerLabels?: QuestionAnswerLabelsShape;
  // 🆕 Gate 警告和 Critical 字段阻止标记
  gateBlocked?: boolean;
  blockedByCriticalFields?: boolean;
  gateWarningMessage?: string | null;
  alternatives?: Array<{
    id: string;
    label: string;
    description: string;
    action?: string;
    actionParams?: Record<string, any>;
    buttonText?: string;
  }>;
  // 🆕 AI 决策逻辑相关字段
  personaInfo?: import('@/types/trip').PersonaInfo;
  recommendedRoutes?: import('@/types/trip').RecommendedRoute[];
  blockedBySafetyPrinciple?: boolean;
  decisionResult?: import('@/types/trip').DecisionResult;
  blockedByDecisionMatrix?: boolean;
  // 🆕 约束冲突检测
  conflicts?: Conflict[];
  conflictRunId?: string; // 冲突检测的 runId，用于反馈
  // 🆕 思考过程与进展步骤
  thinkingProcess?: ThinkingProcess;
  progressSteps?: ProgressStep[];
  /** 阶段指示器（如 硬约束确认 1/4） */
  phaseIndicator?: { phase: number; phaseName: string; progress: string; totalPhases: number };
  // 🆕 用户终止后的重试提示
  isCancelledNotice?: boolean;
  retryPayload?: { text: string; answers?: Record<string, string | string[] | number | boolean | null> };
}

interface NLChatInterfaceProps {
  onTripCreated?: (tripId: string) => void;
  className?: string;
  showHeader?: boolean; // 是否显示内部头部（Dialog 中已有时设为 false）
  resetOnMount?: boolean; // 🆕 是否在挂载时重置会话（用于弹窗场景，每次打开都是新会话）
}

// ==================== 子组件 ====================

/**
 * `plannerReply` / 无 blocks 时的降级正文：按 **Markdown** 渲染（粗体、有序/无序列表、链接等）。
 * 与后端约定：正文可使用 GitHub Flavored Markdown（`remark-gfm`）。
 */
function NlAssistantMarkdown({ text, className }: { text: string; className?: string }) {
  const t = text.trim();
  if (!t) return null;
  return (
    <div className={cn('nl-planner-markdown prose prose-sm max-w-none text-gray-900', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1.5 pl-5 marker:font-normal marker:text-slate-500">
              {children}
            </ol>
          ),
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1.5 pl-5 marker:text-slate-500">{children}</ul>
          ),
          li: ({ children }) => <li className="leading-relaxed [&>p]:mb-1">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
          em: ({ children }) => <em className="italic text-gray-800">{children}</em>,
          h1: ({ children }) => <h1 className="mb-2 text-base font-semibold text-gray-900">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 text-sm font-semibold text-gray-900">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1 text-sm font-semibold text-gray-900">{children}</h3>,
          code: ({ className: codeClass, children, ...props }) =>
            codeClass ? (
              <code className={cn(codeClass, 'block rounded-md bg-slate-100 p-2 text-xs')} {...props}>
                {children}
              </code>
            ) : (
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px]" {...props}>
                {children}
              </code>
            ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-blue-600 underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {t}
      </ReactMarkdown>
    </div>
  );
}

/**
 * 打字机效果 Hook
 * @param text 要显示的完整文本
 * @param enabled 是否启用打字机效果
 * @param speed 打字速度（毫秒/字符）
 */
function useTypewriter(text: string, enabled: boolean, speed: number = 30) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    // 重置
    setDisplayedText('');
    setIsTyping(true);

    let currentIndex = 0;
    const intervalId = setInterval(() => {
      if (currentIndex < text.length) {
        // 每次添加 1-3 个字符，模拟更自然的打字
        const charsToAdd = Math.min(
          Math.floor(Math.random() * 2) + 1,
          text.length - currentIndex
        );
        setDisplayedText(text.slice(0, currentIndex + charsToAdd));
        currentIndex += charsToAdd;
      } else {
        setIsTyping(false);
        clearInterval(intervalId);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, enabled, speed]);

  return { displayedText, isTyping };
}

/**
 * 思考过程可折叠框（图二：进展步骤放入折叠内容内）
 */
function ThinkingProcessCollapsible({
  summary,
  content,
  progressSteps,
  phaseIndicator,
}: ThinkingProcess & { progressSteps?: ProgressStep[]; phaseIndicator?: { phaseName: string; progress: string } }) {
  const hasContent = content || (progressSteps && progressSteps.length > 0);
  const [open, setOpen] = useState(!!progressSteps?.length); // 有进展步骤时默认展开
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 overflow-hidden">
        <CollapsibleTrigger
          className={cn(
            "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
            hasContent && "hover:bg-slate-100/80"
          )}
        >
          <span className="flex items-center gap-2 text-slate-600">
            <Brain className="w-4 h-4 text-slate-500 flex-shrink-0" />
            {summary}
            {phaseIndicator && (
              <span className="text-slate-500 font-normal">
                · {phaseIndicator.phaseName} {phaseIndicator.progress}
              </span>
            )}
          </span>
          {hasContent && (
            open ? (
              <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
            )
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-slate-100 px-3 pb-3 pt-3 space-y-2">
            {content && (
              <div className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">
                {content}
              </div>
            )}
            {progressSteps && progressSteps.length > 0 && (
              (() => {
                let lastCompletedIndex = -1;
                for (let i = progressSteps.length - 1; i >= 0; i--) {
                  if (progressSteps[i].status === 'completed') {
                    lastCompletedIndex = i;
                    break;
                  }
                }
                return (
                  <div className="space-y-1.5">
                    {progressSteps.map((step, idx) => (
                      <ProgressStepItem
                        key={step.id ?? `step-${idx}`}
                        step={step}
                        isHighlighted={idx === lastCompletedIndex && step.status === 'completed'}
                      />
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/**
 * 进展步骤项（图二：绿色完成 / 蓝色加载 / 可选高亮）
 */
function ProgressStepItem({ step, isHighlighted }: { step: ProgressStep; isHighlighted?: boolean }) {
  const { label, detail, status = 'completed', icon } = step;
  const isCompleted = status === 'completed';
  const isRunning = status === 'running';
  const isFailed = status === 'failed';
  const isPending = status === 'pending';

  let IconComponent = CheckCircle2;
  if (icon === 'search') {
    IconComponent = Search;
  } else if (icon === 'loading' || isRunning) {
    IconComponent = Loader2;
  } else if (icon === 'check' || isCompleted) {
    IconComponent = CheckCircle2;
  } else if (isFailed) {
    IconComponent = AlertTriangle;
  }

  const iconColor = isCompleted ? 'text-green-600' : isRunning ? 'text-blue-500' : isFailed ? 'text-red-500' : 'text-slate-400';
  const iconBg = isCompleted ? 'bg-green-50' : isRunning ? 'bg-blue-50' : isFailed ? 'bg-red-50' : 'bg-slate-100';

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm",
        isHighlighted && "bg-blue-50/80"
      )}
    >
      <div className={cn("flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full", iconBg)}>
        {icon === 'search' && isCompleted ? (
          <span className="relative flex items-center justify-center">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <CheckCircle2 className="w-2.5 h-2.5 text-green-500 absolute -right-0.5 -top-0.5" />
          </span>
        ) : (
          <IconComponent
            className={cn(
              'w-3.5 h-3.5',
              iconColor,
              isRunning && 'animate-spin'
            )}
          />
        )}
      </div>
      <span className={cn(
        "text-slate-700",
        isCompleted && "text-slate-600",
        isFailed && "text-red-600",
        isPending && "text-slate-500"
      )}>
        {label}
        {detail && <span className="text-slate-500 ml-1">{detail}</span>}
      </span>
    </div>
  );
}

/**
 * 打字指示器 - 插画风格「规划师正在思考」动效（与 Agent 入口 / 行程生成页共用组件）
 */
function TypingIndicator() {
  return <PlannerThinkingLoading />;
}

/**
 * 消息气泡组件
 */
function MessageBubble({ 
  message, 
  onConfirm,
  onEdit,
  isLatest,
  isNewMessage,
  onQuestionAnswer,
  onSendMessage,
  onConditionalSubmit, // 🆕 条件输入 submitLabel 按钮：PUT 后 POST 继续对话
  onOpenConflictDialog, // 🆕 打开冲突检测弹窗的回调
  hideConfirmButton, // 🆕 当黄条「确认选择并继续」显示时，隐藏卡片内「确认并继续」
  currency = 'CNY', // 🆕 货币代码
}: { 
  message: ChatMessage;
  onConfirm?: () => void;
  onEdit?: () => void;
  isLatest?: boolean;
  isNewMessage?: boolean;  // 是否是刚收到的新消息（用于打字机效果）
  onQuestionAnswer?: (questionId: string, value: string | string[] | number | boolean | null) => void;
  onSendMessage?: (text: string, answers?: Record<string, string | string[] | number | boolean | null>) => void;  // 🆕 用于发送消息（含可选答案）
  onConditionalSubmit?: (question: NLClarificationQuestion, answers: Record<string, string | string[] | number | boolean | null>) => void | Promise<void>;
  onOpenConflictDialog?: (conflicts: Conflict[], runId?: string) => void; // 🆕 打开冲突检测弹窗
  hideConfirmButton?: boolean;
  currency?: string; // 🆕 货币代码
}) {
  const isUser = message.role === 'user';

  // 🆕 用户终止后的重试提示卡片
  if (message.isCancelledNotice && message.retryPayload) {
    return (
      <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 flex-row">
        <div className="flex-shrink-0 mt-1">
          <div className="w-5 h-5 flex items-center justify-center text-slate-600">
            <Compass className="w-4 h-4" strokeWidth={2} />
          </div>
        </div>
        <div className="flex flex-col flex-1 items-start">
          <div className="px-4 py-3 rounded-2xl bg-gray-100 border border-gray-200 text-sm text-gray-700 inline-flex items-center gap-2 max-w-[85%]">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>消息已被用户取消。</span>
            <button
              type="button"
              onClick={() => onSendMessage?.(message.retryPayload!.text, message.retryPayload!.answers)}
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // AI 消息使用打字机效果（仅新消息）
  const enableTypewriter = !isUser && isNewMessage === true;
  
  // 🆕 对于结构化内容，使用 StructuredContentTypewriter
  // 对于普通文本，使用 useTypewriter
  const hasStructuredContent = !isUser && message.responseBlocks && message.responseBlocks.length > 0;
  
  // 🆕 结构化内容的打字状态（通过回调跟踪）
  const [isStructuredTyping, setIsStructuredTyping] = useState(enableTypewriter && hasStructuredContent);
  
  const { displayedText, isTyping: isTextTyping } = useTypewriter(
    message.content, 
    enableTypewriter && !hasStructuredContent, // 只有非结构化内容才使用文本打字机
    25  // 打字速度：25ms/字符
  );
  
  // 显示的文本内容（仅用于非结构化内容）
  const textToShow = enableTypewriter && !hasStructuredContent ? displayedText : message.content;
  
  // 综合打字状态
  const isTyping = hasStructuredContent ? isStructuredTyping : isTextTyping;

  /** 结构化打字过长时解除锁定，避免快捷追问永远不出现 */
  useEffect(() => {
    if (!hasStructuredContent || !isStructuredTyping) return;
    const tid = window.setTimeout(() => setIsStructuredTyping(false), 45000);
    return () => window.clearTimeout(tid);
  }, [hasStructuredContent, isStructuredTyping, message.id]);

  // 🐛 检查该消息的所有澄清问题是否都已回答（用于弱化显示）
  const allQuestionsAnswered = !isUser && message.clarificationQuestions && message.clarificationQuestions.length > 0
    ? message.clarificationQuestions.every(q => {
        // 🆕 使用 fieldName 或 questionId（向后兼容）
        const fieldKey = q.metadata?.fieldName || q.id;
        const answer = message.questionAnswers?.[fieldKey] ?? message.questionAnswers?.[q.id] ?? null;
        if (answer === null || answer === undefined) return false;
        if (answer === '') return false;
        if (q.inputType === 'multiple_choice') {
          return Array.isArray(answer) && answer.length > 0;
        }
        return true;
      })
    : false;
  
  return (
    <div className={cn(
      "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* 🆕 AI消息标识图标 - 使用指南针（契合旅行规划场景） */}
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-5 h-5 flex items-center justify-center text-slate-600">
            <Compass className="w-4 h-4" strokeWidth={2} />
          </div>
        </div>
      )}

      {/* 消息内容（增加最大宽度） */}
      <div className={cn(
        "flex flex-col flex-1",
        isUser ? "items-end" : "items-start"
      )}>
        {/* 🆕 Gemini风格：简化角色标签，仅在需要时显示状态 */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            {/* 🐛 如果所有问题都已回答，显示"已确认"标识 */}
            {allQuestionsAnswered && !isLatest && (
              <Badge variant="outline" className="text-xs h-4 px-1.5 py-0 border-green-300 text-green-700 bg-green-50">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                已确认
              </Badge>
            )}
            {/* 🐛 如果有澄清问题但未全部回答，显示"待确认"标识 */}
            {!allQuestionsAnswered && message.clarificationQuestions && message.clarificationQuestions.length > 0 && !isLatest && (
              <Badge variant="outline" className="text-xs h-4 px-1.5 py-0 border-amber-300 text-amber-700 bg-amber-50">
                待确认
              </Badge>
            )}
          </div>
        )}

        {/* 🆕 Gemini风格：消息气泡 - AI白色背景，用户灰色气泡 */}
        <div className={cn(
          "rounded-lg px-4 py-3 text-sm max-w-[85%]",
          isUser 
            ? "bg-gray-200 text-gray-900 rounded-tr-sm" 
            : "bg-white text-gray-900 rounded-tl-sm border border-gray-100"
        )}>
          {/* 🆕 思考过程（可折叠，图二：进展步骤放入折叠内容内） */}
          {!isUser && (message.thinkingProcess || (message.progressSteps && message.progressSteps.length > 0)) && (
            <div className="mb-3">
              <ThinkingProcessCollapsible
                summary={message.thinkingProcess?.summary ?? '思考了一会儿'}
                content={message.thinkingProcess?.content ?? ''}
                progressSteps={message.progressSteps}
                phaseIndicator={message.phaseIndicator}
              />
            </div>
          )}
          {/* 有 responseBlocks 时正文仅以块为准（paragraph/summary_card 等），不再重复渲染 plannerReply → message.content */}
          {/* 🆕 结构化内容渲染（优先，支持打字机效果） */}
          {!isUser && message.responseBlocks && message.responseBlocks.length > 0 ? (
            isNewMessage && enableTypewriter ? (
              /* 新消息：使用打字机效果 */
              <StructuredContentTypewriter
                blocks={message.responseBlocks}
                enabled={true}
                speed={25}
                blockDelay={200}
                onComplete={() => {
                  setIsStructuredTyping(false);
                }}
              />
            ) : (
              /* 已显示的消息：直接渲染 */
              /* 🐛 如果所有问题都已回答，弱化显示（降低透明度、缩小字体） */
              <div className={cn(
                "space-y-3",
                allQuestionsAnswered && !isLatest && "opacity-60"
              )}>
                {message.responseBlocks.map((block, idx) => {
                  // 跳过 question_card 类型，它们会在下方单独渲染
                  if (block.type === 'question_card') return null;
                  return (
                    <div 
                      key={block.id || `block-${idx}`}
                      className={cn(
                        allQuestionsAnswered && !isLatest && "text-sm"
                      )}
                    >
                      <ResponseBlockRenderer 
                        block={block} 
                        allBlocks={message.responseBlocks}
                      />
                    </div>
                  );
                })}
                {/* 🐛 如果所有问题都已回答，添加"已确认"标识 */}
                {allQuestionsAnswered && !isLatest && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>已确认</span>
                  </div>
                )}
              </div>
            )
          ) : (
            /* 无 responseBlocks：正文可为 Markdown（与后端 plannerReply 约定一致）；打字中用纯行拆分避免半截 ** */
            <div className="leading-relaxed text-gray-900">
              {enableTypewriter && isTextTyping ? (
                <div className="prose prose-sm max-w-none">
                  {textToShow.split('\n').map((line, idx) => (
                    <p key={idx} className="mb-2 last:mb-0">
                      {line || '\u00A0'}
                    </p>
                  ))}
                </div>
              ) : (
                <NlAssistantMarkdown text={textToShow} />
              )}
              {isTyping && (
                <span className="inline-block w-0.5 h-4 bg-blue-600 ml-0.5 animate-pulse" />
              )}
            </div>
          )}
        </div>
        
        {/* 🆕 AI 决策逻辑组件（在澄清问题之前显示） */}
        {!isUser && isLatest && !isTyping && (
          <div className="mt-5 w-full max-w-[95%] space-y-4">
            {/* 1. 用户画像信息卡片 */}
            {message.personaInfo && (
              <PersonaInfoCard personaInfo={message.personaInfo} />
            )}
            
            {/* 2. 推荐路线卡片 */}
            {message.recommendedRoutes && message.recommendedRoutes.length > 0 && (
              <RecommendedRoutesCard
                routes={message.recommendedRoutes}
                onRouteSelect={(route) => {
                  // 用户选择路线后，可以发送消息应用路线参数
                  const routeText = `我想选择路线：${route.route}`;
                  onSendMessage?.(routeText);
                }}
              />
            )}
            
            {/* 3. 安全警告卡片（安全第一原则阻止） */}
            {message.blockedBySafetyPrinciple && (
              <SafetyWarningCard
                warningMessage={message.gateWarningMessage || '为了您的安全，请重新考虑您的选择'}
                alternatives={message.alternatives}
                personaName={message.personaInfo?.personaName}
                onAlternativeSelect={(alternative) => {
                  let alternativeText: string;
                  if (alternative.action && alternative.actionParams) {
                    const paramsText = Object.entries(alternative.actionParams)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(', ');
                    alternativeText = `我选择：${alternative.label}（${paramsText}）`;
                  } else {
                    alternativeText = `我选择：${alternative.label}`;
                  }
                  onSendMessage?.(alternativeText);
                }}
                onContinue={() => {
                  // 用户坚持继续，需要二次确认
                  if (window.confirm('您确定要继续吗？这可能会带来安全风险。')) {
                    onSendMessage?.('我了解风险，仍然希望继续');
                  }
                }}
              />
            )}
            
            {/* 4. 决策矩阵结果卡片（所有轮次完成后） */}
            {message.decisionResult && (
              <DecisionMatrixCard
                decisionResult={message.decisionResult}
                destinationName={message.parsedParams?.destination}
                onContinue={() => {
                  // 根据决策类型处理继续操作
                  if (message.decisionResult?.decision === 'GO_FULLY_SUPPORTED') {
                    // 完全支持，触发创建行程
                    onConfirm?.();
                  } else if (message.decisionResult?.decision === 'GO_WITH_STRONG_CAUTION') {
                    // 需要特别指导，需要确认
                    if (window.confirm('您确定要继续创建行程吗？这可能需要特别指导。')) {
                      onConfirm?.();
                    }
                  } else {
                    // 其他情况，需要二次确认
                    if (window.confirm('您确定要继续创建行程吗？这可能会带来风险。')) {
                      if (window.confirm('请再次确认：您了解可能的风险，仍然希望继续吗？')) {
                        onConfirm?.();
                      }
                    }
                  }
                }}
                onAlternative={() => {
                  // 查看替代方案 - 滚动到推荐路线区域
                  if (message.recommendedRoutes && message.recommendedRoutes.length > 0) {
                    // 可以通过发送消息触发显示推荐路线
                    onSendMessage?.('我想查看推荐的替代方案');
                  }
                }}
                onCancel={() => {
                  // 取消/改目的地
                  onSendMessage?.('我想修改目的地或延期计划');
                }}
                onConsultExpert={() => {
                  // 咨询专家
                  onSendMessage?.('我想咨询专家建议');
                }}
              />
            )}
          </div>
        )}
        
        {/* 🆕 结构化澄清问题卡片（独立渲染在消息气泡下方） */}
        {/* 注意：问题卡片在打字机效果完成后显示（通过 !isTyping 控制） */}
        {/* 🆕 Gate 警告 UI（在澄清问题之前显示） */}
        {!isUser && isLatest && !isTyping && message.gateBlocked && (
          <div className="mt-5 w-full max-w-[95%]">
            <GateWarningCard
              warningMessage={message.gateWarningMessage || '为了您的安全，请选择替代方案'}
              alternatives={message.alternatives || []}
              onSelectAlternative={(alternative) => {
                // 🆕 用户选择替代方案后，构建消息并发送
                // 如果替代方案有 action 和 actionParams，可以构建更精确的消息
                let alternativeText: string;
                
                if (alternative.action && alternative.actionParams) {
                  // 如果有 action 参数，构建更精确的消息
                  // 例如：action = "set_risk_tolerance:medium", actionParams = { riskTolerance: "medium" }
                  const paramsText = Object.entries(alternative.actionParams)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ');
                  alternativeText = `我选择：${alternative.label}（${paramsText}）`;
                } else {
                  // 否则，使用简单的文本
                  alternativeText = `我选择：${alternative.label}`;
                }
                
                
                // 自动发送消息
                onSendMessage?.(alternativeText);
              }}
            />
          </div>
        )}

        {/* 🆕 约束冲突检测提示（仅显示摘要，详情在弹窗中） */}
        {/* 🆕 优化：统一冲突展示方式，避免信息重复（符合渐进式披露原则） */}
        {/* 注意：冲突弹窗通过 handleDetectConflicts 函数自动打开，这里仅显示提示 */}
        {!isUser && message.conflicts && message.conflicts.length > 0 && isLatest && (
          <div className="mt-5 w-full max-w-[95%]">
            <Card className="border-yellow-200 bg-yellow-50/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900 mb-1">
                      检测到 {message.conflicts.length} 个约束冲突
                    </p>
                    <p className="text-xs text-yellow-700 mb-3">
                      您的预算、日期、偏好等约束之间存在冲突，请查看弹窗中的冲突详情和权衡选项。
                    </p>
                    <p className="text-xs text-yellow-600 italic">
                      💡 冲突详情已在弹窗中显示，如未看到请刷新页面
                    </p>
                    {onOpenConflictDialog && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // 🆕 打开冲突检测弹窗
                          onOpenConflictDialog(message.conflicts || [], (message as any).conflictRunId);
                        }}
                        className="text-yellow-900 border-yellow-300 hover:bg-yellow-100 mt-2"
                      >
                        重新打开冲突详情
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 🐛 修复：优先使用 clarificationQuestions，避免与 responseBlocks 中的 question_card 重复渲染 */}
        {!isUser && isLatest && !isTyping && (
          (() => {
            // 优先使用 clarificationQuestions 数组
            if (message.clarificationQuestions && message.clarificationQuestions.length > 0) {
              const params = message.parsedParams;
              const hasKeyInfo = params && (params.destination || params.startDate || params.endDate || (params.totalBudget != null && params.totalBudget > 0));
              const hasSummaryCardInBlocks = message.responseBlocks?.some(b => b.type === 'summary_card' && (b as any).summary?.destination);
              const showKeyInfoFallback = hasKeyInfo && !hasSummaryCardInBlocks;

              return (
                <div className="mt-5 w-full max-w-[95%]">
                  {/* 🆕 关键信息摘要：当 responseBlocks 中无 summary_card 时，用 parsedParams 展示目的地/出行时间/返程时间/预算 */}
                  {showKeyInfoFallback && params && (
                    <Card className="mb-4 border-slate-200 bg-slate-50/50">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                          {params.destination && (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-slate-500">目的地</span>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                <span className="text-slate-800 font-medium">{params.destinationName || params.destination}</span>
                              </div>
                            </div>
                          )}
                          {(params.startDate || (params as any).duration) && (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-slate-500">出行时间</span>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                <span className="text-slate-800">
                                  {params.startDate
                                    ? new Date(params.startDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
                                    : (params as any).duration}
                                </span>
                              </div>
                            </div>
                          )}
                          {params.endDate && (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-slate-500">返程时间</span>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                <span className="text-slate-800">
                                  {new Date(params.endDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          )}
                          {params.totalBudget != null && params.totalBudget > 0 && (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-slate-500">预算</span>
                              <div className="flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                <span className="text-slate-800">
                                  {formatCurrency(params.totalBudget, (params as any).currency || 'CNY')}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {/* 🆕 P0: 问题分组展示 - 使用 group 字段进行分组（符合 Miller's Law） */}
                  {(() => {
                    const filteredQuestions = (message.clarificationQuestions || []).filter(
                      question => question.text && question.text.trim().length > 0
                    );
                    
                    // 🆕 P0: 使用 group 字段分组（向后兼容：如果 group 不存在，使用 required 和 isCritical）
                    const getQuestionGroup = (q: NLClarificationQuestion): 'required' | 'optional' => {
                      if (q.group) {
                        return q.group;
                      }
                      // 向后兼容：根据 required 和 isCritical 推断
                      if (q.metadata?.isCritical === true || q.required === true) {
                        return 'required';
                      }
                      return 'optional';
                    };
                    
                    // 🆕 P0: 按 group 字段分组
                    const requiredQuestions = filteredQuestions
                      .filter(q => getQuestionGroup(q) === 'required')
                      .sort((a, b) => {
                        // 🆕 P1: 按优先级排序（high > medium > low）
                        const priorityOrder = { high: 3, medium: 2, low: 1 };
                        const aPriority = priorityOrder[a.metadata?.priority || 'medium'] || 2;
                        const bPriority = priorityOrder[b.metadata?.priority || 'medium'] || 2;
                        return bPriority - aPriority;
                      })
                      .slice(0, 5); // 🆕 P1: 限制必需问题组不超过5个
                    
                    const optionalQuestions = filteredQuestions
                      .filter(q => getQuestionGroup(q) === 'optional')
                      .sort((a, b) => {
                        // 🆕 P1: 按优先级排序
                        const priorityOrder = { high: 3, medium: 2, low: 1 };
                        const aPriority = priorityOrder[a.metadata?.priority || 'medium'] || 2;
                        const bPriority = priorityOrder[b.metadata?.priority || 'medium'] || 2;
                        return bPriority - aPriority;
                      })
                      .slice(0, 3); // 🆕 P1: 限制补充问题组不超过3个
                    
                    // 🆕 Critical 字段（安全相关）单独显示进度
                    const criticalQuestions = requiredQuestions.filter(q => q.metadata?.isCritical === true);
                    
                    // 🆕 如果问题数量较少，不分组显示
                    if (filteredQuestions.length <= 5 && requiredQuestions.length === filteredQuestions.length) {
                      // 直接显示所有问题，不分组
                      return (
                        <div className="space-y-3">
                          <div className="mb-3">
                            <p className="text-xs font-medium text-slate-600 mb-1">
                              需要确认以下信息
                            </p>
                            <p className="text-xs text-muted-foreground">
                              这些信息将帮助我们为您规划更精准的行程
                            </p>
                          </div>
                          {filteredQuestions.map((question) => {
                            const fieldKey = question.metadata?.fieldName || question.id;
                            const answer = message.questionAnswers?.[fieldKey] ?? message.questionAnswers?.[question.id] ?? null;
                            const isAnswered = answer !== null && answer !== undefined && answer !== '' && 
                              (question.inputType !== 'multiple_choice' || (Array.isArray(answer) && answer.length > 0));
                            return (
                              <div key={question.id} className="relative">
                                <NLClarificationQuestionCard
                                  question={question}
                                  value={answer}
                                  onChange={(value) => {
                                    onQuestionAnswer?.(fieldKey, value);
                                  }}
                                  onAnswer={(key, value) => {
                                    onQuestionAnswer?.(key, value);
                                  }}
                                  onConditionalSubmit={onConditionalSubmit}
                                  conditionalInputAnswers={message.questionAnswers}
                                  disabled={false}
                                />
                                {SHOW_RECOGNIZED_PREVIEW && isAnswered && (
                                  <>
                                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm border-2 border-white z-10">
                                      <CheckCircle2 className="w-3 h-3 text-white" />
                                    </div>
                                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md text-xs text-green-800 animate-in fade-in slide-in-from-top-1 duration-300">
                                      <div className="flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                                        <span className="font-medium">已识别：</span>
                                        <span className="flex-1">
                                          {getAnswerLabelOverride(message, question, fieldKey) ?? formatRecognizedAnswer(question, answer)}
                                        </span>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                          {/* 🆕 紧凑模式：确认并继续按钮（黄条显示时隐藏，避免重复） */}
                          {!hideConfirmButton && (
                            <div className="pt-3 border-t mt-4">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const allAnswers = buildFinalAnswers(filteredQuestions, message.questionAnswers);
                                  const confirmText = generateConfirmationMessage(
                                    filteredQuestions,
                                    allAnswers,
                                    message.questionAnswerLabels
                                  );
                                  onSendMessage?.(confirmText, allAnswers);
                                }}
                                className="w-full text-xs bg-slate-900 hover:bg-slate-800"
                              >
                                确认并继续
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    // 🆕 如果问题需要分组，使用分组显示
                    return (
                      <div className="space-y-4">
                        {/* 🆕 P0: Critical 字段进度指示器（安全相关问题） */}
                        {criticalQuestions.length > 0 && (
                          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-medium text-red-900">
                                  关键问题进度
                                </span>
                              </div>
                              <span className="text-sm text-red-700">
                                {criticalQuestions.filter(q => {
                                  const fieldKey = q.metadata?.fieldName || q.id;
                                  const answer = message.questionAnswers?.[fieldKey] ?? message.questionAnswers?.[q.id];
                                  return answer !== null && answer !== undefined && answer !== '' && 
                                    (q.inputType !== 'multiple_choice' || (Array.isArray(answer) && answer.length > 0));
                                }).length} / {criticalQuestions.length}
                              </span>
                            </div>
                            <div className="w-full bg-red-200 rounded-full h-2 mb-2">
                              <div
                                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${(criticalQuestions.filter(q => {
                                    const fieldKey = q.metadata?.fieldName || q.id;
                                    const answer = message.questionAnswers?.[fieldKey] ?? message.questionAnswers?.[q.id];
                                    return answer !== null && answer !== undefined && answer !== '' && 
                                      (q.inputType !== 'multiple_choice' || (Array.isArray(answer) && answer.length > 0));
                                  }).length / criticalQuestions.length) * 100}%`,
                                }}
                              />
                            </div>
                            {criticalQuestions.some(q => {
                              const fieldKey = q.metadata?.fieldName || q.id;
                              const answer = message.questionAnswers?.[fieldKey] ?? message.questionAnswers?.[q.id];
                              return answer === null || answer === undefined || answer === '' || 
                                (q.inputType === 'multiple_choice' && (!Array.isArray(answer) || answer.length === 0));
                            }) && (
                              <p className="text-xs text-red-700">
                                请先回答所有必填（安全相关）问题才能创建行程
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* 🆕 P0: 问题区域标题 */}
                        <div className="mb-3">
                          <p className="text-xs font-medium text-slate-600 mb-1">
                            需要确认以下信息
                          </p>
                          <p className="text-xs text-muted-foreground">
                            这些信息将帮助我们为您规划更精准的行程
                          </p>
                        </div>
                        
                        {/* 🆕 P0: 必需问题组（required group）- 最多5个 */}
                        {requiredQuestions.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                              <h4 className="text-sm font-semibold text-slate-800">
                                必需问题 ({requiredQuestions.length})
                              </h4>
                              <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                                必填
                              </Badge>
                            </div>
                            {/* 🆕 P0: 必需问题组进度指示器 */}
                            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-blue-700">完成进度</span>
                                <span className="text-xs font-medium text-blue-900">
                                  {requiredQuestions.filter(q => {
                                    const fieldKey = q.metadata?.fieldName || q.id;
                                    const answer = message.questionAnswers?.[fieldKey] ?? message.questionAnswers?.[q.id];
                                    return answer !== null && answer !== undefined && answer !== '' && 
                                      (q.inputType !== 'multiple_choice' || (Array.isArray(answer) && answer.length > 0));
                                  }).length} / {requiredQuestions.length}
                                </span>
                              </div>
                              <div className="w-full bg-blue-200 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${(requiredQuestions.filter(q => {
                                      const fieldKey = q.metadata?.fieldName || q.id;
                                      const answer = message.questionAnswers?.[fieldKey] ?? message.questionAnswers?.[q.id];
                                      return answer !== null && answer !== undefined && answer !== '' && 
                                        (q.inputType !== 'multiple_choice' || (Array.isArray(answer) && answer.length > 0));
                                    }).length / requiredQuestions.length) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                            {requiredQuestions.map((question) => {
                              const fieldKey = question.metadata?.fieldName || question.id;
                              const answer = message.questionAnswers?.[fieldKey] ?? message.questionAnswers?.[question.id] ?? null;
                              const isAnswered = answer !== null && answer !== undefined && answer !== '' && 
                                (question.inputType !== 'multiple_choice' || (Array.isArray(answer) && answer.length > 0));
                              return (
                                <div key={question.id} className="relative">
                                  <NLClarificationQuestionCard
                                    question={question}
                                    value={answer}
                                    onChange={(value) => {
                                      onQuestionAnswer?.(fieldKey, value);
                                    }}
                                    onAnswer={(key, value) => {
                                      onQuestionAnswer?.(key, value);
                                    }}
                                    onConditionalSubmit={onConditionalSubmit}
                                    conditionalInputAnswers={message.questionAnswers}
                                    disabled={false}
                                  />
                                  {SHOW_RECOGNIZED_PREVIEW && isAnswered && (
                                    <>
                                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm border-2 border-white z-10">
                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                      </div>
                                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md text-xs text-green-800 animate-in fade-in slide-in-from-top-1 duration-300">
                                        <div className="flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                                          <span className="font-medium">已识别：</span>
                                          <span className="flex-1">
                                            {getAnswerLabelOverride(message, question, fieldKey) ?? formatRecognizedAnswer(question, answer)}
                                          </span>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* 🆕 P0: 补充问题组（optional group）- 最多3个，可折叠 */}
                        {optionalQuestions.length > 0 && (
                          <details className="space-y-3" open>
                            <summary className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-slate-800 mb-2 flex items-center gap-2 list-none">
                              <Plus className="w-4 h-4" />
                              <span>补充问题 ({optionalQuestions.length})</span>
                              <Badge variant="outline" className="text-xs text-slate-500 border-slate-300">
                                可选
                              </Badge>
                              <span className="text-xs text-muted-foreground ml-auto">（可跳过）</span>
                            </summary>
                            <p className="text-xs text-muted-foreground mt-1 mb-2">
                              可选问题可跳过，输入「已确认」或点击「跳过」后进入下一步
                            </p>
                            <div className="space-y-3 mt-2">
                              {optionalQuestions.map((question) => {
                                const fieldKey = question.metadata?.fieldName || question.id;
                                const answer = message.questionAnswers?.[fieldKey] ?? message.questionAnswers?.[question.id] ?? null;
                                const isAnswered = answer !== null && answer !== undefined && answer !== '' && 
                                  (question.inputType !== 'multiple_choice' || (Array.isArray(answer) && answer.length > 0));
                                return (
                                  <div key={question.id} className="relative">
                                    <NLClarificationQuestionCard
                                      question={question}
                                      value={answer}
                                      onChange={(value) => {
                                        onQuestionAnswer?.(fieldKey, value);
                                      }}
                                      onAnswer={(key, value) => {
                                        onQuestionAnswer?.(key, value);
                                      }}
                                      onConditionalSubmit={onConditionalSubmit}
                                      conditionalInputAnswers={message.questionAnswers}
                                      disabled={false}
                                    />
                                    {SHOW_RECOGNIZED_PREVIEW && isAnswered && (
                                      <>
                                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm border-2 border-white z-10">
                                          <CheckCircle2 className="w-3 h-3 text-white" />
                                        </div>
                                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md text-xs text-green-800 animate-in fade-in slide-in-from-top-1 duration-300">
                                          <div className="flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                                            <span className="font-medium">已识别：</span>
                                            <span className="flex-1">
                                              {getAnswerLabelOverride(message, question, fieldKey) ?? formatRecognizedAnswer(question, answer)}
                                            </span>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </details>
                        )}
                        
                        {/* 🆕 P0: 操作按钮 - 有可选时显示两个，仅必需时显示一个（黄条显示时隐藏，避免重复） */}
                        {!hideConfirmButton && (optionalQuestions.length > 0 ? (
                          <div className="pt-3 border-t space-y-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                const allQuestions = [...requiredQuestions, ...optionalQuestions];
                                const allAnswers = buildFinalAnswers(allQuestions, message.questionAnswers);
                                const confirmText = generateConfirmationMessage(
                                  allQuestions,
                                  allAnswers,
                                  message.questionAnswerLabels
                                );
                                onSendMessage?.(confirmText, allAnswers);
                              }}
                              className="w-full text-xs bg-slate-900 hover:bg-slate-800"
                            >
                              确认并继续
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const requiredAnswers = buildFinalAnswers(requiredQuestions, message.questionAnswers);
                                const confirmText = generateConfirmationMessage(
                                  requiredQuestions,
                                  requiredAnswers,
                                  message.questionAnswerLabels
                                );
                                onSendMessage?.(confirmText, requiredAnswers);
                              }}
                              className="w-full text-xs"
                            >
                              跳过，仅提交必需答案
                            </Button>
                          </div>
                        ) : (
                          <div className="pt-3 border-t">
                            <Button
                              size="sm"
                              onClick={() => {
                                const requiredAnswers = buildFinalAnswers(requiredQuestions, message.questionAnswers);
                                const confirmText = generateConfirmationMessage(
                                  requiredQuestions,
                                  requiredAnswers,
                                  message.questionAnswerLabels
                                );
                                onSendMessage?.(confirmText, requiredAnswers);
                              }}
                              className="w-full text-xs bg-slate-900 hover:bg-slate-800"
                            >
                              确认并继续
                            </Button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              );
            }
            
            // 如果没有 clarificationQuestions，尝试从 responseBlocks 中提取 question_card
            
            // 如果没有 clarificationQuestions，尝试从 responseBlocks 中提取 question_card
            const questionCardBlocks = message.responseBlocks?.filter(block => block.type === 'question_card' && block.questionId) || [];
            if (questionCardBlocks.length > 0) {
              // 从 clarificationQuestions 中查找对应的问题（如果存在）
              const questionsToRender = questionCardBlocks
                .map(block => message.clarificationQuestions?.find(q => q.id === block.questionId))
                .filter((q): q is NLClarificationQuestion => 
                  q !== undefined && 
                  q !== null &&
                  typeof q === 'object' && 
                  'text' in q && 
                  typeof (q as NLClarificationQuestion).text === 'string' && 
                  (q as NLClarificationQuestion).text.trim().length > 0
                );
              
              if (questionsToRender.length > 0) {
                return (
                  <div className="mt-5 w-full max-w-[95%]">
                    {/* 🆕 问题区域标题 */}
                    <div className="mb-3">
                      <p className="text-xs font-medium text-slate-600 mb-1">
                        需要确认以下信息
                      </p>
                      <p className="text-xs text-muted-foreground">
                        这些信息将帮助我们为您规划更精准的行程
                      </p>
                    </div>
                    
                    {/* 问题卡片列表 */}
                    <div className="space-y-3">
                      {questionsToRender.map((question) => {
                        // 🆕 使用 fieldName 或 questionId（向后兼容）
                        const fieldKey = question.metadata?.fieldName || question.id;
                        const answer = message.questionAnswers?.[fieldKey] ?? message.questionAnswers?.[question.id] ?? null;
                        const isAnswered = answer !== null && answer !== undefined && answer !== '';
                        return (
                          <div key={question.id} className="relative">
                            <NLClarificationQuestionCard
                              question={question}
                              value={answer}
                              onChange={(value) => {
                                onQuestionAnswer?.(fieldKey, value);
                              }}
                              onAnswer={(key, value) => {
                                onQuestionAnswer?.(key, value);
                              }}
                              onConditionalSubmit={onConditionalSubmit}
                              conditionalInputAnswers={message.questionAnswers}
                              disabled={false}
                            />
                            {/* 已回答状态指示 */}
                            {SHOW_RECOGNIZED_PREVIEW && isAnswered && (
                              <>
                                <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm border-2 border-white z-10">
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                </div>
                                {/* 🆕 P0: 答案识别反馈 - 显示答案预览（默认隐藏，可通过 VITE_SHOW_NL_RECOGNIZED_PREVIEW 开启） */}
                                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md text-xs text-green-800 animate-in fade-in slide-in-from-top-1 duration-300">
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                                    <span className="font-medium">已识别：</span>
                                    <span className="flex-1">
                                      {getAnswerLabelOverride(message, question, fieldKey) ?? formatRecognizedAnswer(question, answer)}
                                    </span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* 🆕 question_card 路径：确认并继续按钮（黄条显示时隐藏，避免重复） */}
                    {!hideConfirmButton && (
                      <div className="pt-3 border-t mt-4">
                        <Button
                          size="sm"
                          onClick={() => {
                            const allAnswers = buildFinalAnswers(questionsToRender, message.questionAnswers);
                            const confirmText = generateConfirmationMessage(
                              questionsToRender,
                              allAnswers,
                              message.questionAnswerLabels
                            );
                            onSendMessage?.(confirmText, allAnswers);
                          }}
                          className="w-full text-xs bg-slate-900 hover:bg-slate-800"
                        >
                          确认并继续
                        </Button>
                      </div>
                    )}
                  </div>
                );
              }
            }
            
            return null;
          })()
        )}

        {/* 信息确认卡片 - 打字完成后显示 */}
        {!isUser && message.showConfirmCard && message.parsedParams && isLatest && !isTyping && (
          <TripSummaryCard
            params={message.parsedParams}
            onConfirm={onConfirm}
            onEdit={onEdit}
            currency={currency}
            className="mt-4"
          />
        )}

        {/* 时间戳 */}
        <span className="text-xs text-muted-foreground mt-1">
          {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

/**
 * 行程信息确认卡片
 */
function TripSummaryCard({
  params,
  onConfirm,
  onEdit,
  currency = 'CNY', // 🆕 货币代码，默认 CNY
  className,
}: {
  params: ParsedTripParams;
  onConfirm?: () => void;
  onEdit?: () => void;
  currency?: string; // 🆕 货币代码
  className?: string;
}) {
  const hasInferredFields = params.inferredFields && params.inferredFields.length > 0;
  
  // 计算天数
  const getDays = () => {
    if (params.startDate && params.endDate) {
      const start = new Date(params.startDate);
      const end = new Date(params.endDate);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return diff;
    }
    return null;
  };
  
  const days = getDays();

  return (
    <Card className={cn(
      "w-full max-w-md border-2 animate-in fade-in zoom-in-95 duration-300 overflow-hidden",
      hasInferredFields ? "border-amber-200 bg-amber-50/30" : "border-green-200 bg-green-50/30",
      className
    )}>
      <CardContent className="p-0">
        {/* 🆕 品牌化头部：Logo + 状态横幅 */}
        <div className={cn(
          "flex items-center gap-3 px-4 py-3",
          hasInferredFields ? "bg-amber-50/80" : "bg-blue-50/80"
        )}>
          <Logo variant="icon" size={36} className="flex-shrink-0 opacity-90" />
          <div className={cn(
            "flex-1 flex items-center gap-2 min-w-0 rounded-lg px-3 py-2",
            hasInferredFields ? "bg-amber-100/80 border border-amber-200" : "bg-blue-100/80 border border-blue-200"
          )}>
            {hasInferredFields ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-sm font-medium text-amber-800 truncate">请确认以下信息</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-green-800 truncate">已理解您的需求，准备创建行程</span>
              </>
            )}
          </div>
        </div>
        <div className="p-4 space-y-4 pt-4">
        {/* 信息网格 */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* 目的地 */}
          {params.destination && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">目的地</span>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{params.destination}</span>
              </div>
            </div>
          )}

          {/* 出行时间 */}
          {params.startDate && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">出行时间</span>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>
                  {new Date(params.startDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>
          )}
          {/* 返程时间 */}
          {params.endDate && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">返程时间</span>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>
                  {new Date(params.endDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  {days && <span className="text-muted-foreground"> ({days}天)</span>}
                </span>
              </div>
            </div>
          )}

          {/* 同行人 */}
          {(params.hasChildren || params.hasElderly) && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>
                {params.hasChildren && '有儿童'}
                {params.hasChildren && params.hasElderly && '、'}
                {params.hasElderly && '有老人'}
              </span>
            </div>
          )}

          {/* 预算 */}
          {params.totalBudget && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">预算</span>
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span>
                  {formatCurrency(params.totalBudget, currency)}
                  {params.inferredFields?.includes('totalBudget') && (
                    <Badge variant="outline" className="ml-1 text-xs text-amber-600 border-amber-300">
                      推断
                    </Badge>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 旅行风格标签 */}
        {params.preferences?.style && (
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">
                {params.preferences.style}
              </Badge>
            </div>
          </div>
        )}

        {/* 推断字段提示 */}
        {hasInferredFields && (
          <p className="text-xs text-amber-600 bg-amber-100 rounded px-2 py-1">
            ⚠️ 标记为"推断"的信息是 AI 根据您的描述推测的，请确认或修改
          </p>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex-1"
          >
            <Edit3 className="w-4 h-4 mr-1" />
            修改信息
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white"
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            确认创建
          </Button>
        </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 主组件 ====================

export default function NLChatInterface({
  onTripCreated,
  className,
  showHeader = true, // 默认显示头部（向后兼容）
  resetOnMount = false, // 🆕 是否在挂载时重置会话（用于弹窗场景）
}: NLChatInterfaceProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { refreshToken } = useAuth();
  const { buildContextWithCompress } = useContextApi();

  // 状态
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationContext, setConversationContext] = useState<ConversationContext | null>(null);  // 对话上下文
  const [latestParams, setLatestParams] = useState<ParsedTripParams | null>(null);
  const [newMessageId, setNewMessageId] = useState<string | null>(null);  // 用于打字机效果
  const [currency, setCurrency] = useState<string>('CNY'); // 🆕 货币状态
  const [currentContextPackage, setCurrentContextPackage] = useState<ContextPackage | null>(null);  // 当前上下文包
  const [sessionId, setSessionId] = useState<string | null>(null);  // 会话ID，用于多轮对话
  // 🆕 问题答案保存状态追踪（用于批量保存检查）
  const [savedQuestionAnswers, setSavedQuestionAnswers] = useState<Map<string, Set<string>>>(new Map());  // messageId -> Set<questionId>
  // 🆕 是否是新对话的第一条消息（当 resetOnMount 为 true 时，第一条消息需要传递 isNewConversation）
  const [isFirstMessageAfterReset, setIsFirstMessageAfterReset] = useState(resetOnMount);
  
  // 🆕 冲突检测弹窗状态
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [detectedConflicts, setDetectedConflicts] = useState<Conflict[]>([]);
  const [conflictRunId, setConflictRunId] = useState<string | null>(null);
  
  // 🆕 自动提交倒计时状态（符合反馈原则）
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState<number | null>(null);
  const [autoSubmitTimerId, setAutoSubmitTimerId] = useState<NodeJS.Timeout | null>(null);
  const [autoSubmitCancelId, setAutoSubmitCancelId] = useState<string | null>(null);
  // 🆕 防重复提交：记录正在自动提交的消息ID，避免重复触发（用 ref 实现同步检查）
  const autoSubmittingMessageIdRef = useRef<string | null>(null);
  // 🆕 防重复提交：记录最近提交的消息内容，避免重复提交（用 ref 实现同步检查）
  const lastSubmittedContentRef = useRef<string | null>(null);
  // 🆕 是否已在最新对话位置（用于控制「定位到最新」按钮显隐）
  const [isAtBottom, setIsAtBottom] = useState(true);
  // 🆕 用户终止：AbortController，用于取消正在进行的 NL 请求
  const abortControllerRef = useRef<AbortController | null>(null);
  // 🆕 多选问题：不自动提交，需用户点击「确认选择」后才提交
  const [pendingMultiChoiceConfirm, setPendingMultiChoiceConfirm] = useState<{
    messageId: string;
    finalAnswers: Record<string, string | string[] | number | boolean | null>;
    finalQuestions: import('@/types/trip').NLClarificationQuestion[];
  } | null>(null);
  
  // 首次使用状态（简化版）
  const [isFirstTime, setIsFirstTime] = useState(() => {
    const saved = localStorage.getItem('nl-chat-first-time');
    return saved !== 'false';
  });
  
  const dismissOnboarding = () => {
    setIsFirstTime(false);
    localStorage.setItem('nl-chat-first-time', 'false');
  };

  // 🆕 冲突检测函数
  const handleDetectConflicts = useCallback(async (params: ParsedTripParams) => {
    // 构建约束DSL
    const constraints: ConstraintDSL = {
      hard_constraints: {},
      soft_constraints: {},
    };

    // 添加预算约束
    if (params.totalBudget) {
      constraints.hard_constraints.budget = {
        max: params.totalBudget,
        currency: 'CNY',
        flexible: false,
      };
    }

    // 添加日期窗口约束
    if (params.startDate && params.endDate) {
      constraints.hard_constraints.date_window = {
        start: params.startDate,
        end: params.endDate,
        flexible: false,
      };
    }

    // 添加节奏偏好
    if (params.preferences?.style) {
      const paceMap: Record<string, 'relaxed' | 'moderate' | 'intense'> = {
        'relaxed': 'relaxed',
        'moderate': 'moderate',
        'intense': 'intense',
        '轻松': 'relaxed',
        '中等': 'moderate',
        '紧凑': 'intense',
      };
      const pacePreference = paceMap[params.preferences.style.toLowerCase()] || 'moderate';
      constraints.soft_constraints.pace = {
        preference: pacePreference,
        weight: 0.8,
      };
    }

    // 添加舒适度偏好（如果有住宿品质信息）
    if (params.preferences?.accommodation) {
      const qualityMap: Record<string, 'low' | 'medium' | 'high'> = {
        'low': 'low',
        'medium': 'medium',
        'high': 'high',
        '经济': 'low',
        '舒适': 'medium',
        '豪华': 'high',
      };
      const hotelQuality = qualityMap[params.preferences.accommodation.toLowerCase()] || 'medium';
      constraints.soft_constraints.comfort_level = {
        hotel_quality: hotelQuality,
        weight: 0.9,
      };
    }

    // 如果没有足够的约束信息，不进行冲突检测
    const hasHardConstraints = Object.keys(constraints.hard_constraints).length > 0;
    const hasSoftConstraints = Object.keys(constraints.soft_constraints).length > 0;
    
    console.log('[NLChatInterface] 冲突检测 - 约束信息:', {
      hasHardConstraints,
      hasSoftConstraints,
      constraints,
      params,
    });
    
    // 必须至少有一个硬约束才能调用冲突检测 API
    if (!hasHardConstraints) {
      console.log('[NLChatInterface] 冲突检测跳过：没有硬约束信息（API 要求 constraints 是必需的）');
      return;
    }

    try {
      console.log('[NLChatInterface] 开始调用冲突检测API...');
      const result = await decisionApi.detectConflicts({
        constraints,
        state: conversationContext,
      });

      console.log('[NLChatInterface] 冲突检测API响应:', {
        has_conflicts: result.has_conflicts,
        conflictsCount: result.conflicts.length,
        conflicts: result.conflicts,
      });

      if (result.has_conflicts && result.conflicts.length > 0) {
        // 生成 runId（如果没有从 API 返回）
        const runId = `run_${Date.now()}`;

        console.log('[NLChatInterface] 检测到冲突，显示弹窗:', {
          conflictsCount: result.conflicts.length,
          runId,
        });

        // 🆕 显示冲突检测弹窗
        setDetectedConflicts(result.conflicts);
        setConflictRunId(runId);
        setConflictDialogOpen(true);

        // 同时在消息流中插入冲突警告卡片
        const conflictMessageId = `conflict-${Date.now()}`;
        const conflictMessage: ChatMessage = {
          id: conflictMessageId,
          role: 'assistant',
          content: '检测到约束冲突，请查看下方的冲突详情和权衡选项。',
          timestamp: new Date(),
          // 🆕 使用自定义字段存储冲突信息
          conflicts: result.conflicts,
          // 🆕 存储 runId 用于反馈
          conflictRunId: runId,
        } as any;

        setMessages(prev => [...prev, conflictMessage]);
        setNewMessageId(conflictMessageId);
        
        // 滚动到底部，确保用户能看到冲突消息
        setTimeout(() => {
          scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }, 100);
      } else {
        console.log('[NLChatInterface] 未检测到冲突');
      }
    } catch (error: any) {
      console.error('[NLChatInterface] 冲突检测失败:', error);
      // 显示错误提示，但不阻止流程
      toast.error('冲突检测失败，请稍后重试', {
        description: error.message || '无法检测约束冲突',
      });
    }
  }, [conversationContext]);



  // 🆕 新建对话处理函数（暴露给外部调用）
  const handleNewConversation = useCallback(() => {
    // 清空当前会话
    setSessionId(null);
    setMessages([]);
    setConversationContext(null);
    setLatestParams(null);
    setSavedQuestionAnswers(new Map());
    localStorage.removeItem('nl_conversation_session');
    
    // 🆕 设置标记，下次发送消息时不传递 sessionId，后端会自动清空旧会话
    setIsFirstMessageAfterReset(true);
    
    // 🆕 优化：清空消息，让新的 CreateTripWelcomeScreen 显示
    setMessages([]);
    setNewMessageId(null);
    
    console.log('[NLChatInterface] ✅ 新建对话，已清空消息，显示新的创建行程欢迎界面');
  }, []);

  // 监听会话切换事件
  useEffect(() => {
    const handleSessionSwitch = (event: CustomEvent<{ sessionId: string }>) => {
      const targetSessionId = event.detail.sessionId;
      // 加载指定会话
      const loadSession = async () => {
        try {
          const conversation = await tripsApi.getNLConversation(targetSessionId);
          if (conversation && conversation.messages.length > 0) {
            setSessionId(conversation.sessionId);
            // 恢复对话历史
            const restoredMessages: ChatMessage[] = conversation.messages.map((msg: any) => {
              let clarificationQuestions: NLClarificationQuestion[] | undefined;
              if (msg.metadata?.clarificationQuestions) {
                if (Array.isArray(msg.metadata.clarificationQuestions)) {
                  if (msg.metadata.clarificationQuestions.length > 0) {
                    if (typeof msg.metadata.clarificationQuestions[0] !== 'string') {
                      clarificationQuestions = normalizeClarificationQuestions(msg.metadata.clarificationQuestions as any[]);
                    }
                  }
                }
              }
              
              return {
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.timestamp),
                parsedParams: msg.metadata?.parsedParams,
                showConfirmCard: msg.metadata?.showConfirmCard,
                responseBlocks: msg.metadata?.responseBlocks,
                clarificationQuestions,
                questionAnswers: msg.metadata?.questionAnswers || {},
                questionAnswerLabels: msg.metadata?.questionAnswerLabels,
                // 🆕 恢复 AI 决策逻辑相关字段
                personaInfo: msg.metadata?.personaInfo,
                recommendedRoutes: msg.metadata?.recommendedRoutes,
                blockedBySafetyPrinciple: msg.metadata?.blockedBySafetyPrinciple,
                decisionResult: msg.metadata?.decisionResult,
                blockedByDecisionMatrix: msg.metadata?.blockedByDecisionMatrix,
                gateBlocked: msg.metadata?.gateBlocked,
                blockedByCriticalFields: msg.metadata?.blockedByCriticalFields,
                gateWarningMessage: msg.metadata?.gateWarningMessage,
                alternatives: msg.metadata?.alternatives,
                // 🆕 恢复思考过程与进展步骤
                thinkingProcess: (msg.metadata as { thinkingProcess?: ThinkingProcess })?.thinkingProcess,
                progressSteps: (msg.metadata as { progressSteps?: ProgressStep[] })?.progressSteps,
                phaseIndicator: (msg.metadata as { phaseIndicator?: ChatMessage['phaseIndicator'] })
                  ?.phaseIndicator,
              };
            });
            setMessages(restoredMessages);
            
            // 🆕 恢复问题答案保存状态（会话切换时）
            const restoredSavedAnswers = new Map<string, Set<string>>();
            restoredMessages.forEach(msg => {
              if (msg.questionAnswers && Object.keys(msg.questionAnswers).length > 0) {
                // 假设从后端恢复的消息，所有答案都已保存
                restoredSavedAnswers.set(msg.id, new Set(Object.keys(msg.questionAnswers)));
              }
            });
            setSavedQuestionAnswers(restoredSavedAnswers);
            
            if (conversation.conversationContext) {
              setConversationContext(conversation.conversationContext);
            }
            if (conversation.partialParams) {
              setLatestParams(conversation.partialParams);
            }
            
            // 🐛 消除 linter 警告：使用 conversationContext（虽然主要用于存储，但在恢复时记录）
            console.log('[NLChatInterface] 切换会话:', {
              sessionId: conversation.sessionId,
              hasContext: !!conversation.conversationContext,
            });
          }
        } catch (err: any) {
          console.error('Failed to load session:', err);
          // 🆕 会话过期或不存在时的处理
          if (err.code === 'NOT_FOUND' || err.response?.status === 404) {
            // 会话不存在或已过期，清除本地存储
            localStorage.removeItem('nl_conversation_session');
            setSessionId(null);
            
            // 显示提示消息
            const expiredMessageId = `system-expired-${Date.now()}`;
            const expiredMessage: ChatMessage = {
              id: expiredMessageId,
              role: 'assistant',
              content: '之前的对话已过期，让我们重新开始规划吧',
              timestamp: new Date(),
            };
            setMessages([expiredMessage]);
          }
        }
      };
      loadSession();
    };

    // 🆕 监听新建对话事件，调用 handleNewConversation
    const handleNewSessionEvent = () => {
      handleNewConversation();
    };

    window.addEventListener('nl-conversation-switch', handleSessionSwitch as EventListener);
    window.addEventListener('nl-conversation-new', handleNewSessionEvent);

    return () => {
      window.removeEventListener('nl-conversation-switch', handleSessionSwitch as EventListener);
      window.removeEventListener('nl-conversation-new', handleNewSessionEvent);
    };
  }, [handleNewConversation]);

  // 自动滚动到底部（Radix ScrollArea 的滚动发生在 Viewport 上）
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const viewport = root.querySelector<HTMLDivElement>('[data-radix-scroll-area-viewport]');
    const scrollEl = viewport ?? root;
    scrollEl.scrollTop = scrollEl.scrollHeight;
    setIsAtBottom(true); // 自动滚动后视为在最新位置
  }, [messages, isLoading]);

  // 监听滚动位置：用户向上滚动时显示「定位到最新」按钮
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const viewport = root.querySelector<HTMLDivElement>('[data-radix-scroll-area-viewport]');
    const scrollEl = viewport ?? root;
    const THRESHOLD = 80; // 距离底部 80px 内视为「在最新」

    const checkAtBottom = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      const atBottom = scrollHeight - scrollTop - clientHeight <= THRESHOLD;
      setIsAtBottom(atBottom);
    };

    scrollEl.addEventListener('scroll', checkAtBottom, { passive: true });
    checkAtBottom(); // 初次检查
    return () => scrollEl.removeEventListener('scroll', checkAtBottom);
  }, [messages.length]); // 消息变化时重新绑定（viewport 可能重建）

  // 定位到最新对话内容（Radix ScrollArea 的滚动发生在 Viewport 上）
  const scrollToBottom = useCallback(() => {
    const root = scrollRef.current;
    if (!root) return;
    const viewport = root.querySelector<HTMLDivElement>('[data-radix-scroll-area-viewport]');
    const scrollEl = viewport ?? root;
    scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' });
  }, []);

  // 恢复会话（页面加载时）
  useEffect(() => {
    const loadSession = async () => {
      // 🆕 如果设置了 resetOnMount，不恢复会话，直接显示欢迎消息
      if (resetOnMount) {
        // 确保清空所有状态
        setSessionId(null);
        setMessages([]);
        setConversationContext(null);
        setLatestParams(null);
        setSavedQuestionAnswers(new Map());
        
        // 🆕 优化：清空消息，让新的 CreateTripWelcomeScreen 显示
        setMessages([]);
        setNewMessageId(null);
        console.log('[NLChatInterface] 会话切换：清空消息，显示新的创建行程欢迎界面');
        return;
      }
      
      // 尝试从 localStorage 恢复会话ID
      const savedSessionId = localStorage.getItem('nl_conversation_session');
      if (savedSessionId) {
        try {
          const conversation = await tripsApi.getNLConversation(savedSessionId);
          if (conversation && conversation.messages.length > 0) {
            // 🆕 检查恢复的消息是否是欢迎消息或空会话
            const isWelcomeOnly = conversation.messages.length === 1 && 
              conversation.messages[0].role === 'assistant' &&
              (conversation.messages[0].content.includes('你好') || 
               conversation.messages[0].content.includes('旅行规划助手'));
            
            // 🆕 如果是欢迎消息，清空会话，显示新的欢迎界面
            if (isWelcomeOnly) {
              console.log('[NLChatInterface] 检测到欢迎消息，清空会话，显示新的创建行程欢迎界面');
              localStorage.removeItem('nl_conversation_session');
              setSessionId(null);
              setMessages([]);
              return;
            }
            
            // 恢复会话
            setSessionId(conversation.sessionId);
            localStorage.setItem('nl_conversation_session', conversation.sessionId);
            window.dispatchEvent(new CustomEvent('nl-conversation-session-updated', {
              detail: { sessionId: conversation.sessionId },
            }));

            // 恢复对话历史
            const restoredMessages: ChatMessage[] = conversation.messages.map((msg: {
              id: string;
              role: 'user' | 'assistant';
              content: string;
              timestamp: string;
              metadata?: {
                parsedParams?: ParsedTripParams;
                showConfirmCard?: boolean;
                responseBlocks?: PlannerResponseBlock[];
                clarificationQuestions?: NLClarificationQuestion[] | any[]; // 可能是后端原始格式
                questionAnswers?: Record<string, string | string[] | number | boolean | null>;
                // 🆕 AI 决策逻辑相关字段
                personaInfo?: import('@/types/trip').PersonaInfo;
                recommendedRoutes?: import('@/types/trip').RecommendedRoute[];
                blockedBySafetyPrinciple?: boolean;
                decisionResult?: import('@/types/trip').DecisionResult;
                blockedByDecisionMatrix?: boolean;
                gateBlocked?: boolean;
                blockedByCriticalFields?: boolean;
                gateWarningMessage?: string | null;
                alternatives?: Array<{
                  id: string;
                  label: string;
                  description: string;
                  action?: string;
                  actionParams?: Record<string, any>;
                  buttonText?: string;
                }>;
                thinkingProcess?: ThinkingProcess;
                progressSteps?: ProgressStep[];
              };
            }) => {
              // 🐛 恢复时也需要转换 clarificationQuestions 格式，确保与新消息格式一致
              let clarificationQuestions: NLClarificationQuestion[] | undefined;
              if (msg.metadata?.clarificationQuestions) {
                if (Array.isArray(msg.metadata.clarificationQuestions)) {
                  if (msg.metadata.clarificationQuestions.length > 0) {
                    // 检查是否是字符串数组（向后兼容）
                    if (typeof msg.metadata.clarificationQuestions[0] === 'string') {
                      clarificationQuestions = undefined; // 字符串数组不转换为问题卡片
                    } else {
                      // 结构化数组，需要转换格式
                      clarificationQuestions = normalizeClarificationQuestions(msg.metadata.clarificationQuestions as any[]);
                    }
                  }
                }
              }
              
              return {
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.timestamp),
                // 从 metadata 中恢复其他字段
                parsedParams: msg.metadata?.parsedParams,
                showConfirmCard: msg.metadata?.showConfirmCard,
                responseBlocks: msg.metadata?.responseBlocks,
                clarificationQuestions, // 🐛 使用转换后的格式
                questionAnswers: msg.metadata?.questionAnswers || {},
                // 🆕 恢复 AI 决策逻辑相关字段
                personaInfo: msg.metadata?.personaInfo,
                recommendedRoutes: msg.metadata?.recommendedRoutes,
                blockedBySafetyPrinciple: msg.metadata?.blockedBySafetyPrinciple,
                decisionResult: msg.metadata?.decisionResult,
                blockedByDecisionMatrix: msg.metadata?.blockedByDecisionMatrix,
                gateBlocked: msg.metadata?.gateBlocked,
                blockedByCriticalFields: msg.metadata?.blockedByCriticalFields,
                gateWarningMessage: msg.metadata?.gateWarningMessage,
                alternatives: msg.metadata?.alternatives,
                // 🆕 恢复思考过程与进展步骤
                thinkingProcess: (msg.metadata as { thinkingProcess?: ThinkingProcess })?.thinkingProcess,
                progressSteps: (msg.metadata as { progressSteps?: ProgressStep[] })?.progressSteps,
                phaseIndicator: (msg.metadata as { phaseIndicator?: ChatMessage['phaseIndicator'] })
                  ?.phaseIndicator,
              };
            });
            setMessages(restoredMessages);
            
            // 🆕 恢复问题答案保存状态
            const restoredSavedAnswers = new Map<string, Set<string>>();
            restoredMessages.forEach(msg => {
              if (msg.questionAnswers && Object.keys(msg.questionAnswers).length > 0) {
                // 假设从后端恢复的消息，所有答案都已保存
                restoredSavedAnswers.set(msg.id, new Set(Object.keys(msg.questionAnswers)));
              }
            });
            setSavedQuestionAnswers(restoredSavedAnswers);
            
            // 🆕 P0: 优化会话恢复提示 - 添加对话摘要和恢复按钮
            setTimeout(() => {
              const restoreMsgId = `system-restore-switch-${Date.now()}`;
              
              // 提取对话摘要（目的地、日期等关键信息）
              const latestParams = conversation.partialParams;
              const summaryParts: string[] = [];
              // 🐛 优先使用 destinationName，如果没有则使用 destination
              const destinationDisplay = latestParams?.destinationName || latestParams?.destination;
              if (destinationDisplay) {
                summaryParts.push(`目的地：${destinationDisplay}`);
              }
              if (latestParams?.startDate && latestParams?.endDate) {
                const start = new Date(latestParams.startDate).toLocaleDateString('zh-CN');
                const end = new Date(latestParams.endDate).toLocaleDateString('zh-CN');
                summaryParts.push(`日期：${start} - ${end}`);
              }
              if (latestParams?.totalBudget) {
                summaryParts.push(`预算：${latestParams.totalBudget.toLocaleString()}元`);
              }
              
              const summaryText = summaryParts.length > 0 
                ? `（${summaryParts.join('，')}）`
                : '';
              
              const restoreMsg: ChatMessage = {
                id: restoreMsgId,
                role: 'assistant',
                content: `✅ 已恢复对话（${restoredMessages.length} 条消息）${summaryText}，您可以继续规划`,
                timestamp: new Date(),
              };
              setMessages(prev => [...prev, restoreMsg]);
            }, 100);
            
            // 恢复上下文和参数
            if (conversation.conversationContext) {
              setConversationContext(conversation.conversationContext);
            }
            if (conversation.partialParams) {
              setLatestParams(conversation.partialParams);
            }
            
            // 🐛 消除 linter 警告：使用 conversationContext（虽然主要用于存储，但在恢复时记录）
            // 注意：conversationContext 主要用于存储后端返回的上下文，前端通过 sessionId 管理上下文
            console.log('[NLChatInterface] 会话已恢复:', {
              sessionId: conversation.sessionId,
              hasContext: !!conversation.conversationContext,
            });
            return;
          }
        } catch (err: any) {
          console.warn('[NLChatInterface] 恢复会话失败，创建新会话:', err);
          // 清除无效的会话ID
          localStorage.removeItem('nl_conversation_session');
          setSessionId(null);
          
          // 🆕 会话过期或不存在时，清空消息显示新的欢迎界面
          if (err.code === 'NOT_FOUND' || err.response?.status === 404) {
            setMessages([]);
            console.log('[NLChatInterface] 会话已过期，显示新的创建行程欢迎界面');
          }
        }
      }
      
      // 🆕 优化：没有会话或恢复失败时，不添加欢迎消息
      // 让新的 CreateTripWelcomeScreen 组件显示（当 messages.length === 0 时）
      // 只有在用户开始对话后，才显示聊天界面
      if (messages.length === 0) {
        // 不添加欢迎消息，让新的欢迎界面显示
        console.log('[NLChatInterface] 无会话，显示新的创建行程欢迎界面');
      }
    };

    loadSession();
  }, [resetOnMount]); // 依赖 resetOnMount，当它变化时重新执行

  // 🆕 根据目的地获取货币策略
  useEffect(() => {
    const loadCurrency = async () => {
      if (!latestParams?.destination) {
        setCurrency('CNY');
        return;
      }
      
      try {
        // 提取国家代码（destination 格式可能是 "IS" 或 "IS, Reykjavik"）
        const destinationParts = latestParams.destination.split(',');
        const countryCode = destinationParts[0]?.trim().toUpperCase();
        
        if (countryCode) {
          const { countriesApi } = await import('@/api/countries');
          const currencyStrategy = await countriesApi.getCurrencyStrategy(countryCode);
          if (currencyStrategy?.currencyCode) {
            setCurrency(currencyStrategy.currencyCode);
            return;
          }
        }
      } catch (err) {
        console.warn('[NLChatInterface] 获取货币策略失败，使用默认值 CNY:', err);
      }
      
      setCurrency('CNY');
    };
    
    loadCurrency();
  }, [latestParams?.destination]);

  // 构建上下文包（用于增强自然语言理解）
  const buildContextForNL = useCallback(async (userText: string, destinationCountry?: string): Promise<string | undefined> => {
    try {
      // 尝试从用户文本中提取目的地信息
      // 如果 latestParams 中有目的地，使用它
      const country = destinationCountry || latestParams?.destination?.split(',')[0]?.trim().toUpperCase();
      
      if (!country) {
        // 没有目的地信息，不构建上下文
        return undefined;
      }

      // 构建上下文包
      const contextPkg = await buildContextWithCompress(
        {
          // 注意：创建新行程时没有 tripId，所以不传
          phase: 'planning',
          agent: 'PLANNER',
          userQuery: userText,
          tokenBudget: 3600,
          requiredTopics: ['VISA', 'ROAD_RULES', 'SAFETY', 'WEATHER'], // 自然语言创建行程需要的主题
          useCache: true,
        },
        {
          strategy: 'balanced',
          preserveKeys: [],
        }
      );

      if (contextPkg) {
        setCurrentContextPackage(contextPkg);
        console.log('[NLChatInterface] Context Package 构建成功:', {
          id: contextPkg.id,
          totalTokens: contextPkg.totalTokens,
          blocksCount: contextPkg.blocks.length,
        });
        return contextPkg.id;
      }

      return undefined;
    } catch (err) {
      console.warn('[NLChatInterface] 构建上下文包失败，继续使用纯文本:', err);
      return undefined;
    }
  }, [buildContextWithCompress, latestParams]);

  // 收集当前消息的所有问题答案
  // 🆕 返回使用 fieldName 作为 key 的答案对象
  const collectQuestionAnswers = useCallback((): Record<string, string | string[] | number | boolean | null> => {
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== 'assistant') {
      return {};
    }
    
    const questionAnswers = latestMessage.questionAnswers || {};
    const clarificationQuestions = latestMessage.clarificationQuestions || [];
    
    // 🆕 如果答案已经使用 fieldName，直接返回
    // 否则，尝试将 questionId 转换为 fieldName
    const normalizedAnswers: Record<string, string | string[] | number | boolean | null> = {};
    
    clarificationQuestions.forEach(q => {
      const fieldKey = q.metadata?.fieldName || q.id;
      // 🆕 优先使用 fieldName，如果没有则使用 questionId（向后兼容）
      const answer = questionAnswers[fieldKey] ?? questionAnswers[q.id];
      if (answer !== null && answer !== undefined) {
        normalizedAnswers[fieldKey] = answer;
      }
    });
    
    // 🆕 如果没有任何匹配，返回原始答案（向后兼容）
    return Object.keys(normalizedAnswers).length > 0 ? normalizedAnswers : questionAnswers;
  }, [messages]);

  // 🆕 批量保存检查：确保所有答案已保存；若 PUT 返回 nextClarificationQuestions 则一并处理并返回响应，供 sendMessage 决定是否中止发送
  const ensureAllAnswersSaved = useCallback(async (
    messageId: string,
    answers: Record<string, string | string[] | number | boolean | null>
  ): Promise<{ nextClarificationQuestions?: any[]; plannerResponseBlocks?: any[] } | null> => {
    if (!sessionId || !messageId) return null;

    const savedAnswers = savedQuestionAnswers.get(messageId) || new Set();
    const unsavedQuestionIds = Object.keys(answers).filter((qId) => !savedAnswers.has(qId));

    if (unsavedQuestionIds.length === 0) return null;

    const unsavedAnswers: Record<string, string | string[] | number | boolean | null> = {};
    unsavedQuestionIds.forEach((qId) => {
      unsavedAnswers[qId] = answers[qId];
    });

    try {
      const response = await tripsApi.updateMessageQuestionAnswers(sessionId, messageId, unsavedAnswers);
      setSavedQuestionAnswers((prev) => {
        const newMap = new Map(prev);
        if (!newMap.has(messageId)) newMap.set(messageId, new Set());
        unsavedQuestionIds.forEach((qId) => newMap.get(messageId)!.add(qId));
        return newMap;
      });
      console.log('[NLChatInterface] 批量保存答案成功:', unsavedQuestionIds);
      return response || null;
    } catch (err) {
      console.warn('[NLChatInterface] 批量保存答案失败:', err);
      return null;
    }
  }, [sessionId]);

  // 发送消息
  const sendMessage = useCallback(async (
    text: string, 
    providedAnswers?: Record<string, string | string[] | number | boolean | null>
  ) => {
    if (!text.trim() || isLoading) return;

    // 🆕 发送新消息时清除多选题待确认状态
    setPendingMultiChoiceConfirm(null);

    // 🆕 防重复提交：用 ref 同步检查，避免 state 异步导致的重复
    const messageId = `user-${Date.now()}`;
    const messageContent = text.trim();
    
    if (lastSubmittedContentRef.current === messageContent) {
      console.warn('[NLChatInterface] 检测到重复提交，已忽略:', messageContent.substring(0, 30));
      return;
    }
    lastSubmittedContentRef.current = messageContent;
    setTimeout(() => {
      if (lastSubmittedContentRef.current === messageContent) {
        lastSubmittedContentRef.current = null;
      }
    }, 2000);

    // 🆕 批量保存检查：发送消息前确保所有答案已保存；若 PUT 返回 nextClarificationQuestions 则更新消息并中止发送
    const latestMessage = messages[messages.length - 1];
    if (latestMessage && latestMessage.role === 'assistant' && latestMessage.id && latestMessage.questionAnswers) {
      const putResponse = await ensureAllAnswersSaved(latestMessage.id, latestMessage.questionAnswers);
      if (putResponse?.nextClarificationQuestions?.length) {
        const normalized = normalizeClarificationQuestions(putResponse.nextClarificationQuestions);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === latestMessage.id
              ? {
                  ...m,
                  clarificationQuestions: [...(m.clarificationQuestions || []), ...normalized],
                  responseBlocks: [
                    ...(m.responseBlocks || []),
                    ...(putResponse.plannerResponseBlocks || []),
                  ],
                }
              : m
          )
        );
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: messageId,
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    // 🆕 创建 AbortController，支持用户随时终止
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 在 try 外声明，便于 catch 中（用户终止时）用于 retryPayload
    let questionAnswers: Record<string, string | string[] | number | boolean | null> =
      providedAnswers || collectQuestionAnswers();

    try {
      // 🆕 尝试构建上下文包（如果可能）
      // 从用户文本或 latestParams 中提取目的地信息
      const destinationCountry = latestParams?.destination?.split(',')[0]?.trim().toUpperCase();
      const contextPackageId = await buildContextForNL(text.trim(), destinationCountry);

      // 🆕 如果 questionAnswers 为空，尝试从用户输入的文本中提取答案
      // 这可以处理用户直接在输入框输入答案的情况
      if (Object.keys(questionAnswers).length === 0) {
        const latestMessage = messages[messages.length - 1];
        if (latestMessage && latestMessage.role === 'assistant' && latestMessage.clarificationQuestions) {
          // 尝试从用户输入的文本中匹配答案
          const extractedAnswers: Record<string, string | string[] | number | boolean | null> = {};
          
          latestMessage.clarificationQuestions.forEach(question => {
            // 🆕 使用 fieldName 或 questionId（向后兼容）
            const fieldKey = question.metadata?.fieldName || question.id;
            
            // 尝试匹配问题文本和答案
            // 格式可能是："问题文本:答案" 或 "问题文本：答案"
            const questionText = question.text;
            const patterns = [
              new RegExp(`${questionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[：:]([^，,、]+)`, 'i'),
              new RegExp(`${questionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[：:]([^，,、\\n]+)`, 'i'),
            ];
            
            for (const pattern of patterns) {
              const match = text.trim().match(pattern);
              if (match && match[1]) {
                const answerText = match[1].trim();
                
                // 根据问题类型处理答案
                if (question.inputType === 'multiple_choice' && question.options) {
                  // 多选：尝试匹配选项
                  const toOptText = (opt: string | { value: string; label: string }) =>
                    typeof opt === 'string' ? opt : (opt.label || opt.value);
                  const matchedOptions = question.options
                    .map(toOptText)
                    .filter(optText => answerText.includes(optText) || optText.includes(answerText));
                  if (matchedOptions.length > 0) {
                    extractedAnswers[fieldKey] = matchedOptions;
                    break;
                  }
                } else if (question.inputType === 'single_choice' && question.options) {
                  // 单选：尝试匹配选项
                  const toOptText = (opt: string | { value: string; label: string }) =>
                    typeof opt === 'string' ? opt : (opt.label || opt.value);
                  const matchedOption = question.options
                    .map(toOptText)
                    .find(optText => answerText === optText || answerText.includes(optText) || optText.includes(answerText));
                  if (matchedOption) {
                    extractedAnswers[fieldKey] = matchedOption;
                    break;
                  }
                } else {
                  // 文本输入：直接使用匹配的文本
                  extractedAnswers[fieldKey] = answerText;
                  break;
                }
              }
            }
          });
          
          if (Object.keys(extractedAnswers).length > 0) {
            questionAnswers = extractedAnswers;
            console.log('[NLChatInterface] 从文本中提取到答案:', questionAnswers);
            
            // 🆕 P1: 不再添加「已识别」反馈，避免与后端 plannerReply 中的确认文案重复
            // 答案已通过 clarificationAnswers 正确传递，后端会返回确认
          }
        }
      }
      
      // 🐛 调试：打印收集到的答案
      console.log('[NLChatInterface] 收集到的问题答案:', questionAnswers);
      console.log('[NLChatInterface] 答案数量:', Object.keys(questionAnswers).length);
      
      // 构建请求参数
      const requestData: import('@/types/trip').CreateTripFromNLRequest = {
        text: text.trim(),
        // 🆕 创建新对话：不传递 sessionId，后端会自动清空旧会话
        // 🆕 继续对话：传递 sessionId，继续对话
        ...(isFirstMessageAfterReset ? {} : (sessionId && { sessionId })), // 如果是新对话的第一条消息，不传递 sessionId
        ...(contextPackageId && { contextPackageId }),
        ...(!contextPackageId && destinationCountry && {
          context: {
            destinationCountry,
            requiredTopics: ['VISA', 'ROAD_RULES', 'SAFETY', 'WEATHER'],
            includeUserProfile: true,
          },
        }),
        // 🆕 提交问题答案（如果有）
        // 🆕 使用 fieldName 构建 clarificationAnswers（如果问题存在）
        ...(Object.keys(questionAnswers).length > 0 && {
          clarificationAnswers: (() => {
            const latestMessage = messages[messages.length - 1];
            if (latestMessage?.clarificationQuestions) {
              // 🆕 构建字段名映射：fieldKey -> questionId
              const fieldToQuestionId = new Map<string, string>();
              latestMessage.clarificationQuestions.forEach(q => {
                const fieldKey = q.metadata?.fieldName || q.id;
                fieldToQuestionId.set(fieldKey, q.id);
              });
              
              // 🆕 转换答案：questionAnswers 使用 fieldName 作为 key
              // 但 clarificationAnswers 需要传递 questionId 给后端
              return Object.entries(questionAnswers).map(([fieldKey, value]) => {
                // 如果 fieldKey 是 fieldName，查找对应的 questionId
                const questionId = fieldToQuestionId.get(fieldKey) || fieldKey;
                return {
                  questionId,
                  value,
                };
              });
            } else {
              // 降级：如果没有问题列表，直接使用 fieldKey 作为 questionId
              return Object.entries(questionAnswers).map(([fieldKey, value]) => ({
                questionId: fieldKey,
                value,
              }));
            }
          })(),
        }),
      };

      // Trips NL v2：解析阶段引入可行性预检（Ontology + Solver pre-check）
      const response = await tripsApi.createFromNLv2(requestData, { signal: controller.signal });
      
      // 🐛 调试：打印后端返回的完整响应
      console.log('[NLChatInterface] 后端返回的完整响应:', {
        needsClarification: response.needsClarification,
        gateBlocked: response.gateBlocked,
        alternatives: response.alternatives,
        plannerResponseBlocks: response.plannerResponseBlocks,
        clarificationQuestions: response.clarificationQuestions,
        clarificationQuestionsType: Array.isArray(response.clarificationQuestions) 
          ? (response.clarificationQuestions.length > 0 ? typeof response.clarificationQuestions[0] : 'empty array')
          : typeof response.clarificationQuestions,
        questionCardBlocks: response.plannerResponseBlocks?.filter(block => block.type === 'question_card'),
      });
      
      // 🆕 保存会话ID（如果返回了新的会话ID）
      if (response.sessionId) {
        // 如果是新对话的第一条消息，保存新的 sessionId
        if (isFirstMessageAfterReset) {
          setSessionId(response.sessionId);
          localStorage.setItem('nl_conversation_session', response.sessionId);
          console.log('[NLChatInterface] ✅ 新对话会话ID已保存:', response.sessionId);
        } else if (response.sessionId !== sessionId) {
          // 继续对话时，如果 sessionId 变化了，也更新
          setSessionId(response.sessionId);
          localStorage.setItem('nl_conversation_session', response.sessionId);
          console.log('[NLChatInterface] ✅ 会话ID已更新:', response.sessionId);
        }
        
        // 通知 Context 更新当前会话ID
        window.dispatchEvent(new CustomEvent('nl-conversation-session-updated', { 
          detail: { sessionId: response.sessionId } 
        }));
      }
      
      // 🆕 第一条消息发送后，重置标记（后续消息传递 sessionId 继续对话）
      if (isFirstMessageAfterReset) {
        setIsFirstMessageAfterReset(false);
        console.log('[NLChatInterface] ✅ 新对话第一条消息已发送，后续消息将传递 sessionId 继续对话');
      }
      
      // 🐛 产品决策：无论 needsClarification 状态，只要返回了 responseBlocks，就显示结构化内容
      // 理由：
      // 1. 用户体验一致性：用户期望看到结构化的回复内容
      // 2. 信息完整性：responseBlocks 包含了结构化的信息，应该优先显示
      // 3. 降级策略：如果没有 responseBlocks，才使用 plannerReply 作为降级方案
      
      // 处理响应
      if (response.needsClarification) {
        // 🐛 从 responseBlocks 中提取 question_card 类型的问题
        const questionCardBlocks = response.plannerResponseBlocks?.filter(block => block.type === 'question_card') || [];
        console.log('[NLChatInterface] 从 responseBlocks 中找到的问题卡片:', questionCardBlocks);
        
        // 🆕 结构化澄清问题
        let clarificationQuestions: NLClarificationQuestion[] | undefined;
        
        // 🐛 调试：打印后端返回的 clarificationQuestions 原始数据
        console.log('[NLChatInterface] 🔍 后端返回的 clarificationQuestions 原始数据:', {
          type: typeof response.clarificationQuestions,
          isArray: Array.isArray(response.clarificationQuestions),
          length: Array.isArray(response.clarificationQuestions) ? response.clarificationQuestions.length : 0,
          firstItem: Array.isArray(response.clarificationQuestions) && response.clarificationQuestions.length > 0 
            ? response.clarificationQuestions[0] 
            : null,
          raw: response.clarificationQuestions,
        });
        
        // 优先使用直接返回的 clarificationQuestions
        if (Array.isArray(response.clarificationQuestions) && response.clarificationQuestions.length > 0) {
          if (typeof response.clarificationQuestions[0] === 'string') {
            // 字符串数组，使用向后兼容方式（不设置 clarificationQuestions）
            console.log('[NLChatInterface] ⚠️ 检测到字符串数组格式的澄清问题（向后兼容，不会显示为问题卡片）');
            clarificationQuestions = undefined;
          } else {
            // 🐛 转换后端返回的数据格式（适配字段名差异）
            try {
              clarificationQuestions = normalizeClarificationQuestions(response.clarificationQuestions as any[]);
              console.log('[NLChatInterface] ✅ 使用直接返回的结构化澄清问题（已转换）:', {
                count: clarificationQuestions.length,
                questions: clarificationQuestions.map(q => ({ id: q.id, text: q.text, inputType: q.inputType })),
              });
            } catch (err) {
              console.error('[NLChatInterface] ❌ 转换 clarificationQuestions 失败:', err);
              clarificationQuestions = undefined;
            }
          }
        } else if (questionCardBlocks.length > 0) {
          // 🐛 如果 responseBlocks 中有 question_card，但 clarificationQuestions 未返回或为空
          console.warn('[NLChatInterface] ⚠️ 检测到 question_card 块，但 clarificationQuestions 未返回或为空');
          console.warn('[NLChatInterface] question_card 块需要 clarificationQuestions 数组才能显示问题');
          console.warn('[NLChatInterface] 请检查后端是否正确返回了 clarificationQuestions 字段');
        } else {
          console.warn('[NLChatInterface] ⚠️ clarificationQuestions 为空或未返回');
        }
        
        // 🐛 最终检查：如果 clarificationQuestions 为空，不应该尝试从 plannerReply 中提取问题
        // 原因：后端返回空数组通常意味着问题被过滤或依赖规则阻止，应该让用户通过自然语言回答
        if (!clarificationQuestions || clarificationQuestions.length === 0) {
          if (questionCardBlocks.length > 0) {
            console.error('[NLChatInterface] ❌ 无法显示澄清问题：responseBlocks 中有 question_card，但 clarificationQuestions 为空');
            console.error('[NLChatInterface] 后端需要同时返回 clarificationQuestions 数组和 question_card 块');
          } else {
            // 🆕 产品决策：当 clarificationQuestions 为空时，不尝试提取问题
            // 原因：
            // 1. 后端返回空数组通常意味着问题被过滤或依赖规则阻止
            // 2. 从文本中提取的问题结构不完整，无法正确收集答案
            // 3. 用户应该通过自然语言回答 plannerReply 中的问题
            console.warn('[NLChatInterface] ⚠️ clarificationQuestions 为空，但 needsClarification=true');
            console.warn('[NLChatInterface] ⚠️ 后端问题：needsClarification=true 但 clarificationQuestions=[]');
            console.warn('[NLChatInterface] ⚠️ 可能原因：问题过滤逻辑过于严格，或依赖规则导致所有问题被过滤');
            console.warn('[NLChatInterface] ⚠️ 建议：检查后端 DestinationClarificationConfigService 的问题配置和依赖规则');
            console.warn('[NLChatInterface] ⚠️ 前端处理：仅显示 plannerReply 文本，用户通过自然语言回答');
            
            // 保持 clarificationQuestions 为空数组，不尝试提取
            // 这样 UI 不会显示问题卡片结构，只会显示 plannerReply 文本
            clarificationQuestions = [];
          }
        } else {
          console.log('[NLChatInterface] ✅ 澄清问题已准备就绪，数量:', clarificationQuestions.length);
        }
        
        // 🐛 产品决策：清空所有旧答案，每次新问题都是全新的开始
        // 理由：
        // 1. 后端通过 sessionId 和 conversationContext 管理对话上下文，已经记住了之前的答案
        // 2. 如果后端返回了新的问题，说明之前的答案已经被处理，不需要前端保留
        // 3. 用户体验：每次新问题都是全新的开始，避免困惑
        // 4. 数据一致性：完全信任后端返回的数据，不猜测意图
        
        // 🆕 检测 Gate 警告和 Critical 字段阻止
        const gateBlocked = response.gateBlocked === true;
        const blockedByCriticalFields = response.blockedByCriticalFields === true;
        
        // 🐛 提取 Gate 警告消息：优先从 responseBlocks 中提取，如果没有则使用默认消息
        let gateWarningMessage: string | null = null;
        if (gateBlocked) {
          gateWarningMessage = extractGateWarningMessage(response.plannerResponseBlocks || []);
          // 如果提取不到，使用默认消息
          if (!gateWarningMessage) {
            gateWarningMessage = '为了您的安全，请选择替代方案';
          }
        }
        
        const alternatives = response.alternatives || [];
        const plannerVoice = response.plannerReply?.trim() ?? '';
        
        // 🐛 调试：Gate 预检查相关数据
        if (gateBlocked) {
          console.log('[NLChatInterface] ⚠️ Gate 预检查阻止:', {
            gateBlocked,
            gateWarningMessage,
            alternativesCount: alternatives.length,
            alternatives,
            plannerResponseBlocks: response.plannerResponseBlocks,
            extractedMessage: extractGateWarningMessage(response.plannerResponseBlocks || []),
            plannerReply: plannerVoice.substring(0, 200), // 只显示前200字符
          });
        }
        
        // 需要澄清 - 显示规划师回复
        // 🆕 使用后端返回的真实消息ID，如果没有则从会话中获取
        let messageId: string;
        if (response.lastMessageId) {
          // ✅ 使用后端返回的真实ID
          messageId = response.lastMessageId;
          console.log('[NLChatInterface] ✅ 使用后端返回的 lastMessageId:', messageId);
        } else if (response.sessionId) {
          // 🆕 降级方案：从会话中获取最后一条AI消息的ID
          try {
            console.log('[NLChatInterface] 🔍 尝试从会话获取消息ID，sessionId:', response.sessionId);
            const conversation = await tripsApi.getNLConversation(response.sessionId);
            console.log('[NLChatInterface] 🔍 会话消息数量:', conversation.messages.length);
            
            // 查找最后一条AI消息（优先查找有 clarificationQuestions 或 responseBlocks 的）
            const lastAIMessage = [...conversation.messages].reverse().find(m => 
              m.role === 'assistant' && 
              (m.metadata?.clarificationQuestions?.length > 0 || m.metadata?.responseBlocks?.length > 0)
            );
            
            if (lastAIMessage) {
              messageId = lastAIMessage.id;
              console.log('[NLChatInterface] ✅ 从会话中找到AI消息ID:', messageId);
            } else {
              // 如果找不到有问题的消息，查找最后一条AI消息
              const anyLastAIMessage = [...conversation.messages].reverse().find(m => m.role === 'assistant');
              if (anyLastAIMessage) {
                messageId = anyLastAIMessage.id;
                console.log('[NLChatInterface] ⚠️ 使用最后一条AI消息ID（可能没有问题）:', messageId);
              } else {
                // 如果找不到，使用临时ID（向后兼容）
                messageId = `ai-${Date.now()}`;
                console.warn('[NLChatInterface] ⚠️ 未找到最后一条AI消息，使用临时ID:', messageId);
              }
            }
          } catch (err) {
            // 如果获取会话失败，使用临时ID（向后兼容）
            messageId = `ai-${Date.now()}`;
            console.warn('[NLChatInterface] ⚠️ 获取会话失败，使用临时ID:', messageId, err);
          }
        } else {
          // 降级方案：使用临时ID（向后兼容）
          messageId = `ai-${Date.now()}`;
          console.warn('[NLChatInterface] ⚠️ 没有 sessionId 和 lastMessageId，使用临时ID:', messageId);
        }
        
        // v2：若物理不可行，优先展示 feasibility 冲突原因
        const feasibilityConflictMessage =
          response.feasibility?.isPossible === false
            ? response.feasibility?.conflictReason?.message
            : null;
        const clarificationContent =
          feasibilityConflictMessage && feasibilityConflictMessage.trim().length > 0
            ? `${feasibilityConflictMessage}${plannerVoice ? `\n\n${plannerVoice}` : ''}`
            : (plannerVoice || '让我更了解一下您的需求...');

        const aiMessage: ChatMessage = {
          id: messageId,
          role: 'assistant',
          content: clarificationContent,
          timestamp: new Date(),
          // 🆕 结构化内容块（优先）
          responseBlocks: response.plannerResponseBlocks,
          // 🆕 结构化澄清问题
          clarificationQuestions,
          parsedParams: {
            ...response.partialParams,
            ...(response.destinationName && { destinationName: response.destinationName }),
          },
          questionAnswers: {},  // 🐛 清空所有旧答案，每次新问题都是全新的开始
          questionAnswerLabels: (response as any).questionAnswerLabels ?? (response as any).metadata?.questionAnswerLabels,
          // 🆕 Gate 警告和 Critical 字段阻止标记
          gateBlocked,
          blockedByCriticalFields,
          gateWarningMessage,
          alternatives,
          // 🆕 AI 决策逻辑相关字段
          personaInfo: response.personaInfo,
          recommendedRoutes: response.recommendedRoutes,
          blockedBySafetyPrinciple: response.blockedBySafetyPrinciple,
          decisionResult: response.decisionResult,
          blockedByDecisionMatrix: response.blockedByDecisionMatrix,
          // 🆕 思考过程与进展步骤
          thinkingProcess: response.thinkingProcess,
          progressSteps: response.progressSteps,
          phaseIndicator: response.phaseIndicator,
        };
        setMessages(prev => [...prev, aiMessage]);
        setNewMessageId(messageId);  // 触发打字机效果
        
        // 🆕 记录使用的消息ID（用于调试）
        console.log('[NLChatInterface] ✅ 使用消息ID:', {
          messageId,
          source: response.lastMessageId ? 'lastMessageId' : (response.sessionId ? 'fromSession' : 'temporary'),
          hasClarificationQuestions: clarificationQuestions && clarificationQuestions.length > 0,
        });
        
        if (response.conversationContext) {
          setConversationContext(response.conversationContext);
          // 🆕 更新后端会话上下文
          if (response.sessionId) {
            try {
              await tripsApi.updateNLConversation(response.sessionId, {
                conversationContext: response.conversationContext,
                partialParams: response.partialParams,
              });
            } catch (err) {
              console.warn('[NLChatInterface] 更新对话上下文失败:', err);
            }
          }
        }
        
        // 🆕 验证消息保存（仅开发环境，延迟执行以等待后端保存）
        if (response.sessionId && process.env.NODE_ENV === 'development') {
          setTimeout(async () => {
            try {
              const conversation = await tripsApi.getNLConversation(response.sessionId!);
              // 使用 reverse 和 find 代替 findLast（兼容性更好）
              const lastUserMessage = [...conversation.messages].reverse().find(m => m.role === 'user');
              const lastAIMessage = [...conversation.messages].reverse().find(m => m.role === 'assistant');
              
              console.log('[NLChatInterface] ✅ 消息保存验证:', {
                sessionId: conversation.sessionId,
                totalMessages: conversation.messages.length,
                lastUserMessage: lastUserMessage?.content.substring(0, 50),
                lastAIMessage: lastAIMessage?.content.substring(0, 50),
                userMessageMatch: lastUserMessage?.content === userMessage.content,
                aiMessageMatch: lastAIMessage?.content === aiMessage.content,
              });
              
              // 验证消息是否匹配
              if (lastUserMessage?.content !== userMessage.content) {
                console.warn('[NLChatInterface] ⚠️ 用户消息不匹配，可能未正确保存');
              }
              if (lastAIMessage?.content !== aiMessage.content) {
                console.warn('[NLChatInterface] ⚠️ AI消息不匹配，可能未正确保存');
              }
            } catch (err) {
              console.warn('[NLChatInterface] ⚠️ 消息保存验证失败:', err);
            }
          }, 1000);  // 延迟1秒，等待后端保存完成
        }
        // 🐛 消除 linter 警告：使用 conversationContext（虽然主要用于存储，但在恢复时使用）
        // 注意：conversationContext 主要用于存储后端返回的上下文，前端通过 sessionId 管理上下文
        if (response.conversationContext) {
          const _ = conversationContext; // 读取 state 以消除警告
          console.log('[NLChatInterface] 对话上下文已更新:', {
            hasContext: !!response.conversationContext,
            sessionId: response.sessionId,
          });
        }
        if (response.partialParams) {
          setLatestParams(response.partialParams);
          // 如果获取到了目的地信息，可以更新上下文
          if (response.partialParams.destination && !currentContextPackage) {
            // 下次发送消息时会自动构建上下文
          }
          
          // 🆕 检测约束冲突（当用户输入了预算或偏好信息时）
          const params = response.partialParams;
          console.log('[NLChatInterface] 检查是否需要冲突检测:', {
            hasTotalBudget: !!params.totalBudget,
            hasPreferences: !!params.preferences,
            params,
          });
          if (params.totalBudget || params.preferences) {
            console.log('[NLChatInterface] 触发冲突检测（needsClarification分支）');
            handleDetectConflicts(params).catch(err => {
              console.error('[NLChatInterface] 冲突检测失败:', err);
            });
          }
        }
      } else if (response.trip) {
        // 行程创建成功：补充 intent 默认值（创建时可能缺失 travelMode、dailyWalkLimit 等）
        tripsApi.supplementIntentAfterCreate(response.trip.id).catch(() => {});
        const messageId = `ai-${Date.now()}`;
        const successMessage: ChatMessage = {
          id: messageId,
          role: 'assistant',
          content:
            response.message ||
            response.plannerReply?.trim() ||
            '太棒了！我已经为您创建好行程了 🎉',
          timestamp: new Date(),
          // 🐛 如果有 responseBlocks，也显示结构化内容
          responseBlocks: response.plannerResponseBlocks,
          parsedParams: response.parsedParams,
          showConfirmCard: false, // 直接创建成功，不需要确认卡片
          thinkingProcess: response.thinkingProcess,
          progressSteps: response.progressSteps,
          phaseIndicator: response.phaseIndicator,
        };
        setMessages(prev => [...prev, successMessage]);
        setNewMessageId(messageId);  // 触发打字机效果

        // 🆕 行程创建成功后，也检测约束冲突（如果有约束信息）
        if (response.parsedParams) {
          const params = response.parsedParams;
          console.log('[NLChatInterface] 行程创建成功，检查是否需要冲突检测:', {
            hasTotalBudget: !!params.totalBudget,
            hasPreferences: !!params.preferences,
            params,
          });
          if (params.totalBudget || params.preferences) {
            console.log('[NLChatInterface] 触发冲突检测（行程创建成功分支）');
            handleDetectConflicts(params).catch(err => {
              console.error('[NLChatInterface] 冲突检测失败:', err);
            });
          }
        }
        
        // 🆕 后台生成状态提示（改进版：更友好的提示和等待时间说明）
        if (response.generatingItems) {
          const generatingMessageId = `ai-generating-${Date.now()}`;
          const generatingMessage: ChatMessage = {
            id: generatingMessageId,
            role: 'assistant',
            content: '✅ 行程已成功创建！\n\n系统正在后台为您生成详细的行程规划点，这通常需要 **2-5 分钟**。\n\n您可以先查看行程基本信息，规划完成后会自动更新。',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, generatingMessage]);
          setNewMessageId(generatingMessageId);  // 触发打字机效果
          
          // 🆕 显示 Toast 提示，让用户明确知道需要等待
          // 使用 info 类型，因为这是信息性提示而非成功提示
          toast.info('行程创建成功', {
            description: response.message ?? '正在后台生成行程规划点，预计需要 2-5 分钟，请稍候',
            duration: 6000, // 延长显示时间，让用户有足够时间阅读
            action: {
              label: '查看行程',
              onClick: () => {
                navigate(`/dashboard/plan-studio?tripId=${response.trip!.id}`);
              },
            },
          });
        } else {
          // 如果没有后台生成，显示成功提示（优先展示接口返回的 message）
          toast.success('行程创建成功', {
            description: response.message ?? '正在跳转到规划工作台...',
            duration: 2000,
          });
        }
        
        // 通知父组件
        if (onTripCreated) {
          onTripCreated(response.trip.id);
        }
        
        // 🆕 行程创建成功后，可以选择保留或删除会话
        // 这里保留会话，以便用户后续可以继续对话
        // 如果需要删除会话，可以调用：tripsApi.deleteNLConversation(sessionId!)
        
        // 延迟跳转（如果有后台生成，延迟更长时间让用户看到提示）
        const delay = response.generatingItems ? 3000 : 1500;
        setTimeout(() => {
          navigate(`/dashboard/plan-studio?tripId=${response.trip!.id}`);
        }, delay);
      } else if (response.needsConfirmation || (response.parsedParams && !response.parsedParams.needsClarification && !response.needsClarification)) {
        // 🆕 需要用户确认创建行程（needsConfirmation: true）
        // 或者信息完整但没有明确标记需要澄清
        // 🆕 Critical 字段检查：如果被 Critical 字段阻止，不显示确认卡片
        if (response.blockedByCriticalFields) {
          // 被 Critical 字段阻止，继续澄清流程
          console.log('[NLChatInterface] ⚠️ 被 Critical 字段阻止，不显示确认卡片');
          // 这里应该已经在上面的 needsClarification 分支中处理了
        } else {
          // 信息完整，显示确认卡片
          const messageId = `ai-${Date.now()}`;
          const confirmMessage: ChatMessage = {
            id: messageId,
            role: 'assistant',
            content:
              response.plannerReply?.trim() ||
              '我已经理解了您的需求！请确认以下信息是否正确：',
            timestamp: new Date(),
            // 🐛 如果有 responseBlocks，也显示结构化内容
            responseBlocks: response.plannerResponseBlocks,
            parsedParams: response.parsedParams,
            showConfirmCard: response.showConfirmCard !== false, // 🆕 使用后端返回的 showConfirmCard，默认为 true
            needsConfirmation: response.needsConfirmation, // 🆕 保存 needsConfirmation 标记
            blockedByCriticalFields: false, // 明确标记未阻止
            thinkingProcess: response.thinkingProcess,
            progressSteps: response.progressSteps,
            phaseIndicator: response.phaseIndicator,
          };
          setMessages(prev => [...prev, confirmMessage]);
          setNewMessageId(messageId);  // 触发打字机效果
          if (response.parsedParams) {
            setLatestParams(response.parsedParams);
          }
        }
      } else if (response.plannerResponseBlocks && response.plannerResponseBlocks.length > 0) {
        // 🐛 如果返回了 responseBlocks 但没有进入上述分支，也显示结构化内容
        const messageId = `ai-${Date.now()}`;
        const aiMessage: ChatMessage = {
          id: messageId,
          role: 'assistant',
          content: response.plannerReply?.trim() || '让我为您规划行程...',
          timestamp: new Date(),
          responseBlocks: response.plannerResponseBlocks,
          parsedParams: response.partialParams,
          thinkingProcess: response.thinkingProcess,
          progressSteps: response.progressSteps,
          phaseIndicator: response.phaseIndicator,
        };
        setMessages(prev => [...prev, aiMessage]);
        setNewMessageId(messageId);  // 触发打字机效果
        
        if (response.partialParams) {
          setLatestParams(response.partialParams);
        }
      }
    } catch (err: any) {
      // 🆕 用户终止：静默处理，不展示错误
      const isAborted =
        err?.name === 'AbortError' ||
        err?.message?.includes('abort') ||
        err?.message?.includes('canceled') ||
        err?.code === 'ERR_CANCELED';
      if (isAborted) {
        console.log('[NLChatInterface] 用户已终止');
        // 追加「消息已被用户取消。重试」提示卡片
        const cancelledMessage: ChatMessage = {
          id: `cancelled-${Date.now()}`,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isCancelledNotice: true,
          retryPayload: { text: text.trim(), answers: questionAnswers },
        };
        setMessages((prev) => [...prev, cancelledMessage]);
        return;
      }

      // 处理认证错误
      const isUnauthorized =
        err.code === 'UNAUTHORIZED' ||
        err.message?.includes('登录') ||
        err.message?.includes('认证') ||
        err.message?.includes('需要登录') ||
        err.response?.status === 401 ||
        err.response?.data?.error?.code === 'UNAUTHORIZED';

      if (isUnauthorized) {
        console.warn('[NLChatInterface] 检测到认证错误，尝试刷新 token...');
        
        // 检查是否有 token
        const token = sessionStorage.getItem('accessToken');
        if (!token) {
          setError('请先登录才能创建行程');
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
          return;
        }
        
        // 尝试刷新 token
        try {
          await refreshToken();
          console.log('[NLChatInterface] Token 刷新成功，重试发送消息...');
          
          // 重试发送消息（使用相同的上下文）
          try {
            const destinationCountry = latestParams?.destination?.split(',')[0]?.trim().toUpperCase();
            const contextPackageId = currentContextPackage?.id;
            
            const retryRequestData: import('@/types/trip').CreateTripFromNLRequest = {
              text: text.trim(),
              ...(sessionId && { sessionId }), // 🆕 传递会话ID
              ...(contextPackageId && { contextPackageId }),
              ...(!contextPackageId && destinationCountry && {
                context: {
                  destinationCountry,
                  requiredTopics: ['VISA', 'ROAD_RULES', 'SAFETY', 'WEATHER'],
                  includeUserProfile: true,
                },
              }),
            };
            
            const retryResponse = await tripsApi.createFromNLv2(retryRequestData);
            
            // 🆕 保存会话ID
            if (retryResponse.sessionId && retryResponse.sessionId !== sessionId) {
              setSessionId(retryResponse.sessionId);
              localStorage.setItem('nl_conversation_session', retryResponse.sessionId);
            }
            
            // 处理重试响应（与正常响应处理逻辑相同）
            if (retryResponse.needsClarification) {
              const messageId = `ai-${Date.now()}`;
              const aiMessage: ChatMessage = {
                id: messageId,
                role: 'assistant',
                content:
                  retryResponse.plannerReply?.trim() || '让我更了解一下您的需求...',
                timestamp: new Date(),
                // 🆕 结构化内容块（优先）
                responseBlocks: retryResponse.plannerResponseBlocks,
                // 🆕 结构化澄清问题
                clarificationQuestions: Array.isArray(retryResponse.clarificationQuestions) && retryResponse.clarificationQuestions.length > 0
                  ? (typeof retryResponse.clarificationQuestions[0] === 'string' 
                      ? undefined  // 字符串数组，使用向后兼容方式
                      : normalizeClarificationQuestions(retryResponse.clarificationQuestions as any[]))  // 结构化数组（已转换）
                  : undefined,
                parsedParams: retryResponse.partialParams,
                questionAnswers: {},  // 🐛 清空所有旧答案，每次新问题都是全新的开始（产品决策）
                thinkingProcess: retryResponse.thinkingProcess,
                progressSteps: retryResponse.progressSteps,
                phaseIndicator: retryResponse.phaseIndicator,
              };
              setMessages(prev => [...prev, aiMessage]);
              setNewMessageId(messageId);
              
              if (retryResponse.conversationContext) {
                setConversationContext(retryResponse.conversationContext);
                // 🐛 消除 linter 警告：使用 conversationContext（虽然主要用于存储，但在恢复时使用）
                const _ = conversationContext; // 读取 state 以消除警告
              }
              if (retryResponse.partialParams) {
                setLatestParams(retryResponse.partialParams);
              }
            } else if (retryResponse.trip) {
              const messageId = `ai-${Date.now()}`;
              const successMessage: ChatMessage = {
                id: messageId,
                role: 'assistant',
                content: retryResponse.message || '太棒了！我已经为您创建好行程了 🎉',
                timestamp: new Date(),
                parsedParams: retryResponse.parsedParams,
                showConfirmCard: false,
              };
              setMessages(prev => [...prev, successMessage]);
              setNewMessageId(messageId);
              
              if (onTripCreated) {
                onTripCreated(retryResponse.trip.id);
              }
              
              setTimeout(() => {
                navigate(`/dashboard/plan-studio?tripId=${retryResponse.trip!.id}`);
              }, 1500);
            } else if (retryResponse.parsedParams && !retryResponse.parsedParams.needsClarification) {
              const messageId = `ai-${Date.now()}`;
              const confirmMessage: ChatMessage = {
                id: messageId,
                role: 'assistant',
                content: '我已经理解了您的需求！请确认以下信息是否正确：',
                timestamp: new Date(),
                parsedParams: retryResponse.parsedParams,
                showConfirmCard: true,
              };
              setMessages(prev => [...prev, confirmMessage]);
              setNewMessageId(messageId);
              setLatestParams(retryResponse.parsedParams);
            }
            return; // 重试成功，直接返回
          } catch (retryErr: any) {
            // 重试仍然失败
            setError(retryErr.message || '发送失败，请重试');
            console.error('[NLChatInterface] 重试后仍然失败:', retryErr);
          }
        } catch (refreshErr) {
          // Token 刷新失败
          console.error('[NLChatInterface] Token 刷新失败:', refreshErr);
          setError('登录已过期，请重新登录');
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
          return;
        }
      }
      
      // 其他错误
      setError(err.message || '发送失败，请重试');
      console.error('NL Chat error:', err);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isLoading, navigate, onTripCreated, refreshToken, buildContextForNL, latestParams, currentContextPackage, sessionId, conversationContext, collectQuestionAnswers]);

  // 🆕 用户终止当前对话轮次
  const handleTerminate = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // 监听快捷命令事件
  useEffect(() => {
    const handleCommand = (event: CustomEvent<{ command: string }>) => {
      const command = event.detail.command;
      setInputValue(command);
      // 延迟发送，确保输入框已更新
      setTimeout(() => {
        sendMessage(command);
      }, 100);
    };

    window.addEventListener('nl-chat-command', handleCommand as EventListener);
    return () => {
      window.removeEventListener('nl-chat-command', handleCommand as EventListener);
    };
  }, [sendMessage]);

  // 确认创建行程
  const handleConfirmCreate = useCallback(async () => {
    if (!latestParams || isCreating) return;

    // 🆕 检查是否有 sessionId（必需）
    if (!sessionId) {
      setError('会话ID不存在，请刷新页面后重试');
      return;
    }

    // 🆕 决策矩阵阻止检查
    const latestMessage = messages[messages.length - 1];
    if (latestMessage?.blockedByDecisionMatrix) {
      setError('根据决策矩阵评估，当前行程不适合，请选择替代方案或修改计划');
      return;
    }

    // 🆕 Critical 字段验证：检查最新消息的 Critical 字段是否都已回答
    if (latestMessage?.clarificationQuestions && latestMessage.clarificationQuestions.length > 0) {
      const allCriticalAnswered = areAllCriticalFieldsAnswered(
        latestMessage.clarificationQuestions,
        latestMessage.questionAnswers || {}
      );
      if (!allCriticalAnswered) {
        const unansweredCritical = getUnansweredCriticalFields(
          latestMessage.clarificationQuestions,
          latestMessage.questionAnswers || {}
        );
        setError(`请先回答所有必填（安全相关）问题：${unansweredCritical.map(q => q.text).join('、')}`);
        return;
      }
    }

    setIsCreating(true);
    setError(null);

    try {
      // 🆕 收集 additionalParams（从补充问题中）
      const additionalParams: {
        preferences?: Record<string, any>;
        [key: string]: any;
      } = {};

      // 如果有补充问题的答案，收集到 additionalParams 中
      if (latestMessage?.questionAnswers) {
        const questionAnswers = latestMessage.questionAnswers;
        const preferences: Record<string, any> = {};
        
        // 遍历问题答案，提取偏好信息
        Object.entries(questionAnswers).forEach(([questionId, answer]) => {
          const question = latestMessage.clarificationQuestions?.find(
            q => (typeof q === 'object' ? q.id : undefined) === questionId
          );
          
          if (question && typeof question === 'object') {
            // 根据问题类型提取偏好信息
            if (question.metadata?.category === 'preferences') {
              // 例如：style, interests, pace 等
              if (question.id.includes('style') || question.text.includes('风格')) {
                preferences.style = answer;
              } else if (question.id.includes('interests') || question.text.includes('兴趣')) {
                preferences.interests = Array.isArray(answer) ? answer : [answer];
              } else if (question.id.includes('pace') || question.text.includes('节奏')) {
                preferences.pace = answer;
              }
            }
          }
        });

        if (Object.keys(preferences).length > 0) {
          additionalParams.preferences = preferences;
        }
      }

      // 🆕 调用确认创建API
      console.log('[NLChatInterface] 调用确认创建API:', {
        sessionId,
        confirm: true,
        additionalParams,
      });

      const response = await tripsApi.confirmCreateTrip(sessionId, {
        confirm: true,
        ...(Object.keys(additionalParams).length > 0 && { additionalParams }),
      });

      console.log('[NLChatInterface] 确认创建API响应:', response);

      if (response.trip) {
        tripsApi.supplementIntentAfterCreate(response.trip.id).catch(() => {});
        const messageId = `ai-${Date.now()}`;
        const successMessage: ChatMessage = {
          id: messageId,
          role: 'assistant',
          content: response.message || '🎉 行程创建成功！正在为您跳转到规划工作台...',
          timestamp: new Date(),
          responseBlocks: response.plannerResponseBlocks,
          parsedParams: response.parsedParams,
        };
        setMessages(prev => [...prev, successMessage]);
        setNewMessageId(messageId);  // 触发打字机效果

        // 🆕 行程创建成功后，也检测约束冲突（如果有约束信息）
        if (response.parsedParams) {
          const params = response.parsedParams;
          if (params.totalBudget || params.preferences) {
            handleDetectConflicts(params).catch(err => {
              console.error('[NLChatInterface] 冲突检测失败:', err);
            });
          }
        }

        if (onTripCreated) {
          onTripCreated(response.trip.id);
        }

        // 展示接口返回的 message
        toast.success('行程创建成功', {
          description: response.message ?? '正在为您跳转到规划工作台...',
          duration: 2000,
        });

        // 🆕 后台生成状态提示
        if (response.generatingItems) {
          const generatingMessageId = `ai-generating-${Date.now()}`;
          const generatingMessage: ChatMessage = {
            id: generatingMessageId,
            role: 'assistant',
            content: response.message ?? '正在后台生成行程规划点，预计需要 2-5 分钟，请稍后刷新查看',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, generatingMessage]);
        }

        // 延迟跳转，让用户看到成功消息
        const delay = response.generatingItems ? 3000 : 1500;
        setTimeout(() => {
          navigate(`/dashboard/plan-studio?tripId=${response.trip!.id}`);
        }, delay);
      } else {
        // 如果没有返回 trip，可能是错误或需要进一步澄清
        console.warn('[NLChatInterface] 确认创建API未返回行程，响应:', response);
        setError('行程创建失败，请重试或联系客服');
      }
      
      // 🆕 更新对话上下文（如果返回了新的上下文或参数）
      if (response.conversationContext) {
        setConversationContext(response.conversationContext);
        // 可选：更新后端会话上下文
        if (response.sessionId) {
          try {
            await tripsApi.updateNLConversation(response.sessionId, {
              conversationContext: response.conversationContext,
              partialParams: response.partialParams,
            });
          } catch (err) {
            console.warn('[NLChatInterface] 更新对话上下文失败:', err);
          }
        }
        // 🐛 消除 linter 警告：使用 conversationContext（虽然主要用于存储，但在恢复时使用）
        const _ = conversationContext; // 读取 state 以消除警告
      }
      if (response.partialParams) {
        setLatestParams(response.partialParams);
      }
    } catch (err: any) {
      // 处理认证错误
      const isUnauthorized = 
        err.code === 'UNAUTHORIZED' ||
        err.message?.includes('登录') ||
        err.message?.includes('认证') ||
        err.message?.includes('需要登录') ||
        err.response?.status === 401 ||
        err.response?.data?.error?.code === 'UNAUTHORIZED';
      
      if (isUnauthorized) {
        console.warn('[NLChatInterface] 检测到认证错误，尝试刷新 token...');
        
        // 检查是否有 token
        const token = sessionStorage.getItem('accessToken');
        if (!token) {
          setError('请先登录才能创建行程');
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
          return;
        }
        
        // 尝试刷新 token
        try {
          await refreshToken();
          console.log('[NLChatInterface] Token 刷新成功，重试确认创建行程...');
          
          // 🆕 重试确认创建行程（使用 confirm-create API）
          try {
            if (!sessionId) {
              setError('会话ID不存在，无法重试');
              return;
            }
            
            // 收集 additionalParams
            const additionalParams: {
              preferences?: Record<string, any>;
              [key: string]: any;
            } = {};
            
            if (latestMessage?.questionAnswers) {
              const questionAnswers = latestMessage.questionAnswers;
              const preferences: Record<string, any> = {};
              
              Object.entries(questionAnswers).forEach(([questionId, answer]) => {
                const question = latestMessage.clarificationQuestions?.find(
                  q => (typeof q === 'object' ? q.id : undefined) === questionId
                );
                
                if (question && typeof question === 'object') {
                  if (question.metadata?.category === 'preferences') {
                    if (question.id.includes('style') || question.text.includes('风格')) {
                      preferences.style = answer;
                    } else if (question.id.includes('interests') || question.text.includes('兴趣')) {
                      preferences.interests = Array.isArray(answer) ? answer : [answer];
                    } else if (question.id.includes('pace') || question.text.includes('节奏')) {
                      preferences.pace = answer;
                    }
                  }
                }
              });

              if (Object.keys(preferences).length > 0) {
                additionalParams.preferences = preferences;
              }
            }
            
            const retryResponse = await tripsApi.confirmCreateTrip(sessionId, {
              confirm: true,
              ...(Object.keys(additionalParams).length > 0 && { additionalParams }),
            });
            
            if (retryResponse.trip) {
              tripsApi.supplementIntentAfterCreate(retryResponse.trip.id).catch(() => {});
              toast.success('行程创建成功', {
                description: retryResponse.message ?? '正在为您跳转到规划工作台...',
                duration: 2000,
              });
              const messageId = `ai-${Date.now()}`;
              const successMessage: ChatMessage = {
                id: messageId,
                role: 'assistant',
                content: retryResponse.message || '🎉 行程创建成功！正在为您跳转到规划工作台...',
                timestamp: new Date(),
                responseBlocks: retryResponse.plannerResponseBlocks,
                parsedParams: retryResponse.parsedParams,
              };
              setMessages(prev => [...prev, successMessage]);
              setNewMessageId(messageId);

              if (onTripCreated) {
                onTripCreated(retryResponse.trip.id);
              }

              const delay = retryResponse.generatingItems ? 3000 : 1500;
              setTimeout(() => {
                navigate(`/dashboard/plan-studio?tripId=${retryResponse.trip!.id}`);
              }, delay);
            } else {
              setError('行程创建失败，请重试或联系客服');
            }
            return; // 重试成功，直接返回
          } catch (retryErr: any) {
            // 重试仍然失败
            setError(retryErr.message || '创建失败，请重试');
            console.error('[NLChatInterface] 重试后仍然失败:', retryErr);
          }
        } catch (refreshErr) {
          // Token 刷新失败
          console.error('[NLChatInterface] Token 刷新失败:', refreshErr);
          setError('登录已过期，请重新登录');
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
          return;
        }
      }
      
      // 其他错误
      setError(err.message || '创建失败，请重试');
    } finally {
      setIsCreating(false);
    }
  }, [latestParams, isCreating, navigate, onTripCreated, refreshToken, buildContextForNL, currentContextPackage, sessionId, collectQuestionAnswers, messages]);

  // 编辑信息（切换到表单模式）
  const handleEdit = useCallback(() => {
    // 可以触发回调让父组件切换到表单 Tab
    // 或者在这里显示内联编辑界面
    const messageId = `ai-${Date.now()}`;
    const editMessage: ChatMessage = {
      id: messageId,
      role: 'assistant',
      content: '好的，请告诉我您想修改哪些信息？或者您可以直接输入完整的新需求。',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, editMessage]);
    setNewMessageId(messageId);  // 触发打字机效果
  }, []);

  // 处理提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    // 🆕 指令：创建新行程/新建对话（不发给后端，直接重置本地会话）
    if (/^(创建新行程|新建行程|新建对话|开启新行程|开始新行程)$/.test(trimmed)) {
      setInputValue('');
      cancelPendingAutoSubmit();
      handleNewConversation();
      return;
    }
    sendMessage(trimmed);
  };

  const cancelPendingAutoSubmit = useCallback(() => {
    if (autoSubmitTimerId) {
      clearTimeout(autoSubmitTimerId);
    }
    setAutoSubmitCountdown(null);
    setAutoSubmitTimerId(null);
    setAutoSubmitCancelId(null);
    autoSubmittingMessageIdRef.current = null;
  }, [autoSubmitTimerId]);

  // 🆕 如果没有消息，显示优化后的欢迎界面
  if (messages.length === 0 && !isLoading) {
    return (
      <div className={cn("flex flex-col h-full bg-gray-50", className)}>
        <CreateTripWelcomeScreen
          onStart={(message) => {
            sendMessage(message);
          }}
          isLoading={isLoading}
          isCreating={isCreating}
          error={error}
          onRetry={() => {
            // 🆕 P1: 重试机制 - 如果有最后一条用户消息，重新发送
            if (messages.length > 0) {
              const lastUserMessage = messages.filter(m => m.role === 'user').pop();
              if (lastUserMessage) {
                setError(null);
                sendMessage(lastUserMessage.content);
              }
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-gray-50", className)}>
      {/* 🆕 Gemini风格：头部 - 仅在 showHeader 为 true 时显示（避免与 Dialog 标题重复） */}
      {showHeader && (
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
              <Logo variant="icon" size={32} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">智能行程规划</h3>
              <p className="text-xs text-muted-foreground">用自然语言描述，AI 帮你规划</p>
            </div>
          </div>
          {/* 🆕 新建对话按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewConversation}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新建对话
          </Button>
        </div>
      )}

      {/* 🆕 Gemini风格：消息区域 - 更宽的容器，更聚焦对话 */}
      <ScrollArea ref={scrollRef} className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onConfirm={handleConfirmCreate}
              onEdit={handleEdit}
              isLatest={idx === messages.length - 1}
              isNewMessage={msg.id === newMessageId}
              onSendMessage={sendMessage}
              hideConfirmButton={pendingMultiChoiceConfirm?.messageId === msg.id}
              onConditionalSubmit={async (_question, answers) => {
                if (!sessionId || !msg.id) return;
                const response = await tripsApi.updateMessageQuestionAnswers(sessionId, msg.id, answers);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msg.id
                      ? { ...m, questionAnswers: { ...(m.questionAnswers || {}), ...answers } }
                      : m
                  )
                );
                if (response?.nextClarificationQuestions?.length) {
                  const normalized = normalizeClarificationQuestions(response.nextClarificationQuestions);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === msg.id
                        ? {
                            ...m,
                            clarificationQuestions: [...(m.clarificationQuestions || []), ...normalized],
                            responseBlocks: [
                              ...(m.responseBlocks || []),
                              ...(response.plannerResponseBlocks || []),
                            ],
                          }
                        : m
                    )
                  );
                } else if (response?.plannerResponseBlocks?.length) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === msg.id
                        ? {
                            ...m,
                            responseBlocks: [...(m.responseBlocks || []), ...(response.plannerResponseBlocks || [])],
                          }
                        : m
                    )
                  );
                }
                if (response?.messages?.length) {
                  const mapped = response.messages.map((bm: any) => ({
                    id: bm.id,
                    role: bm.role,
                    content: bm.content,
                    timestamp: new Date(bm.timestamp),
                    parsedParams: bm.metadata?.parsedParams,
                    showConfirmCard: bm.metadata?.showConfirmCard,
                    responseBlocks: bm.metadata?.responseBlocks,
                    clarificationQuestions: bm.metadata?.clarificationQuestions
                      ? normalizeClarificationQuestions(bm.metadata.clarificationQuestions)
                      : undefined,
                    questionAnswers: bm.metadata?.questionAnswers || {},
                    personaInfo: bm.metadata?.personaInfo,
                    recommendedRoutes: bm.metadata?.recommendedRoutes,
                    blockedBySafetyPrinciple: bm.metadata?.blockedBySafetyPrinciple,
                    decisionResult: bm.metadata?.decisionResult,
                    blockedByDecisionMatrix: bm.metadata?.blockedByDecisionMatrix,
                    gateBlocked: bm.metadata?.gateBlocked,
                    blockedByCriticalFields: bm.metadata?.blockedByCriticalFields,
                    gateWarningMessage: bm.metadata?.gateWarningMessage,
                    alternatives: bm.metadata?.alternatives,
                    thinkingProcess: bm.metadata?.thinkingProcess,
                    progressSteps: bm.metadata?.progressSteps,
                  }));
                  setMessages((prev) => {
                    const existingIds = new Set(prev.map((x) => x.id));
                    const toAppend = mapped.filter((x: any) => !existingIds.has(x.id));
                    return toAppend.length ? [...prev, ...toAppend] : prev;
                  });
                }
              }}
              currency={currency}
              onOpenConflictDialog={(conflicts, runId) => {
                // 🆕 打开冲突检测弹窗
                setDetectedConflicts(conflicts);
                setConflictRunId(runId || null);
                setConflictDialogOpen(true);
              }}
              onQuestionAnswer={async (fieldKey, value) => {
                // 🆕 fieldKey 可能是 fieldName 或 questionId（向后兼容）
                // 🆕 1. 更新本地状态（立即）
                let updatedMessage: ChatMessage | undefined;
                setMessages(prev => {
                  const updated = prev.map(m => 
                    m.id === msg.id 
                      ? {
                          ...m,
                          questionAnswers: {
                            ...(m.questionAnswers || {}),
                            [fieldKey]: value,
                          },
                        }
                      : m
                  );
                  
                  updatedMessage = updated.find(m => m.id === msg.id);
                  return updated;
                });
                
                // 🆕 2. 调用后端 API（显式更新）
                if (sessionId && msg.id && updatedMessage) {
                  tripsApi.updateMessageQuestionAnswers(sessionId, msg.id, {
                    [fieldKey]: value,
                  }).then((response: { nextClarificationQuestions?: any[]; plannerResponseBlocks?: any[] }) => {
                    setSavedQuestionAnswers(prev => {
                      const newMap = new Map(prev);
                      if (!newMap.has(msg.id)) {
                        newMap.set(msg.id, new Set());
                      }
                      newMap.get(msg.id)!.add(fieldKey);
                      return newMap;
                    });
                    // 🆕 若后端返回 nextClarificationQuestions（如「其他需要修改」缺 confirm_inferred_info_other），追加到当前消息；并用 plannerResponseBlocks 渲染提示
                    if (response?.nextClarificationQuestions && Array.isArray(response.nextClarificationQuestions) && response.nextClarificationQuestions.length > 0) {
                      const normalized = normalizeClarificationQuestions(response.nextClarificationQuestions);
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === msg.id
                            ? {
                                ...m,
                                clarificationQuestions: [...(m.clarificationQuestions || []), ...normalized],
                                responseBlocks: [
                                  ...(m.responseBlocks || []),
                                  ...(response.plannerResponseBlocks || []),
                                ],
                              }
                            : m
                        )
                      );
                    } else if (response?.plannerResponseBlocks?.length) {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === msg.id
                            ? { ...m, responseBlocks: [...(m.responseBlocks || []), ...(response.plannerResponseBlocks || [])] }
                            : m
                        )
                      );
                    }
                  }).catch((err) => {
                    console.warn('[NLChatInterface] 更新问题答案失败:', err);
                  });
                }
                
                // 继续原有的逻辑
                if (updatedMessage && updatedMessage.clarificationQuestions && updatedMessage.clarificationQuestions.length > 0) {
                  // 🐛 检查所有问题（包括必填和非必填）是否都已回答
                  const allQuestionsAnswered = updatedMessage.clarificationQuestions.every(q => {
                    // 🆕 使用 fieldName 或 questionId（向后兼容）
                    const fieldKey = q.metadata?.fieldName || q.id;
                    const answer = updatedMessage?.questionAnswers?.[fieldKey] ?? updatedMessage?.questionAnswers?.[q.id] ?? null;
                    if (answer === null || answer === undefined) return false;
                    if (answer === '') return false;
                    if (q.inputType === 'multiple_choice') {
                      return Array.isArray(answer) && answer.length > 0;
                    }
                    
                    // HCI优化：检查条件输入字段是否已填写（使用与 NLClarificationQuestionCard 一致的匹配逻辑）
                    const triggeredInputs = getTriggeredConditionalInputs(q, answer);
                    for (const triggeredInput of triggeredInputs) {
                      if (!triggeredInput.required) continue;
                      const storageKey = getConditionalInputStorageKey(q.id, fieldKey, triggeredInput);
                      const conditionalAnswer = updatedMessage?.questionAnswers?.[storageKey];
                      if (!conditionalAnswer || conditionalAnswer === '' ||
                          (Array.isArray(conditionalAnswer) && conditionalAnswer.length === 0)) {
                        return false;
                      }
                      if (triggeredInput.inputType === 'date_range' && typeof conditionalAnswer === 'object') {
                        const rangeValue = conditionalAnswer as { startDate?: string; endDate?: string };
                        if (!rangeValue.startDate || !rangeValue.endDate) {
                          return false;
                        }
                      }
                    }
                    
                    return true;
                  });
                  
                  // 🐛 同时检查所有必填问题是否都已回答（双重检查）
                  const allRequiredAnswered = updatedMessage.clarificationQuestions.every(q => {
                    if (!q.required) return true;
                    // 🆕 使用 fieldName 或 questionId（向后兼容）
                    const fieldKey = q.metadata?.fieldName || q.id;
                    const answer = updatedMessage?.questionAnswers?.[fieldKey] ?? updatedMessage?.questionAnswers?.[q.id] ?? null;
                    if (answer === null || answer === undefined) return false;
                    if (answer === '') return false;
                    if (q.inputType === 'multiple_choice') {
                      return Array.isArray(answer) && answer.length > 0;
                    }
                    
                    // HCI优化：使用与 NLClarificationQuestionCard 一致的 trigger 匹配
                    const triggeredInputs = getTriggeredConditionalInputs(q, answer);
                    for (const triggeredInput of triggeredInputs) {
                      if (!triggeredInput.required) continue;
                      const storageKey = getConditionalInputStorageKey(q.id, fieldKey, triggeredInput);
                      const conditionalAnswer = updatedMessage?.questionAnswers?.[storageKey];
                      if (!conditionalAnswer || conditionalAnswer === '' ||
                          (Array.isArray(conditionalAnswer) && conditionalAnswer.length === 0)) {
                        return false;
                      }
                      if (triggeredInput.inputType === 'date_range' && typeof conditionalAnswer === 'object') {
                        const rangeValue = conditionalAnswer as { startDate?: string; endDate?: string };
                        if (!rangeValue.startDate || !rangeValue.endDate) {
                          return false;
                        }
                      }
                    }
                    
                    return true;
                  });
                  
                  // 🆕 「其他需要修改」：需等待后端返回 nextClarificationQuestions 并填写 confirm_inferred_info_other，否则不自动提交
                  const hasOtherNeedModify = Object.values(updatedMessage?.questionAnswers || {}).some((v) => {
                    const s = typeof v === 'string' ? v : Array.isArray(v) ? v.join('') : String(v || '');
                    return /其他需要修改|其他.*修改/.test(s);
                  });
                  const hasConfirmInferredOther = (updatedMessage?.questionAnswers?.confirm_inferred_info_other ?? '') !== '';
                  if (hasOtherNeedModify && !hasConfirmInferredOther) {
                    // 等待 PUT 返回 nextClarificationQuestions 并让用户填写
                    return;
                  }

                  // 🐛 只有所有问题（包括必填和非必填）都回答后才自动提交
                  // 🆕 防重复提交：用 ref 同步检查，避免 state 异步导致重复触发
                  const hasMultipleChoice = updatedMessage.clarificationQuestions.some(q => q.inputType === 'multiple_choice');
                  if (allQuestionsAnswered && allRequiredAnswered && !autoSubmittingMessageIdRef.current) {
                    // 🆕 构建 finalAnswers（包含条件输入字段）
                    const finalAnswers: Record<string, string | string[] | number | boolean | null> = {};
                    if (updatedMessage && updatedMessage.clarificationQuestions) {
                      updatedMessage.clarificationQuestions.forEach(q => {
                        const fieldKey = q.metadata?.fieldName || q.id;
                        const answer = updatedMessage?.questionAnswers?.[fieldKey] ?? updatedMessage?.questionAnswers?.[q.id];
                        if (answer !== null && answer !== undefined) {
                          finalAnswers[fieldKey] = answer;
                        }
                        
                        // HCI优化：收集条件输入字段的值（与 getTriggeredConditionalInputs 一致）
                        const triggered = getTriggeredConditionalInputs(q, answer ?? null);
                        triggered.forEach((conditionalInput) => {
                          const storageKey = getConditionalInputStorageKey(q.id, fieldKey, conditionalInput);
                          const conditionalAnswer = updatedMessage?.questionAnswers?.[storageKey];
                          if (conditionalAnswer !== null && conditionalAnswer !== undefined) {
                            finalAnswers[storageKey] = conditionalAnswer;
                          }
                        });
                      });
                    }
                    const finalQuestions = updatedMessage?.clarificationQuestions ? [...updatedMessage.clarificationQuestions] : [];
                    
                    // 🆕 多选题：不自动提交，等待用户点击「确认选择并继续」
                    if (hasMultipleChoice) {
                      setPendingMultiChoiceConfirm({
                        messageId: msg.id,
                        finalAnswers,
                        finalQuestions,
                      });
                      return;
                    }
                    
                    autoSubmittingMessageIdRef.current = msg.id;
                    
                    // 🆕 P1: 答案预览 - 显示所有答案摘要（优先使用 options 中的 label）
                    const answerSummary = finalQuestions
                      .map(q => {
                        const fieldKey = q.metadata?.fieldName || q.id;
                        const answer = finalAnswers[fieldKey] ?? finalAnswers[q.id];
                        if (answer === null || answer === undefined || answer === '') return null;
                        const opts = q.options || [];
                        const getLabel = (val: any) => {
                          const v = typeof val === 'object' ? (val?.value ?? val?.label) : val;
                          const opt = opts.find((o: any) => {
                            if (typeof o === 'object' && o !== null) {
                              return (o.value ?? o.label) === v;
                            }
                            return o === v;
                          });
                          if (opt === undefined) return null;
                          return typeof opt === 'object' && opt !== null
                            ? (opt.label ?? opt.value ?? '')
                            : String(opt);
                        };
                        const answerText = Array.isArray(answer)
                          ? answer.map((v) => getLabel(v) ?? formatAnswerValue(v)).join('、')
                          : (getLabel(answer) ?? formatAnswerValue(answer));
                        return `${q.text}: ${answerText}`;
                      })
                      .filter(Boolean)
                      .join('；');
                    
                    // 🆕 P1: 显示答案预览消息
                    const previewMessageId = `answer-preview-${Date.now()}`;
                    const previewMessage: ChatMessage = {
                      id: previewMessageId,
                      role: 'assistant',
                      content: `✅ 已收集所有答案：${answerSummary}`,
                      timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, previewMessage]);
                    
                    // 🆕 优化：添加自动提交倒计时提示（符合反馈原则）
                    // 🐛 所有问题都已回答，延迟 1.5 秒后自动发送（给用户时间看到答案预览）
                    // 根据答案生成明确的确认消息，例如："明确两人出行，计划停留7天"
                    const cancelId = `auto-submit-${Date.now()}`;
                    setAutoSubmitCancelId(cancelId);
                    setAutoSubmitCountdown(1.5);
                    
                    // 🆕 倒计时更新（每 0.1 秒更新一次）
                    let currentCountdown = 1.5;
                    const countdownInterval = setInterval(() => {
                      currentCountdown -= 0.1;
                      setAutoSubmitCountdown(prev => {
                        if (prev === null || currentCountdown <= 0) {
                          clearInterval(countdownInterval);
                          return 0;
                        }
                        return Math.max(0, currentCountdown);
                      });
                    }, 100);
                    
                    // 🆕 自动提交定时器
                    const submitTimer = setTimeout(() => {
                      // 🆕 检查是否被取消（通过检查当前 cancelId）
                      setAutoSubmitCancelId(currentCancelId => {
                        if (currentCancelId !== cancelId) {
                          clearInterval(countdownInterval);
                          return currentCancelId;
                        }
                        
                        // 🆕 执行自动提交
                        const confirmText = generateConfirmationMessage(
                          finalQuestions,
                          finalAnswers,
                          updatedMessage?.questionAnswerLabels
                        );
                        console.log('[NLChatInterface] 自动提交确认消息:', confirmText);
                        console.log('[NLChatInterface] 提交的答案:', finalAnswers);
                        console.log('[NLChatInterface] 所有问题已回答，自动提交');
                        
                        // 🐛 直接传递答案给 sendMessage，确保答案正确传输
                        // 因为 setTimeout 回调执行时，messages 状态可能还没有更新完成
                        sendMessage(confirmText, finalAnswers);
                        
                        // 🆕 清理状态
                        setAutoSubmitCountdown(null);
                        setAutoSubmitTimerId(null);
                        setAutoSubmitCancelId(null);
                        autoSubmittingMessageIdRef.current = null;
                        clearInterval(countdownInterval);
                        
                        return null;
                      });
                    }, 1500); // 延长到 1.5 秒，让用户看到答案预览
                    
                    setAutoSubmitTimerId(submitTimer);
                  } else if (autoSubmittingMessageIdRef.current === msg.id) {
                    // 🆕 如果已经在自动提交中，跳过（防止重复触发）
                    console.log('[NLChatInterface] 消息已在自动提交中，跳过重复触发');
                  }
                }
              }}
            />
          ))}
          
          {/* 🆕 多选题确认：用户需点击「确认选择并继续」后才提交 */}
          {pendingMultiChoiceConfirm && (
            <div className="px-4 py-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg animate-in fade-in slide-in-from-bottom-1 duration-300">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-amber-900">
                    您已选择多项，请确认后继续
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingMultiChoiceConfirm(null)}
                      className="text-xs h-7 px-2"
                    >
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const { finalAnswers, finalQuestions } = pendingMultiChoiceConfirm;
                        const confirmText = generateConfirmationMessage(
                          finalQuestions,
                          finalAnswers,
                          pendingMultiChoiceConfirm.messageId
                            ? messages.find((m) => m.id === pendingMultiChoiceConfirm.messageId)?.questionAnswerLabels
                            : undefined
                        );
                        sendMessage(confirmText, finalAnswers);
                        setPendingMultiChoiceConfirm(null);
                      }}
                      className="text-xs h-7 px-2 bg-black hover:bg-gray-800"
                    >
                      确认选择并继续
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 🆕 自动提交倒计时提示（符合反馈原则）- 在消息流末尾显示 */}
          {autoSubmitCountdown !== null && autoSubmitCountdown > 0 && (
            <div className="px-4 py-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg animate-in fade-in slide-in-from-bottom-1 duration-300">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-sm text-blue-900">
                      {autoSubmitCountdown > 0 ? `将在 ${autoSubmitCountdown.toFixed(1)} 秒后自动提交` : '正在提交...'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // 🆕 取消自动提交
                        if (autoSubmitTimerId) {
                          clearTimeout(autoSubmitTimerId);
                        }
                        setAutoSubmitCountdown(null);
                        setAutoSubmitTimerId(null);
                        setAutoSubmitCancelId(null);
                        autoSubmittingMessageIdRef.current = null;
                      }}
                      className="text-xs h-7 px-2"
                    >
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        // 🆕 立即提交（需要找到对应的答案和问题）
                        if (autoSubmitTimerId) {
                          clearTimeout(autoSubmitTimerId);
                        }
                        setAutoSubmitCountdown(null);
                        setAutoSubmitTimerId(null);
                        setAutoSubmitCancelId(null);
                        autoSubmittingMessageIdRef.current = null;
                        // TODO: 实现立即提交逻辑（需要保存 finalAnswers 和 finalQuestions 的引用）
                      }}
                      className="text-xs h-7 px-2 bg-black hover:bg-gray-800"
                    >
                      立即提交
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 加载状态 */}
          {isLoading && <TypingIndicator />}
          
          {/* 创建中状态 */}
          {isCreating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在创建行程...
            </div>
          )}
          
          {/* 🆕 后台生成状态 */}
          {messages.some(msg => msg.content.includes('正在后台生成行程规划点') || msg.content.includes('预计需要')) && (
            <div className="flex items-center gap-2 text-sm text-blue-600 px-4 py-2 bg-blue-50 rounded-lg mx-4 mb-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>正在后台生成行程规划点，预计需要 2-5 分钟，请稍候</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
                className="ml-auto"
              >
                刷新页面
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 定位到最新对话按钮（仅在用户向上滚动时显示；已在最新时不显示） */}
      {messages.length > 0 && !isAtBottom && (
        <div className="flex justify-center py-3 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={scrollToBottom}
            className={cn(
              'h-9 px-4 rounded-full gap-1.5',
              'border-gray-300 bg-white text-gray-700',
              'hover:bg-gray-50 hover:border-gray-400',
              'shadow-sm transition-all duration-200'
            )}
            aria-label="定位到最新对话"
          >
            <ChevronDown className="w-4 h-4" />
            <span className="text-xs font-medium">回到底部</span>
          </Button>
        </div>
      )}

      {/* 🆕 Gemini风格：输入区域 - 大输入框，带工具按钮 */}
      <form onSubmit={handleSubmit} className="border-t bg-white">
        {/* 对话引导（首次使用或快捷命令） */}
        <ConversationGuide
          isFirstTime={isFirstTime}
          onDismiss={dismissOnboarding}
          onCommandClick={(command) => {
            setInputValue(command);
            // 自动提交
            setTimeout(() => {
              sendMessage(command);
            }, 100);
          }}
        />
        
        {/* 🆕 Gemini风格：大输入框容器 */}
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex flex-col gap-2">
            {/* Gemini风格：统一的输入条容器 - 更大更突出 */}
            <div className={cn(
              'flex items-center gap-2',
              'bg-white rounded-2xl',
              'border border-gray-200',
              'transition-all duration-200',
              'focus-within:border-black/50'
            )}>
              {/* 🆕 左侧工具按钮（类似Gemini的+和工具图标） */}
              <div className="flex items-center gap-1 px-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  aria-label="添加附件"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {/* 输入框 - 无边框，作为容器的一部分 */}
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={cancelPendingAutoSubmit}
                onMouseDown={cancelPendingAutoSubmit}
                placeholder="例如：3 月和家人去日本 7 天，节奏轻松"
                disabled={isLoading || isCreating}
                className={cn(
                  'flex-1 h-14 text-base',
                  'border-0 bg-transparent shadow-none',
                  'rounded-2xl px-2',
                  'placeholder:text-gray-400',
                  'focus-visible:outline-none focus-visible:ring-0',
                  'disabled:cursor-not-allowed'
                )}
              />
              
              {/* 🆕 右侧按钮：加载中为终止，否则为发送 */}
              <div className="flex items-center gap-1 px-3">
                {isLoading && !isCreating ? (
                  <Button
                    type="button"
                    onClick={handleTerminate}
                    className={cn(
                      'h-9 w-9 p-0 flex-shrink-0 rounded-lg',
                      'bg-black hover:bg-gray-800 text-white',
                      'transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2'
                    )}
                    aria-label="终止"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!inputValue.trim() || isCreating}
                    className={cn(
                      'h-9 w-9 p-0 flex-shrink-0',
                      'bg-black hover:bg-gray-800',
                      'text-white rounded-lg',
                      'transition-all duration-200',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2'
                    )}
                    aria-label="发送消息"
                  >
                    {isCreating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-5 h-5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
            {/* 🆕 Gemini风格：降低心理负担的文案 */}
            <p className="text-xs text-gray-400 text-center px-2">
              不需要想得很清楚，后面可以随时修改
            </p>
          </div>
        </div>
      </form>

      {/* 🆕 冲突检测弹窗 */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              检测到约束冲突
            </DialogTitle>
            <DialogDescription>
              我们检测到您设置的约束之间存在冲突，请查看下方的冲突详情和权衡选项。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ConflictDetectionCard
              conflicts={detectedConflicts}
              runId={conflictRunId || undefined}
              tripId={undefined} // TODO: 从上下文获取
              userId={undefined} // TODO: 从用户上下文获取
              onResolve={(conflict, option) => {
                console.log('[NLChatInterface] 用户选择权衡选项:', { conflict, option });
                // TODO: 应用选择的权衡选项
                toast.info(`您选择了：${option}`, {
                  description: '我们正在为您调整约束设置...',
                });
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConflictDialogOpen(false)}
            >
              我知道了
            </Button>
            <Button
              onClick={() => {
                setConflictDialogOpen(false);
                // 可以添加"查看详情"的逻辑
              }}
            >
              查看详情
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
