/**
 * 创建行程入口区域
 * 提供两种创建方式：对话创建和表单创建
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, FileText, Maximize2, Minimize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import NLChatInterface from '@/components/trips/NLChatInterface';
import { tripsApi } from '@/api/trips';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CreateTripSectionProps {
  className?: string;
  onTripCreated?: (tripId?: string) => void;
}

export default function CreateTripSection({
  className,
  onTripCreated,
}: CreateTripSectionProps) {
  const navigate = useNavigate();
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [chatKey, setChatKey] = useState(0); // 用于重置 NLChatInterface

  const handleChatCreate = async () => {
    // 🆕 每次打开弹窗时，先清空之前的会话
    const currentSessionId = localStorage.getItem('nl_conversation_session');
    
    // 如果有旧的会话，先删除后端会话
    if (currentSessionId) {
      try {
        await tripsApi.deleteNLConversation(currentSessionId);
        console.log('[CreateTripSection] ✅ 打开弹窗前已删除旧会话:', currentSessionId);
      } catch (err: any) {
        // 静默处理错误，不影响打开弹窗
        console.warn('[CreateTripSection] ⚠️ 删除旧会话时出现异常（继续打开弹窗）:', {
          sessionId: currentSessionId,
          error: err?.message || err,
        });
      }
    }
    
    // 清空本地会话数据
    localStorage.removeItem('nl_conversation_session');
    
    // 重置 chatKey，确保每次打开都是全新的对话
    setChatKey(prev => prev + 1);
    
    // 打开弹窗
    setChatDialogOpen(true);
  };

  const handleFormCreate = () => {
    navigate('/dashboard/trips/new');
  };

  const handleTripCreated = (tripId: string) => {
    setChatDialogOpen(false);
    setIsFullscreen(false); // 关闭时重置全屏状态
    if (onTripCreated) {
      onTripCreated(tripId);
    }
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 关闭 Dialog 时的处理
  const handleDialogOpenChange = async (open: boolean) => {
    if (open) {
      // 🆕 打开 Dialog 时，先清空之前的会话
      const currentSessionId = localStorage.getItem('nl_conversation_session');
      
      // 如果有旧的会话，先删除后端会话
      if (currentSessionId) {
        try {
          await tripsApi.deleteNLConversation(currentSessionId);
          console.log('[CreateTripSection] ✅ 打开弹窗前已删除旧会话:', currentSessionId);
        } catch (err: any) {
          // 静默处理错误，不影响打开弹窗
          console.warn('[CreateTripSection] ⚠️ 删除旧会话时出现异常（继续打开弹窗）:', {
            sessionId: currentSessionId,
            error: err?.message || err,
          });
        }
      }
      
      // 清空本地会话数据
      localStorage.removeItem('nl_conversation_session');
      
      // 重置 chatKey，确保每次打开都是全新的对话
      setChatKey(prev => prev + 1);
      
      // 打开 Dialog
      setChatDialogOpen(true);
    } else {
      // 正在关闭 Dialog
      // 检查是否有对话内容（通过检查 localStorage 中的会话）
      const hasConversation = localStorage.getItem('nl_conversation_session');
      
      if (hasConversation) {
        // 有对话内容，阻止关闭并显示确认对话框
        setShowCloseConfirm(true);
        // 保持 Dialog 打开状态
        setChatDialogOpen(true);
      } else {
        // 没有对话内容，直接关闭
        handleConfirmClose();
      }
    }
  };

  // 确认关闭并清空上下文
  const handleConfirmClose = async () => {
    // 从 localStorage 获取会话ID
    const currentSessionId = localStorage.getItem('nl_conversation_session');
    
    // 如果有会话ID，通知后端删除会话
    if (currentSessionId) {
      try {
        await tripsApi.deleteNLConversation(currentSessionId);
        console.log('[CreateTripSection] ✅ 后端会话已删除:', currentSessionId);
      } catch (err: any) {
        // 后端可能返回成功但记录警告日志，或者会话不存在也返回成功
        // 无论后端是否成功，都继续清空本地数据
        console.warn('[CreateTripSection] ⚠️ 删除后端会话时出现异常（可能已静默处理）:', {
          sessionId: currentSessionId,
          error: err?.message || err,
        });
      }
    }
    
    // 无论后端是否成功，都清空本地会话数据
    localStorage.removeItem('nl_conversation_session');
    
    // 重置组件（通过更新 key）
    setChatKey(prev => prev + 1);
    
    // 关闭 Dialog
    setChatDialogOpen(false);
    setIsFullscreen(false);
    setShowCloseConfirm(false);
  };

  // 取消关闭
  const handleCancelClose = () => {
    setShowCloseConfirm(false);
    // Dialog 保持打开状态（chatDialogOpen 已经是 true）
  };

  return (
    <>
      <Card className={cn(className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">创建新行程</CardTitle>
          <CardDescription className="text-xs">
            选择创建方式开始规划你的旅程
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 对话创建 */}
            <Button
              onClick={handleChatCreate}
              className={cn(
                "h-auto flex-col gap-2.5 p-5",
                "bg-slate-900 hover:bg-slate-800",
                "text-white border-0",
                "transition-all duration-200 hover:scale-[1.02]"
              )}
              size="default"
            >
              <MessageSquare className="w-6 h-6" />
              <div className="flex flex-col gap-1 text-center">
                <span className="font-semibold text-sm">对话创建</span>
                <span className="text-xs opacity-90">
                  通过自然语言对话创建行程
                </span>
              </div>
            </Button>

            {/* 表单创建 */}
            <Button
              onClick={handleFormCreate}
              variant="outline"
              className={cn(
                "h-auto flex-col gap-2.5 p-5",
                "bg-white border border-slate-300",
                "hover:bg-slate-50 hover:border-slate-400",
                "transition-all duration-200 hover:scale-[1.02]"
              )}
              size="default"
            >
              <FileText className="w-6 h-6 text-gray-700" />
              <div className="flex flex-col gap-1 text-center">
                <span className="font-semibold text-sm text-gray-900">表单创建</span>
                <span className="text-xs text-gray-600">
                  使用标准表单创建行程
                </span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 对话创建对话框 */}
      <Dialog open={chatDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent 
          className={cn(
            "flex flex-col p-0 transition-all duration-200",
            "[&>button]:hidden", // 隐藏默认的关闭按钮
            isFullscreen 
              ? "max-w-full w-full h-full max-h-full m-0 rounded-none translate-x-0 translate-y-0 left-0 top-0" 
              : "max-w-4xl h-[80vh]"
          )}
        >
          {/* 简化头部，移除重复描述 - NLChatInterface 内部已有说明 */}
          <DialogHeader className="px-6 pt-4 pb-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base">对话创建行程</DialogTitle>
              <div className="flex items-center gap-2">
                {/* 全屏切换按钮 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleToggleFullscreen}
                  aria-label={isFullscreen ? "退出全屏" : "全屏"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                {/* 关闭按钮 - 样式与全屏按钮一致 */}
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="关闭"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <NLChatInterface
              key={chatKey}
              onTripCreated={handleTripCreated}
              className="h-full"
              showHeader={false}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 关闭确认对话框 */}
      <AlertDialog 
        open={showCloseConfirm} 
        onOpenChange={(open) => {
          if (!open) {
            // 用户点击外部或按 ESC，等同于取消
            handleCancelClose();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认关闭</AlertDialogTitle>
            <AlertDialogDescription>
              关闭对话框将清空当前对话内容，您确定要继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              确认关闭
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
