/**
 * Planning Assistant V2 - 欢迎界面组件
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Heart, Users, Compass, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeScreenProps {
  onStart: (prompt: string) => void;
  className?: string;
}

const quickStarts = [
  {
    icon: Heart,
    label: '浪漫蜜月',
    prompt: '我想和另一半去度蜜月，想要浪漫一点的目的地',
    color: 'text-pink-600',
  },
  {
    icon: Users,
    label: '家庭出游',
    prompt: '想带父母和孩子一起出去玩，有什么适合的地方？',
    color: 'text-blue-600',
  },
  {
    icon: Compass,
    label: '探险之旅',
    prompt: '想去探险，体验一些刺激的户外活动',
    color: 'text-green-600',
  },
  {
    icon: Globe,
    label: '说走就走',
    prompt: '我想去旅行',
    color: 'text-purple-600',
  },
];

export function WelcomeScreen({ onStart, className }: WelcomeScreenProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center h-full',
        className
      )}
    >
      {/* Logo */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 animate-in zoom-in-50 fade-in duration-500">
        <Sparkles className="w-10 h-10 text-white" />
      </div>

      {/* 标题 */}
      <h2 className="text-2xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-4 duration-400 delay-200">
        嗨，我是规划助手 ✨
      </h2>

      {/* 描述 */}
      <p className="text-muted-foreground mb-8 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-400 delay-300">
        告诉我你的旅行想法，我会帮你找到完美的目的地，并生成详细的行程方案
      </p>

      {/* 快捷开始 */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-400 delay-[400ms]">
        {quickStarts.map(({ icon: Icon, label, prompt, color }) => (
          <Button
            key={label}
            variant="outline"
            className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary transition-all"
            onClick={() => onStart(prompt)}
          >
            <Icon className={cn('w-5 h-5', color)} />
            <span className="text-sm">{label}</span>
          </Button>
        ))}
      </div>

      {/* 提示卡片 */}
      <Card className="mt-8 max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-400 delay-[500ms]">
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">
            💡 提示：你可以用自然语言描述你的旅行需求，比如"我想去一个安静的海边城市，预算5万，7天"
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
