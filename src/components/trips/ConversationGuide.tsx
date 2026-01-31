/**
 * 对话引导组件
 * 提供首次使用引导、智能提示、快捷命令
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
  Users,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

const quickCommands = [
  { text: '查看行程', command: '查看我的行程' },
  { text: '新建行程', command: '我想创建一个新行程' },
  { text: '调整预算', command: '调整预算' },
  { text: '国家数据库', command: '查看国家数据库', icon: Globe },
];

export default function ConversationGuide({
  isFirstTime,
  onDismiss,
  onCommandClick,
}: ConversationGuideProps) {
  const [showGuide, setShowGuide] = useState(isFirstTime);
  const [showQuickCommands, setShowQuickCommands] = useState(false);

  useEffect(() => {
    setShowGuide(isFirstTime);
  }, [isFirstTime]);

  const handleCommandClick = (command: string) => {
    if (onCommandClick) {
      onCommandClick(command);
    }
    setShowQuickCommands(false);
  };

  if (!showGuide && !showQuickCommands) {
    // 显示快捷命令按钮（可折叠）
    return (
      <div className="mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowQuickCommands(true)}
          className="text-xs text-muted-foreground"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          快捷命令
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-2">
      {/* 首次使用引导卡片 */}
      {showGuide && (
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
      )}

      {/* 快捷命令（可折叠） */}
      {showQuickCommands && (
        <Card className="border-gray-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700">快捷命令</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setShowQuickCommands(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickCommands.map((cmd, index) => {
                const Icon = cmd.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (cmd.command === '查看国家数据库') {
                        // 跳转到国家数据库页面
                        window.location.href = '/dashboard/countries';
                      } else {
                        handleCommandClick(cmd.command);
                      }
                    }}
                    className="text-xs"
                  >
                    {Icon && <Icon className="h-3 w-3 mr-1" />}
                    {cmd.text}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
