/**
 * Airbnb 授权提示组件
 * 
 * 非阻塞式授权提示，符合渐进式披露原则
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lock, 
  ExternalLink, 
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAirbnb } from '@/hooks/useAirbnb';
import { toast } from 'sonner';

interface AirbnbAuthPromptProps {
  onAuthorized?: () => void;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

export function AirbnbAuthPrompt({
  onAuthorized,
  onDismiss,
  className,
  compact = false,
}: AirbnbAuthPromptProps) {
  const { authStatus, authLoading, getAuthUrl, verifyAuth, checkAuthStatus } = useAirbnb();
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [polling, setPolling] = useState(false);

  // 检查授权状态
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // 轮询检查授权状态
  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(async () => {
      const connectionId = localStorage.getItem('airbnb_connection_id');
      if (connectionId) {
        const authorized = await verifyAuth(connectionId);
        if (authorized) {
          setPolling(false);
          onAuthorized?.();
          toast.success('Airbnb 授权成功！');
        }
      }
    }, 3000); // 每 3 秒检查一次

    // 10 分钟后停止轮询
    const timeout = setTimeout(() => {
      setPolling(false);
      toast.info('授权超时，请重试');
    }, 600000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [polling, verifyAuth, onAuthorized]);

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    try {
      const authUrl = await getAuthUrl();
      if (authUrl) {
        // 打开授权页面
        window.open(authUrl, '_blank', 'width=600,height=700');
        setPolling(true);
        toast.info('请在弹出的窗口中完成授权');
      }
    } catch (error: any) {
      toast.error(error.message || '获取授权 URL 失败');
    } finally {
      setIsAuthorizing(false);
    }
  };

  // 如果已授权，显示成功状态
  if (authStatus?.isAuthorized) {
    return (
      <Alert className={cn("border-green-200 bg-green-50", className)}>
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          ✅ 已授权 Airbnb，可以搜索房源了
        </AlertDescription>
      </Alert>
    );
  }

  if (compact) {
    return (
      <Card className={cn("border-primary/20", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                需要授权才能搜索 Airbnb 房源
              </span>
            </div>
            <div className="flex gap-2">
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={handleAuthorize}
                disabled={authLoading || isAuthorizing || polling}
              >
                {authLoading || isAuthorizing || polling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {polling ? '等待授权...' : '授权中...'}
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    授权
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">需要 Airbnb 授权</CardTitle>
        </div>
        <CardDescription>
          为了搜索 Airbnb 房源，需要您授权访问 Airbnb 账户。授权过程安全且快速。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">授权后，您可以：</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>搜索 Airbnb 房源</li>
            <li>查看房源详情和价格</li>
            <li>将房源添加到行程中</li>
          </ul>
        </div>

        <div className="flex gap-2">
          {onDismiss && (
            <Button
              variant="outline"
              onClick={onDismiss}
              className="flex-1"
            >
              稍后
            </Button>
          )}
          <Button
            variant="default"
            onClick={handleAuthorize}
            disabled={authLoading || isAuthorizing || polling}
            className="flex-1"
          >
            {authLoading || isAuthorizing || polling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {polling ? '等待授权...' : '授权中...'}
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                开始授权
              </>
            )}
          </Button>
        </div>

        {polling && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              请在弹出的窗口中完成授权，授权完成后会自动检测。
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
