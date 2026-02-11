/**
 * 体能评估提示卡片组件
 * 用于在各种场景下非侵入式地引导用户完成体能评估
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X, ArrowRight, Sparkles } from 'lucide-react';
import { FitnessQuestionnaireDialog } from './FitnessQuestionnaireDialog';
import type { PromptTrigger } from '@/types/fitness';

interface FitnessPromptCardProps {
  /** 提示变体 */
  variant?: 'inline' | 'banner' | 'compact';
  /** 自定义消息 */
  message?: string;
  /** 触发来源（用于埋点） */
  trigger?: PromptTrigger;
  /** 完成回调 */
  onComplete?: () => void;
  /** 关闭回调 */
  onDismiss?: () => void;
  /** 是否可关闭 */
  dismissible?: boolean;
  /** 自定义样式 */
  className?: string;
}

/**
 * 体能评估提示卡片
 * 
 * @example
 * ```tsx
 * // 内联卡片（用于页面中）
 * <FitnessPromptCard
 *   variant="inline"
 *   trigger="trip_created"
 *   onComplete={() => refetchProfile()}
 * />
 * 
 * // 横幅样式（用于顶部提示）
 * <FitnessPromptCard
 *   variant="banner"
 *   message="完成体能评估，获得更精准的行程推荐"
 *   dismissible
 * />
 * 
 * // 紧凑样式
 * <FitnessPromptCard variant="compact" />
 * ```
 */
export function FitnessPromptCard({
  variant = 'inline',
  message,
  trigger = 'manual',
  onComplete,
  onDismiss,
  dismissible = true,
  className,
}: FitnessPromptCardProps) {
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleComplete = () => {
    setShowQuestionnaire(false);
    onComplete?.();
  };

  const handleSkip = () => {
    setShowQuestionnaire(false);
    handleDismiss();
  };

  const defaultMessage = '完成体能评估，获得个性化的行程建议';
  const displayMessage = message || defaultMessage;

  // 内联卡片样式
  if (variant === 'inline') {
    return (
      <>
        <Card className={cn('overflow-hidden', className)}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              
              <div className="flex-1 space-y-2">
                <h4 className="font-medium">了解您的体能水平</h4>
                <p className="text-sm text-muted-foreground">
                  {displayMessage}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setShowQuestionnaire(true)}
                  >
                    开始评估
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  {dismissible && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDismiss}
                    >
                      稍后再说
                    </Button>
                  )}
                </div>
              </div>

              {dismissible && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 -mt-1 -mr-2"
                  onClick={handleDismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <FitnessQuestionnaireDialog
          open={showQuestionnaire}
          onOpenChange={setShowQuestionnaire}
          onComplete={handleComplete}
          onSkip={handleSkip}
          trigger={trigger}
        />
      </>
    );
  }

  // 横幅样式
  if (variant === 'banner') {
    return (
      <>
        <div className={cn(
          'bg-primary/5 border-b border-primary/10 px-4 py-3',
          className
        )}>
          <div className="flex items-center justify-between max-w-screen-xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="text-xl">🏃</span>
              <p className="text-sm">
                {displayMessage}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowQuestionnaire(true)}
              >
                立即评估
              </Button>
              {dismissible && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <FitnessQuestionnaireDialog
          open={showQuestionnaire}
          onOpenChange={setShowQuestionnaire}
          onComplete={handleComplete}
          onSkip={handleSkip}
          trigger={trigger}
        />
      </>
    );
  }

  // 紧凑样式
  return (
    <>
      <div className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-amber-50 text-amber-700 text-sm',
        className
      )}>
        <span>💪</span>
        <span>未完成体能评估</span>
        <button
          onClick={() => setShowQuestionnaire(true)}
          className="underline underline-offset-2 hover:no-underline"
        >
          立即评估
        </button>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="ml-1 hover:text-amber-900"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <FitnessQuestionnaireDialog
        open={showQuestionnaire}
        onOpenChange={setShowQuestionnaire}
        onComplete={handleComplete}
        onSkip={handleSkip}
        trigger={trigger}
      />
    </>
  );
}
