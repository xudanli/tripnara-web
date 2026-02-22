/**
 * Planning Assistant V2 - 对话面板组件
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChatV2 } from '@/hooks/useChatV2';
import { MessageBubble } from './MessageBubble';
import { QuickActions } from './QuickActions';
import { VisionPoiDialog } from './VisionPoiDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Sparkles, MapPin, Calendar, DollarSign, Mic, ImageIcon, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { visionApi } from '@/api/vision';
import { toast } from 'sonner';
import type { TripDetail } from '@/types/trip';

interface ChatPanelProps {
  sessionId: string | null;
  userId?: string;
  /** 清空对话消息（供内部按钮使用） */
  clearMessages?: () => void;
  /** 通知父组件清空函数已准备好（供标题栏等外部按钮调用） */
  onClearReady?: (clear: () => void) => void;
  context?: {
    tripId?: string;
    countryCode?: string;
    userCountryCode?: string; // 用户所在国家，用于住宿搜索语言映射（CN→zh、JP→ja 等）
    currentLocation?: { lat: number; lng: number };
    timezone?: string;
  };
  destination?: string; // 当前选定的目的地，用于快捷操作
  tripInfo?: TripDetail; // 行程详细信息，用于上下文感知和显示
  tripId?: string; // 行程 ID，用于加入行程等操作
  onAddToTripSuccess?: () => void; // 加入行程成功后的回调
  /** 规划工作台场景：不展示执行阶段编排进度（ui_state/orchestrationResult 属于 route_and_run） */
  hideExecutionOrchestration?: boolean;
  className?: string;
}

