/**
 * 决策回放控制器组件
 * 播放/暂停/快进/单步前进/单步后退
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { decisionDraftApi } from '@/api/decision-draft';
import type { DecisionReplay, ReplayTimelineItem } from '@/types/decision-draft';
import { Play, Pause, SkipForward, SkipBack, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

export interface ReplayControllerProps {
  draftId: string;
  onStepChange?: (step: ReplayTimelineItem) => void;
}

export default function ReplayController({
  draftId,
  onStepChange,
}: ReplayControllerProps) {
  const [replay, setReplay] = useState<DecisionReplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadReplay();
  }, [draftId]);

  useEffect(() => {
    if (isPlaying && replay) {
      const delay = 1000 / playbackSpeed; // 基础延迟1秒，根据速度调整
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= replay.timeline.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          const next = prev + 1;
          const step = replay.timeline[next];
          onStepChange?.(step);
          return next;
        });
      }, delay);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, replay, onStepChange]);

  const loadReplay = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await decisionDraftApi.getReplay(draftId);
      setReplay(data);
      setCurrentIndex(0);
    } catch (err: any) {
      setError(err.message || '加载回放数据失败');
      console.error('Failed to load replay:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    if (!replay) return;
    if (currentIndex >= replay.timeline.length - 1) {
      // 如果已经播放完，重新开始
      setCurrentIndex(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleStepForward = () => {
    if (!replay) return;
    if (currentIndex < replay.timeline.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      onStepChange?.(replay.timeline[next]);
    }
  };

  const handleStepBackward = () => {
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
      onStepChange?.(replay.timeline[prev]);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    if (replay) {
      onStepChange?.(replay.timeline[0]);
    }
  };

  const handleSliderChange = (value: number[]) => {
    if (!replay) return;
    const index = Math.floor((value[0] / 100) * replay.timeline.length);
    setCurrentIndex(index);
    onStepChange?.(replay.timeline[index]);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">加载回放数据...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!replay || replay.timeline.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">暂无回放数据</div>
        </CardContent>
      </Card>
    );
  }

  const currentStep = replay.timeline[currentIndex];
  const progress = (currentIndex / (replay.timeline.length - 1)) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">决策回放</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 时间线进度条 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              步骤 {currentIndex + 1} / {replay.timeline.length}
            </span>
            <span className="text-muted-foreground">
              {format(new Date(currentStep.timestamp), 'HH:mm:ss')}
            </span>
          </div>
          <Slider
            value={[progress]}
            onValueChange={handleSliderChange}
            max={100}
            step={100 / replay.timeline.length}
            className="w-full"
          />
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            title="重置"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStepBackward}
            disabled={currentIndex === 0}
            title="上一步"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          {isPlaying ? (
            <Button
              variant="default"
              size="sm"
              onClick={handlePause}
              title="暂停"
            >
              <Pause className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handlePlay}
              disabled={currentIndex >= replay.timeline.length - 1}
              title="播放"
            >
              <Play className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleStepForward}
            disabled={currentIndex >= replay.timeline.length - 1}
            title="下一步"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* 播放速度 */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">播放速度:</span>
          <div className="flex gap-1">
            {[1, 2, 4].map((speed) => (
              <Button
                key={speed}
                variant={playbackSpeed === speed ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPlaybackSpeed(speed)}
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>

        {/* 当前步骤信息 */}
        {currentStep && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">{currentStep.step}</div>
            {currentStep.decision_step && (
              <div className="text-xs text-muted-foreground mt-1">
                决策: {currentStep.decision_step.title}
              </div>
            )}
            {currentStep.decision_made && (
              <div className="text-xs text-muted-foreground mt-1">
                操作: {currentStep.decision_made.action}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
