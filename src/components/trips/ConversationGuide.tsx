/**
 * 对话引导组件
 * 提供首次使用引导和示例命令
 * 符合 Contextual Help 和 Progressive Disclosure 原则
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  X, 
  Sparkles, 
  MapPin, 
  Wallet, 
  Shield,
  Calendar,
  Globe,
} from 'lucide-react';

interface ConversationGuideProps {
  isFirstTime: boolean;
  onDismiss: () => void;
  onCommandClick?: (command: string) => void;
}

const exampleCommands = [
  { text: '我想去冰岛', icon: MapPin, category: '创建行程' },
  { text: '查看我的行程', icon: Calendar, category: '查看行程' },
  { text: '调整预算', icon: Wallet, category: '预算管理' },
  { text: '查看风险提示', icon: Shield, category: '风险管理' },
  { text: '查看国家数据库', icon: Globe, category: '工具' },
];

// 快捷命令已移除，简化界面

export default function ConversationGuide({
  isFirstTime,
  onDismiss,
  onCommandClick,
}: ConversationGuideProps) {
  const [showGuide, setShowGuide] = useState(isFirstTime);

  useEffect(() => {
    setShowGuide(isFirstTime);
  }, [isFirstTime]);

  const handleCommandClick = (command: string) => {
    if (onCommandClick) {
      onCommandClick(command);
    }
  };

  // 仅在首次使用时显示引导，移除快捷命令功能
  if (!showGuide) {
    return null;
  }

  return (
    <div className="mb-4">
      {/* 首次使用引导卡片 */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gray-700" />
              <h3 className="text-sm font-semibold text-gray-900">
                欢迎使用 TripNARA
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setShowGuide(false);
                onDismiss();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-700 mb-3">
            你可以通过自然语言描述你的旅行需求，系统会自动帮你规划行程。
          </p>
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-900">试试说：</p>
            <div className="flex flex-wrap gap-2">
              {exampleCommands.map((example, index) => {
                const Icon = example.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleCommandClick(example.text)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-colors text-xs"
                  >
                    <Icon className="h-3 w-3 text-gray-700" />
                    <span className="text-gray-900">{example.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