/** 将 File 转为 base64 data URL */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ChatPanel({ sessionId, userId, clearMessages, onClearReady, context, destination, tripInfo, tripId, onAddToTripSuccess, hideExecutionOrchestration = true, className }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [visionResult, setVisionResult] = useState<Awaited<ReturnType<typeof visionApi.poiRecommend>> | null>(null);
  const [visionDialogOpen, setVisionDialogOpen] = useState(false);
  const [visionLoading, setVisionLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const visionInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { messages, sendMessage, clearMessages: clearMessagesFromHook, isLoading, error } = useChatV2(sessionId, userId, context);
  // 必须使用自身 hook 的 clearMessages，因为 ChatPanel 显示的是本 hook 的 messages
  const handleClearMessages = clearMessagesFromHook;

  // 通知父组件清空函数已准备好（供标题栏等外部按钮调用）
  useEffect(() => {
    if (onClearReady && handleClearMessages) {
      onClearReady(handleClearMessages);
    }
  }, [onClearReady, handleClearMessages]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if ((!inputValue.trim() && imageFiles.length === 0) || isLoading || !sessionId) return;

    // 仅图片、无文字 → 走 Vision 接口（拍照识别），不调用 chat
    if (imageFiles.length > 0 && !inputValue.trim()) {
      const file = imageFiles[0];
      const hadMultiple = imageFiles.length > 1;
      setImageFiles([]);
      if (hadMultiple) {
        toast.info('拍照识别仅支持单张图片，已识别第一张');
      }
      setVisionLoading(true);
      toast.info('正在识别图片...');
      try {
        const pos = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('浏览器不支持定位'));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
            (err) => reject(new Error(err.message || '获取位置失败，请允许定位权限'))
          );
        });
        const result = await visionApi.poiRecommend(file, pos.lat, pos.lng, 'zh-CN');
        setVisionResult(result);
        setVisionDialogOpen(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '拍照识别失败');
      } finally {
        setVisionLoading(false);
      }
      return;
    }

    // 有文字，或文字+图片 → 走 chat 接口
    let imageUrls: string[] | undefined;
    if (imageFiles.length > 0) {
      imageUrls = await Promise.all(imageFiles.map(fileToDataUrl));
      setImageFiles([]);
    }
    const message = inputValue.trim() || (imageUrls?.length ? '（附图片）' : '');
    await sendMessage(message, imageUrls);
    setInputValue('');
  };

  // 语音输入
  const toggleVoiceInput = useCallback(() => {
    const SpeechRecognitionAPI = typeof SpeechRecognition !== 'undefined' ? SpeechRecognition : (typeof webkitSpeechRecognition !== 'undefined' ? webkitSpeechRecognition : null);
    if (!SpeechRecognitionAPI) {
      console.warn('浏览器不支持语音识别');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('');
      if (e.results[e.results.length - 1].isFinal) {
        setInputValue((prev) => (prev ? `${prev}${transcript}` : transcript));
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [isListening]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const images = files.filter((f) => f.type.startsWith('image/'));
    setImageFiles((prev) => [...prev, ...images].slice(0, 5));
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // 拍照识别 POI 推荐
  const handleVisionAction = useCallback(() => {
    visionInputRef.current?.click();
  }, []);

  const handleVisionFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !file.type.startsWith('image/')) return;
      setVisionLoading(true);
      toast.info('正在识别图片...');
      try {
        const pos = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('浏览器不支持定位'));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
            (err) => reject(new Error(err.message || '获取位置失败，请允许定位权限'))
          );
        });
        const result = await visionApi.poiRecommend(file, pos.lat, pos.lng, 'zh-CN');
        setVisionResult(result);
        setVisionDialogOpen(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '拍照识别失败');
      } finally {
        setVisionLoading(false);
      }
    },
    []
  );

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        请先创建会话
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-background ${className || ''}`}>
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        <div className="space-y-4">
          {/* 当前行程信息提示（规划工作台场景） */}
          {tripInfo && messages.length === 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      我已了解您的当前行程
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {tripInfo.destination && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{tripInfo.destination}</span>
                        </div>
                      )}
                      {tripInfo.startDate && tripInfo.endDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(tripInfo.startDate).toLocaleDateString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                            })}
                            {' - '}
                            {new Date(tripInfo.endDate).toLocaleDateString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                      {tripInfo.totalBudget && tripInfo.totalBudget > 0 && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>预算 ¥{tripInfo.totalBudget.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      我可以根据您的行程信息提供更精准的建议，比如推荐酒店、餐厅、天气查询等。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {messages.length === 0 && !tripInfo && (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <div>
                <p className="text-lg font-medium mb-2">开始对话</p>
                <p className="text-sm">告诉我你的旅行想法，我会帮你规划完美的行程</p>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onSendMessage={sendMessage}
              isLastAssistantMessage={
                message.role === 'assistant' &&
                messages.filter((m) => m.role === 'assistant').pop()?.id === message.id
              }
              tripId={tripId}
              tripInfo={tripInfo}
              onAddToTripSuccess={onAddToTripSuccess}
              hideExecutionOrchestration={hideExecutionOrchestration}
            />
          ))}
          
          {isLoading && (
            <div className="flex gap-3 animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">AI正在思考...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error.message || '发送消息失败，请重试'}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 快捷操作 + 输入框 */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 flex-shrink-0 space-y-3">
        <QuickActions
          onAction={sendMessage}
          destination={destination}
          disabled={isLoading || !sessionId || visionLoading}
          onVisionAction={handleVisionAction}
        />
        <input
          ref={visionInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/heic,image/webp"
          className="hidden"
          onChange={handleVisionFileSelect}
        />
        {/* 图片预览 */}
        {imageFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imageFiles.map((file, i) => (
              <div key={i} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  className="w-14 h-14 object-cover rounded-xl border-2 border-muted shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-center rounded-2xl border bg-muted/30 px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleVoiceInput}
            disabled={isLoading || !sessionId}
            className={cn(
              'h-9 w-9 rounded-xl shrink-0',
              isListening && 'bg-primary/10 text-primary'
            )}
            title="语音输入"
          >
            <Mic className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || !sessionId || imageFiles.length >= 5}
            className="h-9 w-9 rounded-xl shrink-0"
            title="上传图片"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息，支持语音和图片..."
            disabled={isLoading}
            className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-w-0"
          />
          <Button
            onClick={handleSend}
            disabled={(!inputValue.trim() && imageFiles.length === 0) || isLoading}
            size="icon"
            className="h-9 w-9 rounded-xl shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      <VisionPoiDialog
        open={visionDialogOpen}
        onOpenChange={setVisionDialogOpen}
        result={visionResult}
        tripId={tripId}
        tripInfo={tripInfo}
        onAddToTripSuccess={onAddToTripSuccess}
      />
    </div>
  );
}
