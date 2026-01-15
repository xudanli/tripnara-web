/**
 * 授权对话框组件
 * 用于处理 NEED_CONSENT 状态，请求用户授权
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConsent?: (granted: boolean) => void;
  title?: string;
  message?: string;
  requiredPermissions?: string[];
  warning?: string;
}

export default function ConsentDialog({
  open,
  onOpenChange,
  onConsent,
  title = '需要您的授权',
  message = '此操作需要您的授权才能继续执行。',
  requiredPermissions = [],
  warning,
}: ConsentDialogProps) {
  const [, setGranted] = useState(false);

  const handleGrant = () => {
    setGranted(true);
    onConsent?.(true);
    onOpenChange(false);
  };

  const handleDeny = () => {
    setGranted(false);
    onConsent?.(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="mt-2">{message}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {warning && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          )}

          {requiredPermissions.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold">需要以下权限：</div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {requiredPermissions.map((permission, idx) => (
                  <li key={idx}>{permission}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                授权后，系统将使用这些权限继续执行您的请求。您可以随时撤销授权。
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleDeny}>
            拒绝
          </Button>
          <Button onClick={handleGrant}>
            授权
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
