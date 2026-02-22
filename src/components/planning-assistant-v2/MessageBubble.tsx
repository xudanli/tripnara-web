/**
 * Planning Assistant V2 - 消息气泡组件
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { User, Sparkles, MessageCircle, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { TripDetail } from '@/types/trip';
import type { ChatMessage } from '@/hooks/useChatV2';
import { MCPDataDisplay } from './MCPDataDisplay';
import { OrchestrationProgressCard } from './OrchestrationProgressCard';

interface MessageBubbleProps {
  message: ChatMessage;
  onSendMessage?: (text: string) => void | Promise<void>;
  isLastAssistantMessage?: boolean;
  tripId?: string;
  tripInfo?: TripDetail;
  onAddToTripSuccess?: () => void;
  /** 规划工作台：不展示执行阶段编排进度（PLAN_GEN/REPAIR 等属于 route_and_run） */
  hideExecutionOrchestration?: boolean;
}

/** 澄清提示：当需要用户补充信息时显示；HOTEL_DATES 时展示日期选择器 */
function ClarificationPrompt({
  clarificationNeeded,
  onSendMessage,
  showDatePicker,
  className,
}: {
  clarificationNeeded: NonNullable<ChatMessage['clarificationNeeded']>;
  onSendMessage?: (text: string) => void | Promise<void>;
  showDatePicker?: boolean;
  className?: string;
}) {
  const suggestedDates = clarificationNeeded.suggestedDates;
  const [checkIn, setCheckIn] = useState(suggestedDates?.checkIn ?? '');
  const [checkOut, setCheckOut] = useState(suggestedDates?.checkOut ?? '');

  const hint = getClarificationHint(clarificationNeeded.type);
  const text = clarificationNeeded.messageCN || clarificationNeeded.message;
  const isHotelDates = clarificationNeeded.type === 'HOTEL_DATES';

  const handleConfirmSuggestedDates = () => {
    if (!suggestedDates || !onSendMessage) return;
    const start = new Date(suggestedDates.checkIn);
    const end = new Date(suggestedDates.checkOut);
    const msg = `${format(start, 'M月d日', { locale: zhCN })}到${format(end, 'M月d日', { locale: zhCN })}`;
    onSendMessage(msg);
  };

  const handleConfirmDates = () => {
    if (!checkIn || !checkOut || !onSendMessage) return;
    const [y1, m1, d1] = checkIn.split('-').map(Number);
    const [y2, m2, d2] = checkOut.split('-').map(Number);
    const start = new Date(y1, m1 - 1, d1);
    const end = new Date(y2, m2 - 1, d2);
    if (start > end) return;
    const text = `${format(start, 'M月d日', { locale: zhCN })}到${format(end, 'M月d日', { locale: zhCN })}`;
    onSendMessage(text);
    setCheckIn('');
    setCheckOut('');
  };

  const canConfirm = checkIn && checkOut && checkIn <= checkOut;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      className={cn(
        'mt-3 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm',
        className
      )}
    >
      <div className="flex items-start gap-2">
        <MessageCircle className="h-4 w-4 flex-shrink-0 text-amber-600 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800">请补充信息</p>
          <p className="text-amber-700 mt-0.5">{text}</p>
          {hint && !showDatePicker && (
            <p className="text-xs text-amber-600 mt-1.5">{hint}</p>
          )}
        </div>
      </div>

      {/* 酒店日期：有 suggestedDates 时优先展示「确认使用行程日期」；否则展示日期选择器 */}
      {isHotelDates && showDatePicker && onSendMessage && (
        <div className="space-y-2">
          {suggestedDates ? (
            <>
              <Button
                size="sm"
                className="w-full h-8 bg-amber-600 hover:bg-amber-700"
                onClick={handleConfirmSuggestedDates}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                确认使用行程日期并搜索
              </Button>
              <p className="text-xs text-amber-600">或选择其他日期：</p>
            </>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-amber-800 block mb-1">入住</label>
              <Input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                min={today}
                className="h-8 text-xs border-amber-300 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-amber-800 block mb-1">退房</label>
              <Input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn || today}
                className="h-8 text-xs border-amber-300 bg-white"
              />
            </div>
          </div>
          <Button
            size="sm"
            variant={suggestedDates ? 'outline' : 'default'}
            className="w-full h-8"
            onClick={handleConfirmDates}
            disabled={!canConfirm}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {suggestedDates ? '使用以上日期搜索' : '确认并搜索酒店'}
          </Button>
        </div>
      )}
    </div>
  );
}

function getClarificationHint(type: string): string | null {
  switch (type) {
    case 'HOTEL_DATES':
      return '例如：3月15日到20日、3月15日入住3月20日退房';
    case 'DESTINATION':
      return '例如：冰岛、东京、巴黎';
    case 'DATES':
      return '例如：3月1日到7日、下周';
    case 'CLARIFYING_RAIL_DATES':
      return '点击下方快捷选项或输入日期';
    default:
      return null;
  }
}

export function MessageBubble({
  message,
  onSendMessage,
  isLastAssistantMessage,
  hideExecutionOrchestration,
  tripId,
  tripInfo,
  onAddToTripSuccess,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex-1 max-w-[85%]',
          isUser ? 'text-right' : 'text-left'
        )}
      >
        <div
          className={cn(
            'inline-block rounded-2xl px-4 py-2.5 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted rounded-tl-sm'
          )}
        >
          <div className="whitespace-pre-wrap">
            {message.content || '(空消息)'}
          </div>
        </div>

        {/* 编排进度：仅执行阶段 Agent 展示；规划工作台不涉及 route_and_run */}
        {!isUser && !hideExecutionOrchestration && (message.ui_state || message.orchestrationResult) && (
          <OrchestrationProgressCard
            ui_state={message.ui_state}
            orchestrationResult={message.orchestrationResult}
          />
        )}

        {/* 澄清提示：需要用户补充信息时显示；最后一条时展示可交互的日期选择器 */}
        {!isUser && message.clarificationNeeded && (
          <ClarificationPrompt
            clarificationNeeded={message.clarificationNeeded}
            onSendMessage={onSendMessage}
            showDatePicker={isLastAssistantMessage}
          />
        )}

        {/* MCP 服务数据展示（推荐、酒店、餐厅、天气等） */}
        {!isUser && (
          <MCPDataDisplay
            message={message}
            tripId={tripId}
            tripInfo={tripInfo}
            onAddToTripSuccess={onAddToTripSuccess}
          />
        )}

        {/* 建议操作：suggestedActions（如铁路日期「明天」「后天」）或 suggestions，点击发送对应消息 */}
        {!isUser && onSendMessage && (
          message.suggestedActions && message.suggestedActions.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-3">
              {message.suggestedActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(action.labelCN || action.label)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-md transition-colors',
                    action.primary
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-background border border-input hover:bg-accent'
                  )}
                >
                  {action.labelCN || action.label}
                </button>
              ))}
            </div>
          ) : message.suggestions && message.suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-3">
              {message.suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(suggestion)}
                  className="text-xs px-3 py-1.5 bg-background border border-input rounded-md hover:bg-accent transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null
        )}

        {/* 时间戳 */}
        <div
          className={cn(
            'text-xs text-muted-foreground mt-1',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {message.timestamp.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
