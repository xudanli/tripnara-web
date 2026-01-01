import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}

interface SpotlightTourProps {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentStepIndex?: number;
}

export default function SpotlightTour({
  steps,
  open,
  onClose,
  onComplete,
  currentStepIndex: controlledStepIndex,
}: SpotlightTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});
  const overlayRef = useRef<HTMLDivElement>(null);

  const activeStepIndex = controlledStepIndex !== undefined ? controlledStepIndex : currentStep;
  const activeStep = steps[activeStepIndex];

  useEffect(() => {
    if (!open || !activeStep) return;

    const updateTarget = () => {
      const element = document.querySelector(activeStep.target) as HTMLElement;
      if (element) {
        setTargetElement(element);
        const rect = element.getBoundingClientRect();
        setOverlayStyle({
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
        });
      }
    };

    updateTarget();
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);

    return () => {
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [open, activeStep]);

  if (!open || !activeStep || !targetElement) {
    return null;
  }

  const targetRect = targetElement.getBoundingClientRect();
  const position = activeStep.position || 'bottom';

  const getTooltipPosition = () => {
    const gap = 16;
    switch (position) {
      case 'top':
        return {
          bottom: window.innerHeight - targetRect.top + gap,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          top: targetRect.bottom + gap,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2,
          right: window.innerWidth - targetRect.left + gap,
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + gap,
          transform: 'translateY(-50%)',
        };
      default:
        return {
          top: targetRect.bottom + gap,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
    }
  };

  const tooltipStyle = getTooltipPosition();

  const handleNext = () => {
    if (activeStep.action) {
      activeStep.action();
    }
    if (activeStepIndex < steps.length - 1) {
      if (controlledStepIndex === undefined) {
        setCurrentStep(activeStepIndex + 1);
      }
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (activeStepIndex > 0) {
      if (controlledStepIndex === undefined) {
        setCurrentStep(activeStepIndex - 1);
      }
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* 遮罩层 */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/60"
        style={{
          clipPath: `polygon(
            0% 0%, 
            0% 100%, 
            ${targetRect.left}px 100%, 
            ${targetRect.left}px ${targetRect.top}px, 
            ${targetRect.right}px ${targetRect.top}px, 
            ${targetRect.right}px ${targetRect.bottom}px, 
            ${targetRect.left}px ${targetRect.bottom}px, 
            ${targetRect.left}px 100%, 
            100% 100%, 
            100% 0%
          )`,
        }}
      />

      {/* 高亮目标元素 */}
      <div
        className="absolute border-2 border-primary rounded-lg shadow-lg pointer-events-none"
        style={{
          left: `${targetRect.left - 4}px`,
          top: `${targetRect.top - 4}px`,
          width: `${targetRect.width + 8}px`,
          height: `${targetRect.height + 8}px`,
        }}
      />

      {/* 工具提示卡片 */}
      <Card
        className="absolute w-80 pointer-events-auto shadow-2xl"
        style={tooltipStyle as React.CSSProperties}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-base mb-1">{activeStep.title}</h3>
              <p className="text-sm text-muted-foreground">{activeStep.description}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              {activeStepIndex > 0 && (
                <Button variant="outline" size="sm" onClick={handlePrev}>
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  上一步
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                跳过
              </Button>
              <Button size="sm" onClick={handleNext}>
                {activeStepIndex < steps.length - 1 ? (
                  <>
                    下一步
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </>
                ) : (
                  '完成'
                )}
              </Button>
            </div>
          </div>

          <div className="mt-3 text-xs text-center text-muted-foreground">
            {activeStepIndex + 1} / {steps.length}
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}


