/**
 * 开始规划卡片组件
 * 引导新用户开始规划行程
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, MapPin, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StartPlanningCardProps {
  onStartPlanning?: () => void;
  onExampleClick?: (example: string) => void;
  className?: string;
}

const exampleCommands = [
  '我想去冰岛',
  '帮我规划一个7天的日本行程',
  '我想去欧洲，预算5万元',
];

export default function StartPlanningCard({
  onStartPlanning,
  onExampleClick,
  className,
}: StartPlanningCardProps) {
  return (
    <Card className={cn('border-gray-200 bg-gradient-to-br from-gray-50 to-white', className)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              开始规划你的旅行
            </h3>
            <p className="text-sm text-gray-600">
              通过自然语言描述你的旅行需求，系统会自动帮你规划行程
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">试试说：</p>
            <div className="flex flex-wrap gap-2">
              {exampleCommands.map((example, index) => (
                <button
                  key={index}
                  onClick={() => onExampleClick?.(example)}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-gray-700"
                >
                  <MapPin className="h-3 w-3 inline mr-1" />
                  {example}
                </button>
              ))}
            </div>
          </div>

          <Button
            size="sm"
            className="w-full"
            onClick={onStartPlanning}
          >
            开始规划
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
